import { ADMIN_EMAILS, SENIOR_PASTOR_EMAIL } from './roles';

const CLAIM_KEYS = {
  admin: ['admin', 'isAdmin'],
  seniorPastor: ['seniorPastor', 'isSeniorPastor'],
};

function hasTruthyClaim(claims, keys) {
  return keys.some((key) => Boolean(claims?.[key]));
}

export function resolveRoleAccess(email, claims = {}) {
  const lowerEmail = String(email || '').toLowerCase();

  const claimsSeniorPastor = hasTruthyClaim(claims, CLAIM_KEYS.seniorPastor);
  const claimsAdmin = hasTruthyClaim(claims, CLAIM_KEYS.admin);

  const fallbackSeniorPastor = lowerEmail === SENIOR_PASTOR_EMAIL.toLowerCase();
  const fallbackAdmin = ADMIN_EMAILS.map((item) => item.toLowerCase()).includes(lowerEmail);

  const isSeniorPastor = claimsSeniorPastor || fallbackSeniorPastor;
  const isAdmin = isSeniorPastor || claimsAdmin || fallbackAdmin;

  return { isSeniorPastor, isAdmin };
}
