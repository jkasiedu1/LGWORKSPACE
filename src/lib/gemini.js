import { auth } from '../config/firebase';
import {
  containsRestrictedData,
  normalizeSecuritySettings,
  redactSensitiveData,
} from './securityPolicy';

// AI calls are routed through the Cloudflare Worker so the DeepSeek API key
// never appears in the browser bundle (OWASP A02 / CWE-312).
const WORKER_BASE_URL = (import.meta.env.VITE_WORKER_BASE_URL || '').replace(/\/$/, '');

let securityPolicy = normalizeSecuritySettings();

export function configureAIPolicy(nextPolicy = {}) {
  securityPolicy = normalizeSecuritySettings(nextPolicy);
}

// Legacy alias — existing callers continue to work without changes
export const configureGeminiPolicy = configureAIPolicy;

/**
 * Call DeepSeek AI via the authenticated Worker proxy.
 *
 * @param {string}      prompt          - User-facing prompt text.
 * @param {string}      systemContext   - System instruction / persona.
 * @param {object|null} policyOverride  - Optional security policy override.
 * @param {object}      options
 * @param {boolean}     options.useReasoner  - Use deepseek-reasoner (R1) for complex analytical tasks.
 * @param {number}      options.temperature  - Sampling temperature (0–2). Default 0.7.
 * @param {number}      options.maxTokens    - Max completion tokens. Default 2048.
 * @param {boolean}     options.jsonMode     - Request a JSON object response.
 * @param {Function}    options.onStream     - Streaming callback (delta, fullTextSoFar) => void.
 */
export const callAI = async (prompt, systemContext, policyOverride = null, options = {}) => {
  const effectivePolicy = policyOverride
    ? normalizeSecuritySettings(policyOverride)
    : securityPolicy;

  if (!WORKER_BASE_URL) {
    return 'AI service is not configured. Set VITE_WORKER_BASE_URL before using AI features.';
  }

  if (!effectivePolicy.isOptOut) {
    return 'AI usage is disabled by security policy. Enable LLM Training Opt-Out to use AI features.';
  }

  const nextPrompt = effectivePolicy.isPII ? redactSensitiveData(prompt) : String(prompt || '');
  const nextContext = effectivePolicy.isPII ? redactSensitiveData(systemContext) : String(systemContext || '');

  if (effectivePolicy.isDLP && containsRestrictedData(`${nextPrompt}\n${nextContext}`)) {
    return 'AI request blocked by DLP policy because sensitive data was detected.';
  }

  const {
    useReasoner = false,
    temperature = 0.7,
    maxTokens = 2048,
    jsonMode = false,
    onStream = null,
  } = options;

  // Obtain the current user's Firebase ID token to authenticate with the Worker.
  const idToken = await auth?.currentUser?.getIdToken();
  if (!idToken) {
    return 'AI features require you to be signed in.';
  }

  const retryFetch = async (url, fetchOptions, retries = 5) => {
    let delay = 1000;
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(url, fetchOptions);
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`HTTP ${res.status}: ${errText}`);
        }
        return res;
      } catch (e) {
        if (i === retries - 1) throw e;
        await new Promise((r) => setTimeout(r, delay));
        delay = Math.min(delay * 2, 16000);
      }
    }
  };

  try {
    const response = await retryFetch(
      `${WORKER_BASE_URL}/ai/chat`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          prompt: nextPrompt,
          systemContext: nextContext,
          options: { useReasoner, temperature, maxTokens, jsonMode, stream: Boolean(onStream) },
        }),
      }
    );

    // ── Streaming path ────────────────────────────────────────────────────
    if (onStream) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk
          .split('\n')
          .filter((l) => l.startsWith('data: ') && !l.includes('[DONE]'));

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line.slice(6));
            const delta = parsed.choices?.[0]?.delta?.content || '';
            if (delta) {
              fullText += delta;
              onStream(delta, fullText);
            }
          } catch {
            // skip malformed SSE lines
          }
        }
      }
      return fullText;
    }

    // ── Non-streaming path ────────────────────────────────────────────────
    const data = await response.json();
    return data.content || 'Could not generate a response. Please try again.';
  } catch (error) {
    console.error('[AI Error]', error);
    return 'An error occurred while connecting to the AI service. Please check your connection.';
  }
};

// Legacy alias — existing callers continue to work without changes
export const callGeminiAI = callAI;
