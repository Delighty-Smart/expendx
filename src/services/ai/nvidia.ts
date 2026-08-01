/**
 * NVIDIA NIM AI Service Client
 * Integration with free NVIDIA Build API endpoints (e.g. meta/llama-3.3-70b-instruct, nvidia/neva-22b, deepseek-ai/deepseek-r1, google/gemma-2-27b-it)
 */

const NVIDIA_API_KEY_STORAGE_KEY = 'nvidia_api_key';

export function getNvidiaApiKey(): string {
  return localStorage.getItem(NVIDIA_API_KEY_STORAGE_KEY) || import.meta.env.VITE_NVIDIA_API_KEY || '';
}

export function setNvidiaApiKey(key: string): void {
  if (key.trim()) {
    localStorage.setItem(NVIDIA_API_KEY_STORAGE_KEY, key.trim());
  } else {
    localStorage.removeItem(NVIDIA_API_KEY_STORAGE_KEY);
  }
}

export async function callNvidiaAI(
  messages: { role: string; content: string }[],
  model: string = 'meta/llama-3.3-70b-instruct'
): Promise<string> {
  const apiKey = getNvidiaApiKey();
  if (!apiKey) {
    throw new Error('NVIDIA API Key is missing. Please set VITE_NVIDIA_API_KEY in .env.');
  }

  // Model fallback stack for NVIDIA NIM
  const modelsToTry = Array.from(new Set([
    model,
    'meta/llama-3.3-70b-instruct',
    'deepseek-ai/deepseek-r1',
    'google/gemma-2-27b-it',
    'nvidia/llama-3.1-nemotron-70b-instruct'
  ]));

  let lastError = '';

  for (const targetModel of modelsToTry) {
    try {
      console.log(`[NVIDIA AI] Requesting NIM completion with model: ${targetModel}`);
      const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: targetModel,
          messages: messages,
          temperature: 0.6,
          top_p: 0.7,
          max_tokens: 1024,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const msg = errorData?.detail || errorData?.message || `HTTP Status ${response.status}`;
        console.warn(`[NVIDIA AI] Model ${targetModel} returned error: ${msg}`);
        lastError = msg;
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (content && content.trim()) {
        return content;
      }
    } catch (err: any) {
      console.error(`[NVIDIA AI] Fetch exception on model ${targetModel}:`, err);
      lastError = err?.message || 'Network request failed (Check CORS or API Key)';
    }
  }

  throw new Error(lastError || 'NVIDIA NIM models failed to respond. Please check your NVIDIA API key or try again.');
}
