const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export const callGeminiAI = async (prompt, systemContext) => {
  if (!GEMINI_API_KEY) {
    return 'Gemini AI is not configured. Set VITE_GEMINI_API_KEY before using AI features.';
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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          systemInstruction: { parts: [{ text: systemContext }] }
        })
      }
    );
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Could not generate a response. Please try again.";
  } catch (error) {
    console.error("AI Error:", error);
    return "An error occurred while connecting to the AI services. Please check your connection.";
  }
};
