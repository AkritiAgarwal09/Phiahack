// Pure helpers: turn a swipe history into a derived style profile
// (no React, no Supabase — easy to unit test & call from anywhere).
import type { SwipeEventRow } from "@/services/swipeService";

export type AestheticCluster =
  | "minimal"
  | "streetwear"
  | "romantic"
  | "editorial"
  | "boho"
  | "athleisure"
  | "preppy"
  | "y2k";

export type PriceTolerance = "budget" | "mid" | "premium" | "luxury";

export interface DerivedStyle {
  topCategories: string[];
  colorPalette: string[];
  aestheticClusters: AestheticCluster[];
  priceTolerance: PriceTolerance;
  boldMinimalScore: number; // 0 minimal -> 100 bold
  casualFormalScore: number; // 0 casual -> 100 formal
  brandAffinity: string[];
  totalSwipes: number;
  loveSwipes: number;
}

const COLOR_KEYWORDS = [
  "black", "white", "cream", "ivory", "beige", "camel", "sand", "tan", "oat",
  "navy", "blue", "denim", "charcoal", "grey", "gray",
  "pink", "blush", "rose", "red", "wine", "burgundy",
  "green", "sage", "forest", "olive",
  "purple", "lilac", "lavender",
  "gold", "champagne", "silver", "metallic",
  "brown", "chocolate", "taupe",
];

const FORMAL_TAGS = new Set([
  "evening","gown","formal","tailoring","blazer","heels","silk","satin","tweed","trench","cashmere",
]);
const CASUAL_TAGS = new Set([
  "tee","hoodie","sneaker","denim","activewear","athleisure","fleece","jersey",
]);
const BOLD_TAGS = new Set([
  "y2k","mesh","logo","cut-out","cargo","leather","gown","puffer","floral","streetwear",
]);
const MINIMAL_TAGS = new Set([
  "basic","ribbed","minimal","cashmere","linen","oat","cream","tee","mock","knit",
]);

function weightFor(direction: SwipeEventRow["direction"]): number {
  if (direction === "up") return 3;
  if (direction === "right") return 2;
  if (direction === "tap") return 1;
  return -1.5; // left
}

function bumpMap(map: Map<string, number>, key: string | null | undefined, w: number) {
  if (!key) return;
  const k = key.toLowerCase().trim();
  if (!k) return;
  map.set(k, (map.get(k) || 0) + w);
}

function topN(map: Map<string, number>, n: number, minScore = 0.5): string[] {
  return [...map.entries()]
    .filter(([, v]) => v >= minScore)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);
}

export function deriveStyleProfile(swipes: SwipeEventRow[]): DerivedStyle {
  const cats = new Map<string, number>();
  const colors = new Map<string, number>();
  const aesthetics = new Map<string, number>();
  const brands = new Map<string, number>();
  const tagScores = new Map<string, number>();

  let priceSum = 0;
  let priceCount = 0;
  let loveCount = 0;
  let bold = 0;
  let minimal = 0;
  let casual = 0;
  let formal = 0;

  for (const s of swipes) {
    const w = weightFor(s.direction);
    if (w > 0) loveCount++;
    bumpMap(cats, s.category, w);
    bumpMap(brands, s.vendor, w);

    if (s.price && w > 0) {
      priceSum += Number(s.price) * w;
      priceCount += w;
    }

    const tags = s.tags || [];
    for (const t of tags) {
      const lt = t.toLowerCase();
      bumpMap(tagScores, lt, w);

      // Aesthetic mining — many tags double as style families in our catalog
      if (
        lt === "minimal" || lt === "streetwear" || lt === "romantic" ||
        lt === "editorial" || lt === "boho" || lt === "athleisure" ||
        lt === "preppy" || lt === "y2k"
      ) {
        bumpMap(aesthetics, lt, w);
      }

      if (FORMAL_TAGS.has(lt)) formal += Math.max(0, w);
      if (CASUAL_TAGS.has(lt)) casual += Math.max(0, w);
      if (BOLD_TAGS.has(lt)) bold += Math.max(0, w);
      if (MINIMAL_TAGS.has(lt)) minimal += Math.max(0, w);
    }

    // Color mining from title — cheap heuristic
    const title = (s.target_title || "").toLowerCase();
    for (const c of COLOR_KEYWORDS) {
      if (title.includes(c)) bumpMap(colors, c, w);
    }
  }

  const avgPrice = priceCount > 0 ? priceSum / priceCount : 0;
  let priceTolerance: PriceTolerance = "mid";
  if (avgPrice === 0) priceTolerance = "mid";
  else if (avgPrice < 100) priceTolerance = "budget";
  else if (avgPrice < 350) priceTolerance = "mid";
  else if (avgPrice < 800) priceTolerance = "premium";
  else priceTolerance = "luxury";

  const denomBM = bold + minimal;
  const boldMinimalScore = denomBM === 0 ? 50 : Math.round((bold / denomBM) * 100);
  const denomCF = casual + formal;
  const casualFormalScore = denomCF === 0 ? 50 : Math.round((formal / denomCF) * 100);

  return {
    topCategories: topN(cats, 4),
    colorPalette: topN(colors, 5),
    aestheticClusters: topN(aesthetics, 3) as AestheticCluster[],
    priceTolerance,
    boldMinimalScore,
    casualFormalScore,
    brandAffinity: topN(brands, 6, 1),
    totalSwipes: swipes.length,
    loveSwipes: loveCount,
  };
}

export function describePriceTolerance(p: PriceTolerance): string {
  switch (p) {
    case "budget": return "Budget-savvy (under $100)";
    case "mid": return "Mid-range contemporary ($100–$350)";
    case "premium": return "Premium contemporary ($350–$800)";
    case "luxury": return "Designer & luxury ($800+)";
  }
}

export function aestheticLabel(a: AestheticCluster): string {
  const map: Record<AestheticCluster, string> = {
    minimal: "Quiet Luxury",
    streetwear: "Streetwear",
    romantic: "Romantic Feminine",
    editorial: "Editorial",
    boho: "Boho Soft",
    athleisure: "Athleisure",
    preppy: "Modern Preppy",
    y2k: "Y2K Statement",
  };
  return map[a] || a;
}
