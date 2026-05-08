const CLAIM_KEYS = {
  admin: ['admin', 'isAdmin'],
  seniorPastor: ['seniorPastor', 'isSeniorPastor'],
};

function hasTruthyClaim(claims, keys) {
  return keys.some((key) => Boolean(claims?.[key]));
}

export function resolveRoleAccess(email, claims = {}) {
  const claimsSeniorPastor = hasTruthyClaim(claims, CLAIM_KEYS.seniorPastor);
  const claimsAdmin = hasTruthyClaim(claims, CLAIM_KEYS.admin);

  // In production, privilege must come from verified custom claims only.
  // We intentionally do not grant access based on email allowlists.
  const isSeniorPastor = claimsSeniorPastor;
  const isAdmin = isSeniorPastor || claimsAdmin;

  return { isSeniorPastor, isAdmin };
}
