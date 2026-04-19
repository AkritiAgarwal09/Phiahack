/**
 * Predictive Discovery & Social Intelligence engine.
 *
 * Pure heuristics over the local catalog + signal stores. No network.
 * All inputs are simple value objects so this is easy to unit-test and to
 * run from any surface (Discover page, home previews, concierge nudges).
 */

import { localProducts, type StyleFamily } from "@/data/shopProducts";
import type { ShopifyProduct } from "@/lib/shopify";
import type { EngagementRow, TrendingRow } from "@/services/engagementService";
import type { UpcomingEvent } from "@/services/upcomingEventsService";
import { eventTypeMeta, daysUntil } from "@/services/upcomingEventsService";

const ALL = localProducts;

export type StyleTribe =
  | "quiet-luxury"
  | "clean-girl"
  | "downtown-vintage"
  | "soft-femme"
  | "street-utility"
  | "resort-minimal";

export const TRIBE_META: Record<
  StyleTribe,
  { label: string; description: string; emoji: string; styles: StyleFamily[]; tagBoost: string[] }
> = {
  "quiet-luxury": {
    label: "Quiet Luxury",
    description: "Refined neutrals, tonal layering, heritage tailoring.",
    emoji: "🤍",
    styles: ["minimal", "editorial"],
    tagBoost: ["cashmere", "tailoring", "wool", "silk"],
  },
  "clean-girl": {
    label: "Clean Girl",
    description: "Polished basics, ribbed knits, minimal gold jewelry.",
    emoji: "🌿",
    styles: ["minimal"],
    tagBoost: ["ribbed", "basic", "knit", "jewelry"],
  },
  "downtown-vintage": {
    label: "Downtown Vintage",
    description: "Lived-in denim, leather, broken-in tees.",
    emoji: "🖤",
    styles: ["streetwear", "editorial"],
    tagBoost: ["denim", "leather", "vintage"],
  },
  "soft-femme": {
    label: "Soft Femme",
    description: "Florals, satin slips, lacy details, soft palette.",
    emoji: "🌸",
    styles: ["romantic"],
    tagBoost: ["floral", "satin", "silk", "lace"],
  },
  "street-utility": {
    label: "Street Utility",
    description: "Cargo, sneakers, oversized layers, technical fabrics.",
    emoji: "🛹",
    styles: ["streetwear", "athleisure"],
    tagBoost: ["cargo", "puffer", "sneakers", "utility"],
  },
  "resort-minimal": {
    label: "Resort Minimal",
    description: "Linen sets, raffia accessories, vacation-ready ease.",
    emoji: "🌅",
    styles: ["boho", "minimal"],
    tagBoost: ["linen", "vacation", "resort", "summer"],
  },
};

// ---------- helpers ----------

export function priceOf(p: ShopifyProduct): number {
  return parseFloat(p.node.priceRange.minVariantPrice.amount);
}

export function findProduct(id: string): ShopifyProduct | undefined {
  return ALL.find((p) => p.node.id === id);
}

function tagSet(p: ShopifyProduct): Set<string> {
  return new Set(p.node.tags.map((t) => t.toLowerCase()));
}

function styleFamiliesOf(p: ShopifyProduct): StyleFamily[] {
  return p.node.tags
    .filter((t) => t.startsWith("style:"))
    .map((t) => t.slice(6) as StyleFamily);
}

// ---------- A. Next-Buy Predictor ----------

export interface NextBuyResult {
  pitch: string;
  budgetHint: string;
  items: ShopifyProduct[];
  signalCount: number;
}

export function nextBuyPrediction(
  engagements: EngagementRow[],
  wishlist: { product_url: string; product_name: string }[],
  recentlyViewedIds: string[]
): NextBuyResult {
  // Aggregate weight by category and tag
  const catScore: Record<string, number> = {};
  const tagScore: Record<string, number> = {};
  const prices: number[] = [];

  for (const e of engagements) {
    if (e.category) catScore[e.category] = (catScore[e.category] || 0) + e.weight;
    for (const t of e.tags || []) {
      tagScore[t] = (tagScore[t] || 0) + e.weight;
    }
    if (e.price) prices.push(Number(e.price));
  }
  // Boost from local recents and wishlist titles
  for (const id of recentlyViewedIds) {
    const p = findProduct(id);
    if (!p) continue;
    catScore[p.node.productType] = (catScore[p.node.productType] || 0) + 1;
    for (const t of p.node.tags) tagScore[t] = (tagScore[t] || 0) + 1;
    prices.push(priceOf(p));
  }
  for (const w of wishlist) {
    const lc = w.product_name.toLowerCase();
    for (const word of lc.split(/\s+/)) {
      tagScore[word] = (tagScore[word] || 0) + 2;
    }
  }

  const topCat = Object.entries(catScore).sort((a, b) => b[1] - a[1])[0]?.[0];
  const topTags = Object.entries(tagScore)
    .filter(([t]) => !t.startsWith("style:"))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([t]) => t);

  const avgPrice =
    prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 200;
  const budgetCeiling = Math.round(avgPrice * 1.25);

  // Score items
  const scored = ALL.map((p) => {
    let s = 0;
    if (topCat && p.node.productType === topCat) s += 5;
    const tagsLc = p.node.tags.map((t) => t.toLowerCase());
    for (const t of topTags) {
      if (tagsLc.includes(t.toLowerCase())) s += 3;
    }
    const price = priceOf(p);
    if (price <= budgetCeiling) s += 2;
    if (price <= avgPrice * 0.9) s += 1; // slightly under their average = good deal
    // Avoid items already seen recently (keep feed fresh)
    if (recentlyViewedIds.includes(p.node.id)) s -= 4;
    return { p, s };
  })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 12)
    .map((x) => x.p);

  const signalCount = engagements.length + recentlyViewedIds.length + wishlist.length;
  let pitch = "Picked from your recent activity";
  if (topTags[0] && topCat) {
    const niceTag = topTags[0].replace(/[-_]/g, " ");
    pitch = `Based on your saves, you're probably looking for ${niceTag} ${topCat} next.`;
  } else if (signalCount === 0) {
    pitch = "Curated starter picks while we learn your taste.";
  }

  // Fallback (cold-start): hand-curated mix
  const items = scored.length > 0 ? scored : seedFeed("starter");

  return {
    pitch,
    budgetHint: `Within your usual budget · under $${budgetCeiling}`,
    items,
    signalCount,
  };
}

// ---------- B. Occasion-Aware Discovery ----------

export interface OccasionSuggestion {
  event: UpcomingEvent;
  pitch: string;
  items: ShopifyProduct[];
}

export function occasionSuggestions(
  events: UpcomingEvent[],
  birthday?: string | null
): OccasionSuggestion[] {
  const list: UpcomingEvent[] = [...events];

  // Birthday auto-event for current month
  if (birthday) {
    const b = new Date(birthday + "T00:00:00");
    const now = new Date();
    const thisYearBday = new Date(now.getFullYear(), b.getMonth(), b.getDate());
    if (thisYearBday >= now) {
      const exists = events.some((e) => e.event_type === "birthday");
      if (!exists) {
        list.push({
          id: "synthetic-birthday",
          user_id: "self",
          title: "Your birthday is coming up",
          event_type: "birthday",
          event_date: thisYearBday.toISOString().slice(0, 10),
          location: null,
          vibe: "Elevated celebration",
          budget_hint: null,
          notes: null,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        });
      }
    }
  }

  list.sort((a, b) => a.event_date.localeCompare(b.event_date));

  return list.slice(0, 4).map((event) => {
    const meta = eventTypeMeta(event.event_type);
    const days = daysUntil(event.event_date);
    const items = scoreByTags(meta.tags, 8);
    const tail = days <= 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;
    const pitch = `${meta.emoji} ${event.title} ${tail}. Curated picks for your ${meta.label.toLowerCase()}.`;
    return { event, pitch, items };
  });
}

// ---------- C. Budget-Smart Predictive Feed ----------

export interface BudgetSmartResult {
  pitch: string;
  averageSpend: number;
  saleSensitivity: "high" | "medium" | "low";
  items: ShopifyProduct[];
}

export function budgetSmartFeed(engagements: EngagementRow[]): BudgetSmartResult {
  const purchases = engagements.filter((e) => e.action === "purchase" && e.price);
  const wishlistish = engagements.filter(
    (e) => (e.action === "wishlist" || e.action === "moodboard") && e.price
  );

  const avgPurchase =
    purchases.length > 0
      ? purchases.reduce((a, b) => a + Number(b.price), 0) / purchases.length
      : null;
  const avgWish =
    wishlistish.length > 0
      ? wishlistish.reduce((a, b) => a + Number(b.price), 0) / wishlistish.length
      : null;

  const avg = avgPurchase ?? avgWish ?? 180;

  // Sale sensitivity: if they wishlist way more than they buy => they wait for sales
  let saleSensitivity: "high" | "medium" | "low" = "medium";
  if (wishlistish.length >= purchases.length * 3) saleSensitivity = "high";
  else if (purchases.length >= wishlistish.length) saleSensitivity = "low";

  const ceiling = Math.round(avg * 1.1);
  const floor = Math.round(avg * 0.4);

  const items = ALL.filter((p) => {
    const pr = priceOf(p);
    return pr >= floor && pr <= ceiling;
  })
    .sort((a, b) => priceOf(a) - priceOf(b))
    .slice(0, 12);

  let pitch = `You usually spend around $${Math.round(avg)}. These match your sweet spot.`;
  if (saleSensitivity === "high") {
    pitch = `You usually wait for a discount before buying. These are similar to items you've saved and currently good value.`;
  } else if (saleSensitivity === "low") {
    pitch = `You're a confident buyer. Premium picks aligned to what you actually purchase.`;
  }

  return { pitch, averageSpend: Math.round(avg), saleSensitivity, items };
}

// ---------- D. Style Progression Engine ----------

export interface StyleProgression {
  past: { tribe: StyleTribe; share: number } | null;
  current: { tribe: StyleTribe; share: number } | null;
  pitch: string;
  items: ShopifyProduct[];
}

export function styleProgression(engagements: EngagementRow[]): StyleProgression {
  if (engagements.length < 4) {
    return {
      past: null,
      current: null,
      pitch: "Save a few more pieces and I'll start mapping how your style is evolving.",
      items: seedFeed("starter").slice(0, 8),
    };
  }
  const sorted = [...engagements].sort((a, b) =>
    a.created_at.localeCompare(b.created_at)
  );
  const half = Math.floor(sorted.length / 2);
  const old = sorted.slice(0, half);
  const recent = sorted.slice(half);

  const oldTribe = inferTribeFromEngagements(old);
  const newTribe = inferTribeFromEngagements(recent);

  let pitch: string;
  if (oldTribe.tribe === newTribe.tribe) {
    pitch = `Your taste is staying loyal to ${TRIBE_META[newTribe.tribe].label.toLowerCase()}. Here's what's freshly aligned.`;
  } else {
    pitch = `You used to lean ${TRIBE_META[oldTribe.tribe].label.toLowerCase()}, but lately you're shifting toward ${TRIBE_META[newTribe.tribe].label.toLowerCase()}. Pieces matching that shift:`;
  }

  const items = scoreByTribe(newTribe.tribe, 10);

  return { past: oldTribe, current: newTribe, pitch, items };
}

// ---------- E. Predictive Complementary Items ----------

const COMPLEMENT_MAP: Record<string, string[]> = {
  dress: ["heels", "sandals", "bag", "jewelry"],
  blazer: ["trousers", "loafers", "bag", "tee"],
  jeans: ["sneakers", "tee", "belt", "jewelry"],
  denim: ["sneakers", "tee", "belt"],
  top: ["jeans", "skirt", "jewelry"],
  blouse: ["trousers", "skirt", "jewelry"],
  sweater: ["jeans", "boots", "scarf"],
  knit: ["jeans", "boots"],
  trousers: ["heels", "blazer", "bag"],
  skirt: ["top", "boots", "bag"],
  coat: ["boots", "scarf", "bag"],
  jacket: ["jeans", "tee", "boots"],
  activewear: ["sneakers", "leggings"],
  bag: ["jewelry", "sunglasses"],
};

export interface CompletionResult {
  anchor: ShopifyProduct;
  pitch: string;
  items: ShopifyProduct[];
}

export function completeTheLook(anchor: ShopifyProduct): CompletionResult {
  const tags = tagSet(anchor);
  const wantTags = new Set<string>();
  for (const t of tags) {
    const c = COMPLEMENT_MAP[t];
    if (c) for (const w of c) wantTags.add(w);
  }
  const items = ALL.filter((p) => p.node.id !== anchor.node.id)
    .map((p) => {
      const tt = tagSet(p);
      let s = 0;
      for (const w of wantTags) if (tt.has(w)) s += 3;
      // bonus if same style family
      const aStyles = new Set(styleFamiliesOf(anchor));
      for (const st of styleFamiliesOf(p)) if (aStyles.has(st)) s += 2;
      // similar price band
      const ratio = priceOf(p) / Math.max(1, priceOf(anchor));
      if (ratio > 0.3 && ratio < 2.5) s += 1;
      return { p, s };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 6)
    .map((x) => x.p);

  return {
    anchor,
    pitch: `Items that complete the look around your ${anchor.node.title}.`,
    items,
  };
}

// ---------- 2A. Trending In Your Circle ----------

export interface TrendingInCircle {
  pitch: string;
  items: ShopifyProduct[];
  trendingMeta: Map<string, { score: number; users: number }>;
}

export function trendingInYourCircle(
  trending: TrendingRow[],
  myEngagements: EngagementRow[]
): TrendingInCircle {
  const myTags = new Set<string>();
  const myCats = new Set<string>();
  for (const e of myEngagements.slice(0, 50)) {
    for (const t of e.tags || []) myTags.add(t.toLowerCase());
    if (e.category) myCats.add(e.category);
  }

  const meta = new Map<string, { score: number; users: number }>();
  let scored = trending.map((t) => {
    let s = Number(t.total_score);
    const tt = (t.tags || []).filter((x): x is string => !!x).map((x) => x.toLowerCase());
    let overlap = 0;
    for (const tag of tt) if (myTags.has(tag)) overlap++;
    s += overlap * 4;
    if (t.category && myCats.has(t.category)) s += 3;
    meta.set(t.product_id, { score: s, users: Number(t.unique_users) });
    return { id: t.product_id, s };
  });

  scored.sort((a, b) => b.s - a.s);
  const items = scored
    .map((x) => findProduct(x.id))
    .filter((x): x is ShopifyProduct => !!x)
    .slice(0, 8);

  // Cold-start fallback: simulate with curated picks if no real trending data
  if (items.length === 0) {
    const sim = seedFeed("trending-circle").slice(0, 8);
    sim.forEach((p, i) => meta.set(p.node.id, { score: 100 - i * 7, users: 600 - i * 60 }));
    return {
      pitch: "Trending picks people with your taste are saving this week.",
      items: sim,
      trendingMeta: meta,
    };
  }

  return {
    pitch: "People who like your style are saving these right now.",
    items,
    trendingMeta: meta,
  };
}

// ---------- 2B. Viral Trend Detector ----------

export interface ViralTrend {
  headline: string;
  detail: string;
  items: ShopifyProduct[];
}

export function viralTrends(trending: TrendingRow[]): ViralTrend[] {
  // Aggregate by tag
  const tagAgg: Record<string, { score: number; productIds: Set<string> }> = {};
  for (const t of trending) {
    for (const tag of t.tags || []) {
      if (!tag) continue;
      if (tag.startsWith("style:")) continue;
      const key = tag.toLowerCase();
      if (!tagAgg[key]) tagAgg[key] = { score: 0, productIds: new Set() };
      tagAgg[key].score += Number(t.total_score);
      tagAgg[key].productIds.add(t.product_id);
    }
  }
  const top = Object.entries(tagAgg)
    .filter(([, v]) => v.productIds.size >= 2)
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 3);

  if (top.length < 2) {
    // Simulated trends
    return [
      {
        headline: "Cherry red mini bags are spiking",
        detail: "+218% saves this week across the Phia Circle.",
        items: scoreByTags(["bag", "mini"], 4),
      },
      {
        headline: "Matching co-ord sets are rising fast",
        detail: "Knit sets and tailored pairs lead the moment.",
        items: scoreByTags(["knit", "tailoring"], 4),
      },
      {
        headline: "Quiet-luxury basics are back",
        detail: "Cashmere, ribbed mock-necks, and tonal tailoring.",
        items: scoreByTags(["cashmere", "ribbed", "tailoring"], 4),
      },
    ];
  }

  return top.map(([tag, v]) => {
    const items = Array.from(v.productIds)
      .map((id) => findProduct(id))
      .filter((x): x is ShopifyProduct => !!x)
      .slice(0, 4);
    return {
      headline: `${capitalize(tag)} pieces are spiking this week`,
      detail: `${v.productIds.size} items trending across the Circle.`,
      items: items.length ? items : scoreByTags([tag], 4),
    };
  });
}

// ---------- 2C. Style Tribe Clustering ----------

export interface TribeAlignment {
  tribe: StyleTribe;
  share: number; // 0..1
}

export function inferTribeFromEngagements(engagements: EngagementRow[]): TribeAlignment {
  const scores: Record<StyleTribe, number> = {
    "quiet-luxury": 0,
    "clean-girl": 0,
    "downtown-vintage": 0,
    "soft-femme": 0,
    "street-utility": 0,
    "resort-minimal": 0,
  };
  for (const e of engagements) {
    const tags = (e.tags || []).map((t) => t.toLowerCase());
    for (const tribe of Object.keys(TRIBE_META) as StyleTribe[]) {
      const meta = TRIBE_META[tribe];
      // style: prefix
      for (const st of meta.styles) if (tags.includes(`style:${st}`)) scores[tribe] += e.weight * 2;
      for (const tag of meta.tagBoost) if (tags.includes(tag)) scores[tribe] += e.weight;
    }
  }
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  if (total === 0) return { tribe: "clean-girl", share: 0 };
  const sorted = (Object.entries(scores) as [StyleTribe, number][]).sort(
    (a, b) => b[1] - a[1]
  );
  return { tribe: sorted[0][0], share: sorted[0][1] / total };
}

export function tribeFeed(tribe: StyleTribe, n = 12): ShopifyProduct[] {
  return scoreByTribe(tribe, n);
}

function scoreByTribe(tribe: StyleTribe, n: number): ShopifyProduct[] {
  const meta = TRIBE_META[tribe];
  return ALL.map((p) => {
    let s = 0;
    const fam = styleFamiliesOf(p);
    for (const st of meta.styles) if (fam.includes(st)) s += 4;
    const tt = tagSet(p);
    for (const t of meta.tagBoost) if (tt.has(t)) s += 2;
    return { p, s };
  })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, n)
    .map((x) => x.p);
}

function scoreByTags(tags: string[], n: number): ShopifyProduct[] {
  const tagsLc = tags.map((t) => t.toLowerCase());
  return ALL.map((p) => {
    const tt = tagSet(p);
    let s = 0;
    for (const t of tagsLc) if (tt.has(t)) s += 3;
    return { p, s };
  })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, n)
    .map((x) => x.p);
}

// ---------- 2D. Social Proof badge generator ----------

export interface SocialProofBadge {
  label: string;
  intent: "trend" | "rising" | "popular" | "matched";
}

export function socialProofForProduct(
  productId: string,
  trendingMeta?: Map<string, { score: number; users: number }>,
  myTribe?: StyleTribe
): SocialProofBadge | null {
  const meta = trendingMeta?.get(productId);
  if (meta) {
    if (meta.users >= 200) {
      return { label: `Saved by ${formatCount(meta.users)} users this week`, intent: "popular" };
    }
    return { label: "Rising in your aesthetic cluster", intent: "rising" };
  }
  if (myTribe) {
    const t = TRIBE_META[myTribe];
    return { label: `Often paired by ${t.label}`, intent: "matched" };
  }
  return null;
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

// ---------- Cold-start curated seeds ----------

function seedFeed(kind: "starter" | "trending-circle"): ShopifyProduct[] {
  const ids =
    kind === "starter"
      ? ["f-top-3", "f-dress-10", "a-bag-1", "a-shoe-2", "f-bot-5", "a-jew-2", "f-outer-1", "af-dress-2"]
      : ["af-acc-2", "f-dress-4", "a-bag-3", "a-shoe-11", "af-top-3", "a-jew-3", "f-top-3", "af-dress-3"];
  return ids
    .map((id) => findProduct(id))
    .filter((x): x is ShopifyProduct => !!x);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
