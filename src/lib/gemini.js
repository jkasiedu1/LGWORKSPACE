import {
  containsRestrictedData,
  normalizeSecuritySettings,
  redactSensitiveData,
} from './securityPolicy';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.0-flash';
let securityPolicy = normalizeSecuritySettings();

export function configureGeminiPolicy(nextPolicy = {}) {
  securityPolicy = normalizeSecuritySettings(nextPolicy);
}

export const callGeminiAI = async (prompt, systemContext, policyOverride = null) => {
  const effectivePolicy = policyOverride
    ? normalizeSecuritySettings(policyOverride)
    : securityPolicy;

  if (!GEMINI_API_KEY) {
    return 'Gemini AI is not configured. Set VITE_GEMINI_API_KEY before using AI features.';
  }

  if (!effectivePolicy.isOptOut) {
    return 'AI usage is disabled by security policy. Enable LLM Training Opt-Out to use AI features.';
  }

  const nextPrompt = effectivePolicy.isPII ? redactSensitiveData(prompt) : String(prompt || '');
  const nextContext = effectivePolicy.isPII ? redactSensitiveData(systemContext) : String(systemContext || '');

  if (effectivePolicy.isDLP && containsRestrictedData(`${nextPrompt}\n${nextContext}`)) {
    return 'AI request blocked by DLP policy because sensitive data was detected.';
  }

  const retryFetch = async (url, options, retries = 5) => {
    let delay = 1000;
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(url, options);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return await res.json();
      } catch (e) {
        if (i === retries - 1) throw e;
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
      }
    }
  };

  try {
    const data = await retryFetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: nextPrompt }] }],
          systemInstruction: { parts: [{ text: nextContext }] }
        })
      }
    );
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Could not generate a response. Please try again.";
  } catch (error) {
    console.error("AI Error:", error);
    return "An error occurred while connecting to the AI services. Please check your connection.";
  }
};
