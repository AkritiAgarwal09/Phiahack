// Helpers for the swipe studio: builds the personalized swipe deck and
// maps onboarding/outfit cards into SwipeDeck-compatible cards.
import type { SwipeDeckCard } from "@/components/swipe/SwipeDeck";
import type { OnboardingCard } from "@/data/onboardingDeck";
import { OUTFIT_BUNDLES, type OutfitBundle } from "@/data/outfitBundles";
import { localProducts } from "@/data/shopProducts";
import type { SwipeEventInput, SwipeTargetType } from "@/services/swipeService";

export interface StudioCard extends SwipeDeckCard {
  // Information needed to log a swipe back to swipe_events
  source: {
    target_type: SwipeTargetType;
    target_id: string;
    target_title: string;
    target_image: string | null;
    vendor: string | null;
    category: string | null;
    tags: string[];
    price: number | null;
  };
}

export function onboardingToStudio(card: OnboardingCard): StudioCard {
  const targetType: SwipeTargetType =
    card.kind === "product"
      ? "product"
      : card.kind === "outfit"
      ? "outfit"
      : (card.kind as SwipeTargetType);
  return {
    id: `${card.kind}:${card.id}`,
    title: card.title,
    subtitle: card.subtitle,
    image: card.image,
    meta: card.vendor || (card.kind !== "product" ? card.kind.toUpperCase() : undefined),
    pricePill: card.price ? `$${Math.round(card.price)}` : card.kind === "outfit" ? "Outfit" : undefined,
    badge: card.kind === "aesthetic" ? "Aesthetic" : card.kind === "color" ? "Palette" : undefined,
    source: {
      target_type: targetType,
      target_id: card.id,
      target_title: card.title,
      target_image: card.image || null,
      vendor: card.vendor || null,
      category: card.category || null,
      tags: card.tags || [],
      price: card.price ?? null,
    },
  };
}

export function bundleToStudio(b: OutfitBundle): StudioCard {
  const items = b.items
    .map((it) => localProducts.find((p) => p.node.id === it.id))
    .filter(Boolean) as typeof localProducts;
  const total = items.reduce(
    (s, p) => s + Number(p.node.priceRange.minVariantPrice.amount),
    0
  );
  return {
    id: `outfit:${b.id}`,
    title: b.title,
    subtitle: b.vibe,
    image: b.hero,
    meta: b.occasion,
    pricePill: total ? `Outfit · $${Math.round(total)}` : "Outfit",
    badge: "Full Look",
    extra: items.length ? (
      <ItemThumbStrip
        items={items.slice(0, 4).map((p) => ({
          id: p.node.id,
          title: p.node.title,
          image: p.node.images.edges[0]?.node?.url || "",
        }))}
      />
    ) : undefined,
    source: {
      target_type: "outfit",
      target_id: b.id,
      target_title: b.title,
      target_image: b.hero,
      vendor: null,
      category: "outfit",
      tags: b.tags,
      price: total || null,
    },
  };
}

function ItemThumbStrip({
  items,
}: {
  items: { id: string; title: string; image: string }[];
}) {
  return (
    <div className="flex gap-1.5">
      {items.map((it) =>
        it.image ? (
          <div
            key={it.id}
            className="h-10 w-10 overflow-hidden rounded-md border border-white/30 bg-white/10"
            title={it.title}
          >
            <img src={it.image} alt={it.title} className="h-full w-full object-cover" />
          </div>
        ) : null
      )}
    </div>
  );
}

export function productToStudio(p: typeof localProducts[number]): StudioCard {
  const node = p.node;
  return {
    id: `product:${node.id}`,
    title: node.title,
    subtitle: node.vendor,
    image: node.images.edges[0]?.node?.url || "",
    meta: node.vendor,
    pricePill: `$${Math.round(Number(node.priceRange.minVariantPrice.amount))}`,
    source: {
      target_type: "product",
      target_id: node.id,
      target_title: node.title,
      target_image: node.images.edges[0]?.node?.url || null,
      vendor: node.vendor,
      category: node.productType,
      tags: node.tags,
      price: Number(node.priceRange.minVariantPrice.amount),
    },
  };
}

// Build a personalized Swipe Studio deck from the user's derived style profile.
export function buildStudioDeck(opts: {
  topCategories: string[];
  aestheticClusters: string[];
  brandAffinity: string[];
  recentTargetIds: string[]; // skip these so the deck stays fresh
  size?: number;
}): StudioCard[] {
  const { topCategories, aestheticClusters, brandAffinity, recentTargetIds, size = 30 } = opts;
  const seen = new Set(recentTargetIds);

  // Score products against the user
  const scored = localProducts
    .filter((p) => !seen.has(p.node.id))
    .map((p) => {
      let score = 0;
      const node = p.node;
      const cat = (node.productType || "").toLowerCase();
      const tags = (node.tags || []).map((t) => t.toLowerCase());
      if (topCategories.some((c) => cat.includes(c.toLowerCase()))) score += 3;
      if (brandAffinity.some((b) => node.vendor.toLowerCase().includes(b.toLowerCase()))) score += 2;
      for (const a of aestheticClusters) {
        if (tags.includes(a.toLowerCase())) score += 2;
      }
      // small randomization so two sessions feel different
      score += Math.random() * 0.8;
      return { p, score };
    })
    .sort((a, b) => b.score - a.score);

  const productCards = scored.slice(0, size - 6).map((s) => productToStudio(s.p));

  // Mix in a handful of outfit bundles, prioritised by aesthetic match
  const bundles = [...OUTFIT_BUNDLES]
    .map((b) => {
      let score = 0;
      for (const a of aestheticClusters) if (b.styles.includes(a)) score += 2;
      score += Math.random();
      return { b, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((s) => bundleToStudio(s.b));

  // Interleave: product, product, outfit, repeat
  const out: StudioCard[] = [];
  let pi = 0,
    bi = 0;
  while (pi < productCards.length || bi < bundles.length) {
    for (let k = 0; k < 2 && pi < productCards.length; k++) out.push(productCards[pi++]);
    if (bi < bundles.length) out.push(bundles[bi++]);
  }
  return out.slice(0, size);
}

// Build the swipeInput from a StudioCard and direction.
export function toSwipeInput(
  card: StudioCard,
  direction: "left" | "right" | "up" | "tap",
  context: "onboarding" | "studio" | "concierge",
  reason?: string,
  dwellMs?: number
): SwipeEventInput {
  return {
    target_type: card.source.target_type,
    target_id: card.source.target_id,
    target_title: card.source.target_title,
    target_image: card.source.target_image,
    vendor: card.source.vendor,
    category: card.source.category,
    tags: card.source.tags,
    price: card.source.price,
    direction,
    reason: reason ?? null,
    dwell_ms: dwellMs,
    context,
  };
}
