// Curated outfit bundles for swipe-based outfit discovery.
// Each bundle references existing product IDs from src/data/shopProducts.ts so
// the existing cart, wishlist, and concierge components keep working.

export interface OutfitBundle {
  id: string;
  title: string;
  occasion: string; // "Dinner Date", "Office Chic", "Vacation Capsule", etc.
  vibe: string; // short tag line
  hero: string; // image URL
  items: { id: string; role: "top" | "bottom" | "dress" | "shoes" | "bag" | "layer" | "accessory" }[];
  tags: string[];
  styles: string[]; // aesthetic clusters
}

export const OUTFIT_BUNDLES: OutfitBundle[] = [
  {
    id: "out-dinner-date",
    title: "Candlelit Dinner Date",
    occasion: "Dinner Date",
    vibe: "Slinky satin, champagne tones, soft heel.",
    hero: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=1200&q=80&auto=format&fit=crop",
    items: [
      { id: "f-dress-1", role: "dress" },
      { id: "a-shoe-11", role: "shoes" },
      { id: "a-bag-1", role: "bag" },
      { id: "a-jew-1", role: "accessory" },
    ],
    tags: ["evening", "romantic", "satin"],
    styles: ["romantic", "minimal"],
  },
  {
    id: "out-office-chic",
    title: "Quiet Luxury Office",
    occasion: "Office Chic",
    vibe: "Tailoring, neutral palette, polished accessories.",
    hero: "https://images.unsplash.com/photo-1591369822096-ffd140ec948f?w=1200&q=80&auto=format&fit=crop",
    items: [
      { id: "f-top-1", role: "layer" },
      { id: "f-top-5", role: "top" },
      { id: "f-bot-1", role: "bottom" },
      { id: "a-shoe-11", role: "shoes" },
      { id: "a-bag-2", role: "bag" },
    ],
    tags: ["work", "tailoring", "minimal"],
    styles: ["minimal", "editorial"],
  },
  {
    id: "out-vacation-capsule",
    title: "Mediterranean Capsule",
    occasion: "Vacation Capsule",
    vibe: "Linen, sun-drenched neutrals, woven leather.",
    hero: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=1200&q=80&auto=format&fit=crop",
    items: [
      { id: "f-dress-5", role: "dress" },
      { id: "a-bag-3", role: "bag" },
      { id: "a-sun-1", role: "accessory" },
      { id: "a-shoe-7", role: "shoes" },
    ],
    tags: ["vacation", "linen", "resort"],
    styles: ["boho", "romantic"],
  },
  {
    id: "out-girls-night",
    title: "Girls' Night Out",
    occasion: "Girls' Night",
    vibe: "Mini length, statement bag, going-out shoe.",
    hero: "https://images.unsplash.com/photo-1583496661160-fb5886a13d44?w=1200&q=80&auto=format&fit=crop",
    items: [
      { id: "f-dress-10", role: "dress" },
      { id: "a-shoe-11", role: "shoes" },
      { id: "a-bag-4", role: "bag" },
      { id: "a-jew-2", role: "accessory" },
    ],
    tags: ["going-out", "satin", "evening"],
    styles: ["romantic", "y2k"],
  },
  {
    id: "out-coffee-run",
    title: "Coffee Run Sunday",
    occasion: "Off-Duty",
    vibe: "Effortless layering, denim, vintage tee.",
    hero: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=1200&q=80&auto=format&fit=crop",
    items: [
      { id: "f-top-6", role: "top" },
      { id: "f-bot-1", role: "bottom" },
      { id: "f-outer-7", role: "layer" },
      { id: "a-shoe-1", role: "shoes" },
      { id: "a-bag-3", role: "bag" },
    ],
    tags: ["weekend", "denim", "casual"],
    styles: ["minimal", "streetwear"],
  },
  {
    id: "out-creative-meeting",
    title: "Creative Meeting",
    occasion: "Smart Casual",
    vibe: "Knit + tailored trouser + sleek loafer.",
    hero: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=1200&q=80&auto=format&fit=crop",
    items: [
      { id: "f-top-3", role: "top" },
      { id: "f-bot-1", role: "bottom" },
      { id: "f-outer-1", role: "layer" },
      { id: "a-shoe-8", role: "shoes" },
      { id: "a-bag-2", role: "bag" },
    ],
    tags: ["smart-casual", "knit", "tailoring"],
    styles: ["minimal", "editorial"],
  },
  {
    id: "out-festival-day",
    title: "Festival Day Look",
    occasion: "Festival",
    vibe: "Crochet, denim shorts, statement sunnies.",
    hero: "https://images.unsplash.com/photo-1521369909029-2afed882baee?w=1200&q=80&auto=format&fit=crop",
    items: [
      { id: "f-top-13", role: "top" },
      { id: "f-bot-5", role: "bottom" },
      { id: "a-shoe-1", role: "shoes" },
      { id: "a-sun-1", role: "accessory" },
      { id: "a-hat-1", role: "accessory" },
    ],
    tags: ["festival", "boho", "summer"],
    styles: ["boho", "y2k"],
  },
  {
    id: "out-cold-commute",
    title: "Cold Commute",
    occasion: "Winter Commute",
    vibe: "Wool coat, mock neck, leather boot.",
    hero: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=1200&q=80&auto=format&fit=crop",
    items: [
      { id: "f-outer-2", role: "layer" },
      { id: "f-top-5", role: "top" },
      { id: "f-bot-1", role: "bottom" },
      { id: "a-shoe-5", role: "shoes" },
      { id: "a-bag-2", role: "bag" },
    ],
    tags: ["winter", "wool", "office"],
    styles: ["minimal", "preppy"],
  },
];

export function getBundleById(id: string): OutfitBundle | undefined {
  return OUTFIT_BUNDLES.find((b) => b.id === id);
}
