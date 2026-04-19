import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { CATALOG, shortlistCatalog, findById, type CatalogItem } from "./_catalog.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function memoryLines(memory: any): string[] {
  const mem = memory && typeof memory === "object" ? memory : {};
  const out: string[] = [];
  if (mem.budget) out.push(`- Budget: ${mem.budget}`);
  if (mem.style) out.push(`- Style: ${mem.style}`);
  if (Array.isArray(mem.brands) && mem.brands.length) out.push(`- Favorite brands: ${mem.brands.join(", ")}`);
  if (Array.isArray(mem.colors) && mem.colors.length) out.push(`- Favorite colors: ${mem.colors.join(", ")}`);
  return out;
}

function catalogTable(items: CatalogItem[]) {
  return items
    .map((p) => `${p.id} | ${p.title} | ${p.vendor} | $${p.price} | ${p.category} | ${p.tags.join(",")} | ${p.styles.join(",")}`)
    .join("\n");
}

function buildSystemPrompt(memory: any, items: CatalogItem[], swapMode = false) {
  const mem = memoryLines(memory);
  const memBlock = mem.length ? `\n\nUSER MEMORY (personalize accordingly):\n${mem.join("\n")}` : "";

  if (swapMode) {
    return `You are Phia, helping a user swap one item in an outfit.

Pick exactly ONE item from the candidate catalog below that best fits the user's swap request (same role, similar/lower price, fits style).

CANDIDATES (id | title | vendor | $price | category | tags | styles):
${catalogTable(items)}

Reply with a 1-sentence rationale, then a fenced \`\`\`cards block containing exactly one section with one item:

\`\`\`cards
[{ "title": "Swap pick", "kind": "section", "items": [{ "id": "<chosen-id>", "note": "why it works" }] }]
\`\`\`

Use ONLY ids from the candidates above.${memBlock}`;
  }

  return `You are Phia, an expert AI fashion concierge for the Phia Circle luxury platform.

Recommend products ONLY from the catalog slice below. Never invent SKUs.

CATALOG SLICE (id | title | vendor | $price | category | tags | styles):
${catalogTable(items)}

RESPONSE FORMAT:
1. Short conversational reply in markdown (2–4 sentences max). Warm, concise, light emoji.
2. Append ONE fenced \`\`\`cards block containing a JSON array of sections:

\`\`\`cards
[
  {
    "title": "Outfit Ideas",
    "kind": "section",
    "items": [
      { "id": "f-dress-1", "note": "Slinky base layer" },
      { "id": "f-top-1" }
    ]
  },
  {
    "title": "Budget Alternatives",
    "kind": "section",
    "items": [{ "id": "b-mk-1" }]
  }
]
\`\`\`

For OUTFIT BUILDS, use kind "outfit" and assign roles (top, bottom, shoes, accessory, layer, dress):

\`\`\`cards
[
  {
    "title": "Outfit 1 · Brunch",
    "kind": "outfit",
    "items": [
      { "id": "f-dress-1", "role": "dress" },
      { "id": "f-top-1", "role": "layer" },
      { "id": "a-bag-1", "role": "accessory" },
      { "id": "a-shoe-11", "role": "shoes" }
    ]
  }
]
\`\`\`

Rules:
- Use ONLY ids from the catalog slice above.
- 2–4 sections max, 2–6 items per section.
- Respect the user's budget memory when present.
- If non-fashion, gently redirect.${memBlock}`;
}

// Pull a quick text query from the most recent user message (used to score the catalog).
function lastUserText(messages: any[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m?.role === "user") {
      if (typeof m.content === "string") return m.content;
      if (Array.isArray(m.content)) {
        const t = m.content.find((c: any) => c.type === "text");
        if (t?.text) return t.text;
      }
      return "";
    }
  }
  return "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      messages = [],
      memory,
      imageDataUrl,
      // Swap-specific:
      swap,
    } = body as {
      messages: any[];
      memory?: any;
      imageDataUrl?: string;
      swap?: { excludeId: string; role?: string; priceMin?: number; priceMax?: number; intent?: string };
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // ===== SWAP path: non-streaming, returns JSON cards directly =====
    if (swap?.excludeId) {
      const excluded = findById(swap.excludeId);
      const candidates = shortlistCatalog({
        excludeId: swap.excludeId,
        role: swap.role,
        priceMin: swap.priceMin,
        priceMax: swap.priceMax ?? (excluded ? Math.ceil(excluded.price * 1.15) : undefined),
        styles: memory?.style ? [memory.style.split(/[\s\/]+/)[0].toLowerCase()] : [],
        budget: memory?.budget,
        query: swap.intent || (excluded?.title ?? ""),
        limit: 30,
      });

      if (candidates.length === 0) {
        return new Response(JSON.stringify({ error: "No matching alternatives found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const sysPrompt = buildSystemPrompt(memory, candidates, true);
      const userPrompt = `Original item: ${excluded?.title || swap.excludeId} (${excluded ? `$${excluded.price}` : "?"}, role: ${swap.role || "n/a"}). User wants: ${swap.intent || "a similar alternative"}. Pick one swap.`;

      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "system", content: sysPrompt }, { role: "user", content: userPrompt }],
        }),
      });

      if (!resp.ok) {
        if (resp.status === 429 || resp.status === 402) {
          return new Response(JSON.stringify({ error: resp.status === 429 ? "Rate limited" : "AI credits exhausted" }), {
            status: resp.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ error: "AI service unavailable" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await resp.json();
      const content = data?.choices?.[0]?.message?.content || "";
      // Try to extract id from cards block; fall back to first candidate
      const m = content.match(/```cards\s*\n([\s\S]*?)```/i);
      let pickedId: string | null = null;
      let note: string | undefined;
      if (m) {
        try {
          const arr = JSON.parse(m[1].trim());
          const it = arr?.[0]?.items?.[0];
          if (it?.id && candidates.find((c) => c.id === it.id)) {
            pickedId = it.id;
            note = it.note;
          }
        } catch { /* ignore */ }
      }
      if (!pickedId) pickedId = candidates[0].id;

      return new Response(JSON.stringify({ id: pickedId, note }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== Normal chat path: streaming =====
    const userQuery = lastUserText(messages);
    const styleSeed = memory?.style
      ? memory.style.split(/[\s\/]+/).map((s: string) => s.toLowerCase()).filter(Boolean)
      : [];

    const slice = shortlistCatalog({
      query: userQuery,
      styles: styleSeed,
      budget: memory?.budget,
      limit: 50,
    });
    // Always include some staples from each category so the model can build outfits
    const ensureCats: ("fashion"|"accessories"|"beauty"|"home")[] = ["fashion", "accessories"];
    for (const c of ensureCats) {
      if (!slice.some((p) => p.category === c)) {
        const extra = CATALOG.filter((p) => p.category === c).slice(0, 6);
        slice.push(...extra);
      }
    }

    let outboundMessages = Array.isArray(messages) ? [...messages] : [];
    if (imageDataUrl && outboundMessages.length > 0) {
      const lastIdx = outboundMessages.length - 1;
      const last = outboundMessages[lastIdx];
      if (last?.role === "user") {
        outboundMessages[lastIdx] = {
          role: "user",
          content: [
            { type: "text", text: typeof last.content === "string" && last.content.trim() ? last.content : "Find styles like this image. Return Closest Matches, Same Vibe Cheaper, and Complete the Outfit sections." },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ],
        };
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: buildSystemPrompt(memory, slice, false) },
          ...outboundMessages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("concierge error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
