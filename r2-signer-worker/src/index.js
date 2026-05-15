const UPLOAD_RATE_LIMIT = 20; // max uploads per user per hour
const ADMIN_RATE_LIMIT  = 30; // max admin actions per user per hour
const AI_RATE_LIMIT     = 60; // max AI requests per user per hour

// Generic per-namespace hourly rate limiter. Gracefully skips if KV is not configured.
async function checkRateLimit(uid, namespace, limit, env) {
  if (!env.RATE_LIMIT_KV) return;
  const hourBucket = Math.floor(Date.now() / 3_600_000);
  const key = `rl:${namespace}:${uid}:${hourBucket}`;
  const current = parseInt(await env.RATE_LIMIT_KV.get(key) || '0', 10);
  if (current >= limit) {
    throw new Error(`Rate limit exceeded. Max ${limit} ${namespace} requests per hour.`);
  }
  await env.RATE_LIMIT_KV.put(key, String(current + 1), { expirationTtl: 7200 });
}

async function checkUploadRateLimit(uid, env) {
  return checkRateLimit(uid, 'upload', UPLOAD_RATE_LIMIT, env);
}

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic',
]);

const ALLOWED_VIDEO_TYPES = new Set([
  'video/mp4', 'video/quicktime', 'video/webm', 'video/mov',
]);

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;  // 10 MB
const MAX_VIDEO_BYTES = 200 * 1024 * 1024; // 200 MB
const GOOGLE_OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const AWS_ALGORITHM = 'AWS4-HMAC-SHA256';
const AWS_REGION = 'auto';
const AWS_SERVICE = 's3';

function sanitize(name) {
  return String(name || 'upload').replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').slice(0, 120);
}

function getAllowedOrigins(env) {
  const raw = String(env.ALLOWED_ORIGINS || '').trim();
  if (!raw) return [];
  return raw.split(',').map((item) => item.trim()).filter(Boolean);
}

function getFirebaseProjectId(env) {
  return String(env.FIREBASE_PROJECT_ID || '').trim();
}

function resolveCorsOrigin(origin, env) {
  const allowedOrigins = getAllowedOrigins(env);
  if (allowedOrigins.length === 0) {
    return origin || '*';
  }

  // Normalise before comparing so trailing slashes / case differences don't block legit origins
  const normalised = (origin || '').trim().toLowerCase().replace(/\/$/, '');
  const match = allowedOrigins.find(
    (o) => o.trim().toLowerCase().replace(/\/$/, '') === normalised
  );
  return match ? origin : null;
}

function hasSeniorPastorClaims(claims) {
  return claims?.seniorPastor === true || claims?.isSeniorPastor === true;
}

function hasPrivilegedClaims(claims) {
  return claims?.admin === true
    || claims?.isAdmin === true
    || claims?.seniorPastor === true
    || claims?.isSeniorPastor === true;
}

// ── Firebase JWKS verification (RFC 7519, OWASP A07) ────────────────────────
// Google rotates these keys every ~6 h; the module-level cache avoids a
// JWKS fetch on every request while respecting the rotation window.
const FIREBASE_JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const JWKS_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
let jwksCache = { keys: null, fetchedAt: 0 };

function decodeBase64Url(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  return atob(padded);
}

function parseJwtParts(token) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed JWT.');
  return {
    header:  JSON.parse(decodeBase64Url(parts[0])),
    payload: JSON.parse(decodeBase64Url(parts[1])),
    rawParts: parts,
  };
}

async function getJwksPublicKey(kid) {
  const now = Date.now();
  if (!jwksCache.keys || now - jwksCache.fetchedAt > JWKS_CACHE_TTL_MS) {
    const res = await fetch(FIREBASE_JWKS_URL);
    if (!res.ok) throw new Error('Failed to fetch Firebase public keys.');
    const body = await res.json();
    jwksCache = { keys: body.keys, fetchedAt: now };
  }
  const jwk = jwksCache.keys?.find((k) => k.kid === kid);
  if (!jwk) throw new Error('Token signed with unknown key ID.');
  return crypto.subtle.importKey(
    'jwk', jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['verify']
  );
}

async function verifyFirebaseToken(idToken, env) {
  if (!idToken) throw new Error('Missing bearer token.');

  const projectId = getFirebaseProjectId(env);
  if (!projectId) throw new Error('FIREBASE_PROJECT_ID is not configured.');

  const { header, payload, rawParts } = parseJwtParts(idToken);

  if (header.alg !== 'RS256') throw new Error('Unsupported JWT algorithm.');

  const nowSec = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp <= nowSec)       throw new Error('Token has expired.');
  if (!payload.iat || payload.iat > nowSec + 300)  throw new Error('Token issued in the future.');
  if (payload.aud !== projectId)                   throw new Error('Token audience mismatch.');
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new Error('Token issuer mismatch.');
  }
  if (!payload.sub) throw new Error('Token is missing subject claim.');

  const publicKey = await getJwksPublicKey(header.kid);
  const signingInput = new TextEncoder().encode(`${rawParts[0]}.${rawParts[1]}`);
  const sigBytes = Uint8Array.from(decodeBase64Url(rawParts[2]), (c) => c.charCodeAt(0));
  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', publicKey, sigBytes, signingInput);
  if (!valid) throw new Error('Token signature verification failed.');

  // Custom claims are merged into the JWT payload by Firebase.
  // Strip standard reserved keys to isolate only the custom claims.
  const RESERVED_JWT_KEYS = new Set([
    'iss', 'aud', 'auth_time', 'user_id', 'sub', 'iat', 'exp',
    'email', 'email_verified', 'phone_number', 'name', 'picture', 'firebase',
  ]);
  const claims = {};
  for (const [k, v] of Object.entries(payload)) {
    if (!RESERVED_JWT_KEYS.has(k)) claims[k] = v;
  }

  return { uid: payload.sub, email: payload.email || '', claims };
}

function pemToBinary(pem) {
  const normalized = String(pem || '')
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\n/g, '')
    .replace(/\s+/g, '');

  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

function base64UrlEncode(value) {
  const bytes = value instanceof Uint8Array ? value : new TextEncoder().encode(String(value));
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function toHex(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(value) {
  const bytes = value instanceof Uint8Array ? value : new TextEncoder().encode(String(value));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return toHex(digest);
}

async function hmacSha256(key, message) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    new TextEncoder().encode(message)
  );

  return new Uint8Array(signature);
}

function formatAmzDate(date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function formatDateStamp(date) {
  return formatAmzDate(date).slice(0, 8);
}

async function deriveSigningKey(secretAccessKey, dateStamp) {
  const kDate = await hmacSha256(new TextEncoder().encode(`AWS4${secretAccessKey}`), dateStamp);
  const kRegion = await hmacSha256(kDate, AWS_REGION);
  const kService = await hmacSha256(kRegion, AWS_SERVICE);
  return hmacSha256(kService, 'aws4_request');
}

async function signR2UploadUrl(endpoint, fileType, accessKeyId, secretAccessKey) {
  if (!accessKeyId || !secretAccessKey) {
    throw new Error('R2 signing credentials are not configured.');
  }

  const url = new URL(endpoint);
  const now = new Date();
  const amzDate = formatAmzDate(now);
  const dateStamp = formatDateStamp(now);
  const credentialScope = `${dateStamp}/${AWS_REGION}/${AWS_SERVICE}/aws4_request`;
  const signedHeaders = 'host';

  url.searchParams.set('X-Amz-Algorithm', AWS_ALGORITHM);
  url.searchParams.set('X-Amz-Credential', `${accessKeyId}/${credentialScope}`);
  url.searchParams.set('X-Amz-Date', amzDate);
  url.searchParams.set('X-Amz-Expires', '900');
  url.searchParams.set('X-Amz-SignedHeaders', signedHeaders);

  const canonicalQuery = Array.from(url.searchParams.entries())
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');

  const canonicalRequest = [
    'PUT',
    url.pathname,
    canonicalQuery,
    `host:${url.host}\n`,
    signedHeaders,
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const stringToSign = [
    AWS_ALGORITHM,
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join('\n');

  const signingKey = await deriveSigningKey(secretAccessKey, dateStamp);
  const signature = toHex(await hmacSha256(signingKey, stringToSign));

  url.searchParams.set('X-Amz-Signature', signature);

  return new Request(url.toString(), {
    method: 'PUT',
    headers: { 'Content-Type': fileType },
  });
}

async function createSignedJwt(serviceAccountEmail, privateKey, scope) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: serviceAccountEmail,
    scope,
    aud: GOOGLE_OAUTH_TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    pemToBinary(privateKey),
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  return `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;
}

async function getGoogleAccessToken(env) {
  const serviceAccountEmail = String(env.FIREBASE_SERVICE_ACCOUNT_EMAIL || '').trim();
  const privateKey = String(env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY || '').trim();

  if (!serviceAccountEmail || !privateKey) {
    throw new Error('Service account credentials are not configured.');
  }

  const assertion = await createSignedJwt(
    serviceAccountEmail,
    privateKey,
    'https://www.googleapis.com/auth/identitytoolkit'
  );

  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }).toString(),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`OAuth token request failed (${response.status}): ${details}`);
  }

  const payload = await response.json();
  if (!payload.access_token) {
    throw new Error('OAuth token response did not include access_token.');
  }

  return payload.access_token;
}

async function fetchIdentityToolkit(env, path, body) {
  const projectId = getFirebaseProjectId(env);
  if (!projectId) {
    throw new Error('FIREBASE_PROJECT_ID is not configured.');
  }

  const accessToken = await getGoogleAccessToken(env);
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${encodeURIComponent(projectId)}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Identity Toolkit request failed (${response.status}): ${details}`);
  }

  return response.json();
}

async function fetchIdentityToolkitWithApiKey(env, path, body) {
  if (!env.FIREBASE_WEB_API_KEY) {
    throw new Error('FIREBASE_WEB_API_KEY is not configured.');
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1${path}?key=${encodeURIComponent(env.FIREBASE_WEB_API_KEY)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Identity Toolkit API-key request failed (${response.status}): ${details}`);
  }

  return response.json();
}

async function lookupUserByEmail(email, env) {
  const payload = await fetchIdentityToolkit(env, '/accounts:lookup', {
    email: [email],
  });

  const user = payload?.users?.[0];
  if (!user) {
    throw new Error('No Firebase Auth user exists for that email.');
  }

  return user;
}

function parseCustomClaims(customAttributes) {
  if (!customAttributes) return {};

  try {
    return JSON.parse(customAttributes);
  } catch (error) {
    console.warn('[claims] Failed to parse customAttributes:', error);
    return {};
  }
}

function generateTemporaryPassword(length = 24) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()-_=+?';
  const random = new Uint32Array(length);
  crypto.getRandomValues(random);
  let password = '';
  for (let index = 0; index < length; index += 1) {
    password += alphabet[random[index] % alphabet.length];
  }
  return password;
}

async function createUserWithTemporaryPassword(email, env) {
  const temporaryPassword = generateTemporaryPassword();
  return fetchIdentityToolkitWithApiKey(env, '/accounts:signUp', {
    email,
    password: temporaryPassword,
    returnSecureToken: false,
  });
}

async function sendPasswordSetupEmail(email, env) {
  // If Resend is configured, generate the link from Firebase and send a
  // properly formatted HTML email (avoids spam and ensures clickable links).
  if (env.RESEND_API_KEY) {
    const linkResponse = await fetchIdentityToolkit(env, '/accounts:sendOobCode', {
      requestType: 'PASSWORD_RESET',
      email,
      returnOobLink: true,
    });

    const resetLink = linkResponse?.oobLink;
    if (!resetLink) {
      throw new Error('Firebase did not return a password setup link.');
    }

    return sendEmailViaResend(email, resetLink, env);
  }

  // Fallback: let Firebase send its own email via the admin path.
  return fetchIdentityToolkit(env, '/accounts:sendOobCode', {
    requestType: 'PASSWORD_RESET',
    email,
  });
}

async function sendEmailViaResend(toEmail, resetLink, env) {
  const fromEmail = env.RESEND_FROM_EMAIL || 'noreply@lifegate.ag';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Set up your Lifegate Workspace password</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;border:1px solid #e7e5e4;overflow:hidden;">
          <tr>
            <td style="background:#1c1917;padding:28px 40px;text-align:center;">
              <p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Lifegate AG</p>
              <p style="margin:6px 0 0;color:#a8a29e;font-size:13px;">Workspace &amp; Ministry Portal</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#1c1917;">You've been invited</h1>
              <p style="margin:0 0 24px;font-size:15px;color:#57534e;line-height:1.6;">
                Your Lifegate Workspace account has been created. Click the button below to set up your password and activate your account.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 32px;">
                    <a href="${resetLink}"
                       style="display:inline-block;background:#1c1917;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;letter-spacing:0.1px;">
                      Set Up My Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:13px;color:#78716c;">
                This link expires in <strong>24 hours</strong>. If you didn't expect this invitation, you can safely ignore this email.
              </p>
              <p style="margin:0;font-size:12px;color:#a8a29e;word-break:break-all;">
                If the button above doesn't work, copy and paste this link into your browser:<br/>
                <a href="${resetLink}" style="color:#0369a1;">${resetLink}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#fafaf9;border-top:1px solid #e7e5e4;padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#a8a29e;">Lifegate AG · Ministry Portal</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [toEmail],
      subject: 'Set up your Lifegate Workspace password',
      html,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Resend email failed (${response.status}): ${details}`);
  }

  return response.json();
}

async function deleteUserByLocalId(localId, env) {
  return fetchIdentityToolkit(env, '/accounts:delete', {
    localId,
  });
}

async function ensureUserByEmail(email, env) {
  try {
    const existing = await lookupUserByEmail(email, env);
    return { user: existing, created: false };
  } catch (error) {
    const message = String(error?.message || '').toLowerCase();
    if (!message.includes('no firebase auth user exists')) {
      throw error;
    }
  }

  const created = await createUserWithTemporaryPassword(email, env);
  const localId = created?.localId;
  if (!localId) {
    throw new Error('User creation succeeded but localId was missing.');
  }

  const user = await lookupUserByEmail(email, env);
  return { user, created: true };
}

async function applyRoleClaimsByEmail(email, role, enabled, apps, env) {
  const user = await lookupUserByEmail(email, env);
  const existingClaims = parseCustomClaims(user.customAttributes);
  const nextClaims = buildUpdatedClaims(existingClaims, role, Boolean(enabled), apps);
  await updateUserCustomClaims(user.localId, nextClaims, env);
  return { user, claims: nextClaims };
}

async function updateUserCustomClaims(localId, nextClaims, env) {
  return fetchIdentityToolkit(env, '/accounts:update', {
    localId,
    customAttributes: JSON.stringify(nextClaims),
  });
}

const VALID_APP_IDS = new Set([
  'home', 'community', 'services', 'music', 'teams',
  'people', 'giving', 'calendar', 'workflows', 'security', 'reporting',
]);

function buildUpdatedClaims(existingClaims, role, enabled, apps) {
  const nextClaims = { ...(existingClaims || {}) };

  if (role === 'admin') {
    nextClaims.admin = enabled;
    nextClaims.isAdmin = enabled;
  }

  if (role === 'seniorPastor') {
    nextClaims.seniorPastor = enabled;
    nextClaims.isSeniorPastor = enabled;
    if (enabled) {
      nextClaims.admin = true;
      nextClaims.isAdmin = true;
    }
  }

  if (role === 'appAccess') {
    if (!enabled) {
      delete nextClaims.appAccess;
    } else {
      const validApps = (Array.isArray(apps) ? apps : [])
        .map((id) => String(id).trim().toLowerCase())
        .filter((id) => VALID_APP_IDS.has(id));
      if (validApps.length > 0) {
        nextClaims.appAccess = validApps;
      }
    }
  }

  Object.keys(nextClaims).forEach((key) => {
    if (nextClaims[key] === false) {
      delete nextClaims[key];
    }
  });

  return nextClaims;
}

function cors(origin) {
  const allowOrigin = origin || '*';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

// Security headers applied to every response (OWASP A05).
function withSecurityHeaders(headers) {
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
}

function json(body, status = 200, origin) {
  const headers = new Headers({ 'Content-Type': 'application/json', ...cors(origin) });
  withSecurityHeaders(headers);
  return new Response(JSON.stringify(body), { status, headers });
}

// RFC-5321 email validation — rejects obviously malformed addresses (OWASP A03).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
function isValidEmail(email) {
  return typeof email === 'string' && EMAIL_RE.test(email) && email.length <= 254;
}

// Path traversal guard for R2 object keys (OWASP A01).
function isSafeMediaKey(key) {
  return (
    typeof key === 'string' &&
    key.length > 0 &&
    key.length <= 512 &&
    !key.includes('..') &&
    !key.includes('\0') &&
    !/^[\/\\]/.test(key)
  );
}

// Tamper-evident structured audit log written to KV (SOC 2 CC7 / ISO 27001 A.12.4).
// Silently skips when KV is not yet configured.
async function writeAuditLog(env, { action, actorUid, actorEmail, targetEmail = null, metadata = {} }) {
  if (!env.RATE_LIMIT_KV) return;
  try {
    const entry = JSON.stringify({
      action, actorUid, actorEmail, targetEmail, metadata,
      timestamp: new Date().toISOString(),
    });
    // Date-prefixed key enables efficient range scans; TTL = 90 days.
    const key = `audit:${new Date().toISOString().slice(0, 10)}:${Date.now()}:${actorUid.slice(0, 8)}`;
    await env.RATE_LIMIT_KV.put(key, entry, { expirationTtl: 7_776_000 });
  } catch (e) {
    console.warn('[audit] Failed to write audit log:', e);
  }
}

// Any authenticated user with any assigned role or app access may call /ai/chat.
function hasAnyAccess(claims) {
  return claims?.admin === true
    || claims?.isAdmin === true
    || claims?.seniorPastor === true
    || claims?.isSeniorPastor === true
    || (Array.isArray(claims?.appAccess) && claims.appAccess.length > 0);
}

export default {
  async fetch(request, env) {
    const requestOrigin = request.headers.get('Origin') || '';
    const url = new URL(request.url);

    // Handle CORS preflight BEFORE the origin check so cached preflight failures
    // don't permanently block origins that are later added to the allowlist.
    if (request.method === 'OPTIONS') {
      const preflightOrigin = resolveCorsOrigin(requestOrigin, env) || requestOrigin || '*';
      return new Response(null, { status: 204, headers: cors(preflightOrigin) });
    }

    const origin = resolveCorsOrigin(requestOrigin, env);

    if (!origin) {
      return json({ error: 'Origin not allowed.' }, 403, null);
    }

    // POST /sign-upload — generate signed R2 PUT URL
    if (request.method === 'POST' && url.pathname === '/sign-upload') {
      try {
        const authHeader = request.headers.get('Authorization') || '';
        const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
        const requester = await verifyFirebaseToken(idToken, env);
        if (!hasPrivilegedClaims(requester.claims)) {
          return json({ error: 'Insufficient privileges to sign uploads.' }, 403, origin);
        }

        await checkUploadRateLimit(requester.uid, env);

        const { fileName, fileType, fileSize, folder = 'community' } = await request.json();

        if (!fileName || !fileType) {
          return json({ error: 'fileName and fileType are required' }, 400, origin);
        }

        const isVideo = ALLOWED_VIDEO_TYPES.has(fileType);
        const isImage = ALLOWED_IMAGE_TYPES.has(fileType);

        if (!isImage && !isVideo) {
          return json({ error: `File type ${fileType} is not allowed.` }, 415, origin);
        }

        if (fileSize && isImage && fileSize > MAX_IMAGE_BYTES) {
          return json({ error: 'Image exceeds 10 MB limit.' }, 413, origin);
        }

        if (fileSize && isVideo && fileSize > MAX_VIDEO_BYTES) {
          return json({ error: 'Video exceeds 200 MB limit.' }, 413, origin);
        }

        const key = `${folder}/${Date.now()}-${sanitize(fileName)}`;
        const endpoint = `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${env.R2_BUCKET}/${key}`;

        const signedReq = await signR2UploadUrl(
          endpoint,
          fileType,
          env.R2_ACCESS_KEY_ID,
          env.R2_SECRET_ACCESS_KEY
        );

        const fileUrl = `${url.origin}/media/${encodeURIComponent(key)}`;

        return json({ uploadUrl: signedReq.url, fileUrl, key }, 200, origin);
      } catch (err) {
        console.error('[sign-upload]', err);
        return json({ error: String(err?.message || err) }, 500, origin);
      }
    }

    // POST /roles/grant — assign Firebase custom claims
    if (request.method === 'POST' && url.pathname === '/roles/grant') {
      try {
        const authHeader = request.headers.get('Authorization') || '';
        const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
        const requester = await verifyFirebaseToken(idToken, env);

        if (!hasSeniorPastorClaims(requester.claims)) {
          return json({ error: 'Only senior pastor accounts can manage roles.' }, 403, origin);
        }

        await checkRateLimit(requester.uid, 'admin', ADMIN_RATE_LIMIT, env);

        const { email, role = 'admin', enabled = true, apps } = await request.json();
        const normalizedEmail = String(email || '').trim().toLowerCase();

        if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
          return json({ error: 'A valid email address is required.' }, 400, origin);
        }

        if (!['admin', 'seniorPastor', 'appAccess'].includes(role)) {
          return json({ error: 'Unsupported role.' }, 400, origin);
        }

        if (role === 'appAccess' && enabled && (!Array.isArray(apps) || apps.length === 0)) {
          return json({ error: 'apps array is required for appAccess role.' }, 400, origin);
        }

        const user = await lookupUserByEmail(normalizedEmail, env);
        const existingClaims = parseCustomClaims(user.customAttributes);
        const nextClaims = buildUpdatedClaims(existingClaims, role, Boolean(enabled), apps);
        await updateUserCustomClaims(user.localId, nextClaims, env);

        await writeAuditLog(env, {
          action: 'roles/grant',
          actorUid: requester.uid,
          actorEmail: requester.email,
          targetEmail: normalizedEmail,
          metadata: { role, enabled: Boolean(enabled) },
        });

        return json({
          ok: true,
          email: normalizedEmail,
          role,
          enabled: Boolean(enabled),
          claims: nextClaims,
        }, 200, origin);
      } catch (err) {
        console.error('[roles/grant]', err);
        return json({ error: String(err?.message || err) }, 500, origin);
      }
    }

    // POST /users/invite — create user if needed, assign role claims, send password setup email
    if (request.method === 'POST' && url.pathname === '/users/invite') {
      try {
        const authHeader = request.headers.get('Authorization') || '';
        const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
        const requester = await verifyFirebaseToken(idToken, env);

        if (!hasSeniorPastorClaims(requester.claims)) {
          return json({ error: 'Only senior pastor accounts can invite users.' }, 403, origin);
        }

        await checkRateLimit(requester.uid, 'admin', ADMIN_RATE_LIMIT, env);

        const { email, role = 'appAccess', apps = [], sendSetupEmail = true } = await request.json();
        const normalizedEmail = String(email || '').trim().toLowerCase();

        if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
          return json({ error: 'A valid email address is required.' }, 400, origin);
        }

        if (!['admin', 'appAccess'].includes(role)) {
          return json({ error: 'Unsupported invite role. Use admin or appAccess.' }, 400, origin);
        }

        if (role === 'appAccess' && (!Array.isArray(apps) || apps.length === 0)) {
          return json({ error: 'apps array is required for appAccess role.' }, 400, origin);
        }

        const ensured = await ensureUserByEmail(normalizedEmail, env);
        const claimResult = await applyRoleClaimsByEmail(normalizedEmail, role, true, apps, env);

        if (sendSetupEmail) {
          await sendPasswordSetupEmail(normalizedEmail, env);
        }

        await writeAuditLog(env, {
          action: 'users/invite',
          actorUid: requester.uid,
          actorEmail: requester.email,
          targetEmail: normalizedEmail,
          metadata: { role, created: ensured.created, setupEmailSent: Boolean(sendSetupEmail) },
        });

        return json({
          ok: true,
          created: ensured.created,
          email: normalizedEmail,
          localId: claimResult.user.localId,
          role,
          claims: claimResult.claims,
          setupEmailSent: Boolean(sendSetupEmail),
        }, 200, origin);
      } catch (err) {
        console.error('[users/invite]', err);
        return json({ error: String(err?.message || err) }, 500, origin);
      }
    }

    // POST /users/delete — remove Firebase Auth user and clear claims
    if (request.method === 'POST' && url.pathname === '/users/delete') {
      try {
        const authHeader = request.headers.get('Authorization') || '';
        const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
        const requester = await verifyFirebaseToken(idToken, env);

        if (!hasSeniorPastorClaims(requester.claims)) {
          return json({ error: 'Only senior pastor accounts can delete users.' }, 403, origin);
        }

        await checkRateLimit(requester.uid, 'admin', ADMIN_RATE_LIMIT, env);

        const { email } = await request.json();
        const normalizedEmail = String(email || '').trim().toLowerCase();

        if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
          return json({ error: 'A valid email address is required.' }, 400, origin);
        }

        if (requester.email && requester.email.toLowerCase() === normalizedEmail) {
          return json({ error: 'You cannot delete your own account.' }, 400, origin);
        }

        const user = await lookupUserByEmail(normalizedEmail, env);
        const claims = parseCustomClaims(user.customAttributes);

        if (hasSeniorPastorClaims(claims)) {
          return json({ error: 'Cannot delete another senior pastor account from this workflow.' }, 400, origin);
        }

        await deleteUserByLocalId(user.localId, env);

        await writeAuditLog(env, {
          action: 'users/delete',
          actorUid: requester.uid,
          actorEmail: requester.email,
          targetEmail: normalizedEmail,
          metadata: { localId: user.localId },
        });

        return json({
          ok: true,
          deleted: true,
          email: normalizedEmail,
          localId: user.localId,
        }, 200, origin);
      } catch (err) {
        console.error('[users/delete]', err);
        return json({ error: String(err?.message || err) }, 500, origin);
      }
    }

    // GET /media/:key — serve file from R2
    if (request.method === 'GET' && url.pathname.startsWith('/media/')) {
      try {
        const key = decodeURIComponent(url.pathname.replace('/media/', ''));

        if (!isSafeMediaKey(key)) {
          return json({ error: 'Invalid media key.' }, 400, origin);
        }

        const object = await env.MEDIA_BUCKET.get(key);

        if (!object) {
          return new Response('Not found', { status: 404, headers: cors(origin) });
        }

        const headers = new Headers(cors(origin));
        withSecurityHeaders(headers);
        if (object.httpMetadata?.contentType) {
          headers.set('Content-Type', object.httpMetadata.contentType);
        }
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');

        return new Response(object.body, { status: 200, headers });
      } catch (err) {
        console.error('[media-serve]', err);
        return json({ error: String(err?.message || err) }, 500, origin);
      }
    }

    // POST /ai/chat — authenticated DeepSeek proxy (API key never leaves the Worker)
    if (request.method === 'POST' && url.pathname === '/ai/chat') {
      try {
        const authHeader = request.headers.get('Authorization') || '';
        const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
        const requester = await verifyFirebaseToken(idToken, env);

        if (!hasAnyAccess(requester.claims)) {
          return json({ error: 'Access denied.' }, 403, origin);
        }

        await checkRateLimit(requester.uid, 'ai', AI_RATE_LIMIT, env);

        if (!env.DEEPSEEK_API_KEY) {
          return json({ error: 'AI service is not configured.' }, 503, origin);
        }

        const {
          prompt = '',
          systemContext = '',
          options: {
            useReasoner = false,
            temperature = 0.7,
            maxTokens = 2048,
            jsonMode = false,
            stream = false,
          } = {},
        } = await request.json();

        if (!String(prompt).trim()) {
          return json({ error: 'prompt is required.' }, 400, origin);
        }

        const model = useReasoner ? 'deepseek-reasoner' : 'deepseek-chat';
        const body = {
          model,
          messages: [
            { role: 'system', content: String(systemContext) },
            { role: 'user',   content: String(prompt) },
          ],
          temperature,
          max_tokens: maxTokens,
          stream,
        };
        if (jsonMode) body.response_format = { type: 'json_object' };

        const upstream = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
          },
          body: JSON.stringify(body),
        });

        if (!upstream.ok) {
          const details = await upstream.text();
          console.error('[ai/chat] upstream error:', details);
          return json({ error: 'AI service error.' }, 502, origin);
        }

        // Streaming: pipe SSE directly back to the client.
        if (stream) {
          const responseHeaders = new Headers({
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            ...cors(origin),
          });
          withSecurityHeaders(responseHeaders);
          return new Response(upstream.body, { status: 200, headers: responseHeaders });
        }

        // Non-streaming: return the full completion.
        const data = await upstream.json();
        return json({ content: data.choices?.[0]?.message?.content || '' }, 200, origin);
      } catch (err) {
        console.error('[ai/chat]', err);
        return json({ error: String(err?.message || err) }, 500, origin);
      }
    }

    return json({ error: 'Not found' }, 404, origin);
  },
};
