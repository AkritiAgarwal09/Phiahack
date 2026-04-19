// First-run onboarding deck — a curated subset of products + outfits + aesthetic
// concept cards designed to teach the system the user's taste FAST.

import { localProducts } from "@/data/shopProducts";
import { OUTFIT_BUNDLES } from "@/data/outfitBundles";

export type OnboardingCardKind = "product" | "outfit" | "aesthetic" | "color";

export interface OnboardingCard {
  kind: OnboardingCardKind;
  id: string;
  title: string;
  subtitle: string;
  image: string;
  category?: string;
  tags?: string[];
  vendor?: string;
  price?: number;
  // For aesthetic / color: the style cluster or color name being signalled.
  signal?: string;
}

const PRODUCT_PICKS = [
  // Dresses across feel
  "f-dress-1","f-dress-3","f-dress-5","f-dress-7","f-dress-13","f-dress-14",
  // Outerwear & tops
  "f-outer-3","f-outer-6","f-top-1","f-top-3","f-top-6","f-top-13",
  // Bottoms
  "f-bot-1","f-bot-5",
  // Shoes
  "a-shoe-1","a-shoe-5","a-shoe-8","a-shoe-11",
  // Bags
  "a-bag-1","a-bag-2","a-bag-3",
];

const AESTHETIC_CARDS: OnboardingCard[] = [
  {
    kind: "aesthetic",
    id: "aes-minimal",
    title: "Quiet Luxury",
    subtitle: "Soft tailoring, neutral palette, no logos.",
    image: "https://images.unsplash.com/photo-1591369822096-ffd140ec948f?w=1000&q=80&auto=format&fit=crop",
    signal: "minimal",
    tags: ["minimal","tailoring","cashmere"],
  },
  {
    kind: "aesthetic",
    id: "aes-romantic",
    title: "Romantic Feminine",
    subtitle: "Silks, florals, soft drape.",
    image: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=1000&q=80&auto=format&fit=crop",
    signal: "romantic",
    tags: ["romantic","silk","floral"],
  },
  {
    kind: "aesthetic",
    id: "aes-streetwear",
    title: "Elevated Streetwear",
    subtitle: "Heavyweight cotton, sneakers, structured bags.",
    image: "https://images.unsplash.com/photo-1620799140188-3b2a02fd9a77?w=1000&q=80&auto=format&fit=crop",
    signal: "streetwear",
    tags: ["streetwear","oversized","sneaker"],
  },
  {
    kind: "aesthetic",
    id: "aes-y2k",
    title: "Y2K Statement",
    subtitle: "Mesh, low-rise, bold accessories.",
    image: "https://images.unsplash.com/photo-1583496661160-fb5886a13d44?w=1000&q=80&auto=format&fit=crop",
    signal: "y2k",
    tags: ["y2k","going-out","mesh"],
  },
  {
    kind: "aesthetic",
    id: "aes-boho",
    title: "Boho Soft",
    subtitle: "Linen, crochet, sun-drenched neutrals.",
    image: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=1000&q=80&auto=format&fit=crop",
    signal: "boho",
    tags: ["boho","linen","resort"],
  },
];

const COLOR_CARDS: OnboardingCard[] = [
  {
    kind: "color",
    id: "col-neutral",
    title: "Warm Neutrals",
    subtitle: "Cream, oat, camel, chocolate.",
    image: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=1000&q=80&auto=format&fit=crop",
    signal: "cream",
    tags: ["cream","oat","camel","chocolate"],
  },
  {
    kind: "color",
    id: "col-monochrome",
    title: "Monochrome",
    subtitle: "Black & white, contrast forward.",
    image: "https://images.unsplash.com/photo-1591369822096-ffd140ec948f?w=1000&q=80&auto=format&fit=crop",
    signal: "black",
    tags: ["black","white"],
  },
  {
    kind: "color",
    id: "col-jewel",
    title: "Jewel Tones",
    subtitle: "Wine, forest, navy, gold accents.",
    image: "https://images.unsplash.com/photo-1535632787350-4e68ef0ac584?w=1000&q=80&auto=format&fit=crop",
    signal: "wine",
    tags: ["wine","forest","navy","gold"],
  },
];

function buildProductCards(): OnboardingCard[] {
  return PRODUCT_PICKS
    .map((id) => localProducts.find((p) => p.node.id === id))
    .filter(Boolean)
    .map((p) => {
      const node = p!.node;
      return {
        kind: "product" as const,
        id: node.id,
        title: node.title,
        subtitle: node.vendor,
        image: node.images.edges[0]?.node?.url || "",
        category: node.productType,
        tags: node.tags,
        vendor: node.vendor,
        price: Number(node.priceRange.minVariantPrice.amount),
      };
    });
}

function buildOutfitCards(): OnboardingCard[] {
  return OUTFIT_BUNDLES.slice(0, 5).map((b) => ({
    kind: "outfit" as const,
    id: b.id,
    title: b.title,
    subtitle: b.vibe,
    image: b.hero,
    category: "outfit",
    tags: b.tags,
    price: undefined,
  }));
}

// Interleave kinds so the user experiences variety throughout.
export function buildOnboardingDeck(): OnboardingCard[] {
  const products = buildProductCards();
  const outfits = buildOutfitCards();
  const out: OnboardingCard[] = [];
  let pi = 0, oi = 0, ai = 0, ci = 0;
  // Pattern: 3 products, 1 outfit, repeat. Sprinkle aesthetic & color every ~8 cards.
  while (pi < products.length || oi < outfits.length) {
    for (let k = 0; k < 3 && pi < products.length; k++) out.push(products[pi++]);
    if (oi < outfits.length) out.push(outfits[oi++]);
    if (out.length % 8 === 0 && ai < AESTHETIC_CARDS.length) out.push(AESTHETIC_CARDS[ai++]);
    if (out.length % 11 === 0 && ci < COLOR_CARDS.length) out.push(COLOR_CARDS[ci++]);
  }
  // Append any leftover concept cards
  while (ai < AESTHETIC_CARDS.length) out.push(AESTHETIC_CARDS[ai++]);
  while (ci < COLOR_CARDS.length) out.push(COLOR_CARDS[ci++]);
  return out.slice(0, 28);
}
