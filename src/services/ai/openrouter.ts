/**
 * OpenRouter AI Service Client
 * Dynamic free model dispatcher using OpenRouter Auto-Router & fallback chain
 */

const OPENROUTER_API_KEY_STORAGE_KEY = 'openrouter_api_key';

export function getOpenRouterApiKey(): string {
  return localStorage.getItem(OPENROUTER_API_KEY_STORAGE_KEY) || import.meta.env.VITE_OPENROUTER_API_KEY || '';
}

export function setOpenRouterApiKey(key: string): void {
  if (key.trim()) {
    localStorage.setItem(OPENROUTER_API_KEY_STORAGE_KEY, key.trim());
  } else {
    localStorage.removeItem(OPENROUTER_API_KEY_STORAGE_KEY);
  }
}

/**
 * Dynamically fetches currently active free model IDs directly from OpenRouter API
 */
async function fetchActiveFreeModels(): Promise<string[]> {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models');
    if (!res.ok) return [];
    const json = await res.json();
    const freeModels: string[] = (json?.data || [])
      .filter((m: any) => m.pricing?.prompt === '0' || m.id.endsWith(':free'))
      .map((m: any) => m.id);
    console.log(`[OpenRouter] Found ${freeModels.length} active free models:`, freeModels.slice(0, 5));
    return freeModels;
  } catch {
    return [];
  }
}

export async function callOpenRouter(
  messages: { role: string; content: string }[],
  primaryModel: string = 'openrouter/free'
): Promise<string> {
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    throw new Error('OpenRouter API key is missing. Please enter your OpenRouter key in Settings → OpenRouter Cloud AI.');
  }

  // 1. Try 'openrouter/free' auto-router first
  // 2. Fetch active free model IDs directly from OpenRouter API
  // 1. Try requested primary model or OpenRouter free models
  const dynamicFreeModels = await fetchActiveFreeModels();
  const modelsToTry = Array.from(new Set([
    primaryModel,
    'meta-llama/llama-3.3-70b-instruct:free',
    'deepseek/deepseek-r1:free',
    'nvidia/llama-3.1-nemotron-70b-instruct:free',
    'openrouter/free',
    ...dynamicFreeModels,
    'google/gemma-2-9b-it:free',
    'meta-llama/llama-3.2-3b-instruct:free',
  ]));

  let lastError = '';

  for (const model of modelsToTry) {
    try {
      console.log(`[OpenRouter] Requesting cloud completion with model: ${model}`);
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Lucent AI Companion',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          temperature: 0.7,
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const msg = errorData?.error?.message || `Status ${response.status}`;
        console.warn(`[OpenRouter] Model ${model} returned error: ${msg}`);
        lastError = msg;
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (content && content.trim()) {
        return content;
      }
    } catch (err: any) {
      console.warn(`[OpenRouter] Fetch error on model ${model}:`, err);
      lastError = err?.message || 'Network error';
    }
  }

  throw new Error(lastError || 'All free cloud models failed to respond. Please check your OpenRouter API key quota or try again in a moment.');
}
