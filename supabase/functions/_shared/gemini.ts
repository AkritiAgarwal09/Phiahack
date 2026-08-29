export const GEMINI_CHAT_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

export const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash";

const FAILOVER_STATUSES = new Set([401, 403, 408, 429, 402, 500, 502, 503, 504]);

export function getGeminiApiKeys() {
  const named = [
    Deno.env.get("GEMINI_API_KEY"),
    Deno.env.get("GEMINI_API_KEY_2"),
    Deno.env.get("GEMINI_API_KEY_3"),
  ];
  const csv = (Deno.env.get("GEMINI_API_KEYS") ?? "")
    .split(/[,;\s]+/)
    .map((k) => k.trim());

  const keys = [...named, ...csv].filter((k): k is string => !!k);
  const unique = [...new Set(keys)];
  if (unique.length === 0) {
    throw new Error(
      "No Gemini keys configured. Set GEMINI_API_KEY, GEMINI_API_KEY_2, and GEMINI_API_KEY_3 in Edge Function secrets.",
    );
  }
  return unique;
}

function geminiHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

function shouldFailover(status: number, bodyText: string) {
  if (FAILOVER_STATUSES.has(status)) return true;
  const t = bodyText.toLowerCase();
  return (
    t.includes("quota") ||
    t.includes("rate limit") ||
    t.includes("resource_exhausted") ||
    t.includes("api key not valid") ||
    t.includes("permission_denied")
  );
}

/** Tries GEMINI_API_KEY, then _2, then _3 (and GEMINI_API_KEYS) until one succeeds. */
export async function fetchGeminiChat(payload: Record<string, unknown>) {
  const keys = getGeminiApiKeys();
  const body = JSON.stringify({ model: GEMINI_MODEL, ...payload });
  let last: Response | null = null;

  for (let i = 0; i < keys.length; i++) {
    const keyIndex = i + 1;
    try {
      const resp = await fetch(GEMINI_CHAT_URL, {
        method: "POST",
        headers: geminiHeaders(keys[i]),
        body,
      });

      if (resp.ok) {
        if (i > 0) console.log(`Gemini key ${keyIndex} succeeded after failover`);
        return resp;
      }

      const errText = await resp.text();
      console.error(`Gemini key ${keyIndex} failed: ${resp.status} ${errText.slice(0, 300)}`);
      last = new Response(errText, { status: resp.status, headers: resp.headers });

      const canRetry = i < keys.length - 1 && shouldFailover(resp.status, errText);
      if (!canRetry) return last;
    } catch (e) {
      console.error(`Gemini key ${keyIndex} network error:`, e);
      if (i === keys.length - 1) throw e;
    }
  }

  return last!;
}
