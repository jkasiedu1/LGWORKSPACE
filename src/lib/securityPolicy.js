export const DEFAULT_SECURITY_SETTINGS = {
  is2FA: true,
  isDLP: true,
  isPII: true,
  isOptOut: true,
  isEndpoint: false,
};

export function normalizeSecuritySettings(settings = {}) {
  return {
    ...DEFAULT_SECURITY_SETTINGS,
    ...settings,
  };
}

export function redactSensitiveData(input) {
  const text = String(input || '');
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]')
    .replace(/\+?\d?[\d\s().-]{8,}\d/g, '[REDACTED_PHONE]')
    // Require a street-type suffix to avoid matching arbitrary numbers (e.g. "2 Samuel", "3 hours")
    .replace(/\b\d{1,5}\s+[a-zA-Z0-9.\s-]{2,}?\b(?:St(?:reet)?|Ave(?:nue)?|Blvd|Rd|Road|Dr(?:ive)?|Ln|Lane|Ct|Court|Pl(?:ace)?|Way|Pkwy|Hwy)\b[^\n]*/gi, '[REDACTED_ADDRESS]');
}

export function containsRestrictedData(input) {
  const text = String(input || '');

  const patterns = [
    /\b\d{3}-\d{2}-\d{4}\b/, // SSN
    /\b(?:\d[ -]*?){13,16}\b/, // likely card number
    /\b(?:cvv|cvc|security\s*code)\b/i,
  ];

  return patterns.some((pattern) => pattern.test(text));
}