import { auth } from '../config/firebase';

function deriveRoleAdminUrl() {
  const explicitUrl = import.meta.env.VITE_ROLE_ADMIN_API_URL;
  if (explicitUrl) return explicitUrl;

  const signerUrl = import.meta.env.VITE_R2_SIGNER_URL;
  if (!signerUrl) return '';

  try {
    const url = new URL(signerUrl);
    url.pathname = '/roles/grant';
    url.search = '';
    return url.toString();
  } catch {
    return '';
  }
}

const ROLE_ADMIN_API_URL = deriveRoleAdminUrl();

function deriveUserAdminBaseUrl() {
  const explicitBaseUrl = import.meta.env.VITE_USER_ADMIN_API_BASE_URL;
  if (explicitBaseUrl) return explicitBaseUrl;

  const signerUrl = import.meta.env.VITE_R2_SIGNER_URL;
  if (!signerUrl) return '';

  try {
    const url = new URL(signerUrl);
    url.pathname = '/users';
    url.search = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return '';
  }
}

const USER_ADMIN_BASE_URL = deriveUserAdminBaseUrl();

async function getAuthToken() {
  const token = await auth?.currentUser?.getIdToken();
  if (!token) {
    throw new Error('You must be signed in to manage users and roles.');
  }
  return token;
}

async function postWithAuth(url, body, networkLabel, failureLabel) {
  const token = await getAuthToken();

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    const message = error?.message || '';
    throw new Error(
      `${networkLabel} (${message || 'request failed'}). `
      + `Confirm Cloudflare ALLOWED_ORIGINS contains ${window.location.origin} and the worker is deployed.`
    );
  }

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`${failureLabel} (${response.status}): ${details}`);
  }

  return response.json();
}

export async function grantAdminAccess(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error('Email is required.');
  }

  if (!ROLE_ADMIN_API_URL) {
    throw new Error('Role admin API is not configured. Set VITE_ROLE_ADMIN_API_URL.');
  }

  return postWithAuth(
    ROLE_ADMIN_API_URL,
    { email: normalizedEmail, role: 'admin', enabled: true },
    'Role API network/CORS failure',
    'Role grant failed'
  );
}

export async function grantAppAccess(email, apps) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error('Email is required.');
  }

  if (!Array.isArray(apps) || apps.length === 0) {
    throw new Error('At least one app must be selected.');
  }

  if (!ROLE_ADMIN_API_URL) {
    throw new Error('Role admin API is not configured. Set VITE_ROLE_ADMIN_API_URL.');
  }

  return postWithAuth(
    ROLE_ADMIN_API_URL,
    { email: normalizedEmail, role: 'appAccess', apps, enabled: true },
    'Role API network/CORS failure',
    'App access grant failed'
  );
}

export async function revokeAppAccess(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error('Email is required.');
  }

  if (!ROLE_ADMIN_API_URL) {
    throw new Error('Role admin API is not configured. Set VITE_ROLE_ADMIN_API_URL.');
  }

  return postWithAuth(
    ROLE_ADMIN_API_URL,
    { email: normalizedEmail, role: 'appAccess', enabled: false },
    'Role API network/CORS failure',
    'App access revoke failed'
  );
}

export async function revokeAdminAccess(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error('Email is required.');
  }

  if (!ROLE_ADMIN_API_URL) {
    throw new Error('Role admin API is not configured. Set VITE_ROLE_ADMIN_API_URL.');
  }

  return postWithAuth(
    ROLE_ADMIN_API_URL,
    { email: normalizedEmail, role: 'admin', enabled: false },
    'Role API network/CORS failure',
    'Role revoke failed'
  );
}

export async function inviteUser({ email, role = 'appAccess', apps = [], sendSetupEmail = true }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error('Email is required.');
  }

  if (!['admin', 'appAccess'].includes(role)) {
    throw new Error('Unsupported invite role.');
  }

  if (role === 'appAccess' && (!Array.isArray(apps) || apps.length === 0)) {
    throw new Error('Select at least one app for app-scoped users.');
  }

  if (!USER_ADMIN_BASE_URL) {
    throw new Error('User admin API is not configured. Set VITE_USER_ADMIN_API_BASE_URL or VITE_R2_SIGNER_URL.');
  }

  return postWithAuth(
    `${USER_ADMIN_BASE_URL}/invite`,
    { email: normalizedEmail, role, apps, sendSetupEmail: Boolean(sendSetupEmail) },
    'User invite API network/CORS failure',
    'User invite failed'
  );
}

export async function deleteUserByEmail(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error('Email is required.');
  }

  if (!USER_ADMIN_BASE_URL) {
    throw new Error('User admin API is not configured. Set VITE_USER_ADMIN_API_BASE_URL or VITE_R2_SIGNER_URL.');
  }

  return postWithAuth(
    `${USER_ADMIN_BASE_URL}/delete`,
    { email: normalizedEmail },
    'User delete API network/CORS failure',
    'Delete user failed'
  );
}