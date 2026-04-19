import { useMemo, useState } from "react";
import { Wand2, Sparkles, ShoppingBag, RefreshCw } from "lucide-react";
import { localProducts } from "@/data/shopProducts";
import { useCartStore } from "@/stores/cartStore";
import { toast } from "sonner";
import type { DerivedStyle } from "@/lib/styleProfile";

interface Props {
  derived: DerivedStyle;
}

interface BuiltOutfit {
  id: string;
  title: string;
  vibe: string;
  items: {
    product: any;
    title: string;
    image: string;
    price: number;
    role: string;
  }[];
  total: number;
  matchedSignals: string[];
}

const ROLE_BUCKETS: Record<string, string[]> = {
  top: ["top", "blouse", "shirt", "tee", "knit", "sweater"],
  bottom: ["bottom", "pants", "skirt", "denim", "trouser", "jean"],
  dress: ["dress", "gown", "jumpsuit"],
  outer: ["jacket", "coat", "blazer", "trench", "outer"],
  shoes: ["shoes", "heels", "sneaker", "boot", "loafer", "sandal"],
  bag: ["bag", "handbag", "tote", "clutch"],
  accessory: ["jewelry", "sunglasses", "belt", "scarf", "accessory"],
};

function matchRole(p: any): string | null {
  const hay = `${p.node.productType || ""} ${(p.node.tags || []).join(" ")} ${p.node.title}`.toLowerCase();
  for (const [role, kws] of Object.entries(ROLE_BUCKETS)) {
    if (kws.some((k) => hay.includes(k))) return role;
  }
  return null;
}

const TEMPLATES: { title: string; vibe: string; roles: string[] }[] = [
  { title: "Day-to-night essentials", vibe: "Effortless layers that pivot from coffee to cocktails.", roles: ["top", "bottom", "shoes", "bag"] },
  { title: "Statement evening look", vibe: "One-and-done dress with elevated finishing touches.", roles: ["dress", "shoes", "bag", "accessory"] },
  { title: "Polished weekend uniform", vibe: "Easy outerwear over a strong silhouette.", roles: ["outer", "top", "bottom", "shoes"] },
];

function scoreProduct(p: any, derived: DerivedStyle): number {
  let score = 0;
  const tags: string[] = (p.node.tags || []).map((t: string) => t.toLowerCase());
  const cat = (p.node.productType || "").toLowerCase();
  const title = p.node.title.toLowerCase();

  derived.topCategories.forEach((c) => {
    if (cat.includes(c.toLowerCase()) || title.includes(c.toLowerCase())) score += 3;
  });
  derived.aestheticClusters.forEach((a) => {
    if (tags.includes(a.toLowerCase())) score += 4;
  });
  derived.colorPalette.forEach((col) => {
    if (tags.includes(col.toLowerCase()) || title.includes(col.toLowerCase())) score += 2;
  });
  derived.brandAffinity.forEach((b) => {
    if (p.node.vendor?.toLowerCase() === b.toLowerCase()) score += 2;
  });
  return score;
}

function buildOutfits(budget: number, derived: DerivedStyle): BuiltOutfit[] {
  const scored = localProducts
    .map((p) => ({
      p,
      role: matchRole(p),
      price: parseFloat(p.node.priceRange.minVariantPrice.amount),
      score: scoreProduct(p, derived),
    }))
    .filter((x) => x.role && x.price > 0)
    .sort((a, b) => b.score - a.score || a.price - b.price);

  return TEMPLATES.map((tpl, idx) => {
    const used = new Set<string>();
    const items: BuiltOutfit["items"] = [];
    let runningTotal = 0;
    const targetPerRole = budget / tpl.roles.length;
    const matchedSignals = new Set<string>();

    for (const role of tpl.roles) {
      // Pick best-scoring unused item in role within remaining budget
      const candidates = scored.filter(
        (x) => x.role === role && !used.has(x.p.node.id) && runningTotal + x.price <= budget
      );
      if (!candidates.length) continue;

      // Prefer items near the per-role target to balance the bundle, but skewed by score
      candidates.sort((a, b) => {
        const sa = b.score - a.score;
        if (sa !== 0) return sa;
        return Math.abs(a.price - targetPerRole) - Math.abs(b.price - targetPerRole);
      });
      // Skip the first idx items so each outfit feels distinct
      const pick = candidates[Math.min(idx, candidates.length - 1)];
      if (!pick) continue;

      used.add(pick.p.node.id);
      runningTotal += pick.price;
      items.push({
        product: pick.p,
        title: pick.p.node.title,
        image: pick.p.node.images.edges[0]?.node.url || "",
        price: pick.price,
        role,
      });

      // Track which signal matched
      const tags: string[] = (pick.p.node.tags || []).map((t: string) => t.toLowerCase());
      derived.aestheticClusters.forEach((a) => tags.includes(a.toLowerCase()) && matchedSignals.add(a));
      derived.colorPalette.forEach((c) => tags.includes(c.toLowerCase()) && matchedSignals.add(c));
    }

    return {
      id: `built-${idx}`,
      title: tpl.title,
      vibe: tpl.vibe,
      items,
      total: runningTotal,
      matchedSignals: Array.from(matchedSignals).slice(0, 4),
    };
  }).filter((o) => o.items.length >= 2);
}

const BUDGET_OPTIONS = [200, 500, 1000, 2000];

const OutfitBuilder = ({ derived }: Props) => {
  const [budget, setBudget] = useState<number>(500);
  const [seed, setSeed] = useState(0);
  const addToCart = useCartStore((s) => s.addItem);

  const outfits = useMemo(() => buildOutfits(budget, derived), [budget, derived, seed]);

  const handleShopOutfit = async (outfit: BuiltOutfit) => {
    for (const item of outfit.items) {
      const variant = item.product.node.variants.edges[0]?.node;
      if (!variant) continue;
      await addToCart({
        product: item.product,
        variantId: variant.id,
        variantTitle: variant.title,
        price: variant.price,
        quantity: 1,
        selectedOptions: variant.selectedOptions,
      });
    }
    toast.success(`Added ${outfit.items.length} pieces to your cart`, {
      description: outfit.title,
    });
  };

  if (derived.totalSwipes === 0) {
    return (
      <section className="rounded-2xl border border-border bg-card p-6 text-center">
        <Wand2 className="mx-auto h-6 w-6 text-primary/60" />
        <p className="mt-2 text-sm text-muted-foreground">
          Swipe a few cards in Studio first — Phia needs taste signals to build outfits for you.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            <Wand2 className="h-3 w-3" /> Autonomous outfits
          </p>
          <h2 className="mt-2 font-serif text-2xl text-foreground">AI-built bundles for you</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Three full looks under your budget — composed from your top categories, colors and aesthetic.
          </p>
        </div>
        <button
          onClick={() => setSeed((s) => s + 1)}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-semibold text-foreground hover:border-primary/40"
        >
          <RefreshCw className="h-3 w-3" /> Reshuffle
        </button>
      </div>

      {/* Budget chips */}
      <div className="flex flex-wrap gap-2">
        {BUDGET_OPTIONS.map((b) => (
          <button
            key={b}
            onClick={() => setBudget(b)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              budget === b
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:border-primary/40"
            }`}
          >
            Under ${b}
          </button>
        ))}
      </div>

      {/* Outfits */}
      {outfits.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No outfits fit under ${budget}. Try a higher budget.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {outfits.map((outfit) => (
            <article
              key={outfit.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary/40"
            >
              <div className="grid grid-cols-2 gap-px bg-border">
                {outfit.items.slice(0, 4).map((item) => (
                  <div key={item.product.node.id} className="aspect-square bg-secondary">
                    {item.image && (
                      <img src={item.image} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                    {outfit.items.length} pieces
                  </p>
                  <h3 className="mt-1 font-serif text-lg text-foreground">{outfit.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{outfit.vibe}</p>
                </div>

                {outfit.matchedSignals.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {outfit.matchedSignals.map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
                      >
                        <Sparkles className="h-2.5 w-2.5" />
                        {s}
                      </span>
                    ))}
                  </div>
                )}

                <ul className="space-y-1 text-[11px] text-muted-foreground">
                  {outfit.items.map((item) => (
                    <li key={item.product.node.id} className="flex items-center justify-between gap-2">
                      <span className="truncate">
                        <span className="uppercase tracking-wider text-foreground/70">{item.role}</span>{" "}
                        · {item.title}
                      </span>
                      <span className="shrink-0 font-semibold text-foreground">
                        ${Math.round(item.price)}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</p>
                    <p className="font-serif text-xl text-foreground">${Math.round(outfit.total)}</p>
                  </div>
                  <button
                    onClick={() => handleShopOutfit(outfit)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-[11px] font-semibold text-primary-foreground hover:opacity-90"
                  >
                    <ShoppingBag className="h-3 w-3" /> Shop the look
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default OutfitBuilder;
