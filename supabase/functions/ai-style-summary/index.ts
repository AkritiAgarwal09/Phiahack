import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SwipeLite {
  direction: "left" | "right" | "up" | "tap";
  target_title?: string | null;
  target_type?: string | null;
  vendor?: string | null;
  category?: string | null;
  tags?: string[] | null;
  price?: number | null;
}

interface DerivedLite {
  topCategories?: string[];
  colorPalette?: string[];
  aestheticClusters?: string[];
  priceTolerance?: string;
  boldMinimalScore?: number; // 0 minimal -> 100 bold
  casualFormalScore?: number; // 0 casual -> 100 formal
  brandAffinity?: string[];
  totalSwipes?: number;
  loveSwipes?: number;
}

function summarizeSwipes(swipes: SwipeLite[]) {
  const liked = swipes.filter((s) => s.direction === "right" || s.direction === "up");
  const passed = swipes.filter((s) => s.direction === "left");
  const lovedTitles = liked.slice(0, 24).map((s) => s.target_title).filter(Boolean);
  const passedTitles = passed.slice(0, 12).map((s) => s.target_title).filter(Boolean);
  return { lovedTitles, passedTitles, likedCount: liked.length, passedCount: passed.length };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { swipes = [], derived = {} } = (await req.json()) as {
      swipes: SwipeLite[];
      derived: DerivedLite;
    };

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const { lovedTitles, passedTitles, likedCount, passedCount } = summarizeSwipes(swipes);

    const userBlock = `
SWIPE STATS:
- Total swipes: ${derived.totalSwipes ?? swipes.length}
- Liked / super-liked: ${likedCount}
- Passed: ${passedCount}

DERIVED PROFILE:
- Top categories: ${(derived.topCategories || []).join(", ") || "—"}
- Color palette: ${(derived.colorPalette || []).join(", ") || "—"}
- Aesthetic clusters: ${(derived.aestheticClusters || []).join(", ") || "—"}
- Price tolerance: ${derived.priceTolerance || "mid"}
- Bold↔Minimal score (0 minimal → 100 bold): ${derived.boldMinimalScore ?? 50}
- Casual↔Formal score (0 casual → 100 formal): ${derived.casualFormalScore ?? 50}
- Brand affinity: ${(derived.brandAffinity || []).join(", ") || "—"}

LOVED TITLES (sample): ${lovedTitles.slice(0, 16).join(" · ") || "—"}
PASSED TITLES (sample): ${passedTitles.slice(0, 8).join(" · ") || "—"}
`.trim();

    const systemPrompt = `You are Phia, a sharp, warm AI fashion stylist.
Write a 2-sentence personal style summary in second person ("You ...") that is specific, observational, and elegant.
- Sentence 1: name the user's dominant aesthetic, palette, and silhouette tendencies.
- Sentence 2: name the price tolerance and one contextual leaning (work, evening, off-duty, vacation, going-out).
Avoid generic words like "fashionable" or "stylish". No hashtags, no emojis, no preamble — just the two sentences.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userBlock },
        ],
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await resp.text();
      console.error("AI gateway error:", resp.status, t);
      throw new Error("AI gateway error");
    }

    const data = await resp.json();
    const summary: string = data?.choices?.[0]?.message?.content?.trim() || "";

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-style-summary error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
