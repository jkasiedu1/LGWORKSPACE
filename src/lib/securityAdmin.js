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

export async function grantAdminAccess(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error('Email is required.');
  }

  if (!ROLE_ADMIN_API_URL) {
    throw new Error('Role admin API is not configured. Set VITE_ROLE_ADMIN_API_URL.');
  }

  const token = await auth?.currentUser?.getIdToken();
  if (!token) {
    throw new Error('You must be signed in to manage roles.');
  }

  let response;
  try {
    response = await fetch(ROLE_ADMIN_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email: normalizedEmail, role: 'admin', enabled: true }),
    });
  } catch (error) {
    const message = error?.message || '';
    throw new Error(
      `Role API network/CORS failure (${message || 'request failed'}). `
      + `Confirm Cloudflare ALLOWED_ORIGINS contains ${window.location.origin} and the worker is deployed.`
    );
  }

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Role grant failed (${response.status}): ${details}`);
  }

  return response.json();
}

export async function revokeAdminAccess(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error('Email is required.');
  }

  if (!ROLE_ADMIN_API_URL) {
    throw new Error('Role admin API is not configured. Set VITE_ROLE_ADMIN_API_URL.');
  }

  const token = await auth?.currentUser?.getIdToken();
  if (!token) {
    throw new Error('You must be signed in to manage roles.');
  }

  let response;
  try {
    response = await fetch(ROLE_ADMIN_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email: normalizedEmail, role: 'admin', enabled: false }),
    });
  } catch (error) {
    const message = error?.message || '';
    throw new Error(
      `Role API network/CORS failure (${message || 'request failed'}). `
      + `Confirm Cloudflare ALLOWED_ORIGINS contains ${window.location.origin} and the worker is deployed.`
    );
  }

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Role revoke failed (${response.status}): ${details}`);
  }

  return response.json();
}