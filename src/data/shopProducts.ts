// Local product catalog. The shape mimics the previous Shopify product so the
// existing components (cart, detail dialog, product card) keep working.

export type ShopCategory =
  | "all"
  | "fashion"
  | "accessories"
  | "beauty"
  | "home";

export type StyleFamily =
  | "minimal"
  | "streetwear"
  | "romantic"
  | "editorial"
  | "boho"
  | "athleisure"
  | "preppy"
  | "y2k";

export interface ProductOption {
  name: "Size" | "Color";
  values: string[];
}

export interface ProductVariant {
  id: string;
  title: string;
  price: { amount: string; currencyCode: string };
  availableForSale: boolean;
  selectedOptions: { name: string; value: string }[];
}

export interface LocalProduct {
  node: {
    id: string;
    handle: string;
    title: string;
    description: string;
    vendor: string;
    productType: string; // category
    tags: string[];
    priceRange: { minVariantPrice: { amount: string; currencyCode: string } };
    images: { edges: { node: { url: string; altText: string | null } }[] };
    variants: { edges: { node: ProductVariant }[] };
    options: ProductOption[];
  };
}

const SIZES_APPAREL = ["XS", "S", "M", "L", "XL"];
const SIZES_DENIM = ["24", "26", "28", "30", "32"];
const SIZES_SHOES = ["36", "37", "38", "39", "40", "41"];

function buildVariants(
  productId: string,
  basePrice: number,
  opts: ProductOption[]
): ProductVariant[] {
  const combos: Record<string, string>[] = [{}];
  opts.forEach((opt) => {
    const next: Record<string, string>[] = [];
    combos.forEach((c) => {
      opt.values.forEach((v) => next.push({ ...c, [opt.name]: v }));
    });
    combos.length = 0;
    combos.push(...next);
  });

  return combos.map((combo, i) => ({
    id: `${productId}-v${i}`,
    title: Object.values(combo).join(" / ") || "Default",
    price: { amount: basePrice.toFixed(2), currencyCode: "USD" },
    availableForSale: true,
    selectedOptions: Object.entries(combo).map(([name, value]) => ({ name, value })),
  }));
}

interface Seed {
  id: string;
  title: string;
  vendor: string;
  description: string;
  category: Exclude<ShopCategory, "all">;
  price: number;
  image: string;
  options: ProductOption[];
  tags?: string[];
  styles?: StyleFamily[];
}

// Unsplash image pool keyed by a tag — we cycle through these to give every
// product a real, on-theme image without curating 150 unique URLs by hand.
const IMG: Record<string, string[]> = {
  dress: [
    "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=900&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=900&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=900&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1559599101-f09722fb4948?w=900&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=900&q=80&auto=format&fit=crop",
  ],
  coat: [
    "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=900&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=900&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1548126032-079a0fb0099d?w=900&q=80&auto=format&fit=crop",
  ],
  blazer: [
    "https://images.unsplash.com/photo-1591369822096-ffd140ec948f?w=900&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=900&q=80&auto=format&fit=crop",
  ],
  denim: [
    "https://images.unsplash.com/photo-1542272604-787c3835535d?w=900&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1582418702059-97ebafb35d09?w=900&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=900&q=80&auto=format&fit=crop",
  ],
  knit: [
    "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=900&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=900&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1620799139507-2a76f79a2f4d?w=900&q=80&auto=format&fit=crop",
  ],
  tee: [
    "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=900&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=900&q=80&auto=format&fit=crop",
  ],
  hoodie: [
    "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=900&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1620799140188-3b2a02fd9a77?w=900&q=80&auto=format&fit=crop",
  ],
  skirt: [
    "https://images.unsplash.com/photo-1583846783214-7229a91b20ed?w=900&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1577900232427-18219b9166a0?w=900&q=80&auto=format&fit=crop",
  ],
  pants: [
    "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=900&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=900&q=80&auto=format&fit=crop",
  ],
  activewear: [
    "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=900&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1483721310020-03333e577078?w=900&q=80&auto=format&fit=crop",
  ],
  sneaker: [
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=900&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1539185441755-769473a23570?w=900&q=80&auto=format&fit=crop",
  ],
  heels: [
    "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=900&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1535043934128-cf0b28d52f95?w=900&q=80&auto=format&fit=crop",
  ],
  boots: [
    "https://images.unsplash.com/photo-1605812860427-4024433a70fd?w=900&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1520639888713-7851133b1ed0?w=900&q=80&auto=format&fit=crop",
  ],
  bag: [
    "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=900&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=900&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1591561954557-26941169b49e?w=900&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=900&q=80&auto=format&fit=crop",
  ],
  jewelry: [
    "https://images.unsplash.com/photo-1535632787350-4e68ef0ac584?w=900&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=900&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=900&q=80&auto=format&fit=crop",
  ],
  sunglasses: [
    "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=900&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=900&q=80&auto=format&fit=crop",
  ],
  hat: [
    "https://images.unsplash.com/photo-1521369909029-2afed882baee?w=900&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1556306535-0f09a537f0a3?w=900&q=80&auto=format&fit=crop",
  ],
  scarf: [
    "https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=900&q=80&auto=format&fit=crop",
  ],
  belt: [
    "https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=900&q=80&auto=format&fit=crop",
  ],
  watch: [
    "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=900&q=80&auto=format&fit=crop",
  ],
  skincare: [
    "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=900&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=900&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=900&q=80&auto=format&fit=crop",
  ],
  fragrance: [
    "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=900&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1541643600914-78b084683601?w=900&q=80&auto=format&fit=crop",
  ],
  makeup: [
    "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=900&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=900&q=80&auto=format&fit=crop",
  ],
  haircare: [
    "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=900&q=80&auto=format&fit=crop",
  ],
  decor: [
    "https://images.unsplash.com/photo-1578500494198-246f612d3b3d?w=900&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=900&q=80&auto=format&fit=crop",
  ],
  textile: [
    "https://images.unsplash.com/photo-1567016526105-22da7c13161a?w=900&q=80&auto=format&fit=crop",
  ],
  candle: [
    "https://images.unsplash.com/photo-1603006905003-be475563bc59?w=900&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1601814933824-fd0b574dd592?w=900&q=80&auto=format&fit=crop",
  ],
};

let imgIdx: Record<string, number> = {};
function pickImg(key: keyof typeof IMG): string {
  const pool = IMG[key];
  imgIdx[key] = (imgIdx[key] ?? -1) + 1;
  return pool[imgIdx[key] % pool.length];
}

// ---------- Seed catalog (~150 items) ----------
const seeds: Seed[] = [
  // ===== FASHION — Dresses (15) =====
  { id: "f-dress-1", title: "Silk Slip Dress", vendor: "Atelier Noir", description: "Bias-cut mulberry silk slip dress with adjustable straps.", category: "fashion", price: 289, image: pickImg("dress"), options: [{ name: "Size", values: SIZES_APPAREL }, { name: "Color", values: ["Champagne", "Onyx", "Blush"] }], tags: ["dress", "silk", "evening"], styles: ["minimal", "romantic"] },
  { id: "f-dress-2", title: "Cotton Poplin Midi Dress", vendor: "Études", description: "Crisp cotton poplin midi with a tie waist.", category: "fashion", price: 165, image: pickImg("dress"), options: [{ name: "Size", values: SIZES_APPAREL }, { name: "Color", values: ["White", "Black"] }], tags: ["dress", "cotton", "summer"], styles: ["minimal", "preppy"] },
  { id: "f-dress-3", title: "Floral Wrap Maxi", vendor: "Réalisation", description: "Silk wrap maxi in a vintage floral.", category: "fashion", price: 320, image: pickImg("dress"), options: [{ name: "Size", values: SIZES_APPAREL }], tags: ["dress", "maxi", "floral"], styles: ["romantic", "boho"] },
  { id: "f-dress-4", title: "Ribbed Knit Mini Dress", vendor: "House of Sunny", description: "Body-skimming ribbed knit mini.", category: "fashion", price: 95, image: pickImg("dress"), options: [{ name: "Size", values: SIZES_APPAREL }, { name: "Color", values: ["Sage", "Cream", "Black"] }], tags: ["dress", "knit", "mini"], styles: ["minimal", "y2k"] },
  { id: "f-dress-5", title: "Linen Sundress", vendor: "Faithfull the Brand", description: "Breezy linen sundress with smocked bodice.", category: "fashion", price: 218, image: pickImg("dress"), options: [{ name: "Size", values: SIZES_APPAREL }], tags: ["dress", "linen", "vacation"], styles: ["boho", "romantic"] },
  { id: "f-dress-6", title: "Black Tie Gown", vendor: "Galvan", description: "Floor-length satin gown with cowl neckline.", category: "fashion", price: 1250, image: pickImg("dress"), options: [{ name: "Size", values: SIZES_APPAREL }], tags: ["dress", "gown", "formal"], styles: ["editorial", "romantic"] },
  { id: "f-dress-7", title: "Mesh Bodycon Mini", vendor: "I.AM.GIA", description: "Sheer mesh overlay bodycon with built-in shorts.", category: "fashion", price: 75, image: pickImg("dress"), options: [{ name: "Size", values: SIZES_APPAREL }], tags: ["dress", "going-out"], styles: ["y2k", "streetwear"] },
  { id: "f-dress-8", title: "Tailored Shirt Dress", vendor: "Toteme", description: "Crisp poplin shirtdress with belted waist.", category: "fashion", price: 480, image: pickImg("dress"), options: [{ name: "Size", values: SIZES_APPAREL }], tags: ["dress", "shirtdress"], styles: ["minimal", "editorial"] },
  { id: "f-dress-9", title: "Tiered Cotton Maxi", vendor: "Doen", description: "Three-tiered cotton maxi with puff sleeves.", category: "fashion", price: 268, image: pickImg("dress"), options: [{ name: "Size", values: SIZES_APPAREL }], tags: ["dress", "maxi"], styles: ["romantic", "boho"] },
  { id: "f-dress-10", title: "Slip Mini in Satin", vendor: "Reformation", description: "Cowl-neck satin slip in a flirty mini length.", category: "fashion", price: 148, image: pickImg("dress"), options: [{ name: "Size", values: SIZES_APPAREL }, { name: "Color", values: ["Champagne", "Wine", "Black"] }], tags: ["dress", "satin"], styles: ["romantic", "minimal"] },
  { id: "f-dress-11", title: "Cargo Cargo Dress", vendor: "Acne Studios", description: "Utility-inspired cotton cargo dress.", category: "fashion", price: 395, image: pickImg("dress"), options: [{ name: "Size", values: SIZES_APPAREL }], tags: ["dress", "utility"], styles: ["streetwear", "editorial"] },
  { id: "f-dress-12", title: "Ditsy Floral Mini", vendor: "& Other Stories", description: "Smocked ditsy floral mini for everyday romance.", category: "fashion", price: 89, image: pickImg("dress"), options: [{ name: "Size", values: SIZES_APPAREL }], tags: ["dress", "floral", "mini"], styles: ["romantic"] },
  { id: "f-dress-13", title: "Cut-Out Jersey Dress", vendor: "Mugler", description: "Sculpted jersey dress with side cut-outs.", category: "fashion", price: 890, image: pickImg("dress"), options: [{ name: "Size", values: SIZES_APPAREL }], tags: ["dress", "jersey", "going-out"], styles: ["editorial", "y2k"] },
  { id: "f-dress-14", title: "Sweater Midi Dress", vendor: "COS", description: "Merino wool sweater dress, midi length.", category: "fashion", price: 175, image: pickImg("dress"), options: [{ name: "Size", values: SIZES_APPAREL }, { name: "Color", values: ["Camel", "Black", "Cream"] }], tags: ["dress", "knit"], styles: ["minimal"] },
  { id: "f-dress-15", title: "Polka Dot Tea Dress", vendor: "Rixo", description: "Vintage-inspired silk tea dress.", category: "fashion", price: 365, image: pickImg("dress"), options: [{ name: "Size", values: SIZES_APPAREL }], tags: ["dress", "vintage"], styles: ["romantic"] },

  // ===== FASHION — Outerwear (10) =====
  { id: "f-outer-1", title: "Cashmere Wrap Trench", vendor: "Maison Lune", description: "Wool-cashmere blend trench with tonal belt.", category: "fashion", price: 642, image: pickImg("coat"), options: [{ name: "Size", values: SIZES_APPAREL }, { name: "Color", values: ["Camel", "Charcoal"] }], tags: ["coat", "outerwear", "cashmere"], styles: ["minimal", "editorial"] },
  { id: "f-outer-2", title: "Oversized Wool Coat", vendor: "Toteme", description: "Double-breasted virgin wool overcoat.", category: "fashion", price: 1120, image: pickImg("coat"), options: [{ name: "Size", values: SIZES_APPAREL }], tags: ["coat", "wool"], styles: ["minimal"] },
  { id: "f-outer-3", title: "Vintage Leather Jacket", vendor: "AllSaints", description: "Distressed lambskin biker with quilted shoulders.", category: "fashion", price: 498, image: pickImg("coat"), options: [{ name: "Size", values: SIZES_APPAREL }], tags: ["jacket", "leather"], styles: ["streetwear", "editorial"] },
  { id: "f-outer-4", title: "Quilted Puffer", vendor: "Ganni", description: "Recycled-fill quilted puffer in matte technical fabric.", category: "fashion", price: 295, image: pickImg("coat"), options: [{ name: "Size", values: SIZES_APPAREL }, { name: "Color", values: ["Black", "Lilac"] }], tags: ["jacket", "puffer"], styles: ["streetwear"] },
  { id: "f-outer-5", title: "Faux Shearling Aviator", vendor: "Stand Studio", description: "Cropped faux shearling aviator jacket.", category: "fashion", price: 425, image: pickImg("coat"), options: [{ name: "Size", values: SIZES_APPAREL }], tags: ["jacket", "shearling"], styles: ["editorial", "boho"] },
  { id: "f-outer-6", title: "Classic Trench Coat", vendor: "Burberry", description: "Iconic gabardine trench in heritage cut.", category: "fashion", price: 1890, image: pickImg("coat"), options: [{ name: "Size", values: SIZES_APPAREL }], tags: ["trench", "outerwear"], styles: ["preppy", "minimal"] },
  { id: "f-outer-7", title: "Cropped Denim Jacket", vendor: "Levi's", description: "Cropped trucker jacket in rigid blue denim.", category: "fashion", price: 98, image: pickImg("coat"), options: [{ name: "Size", values: SIZES_APPAREL }], tags: ["jacket", "denim"], styles: ["streetwear", "preppy"] },
  { id: "f-outer-8", title: "Wool-Blend Bomber", vendor: "Acne Studios", description: "Boxy wool bomber with ribbed trim.", category: "fashion", price: 695, image: pickImg("coat"), options: [{ name: "Size", values: SIZES_APPAREL }], tags: ["jacket", "bomber"], styles: ["streetwear", "editorial"] },
  { id: "f-outer-9", title: "Padded Liner Vest", vendor: "Arket", description: "Lightweight quilted vest, layer it under everything.", category: "fashion", price: 125, image: pickImg("coat"), options: [{ name: "Size", values: SIZES_APPAREL }], tags: ["vest", "outerwear"], styles: ["minimal", "athleisure"] },
  { id: "f-outer-10", title: "Linen Duster Coat", vendor: "Doen", description: "Floor-skimming linen duster, perfect for resort.", category: "fashion", price: 348, image: pickImg("coat"), options: [{ name: "Size", values: SIZES_APPAREL }], tags: ["coat", "linen"], styles: ["boho", "minimal"] },

  // ===== FASHION — Tops & Knits (15) =====
  { id: "f-top-1", title: "Oversized Linen Blazer", vendor: "Études", description: "Single-button Italian linen blazer with soft shoulder.", category: "fashion", price: 410, image: pickImg("blazer"), options: [{ name: "Size", values: SIZES_APPAREL }, { name: "Color", values: ["Sand", "Black"] }], tags: ["blazer", "linen", "tailoring"], styles: ["editorial", "minimal"] },
  { id: "f-top-2", title: "Cropped Tweed Blazer", vendor: "Self-Portrait", description: "Boucle tweed blazer with frayed edges.", category: "fashion", price: 425, image: pickImg("blazer"), options: [{ name: "Size", values: SIZES_APPAREL }], tags: ["blazer", "tweed"], styles: ["preppy", "romantic"] },
  { id: "f-top-3", title: "Cashmere Crewneck", vendor: "Naadam", description: "Mongolian cashmere crew, ethically sourced.", category: "fashion", price: 145, image: pickImg("knit"), options: [{ name: "Size", values: SIZES_APPAREL }, { name: "Color", values: ["Oat", "Charcoal", "Forest"] }], tags: ["sweater", "cashmere", "knit"], styles: ["minimal", "preppy"] },
  { id: "f-top-4", title: "Chunky Cable Knit", vendor: "& Other Stories", description: "Oversized cable cardigan in alpaca blend.", category: "fashion", price: 169, image: pickImg("knit"), options: [{ name: "Size", values: SIZES_APPAREL }], tags: ["sweater", "cardigan"], styles: ["preppy", "boho"] },
  { id: "f-top-5", title: "Ribbed Mock Neck", vendor: "COS", description: "Slim ribbed mock neck base layer.", category: "fashion", price: 65, image: pickImg("knit"), options: [{ name: "Size", values: SIZES_APPAREL }, { name: "Color", values: ["Cream", "Black", "Chocolate"] }], tags: ["top", "ribbed", "basic"], styles: ["minimal"] },
  { id: "f-top-6", title: "Vintage Wash Tee", vendor: "RE/DONE", description: "Cropped boxy tee in soft vintage cotton.", category: "fashion", price: 95, image: pickImg("tee"), options: [{ name: "Size", values: SIZES_APPAREL }, { name: "Color", values: ["White", "Faded Black"] }], tags: ["tee", "basic"], styles: ["minimal", "streetwear"] },
  { id: "f-top-7", title: "Logo Heavyweight Tee", vendor: "Stüssy", description: "Heavyweight cotton tee with chest logo.", category: "fashion", price: 55, image: pickImg("tee"), options: [{ name: "Size", values: SIZES_APPAREL }], tags: ["tee", "logo"], styles: ["streetwear"] },
  { id: "f-top-8", title: "Boxy Hoodie", vendor: "Essentials", description: "Heavy fleece boxy hoodie in tonal palette.", category: "fashion", price: 110, image: pickImg("hoodie"), options: [{ name: "Size", values: SIZES_APPAREL }, { name: "Color", values: ["Bone", "Taupe", "Black"] }], tags: ["hoodie", "fleece"], styles: ["streetwear", "athleisure"] },
  { id: "f-top-9", title: "Silk Camisole", vendor: "La Perla", description: "100% silk bias-cut camisole with lace trim.", category: "fashion", price: 180, image: pickImg("knit"), options: [{ name: "Size", values: SIZES_APPAREL }], tags: ["top", "silk", "camisole"], styles: ["romantic"] },
  { id: "f-top-10", title: "Puff Sleeve Blouse", vendor: "Sandy Liang", description: "Cotton blouse with dramatic puff sleeves.", category: "fashion", price: 245, image: pickImg("knit"), options: [{ name: "Size", values: SIZES_APPAREL }], tags: ["top", "blouse"], styles: ["romantic", "editorial"] },
  { id: "f-top-11", title: "Mesh Long Sleeve", vendor: "Diesel", description: "Sheer logo-print mesh long sleeve.", category: "fashion", price: 145, image: pickImg("tee"), options: [{ name: "Size", values: SIZES_APPAREL }], tags: ["top", "mesh"], styles: ["y2k", "streetwear"] },
  { id: "f-top-12", title: "Merino Polo Shirt", vendor: "Sunspel", description: "Fine-gauge merino polo, button placket.", category: "fashion", price: 225, image: pickImg("knit"), options: [{ name: "Size", values: SIZES_APPAREL }], tags: ["polo", "knit"], styles: ["preppy", "minimal"] },
  { id: "f-top-13", title: "Crochet Halter Top", vendor: "Sir.", description: "Hand-crocheted halter in cotton blend.", category: "fashion", price: 195, image: pickImg("knit"), options: [{ name: "Size", values: SIZES_APPAREL }], tags: ["top", "crochet"], styles: ["boho", "y2k"] },
  { id: "f-top-14", title: "Boxy Button-Down", vendor: "The Frankie Shop", description: "Drapey lyocell button-down, oversized fit.", category: "fashion", price: 195, image: pickImg("knit"), options: [{ name: "Size", values: SIZES_APPAREL }, { name: "Color", values: ["White", "Sky", "Stone"] }], tags: ["shirt", "button-down"], styles: ["minimal", "editorial"] },
  { id: "f-top-15", title: "Quarter-Zip Sweatshirt", vendor: "Aimé Leon Dore", description: "Heavyweight cotton quarter-zip with embroidered crest.", category: "fashion", price: 178, image: pickImg("hoodie"), options: [{ name: "Size", values: SIZES_APPAREL }], tags: ["sweatshirt", "quarter-zip"], styles: ["preppy", "streetwear"] },

  // ===== FASHION — Bottoms (12) =====
  { id: "f-bot-1", title: "High-Rise Wide-Leg Denim", vendor: "Kōji Denim", description: "Japanese rigid denim, raw hem, vintage indigo.", category: "fashion", price: 245, image: pickImg("denim"), options: [{ name: "Size", values: SIZES_DENIM }], tags: ["denim", "jeans"], styles: ["minimal", "editorial"] },
  { id: "f-bot-2", title: "Baggy Carpenter Jeans", vendor: "Carhartt WIP", description: "Loose carpenter jeans in heavyweight denim.", category: "fashion", price: 168, image: pickImg("denim"), options: [{ name: "Size", values: SIZES_DENIM }], tags: ["denim", "jeans", "baggy"], styles: ["streetwear"] },
  { id: "f-bot-3", title: "Low-Rise Bootcut Jeans", vendor: "Re/Done", description: "Y2K-inspired low rise bootcut.", category: "fashion", price: 295, image: pickImg("denim"), options: [{ name: "Size", values: SIZES_DENIM }], tags: ["denim", "jeans"], styles: ["y2k"] },
  { id: "f-bot-4", title: "Skinny Black Jeans", vendor: "Frame", description: "High-stretch skinny in jet black wash.", category: "fashion", price: 198, image: pickImg("denim"), options: [{ name: "Size", values: SIZES_DENIM }], tags: ["denim", "skinny"], styles: ["minimal"] },
  { id: "f-bot-5", title: "Pleated Trousers", vendor: "Toteme", description: "Wool-blend pleated trousers, relaxed fit.", category: "fashion", price: 425, image: pickImg("pants"), options: [{ name: "Size", values: SIZES_APPAREL }, { name: "Color", values: ["Black", "Camel"] }], tags: ["trousers", "tailoring"], styles: ["minimal", "editorial"] },
  { id: "f-bot-6", title: "Cargo Parachute Pants", vendor: "JNCO", description: "Drawstring nylon parachute pants.", category: "fashion", price: 135, image: pickImg("pants"), options: [{ name: "Size", values: SIZES_APPAREL }], tags: ["pants", "cargo"], styles: ["streetwear", "y2k"] },
  { id: "f-bot-7", title: "Linen Drawstring Pants", vendor: "Faherty", description: "Beach-ready linen pull-on pants.", category: "fashion", price: 158, image: pickImg("pants"), options: [{ name: "Size", values: SIZES_APPAREL }, { name: "Color", values: ["Natural", "Sage"] }], tags: ["pants", "linen"], styles: ["boho", "minimal"] },
  { id: "f-bot-8", title: "Mini Cargo Skirt", vendor: "Dion Lee", description: "Asymmetric cargo mini skirt.", category: "fashion", price: 295, image: pickImg("skirt"), options: [{ name: "Size", values: SIZES_APPAREL }], tags: ["skirt", "mini", "cargo"], styles: ["streetwear", "y2k"] },
  { id: "f-bot-9", title: "Pleated Tennis Skirt", vendor: "Lacoste", description: "Classic white pleated tennis skirt.", category: "fashion", price: 95, image: pickImg("skirt"), options: [{ name: "Size", values: SIZES_APPAREL }], tags: ["skirt", "tennis"], styles: ["preppy"] },
  { id: "f-bot-10", title: "Maxi Slip Skirt", vendor: "Vince", description: "Bias silk maxi slip skirt in champagne.", category: "fashion", price: 285, image: pickImg("skirt"), options: [{ name: "Size", values: SIZES_APPAREL }], tags: ["skirt", "maxi", "silk"], styles: ["minimal", "romantic"] },
  { id: "f-bot-11", title: "Wide-Leg Trousers", vendor: "Arket", description: "Crepe wide-leg trousers, easy elastic waist.", category: "fashion", price: 135, image: pickImg("pants"), options: [{ name: "Size", values: SIZES_APPAREL }], tags: ["pants", "wide-leg"], styles: ["minimal"] },
  { id: "f-bot-12", title: "Faux Leather Pants", vendor: "Commando", description: "Liquid faux leather pull-on pants.", category: "fashion", price: 168, image: pickImg("pants"), options: [{ name: "Size", values: SIZES_APPAREL }], tags: ["pants", "leather"], styles: ["editorial", "y2k"] },

  // ===== FASHION — Activewear (5) =====
  { id: "f-act-1", title: "Yoga Bra Top", vendor: "Alo Yoga", description: "Soft compression yoga bra, brushed feel.", category: "fashion", price: 64, image: pickImg("activewear"), options: [{ name: "Size", values: SIZES_APPAREL }], tags: ["activewear", "bra"], styles: ["athleisure"] },
  { id: "f-act-2", title: "High-Waist Leggings", vendor: "Lululemon", description: "Buttery 7/8 leggings with side pockets.", category: "fashion", price: 128, image: pickImg("activewear"), options: [{ name: "Size", values: SIZES_APPAREL }], tags: ["leggings", "activewear"], styles: ["athleisure"] },
  { id: "f-act-3", title: "Tennis Polo Dress", vendor: "Halara", description: "Built-in shorts tennis dress.", category: "fashion", price: 55, image: pickImg("activewear"), options: [{ name: "Size", values: SIZES_APPAREL }], tags: ["activewear", "dress"], styles: ["athleisure", "preppy"] },
  { id: "f-act-4", title: "Compression Bike Shorts", vendor: "Sweaty Betty", description: "Sculpting bike shorts with high-rise waist.", category: "fashion", price: 68, image: pickImg("activewear"), options: [{ name: "Size", values: SIZES_APPAREL }], tags: ["activewear", "shorts"], styles: ["athleisure"] },
  { id: "f-act-5", title: "Track Jacket", vendor: "Adidas Originals", description: "Classic three-stripe track jacket.", category: "fashion", price: 95, image: pickImg("hoodie"), options: [{ name: "Size", values: SIZES_APPAREL }], tags: ["activewear", "jacket"], styles: ["athleisure", "streetwear"] },

  // ===== ACCESSORIES — Bags (12) =====
  { id: "a-bag-1", title: "Lumière Leather Tote", vendor: "Studio Lumière", description: "Italian leather tote with brushed gold hardware.", category: "accessories", price: 640, image: pickImg("bag"), options: [{ name: "Color", values: ["Black", "Cream", "Cognac"] }], tags: ["bag", "leather", "tote"], styles: ["minimal", "editorial"] },
  { id: "a-bag-2", title: "Mini Crescent Bag", vendor: "Khaite", description: "Soft leather crescent shoulder bag.", category: "accessories", price: 1450, image: pickImg("bag"), options: [{ name: "Color", values: ["Black", "Walnut"] }], tags: ["bag", "shoulder"], styles: ["minimal", "editorial"] },
  { id: "a-bag-3", title: "Quilted Chain Bag", vendor: "Aupen", description: "Diamond-quilted lambskin with curb chain.", category: "accessories", price: 525, image: pickImg("bag"), options: [{ name: "Color", values: ["Black", "Caramel"] }], tags: ["bag", "quilted"], styles: ["editorial", "preppy"] },
  { id: "a-bag-4", title: "Canvas Crossbody", vendor: "Baggu", description: "Recycled cotton canvas crossbody, packs flat.", category: "accessories", price: 48, image: pickImg("bag"), options: [{ name: "Color", values: ["Sand", "Sky", "Black"] }], tags: ["bag", "canvas"], styles: ["minimal", "boho"] },
  { id: "a-bag-5", title: "Beaded Evening Clutch", vendor: "Cult Gaia", description: "Hand-beaded evening clutch with crystal clasp.", category: "accessories", price: 295, image: pickImg("bag"), options: [], tags: ["bag", "clutch"], styles: ["romantic", "boho"] },
  { id: "a-bag-6", title: "Nylon Sling", vendor: "Prada", description: "Re-Nylon triangle sling bag.", category: "accessories", price: 1090, image: pickImg("bag"), options: [{ name: "Color", values: ["Black", "Steel"] }], tags: ["bag", "nylon"], styles: ["streetwear", "y2k"] },
  { id: "a-bag-7", title: "Woven Raffia Bag", vendor: "Loewe", description: "Hand-woven raffia basket bag.", category: "accessories", price: 720, image: pickImg("bag"), options: [], tags: ["bag", "raffia"], styles: ["boho"] },
  { id: "a-bag-8", title: "Suede Bucket Bag", vendor: "Mansur Gavriel", description: "Italian suede bucket with drawstring closure.", category: "accessories", price: 495, image: pickImg("bag"), options: [{ name: "Color", values: ["Sand", "Black"] }], tags: ["bag", "suede"], styles: ["minimal", "boho"] },
  { id: "a-bag-9", title: "Mini Top Handle", vendor: "JW Pei", description: "Vegan leather mini top-handle bag.", category: "accessories", price: 99, image: pickImg("bag"), options: [{ name: "Color", values: ["Cream", "Olive"] }], tags: ["bag", "mini"], styles: ["minimal", "preppy"] },
  { id: "a-bag-10", title: "Backpack 25L", vendor: "Herschel", description: "Classic 25L backpack in waxed canvas.", category: "accessories", price: 95, image: pickImg("bag"), options: [{ name: "Color", values: ["Black", "Olive"] }], tags: ["bag", "backpack"], styles: ["streetwear", "athleisure"] },
  { id: "a-bag-11", title: "Soft Hobo Shoulder", vendor: "The Row", description: "Slouchy lambskin hobo, all-day softness.", category: "accessories", price: 1990, image: pickImg("bag"), options: [{ name: "Color", values: ["Black", "Chocolate"] }], tags: ["bag", "hobo"], styles: ["minimal", "editorial"] },
  { id: "a-bag-12", title: "Beach Tote XL", vendor: "Hermès Inspired", description: "Oversized woven beach tote.", category: "accessories", price: 89, image: pickImg("bag"), options: [], tags: ["bag", "beach"], styles: ["boho"] },

  // ===== ACCESSORIES — Shoes (12) =====
  { id: "a-shoe-1", title: "Italian Leather Mules", vendor: "Bottega Veneta", description: "Hand-stitched leather mules with kitten heel.", category: "accessories", price: 950, image: pickImg("heels"), options: [{ name: "Size", values: SIZES_SHOES }], tags: ["shoes", "mules"], styles: ["minimal", "editorial"] },
  { id: "a-shoe-2", title: "Strappy Stiletto", vendor: "Aquazzura", description: "Crystal-trim strappy stiletto in satin.", category: "accessories", price: 695, image: pickImg("heels"), options: [{ name: "Size", values: SIZES_SHOES }], tags: ["shoes", "heels"], styles: ["romantic", "editorial"] },
  { id: "a-shoe-3", title: "Square Toe Pump", vendor: "By Far", description: "Block-heel square-toe pump in patent leather.", category: "accessories", price: 425, image: pickImg("heels"), options: [{ name: "Size", values: SIZES_SHOES }], tags: ["shoes", "pump"], styles: ["minimal", "y2k"] },
  { id: "a-shoe-4", title: "Cowboy Boots", vendor: "Ganni", description: "Western cowboy boots in tonal embroidered suede.", category: "accessories", price: 645, image: pickImg("boots"), options: [{ name: "Size", values: SIZES_SHOES }], tags: ["boots", "cowboy"], styles: ["boho", "editorial"] },
  { id: "a-shoe-5", title: "Knee-High Leather Boots", vendor: "Stuart Weitzman", description: "Sleek stretch leather knee-highs.", category: "accessories", price: 798, image: pickImg("boots"), options: [{ name: "Size", values: SIZES_SHOES }], tags: ["boots", "knee-high"], styles: ["editorial", "minimal"] },
  { id: "a-shoe-6", title: "Combat Boots", vendor: "Dr. Martens", description: "Iconic 1460 leather combat boots.", category: "accessories", price: 170, image: pickImg("boots"), options: [{ name: "Size", values: SIZES_SHOES }], tags: ["boots", "combat"], styles: ["streetwear"] },
  { id: "a-shoe-7", title: "Chunky Trail Sneakers", vendor: "Salomon", description: "Performance trail sneakers with quicklace.", category: "accessories", price: 175, image: pickImg("sneaker"), options: [{ name: "Size", values: SIZES_SHOES }], tags: ["sneakers"], styles: ["streetwear", "athleisure"] },
  { id: "a-shoe-8", title: "Court Sneakers", vendor: "Common Projects", description: "Italian leather court sneakers, gold heel stamp.", category: "accessories", price: 425, image: pickImg("sneaker"), options: [{ name: "Size", values: SIZES_SHOES }], tags: ["sneakers"], styles: ["minimal", "preppy"] },
  { id: "a-shoe-9", title: "Retro Runners", vendor: "New Balance", description: "990v6 retro running silhouette.", category: "accessories", price: 199, image: pickImg("sneaker"), options: [{ name: "Size", values: SIZES_SHOES }], tags: ["sneakers", "running"], styles: ["streetwear", "athleisure"] },
  { id: "a-shoe-10", title: "Strappy Flat Sandals", vendor: "Ancient Greek Sandals", description: "Hand-made leather sandals from Athens.", category: "accessories", price: 245, image: pickImg("heels"), options: [{ name: "Size", values: SIZES_SHOES }], tags: ["sandals"], styles: ["boho", "minimal"] },
  { id: "a-shoe-11", title: "Ballet Flats", vendor: "Repetto", description: "Cendrillon leather ballet flats, ribbon tie.", category: "accessories", price: 295, image: pickImg("heels"), options: [{ name: "Size", values: SIZES_SHOES }], tags: ["flats", "ballet"], styles: ["romantic", "preppy"] },
  { id: "a-shoe-12", title: "Sport Slide", vendor: "Adidas", description: "Adilette logo slide.", category: "accessories", price: 35, image: pickImg("sneaker"), options: [{ name: "Size", values: SIZES_SHOES }], tags: ["slides"], styles: ["athleisure", "streetwear"] },

  // ===== ACCESSORIES — Jewelry / Eyewear / Other (16) =====
  { id: "a-jew-1", title: "Sculpted Gold Hoops", vendor: "Aurelia", description: "14k gold-plated hoops with hand-finished organic curve.", category: "accessories", price: 145, image: pickImg("jewelry"), options: [{ name: "Color", values: ["Gold", "Silver"] }], tags: ["jewelry", "earrings"], styles: ["minimal"] },
  { id: "a-jew-2", title: "Pearl Drop Earrings", vendor: "Sophie Bille Brahe", description: "Freshwater pearl drops on 14k gold posts.", category: "accessories", price: 380, image: pickImg("jewelry"), options: [], tags: ["jewelry", "earrings", "pearl"], styles: ["romantic", "editorial"] },
  { id: "a-jew-3", title: "Layered Chain Necklace", vendor: "Missoma", description: "Three-strand layered curb chain.", category: "accessories", price: 198, image: pickImg("jewelry"), options: [{ name: "Color", values: ["Gold", "Silver"] }], tags: ["jewelry", "necklace"], styles: ["minimal", "streetwear"] },
  { id: "a-jew-4", title: "Vintage Signet Ring", vendor: "Mejuri", description: "Bold signet ring in solid 14k gold.", category: "accessories", price: 250, image: pickImg("jewelry"), options: [], tags: ["jewelry", "ring"], styles: ["minimal", "editorial"] },
  { id: "a-jew-5", title: "Diamond Tennis Bracelet", vendor: "Anita Ko", description: "Classic diamond tennis bracelet, 18k.", category: "accessories", price: 4250, image: pickImg("jewelry"), options: [], tags: ["jewelry", "bracelet"], styles: ["editorial", "romantic"] },
  { id: "a-jew-6", title: "Beaded Friendship Bracelet Stack", vendor: "Roxanne Assoulin", description: "Set of 5 hand-beaded bracelets.", category: "accessories", price: 95, image: pickImg("jewelry"), options: [], tags: ["jewelry", "bracelet"], styles: ["boho"] },
  { id: "a-eye-1", title: "Tortoise Acetate Sunglasses", vendor: "Vela", description: "Hand-polished acetate frames with UV400 lenses.", category: "accessories", price: 215, image: pickImg("sunglasses"), options: [{ name: "Color", values: ["Tortoise", "Black", "Honey"] }], tags: ["sunglasses", "eyewear"], styles: ["minimal"] },
  { id: "a-eye-2", title: "Oversized Cat-Eye Shades", vendor: "Saint Laurent", description: "Statement cat-eye sunglasses.", category: "accessories", price: 425, image: pickImg("sunglasses"), options: [], tags: ["sunglasses"], styles: ["editorial", "y2k"] },
  { id: "a-eye-3", title: "Aviator Sunglasses", vendor: "Ray-Ban", description: "Iconic gold-frame aviators.", category: "accessories", price: 175, image: pickImg("sunglasses"), options: [], tags: ["sunglasses"], styles: ["preppy", "minimal"] },
  { id: "a-eye-4", title: "Sport Wrap Shades", vendor: "Oakley", description: "Wrap-around sport sunglasses with mirrored lenses.", category: "accessories", price: 220, image: pickImg("sunglasses"), options: [], tags: ["sunglasses", "sport"], styles: ["athleisure", "y2k"] },
  { id: "a-hat-1", title: "Wool Felt Fedora", vendor: "Janessa Leoné", description: "Hand-shaped Australian wool fedora.", category: "accessories", price: 245, image: pickImg("hat"), options: [{ name: "Color", values: ["Camel", "Black"] }], tags: ["hat", "fedora"], styles: ["boho", "editorial"] },
  { id: "a-hat-2", title: "Logo Trucker Cap", vendor: "Patagonia", description: "Mesh-back trucker with embroidered logo.", category: "accessories", price: 35, image: pickImg("hat"), options: [], tags: ["hat", "cap"], styles: ["streetwear", "athleisure"] },
  { id: "a-scf-1", title: "Silk Twill Scarf", vendor: "Hermès Inspired", description: "Hand-rolled silk twill square scarf.", category: "accessories", price: 365, image: pickImg("scarf"), options: [], tags: ["scarf", "silk"], styles: ["preppy", "editorial"] },
  { id: "a-blt-1", title: "Western Buckle Belt", vendor: "B-Low the Belt", description: "Italian leather western belt with antique buckle.", category: "accessories", price: 225, image: pickImg("belt"), options: [{ name: "Color", values: ["Black", "Cognac"] }], tags: ["belt"], styles: ["boho", "editorial"] },
  { id: "a-wat-1", title: "Minimalist Field Watch", vendor: "Timex", description: "39mm field watch on woven nylon strap.", category: "accessories", price: 165, image: pickImg("watch"), options: [], tags: ["watch"], styles: ["minimal", "preppy"] },
  { id: "a-wat-2", title: "Two-Tone Bracelet Watch", vendor: "Cartier Inspired", description: "Tank-style two-tone bracelet watch.", category: "accessories", price: 895, image: pickImg("watch"), options: [], tags: ["watch"], styles: ["editorial", "preppy"] },

  // ===== BEAUTY — Skincare (10) =====
  { id: "b-sk-1", title: "Rose Facial Oil", vendor: "Botanica", description: "Cold-pressed rosehip + jojoba oil for radiance.", category: "beauty", price: 64, image: pickImg("skincare"), options: [], tags: ["skincare", "oil"], styles: ["minimal", "romantic"] },
  { id: "b-sk-2", title: "Vitamin C Serum 15%", vendor: "Drunk Elephant", description: "Brightening L-ascorbic acid serum.", category: "beauty", price: 80, image: pickImg("skincare"), options: [], tags: ["skincare", "serum"], styles: ["minimal"] },
  { id: "b-sk-3", title: "Hyaluronic Hydrator", vendor: "The Ordinary", description: "Multi-weight hyaluronic acid for plump skin.", category: "beauty", price: 9, image: pickImg("skincare"), options: [], tags: ["skincare", "serum"], styles: ["minimal"] },
  { id: "b-sk-4", title: "Daily SPF 50", vendor: "Supergoop!", description: "Invisible mineral SPF 50, no white cast.", category: "beauty", price: 38, image: pickImg("skincare"), options: [], tags: ["skincare", "spf"], styles: ["minimal", "athleisure"] },
  { id: "b-sk-5", title: "Cleansing Balm", vendor: "Augustinus Bader", description: "Triple-action cleansing balm.", category: "beauty", price: 80, image: pickImg("skincare"), options: [], tags: ["skincare", "cleanser"], styles: ["minimal"] },
  { id: "b-sk-6", title: "Retinol Night Cream", vendor: "Sunday Riley", description: "Retinol + peptide overnight treatment.", category: "beauty", price: 130, image: pickImg("skincare"), options: [], tags: ["skincare", "retinol"], styles: ["minimal"] },
  { id: "b-sk-7", title: "Face Mist Toner", vendor: "Tatcha", description: "Essence-mist hybrid for travel.", category: "beauty", price: 48, image: pickImg("skincare"), options: [], tags: ["skincare", "mist"], styles: ["minimal", "boho"] },
  { id: "b-sk-8", title: "Body Lotion 250ml", vendor: "Aesop", description: "Resurrection aromatique body balm.", category: "beauty", price: 49, image: pickImg("skincare"), options: [], tags: ["bodycare"], styles: ["minimal", "editorial"] },
  { id: "b-sk-9", title: "Lip Mask Overnight", vendor: "Laneige", description: "Overnight repair lip mask.", category: "beauty", price: 24, image: pickImg("skincare"), options: [], tags: ["lipcare"], styles: ["romantic", "minimal"] },
  { id: "b-sk-10", title: "Bakuchiol Treatment", vendor: "Herbivore", description: "Plant-based retinol alternative.", category: "beauty", price: 54, image: pickImg("skincare"), options: [], tags: ["skincare", "treatment"], styles: ["boho"] },

  // ===== BEAUTY — Fragrance (5) =====
  { id: "b-fr-1", title: "Nuit · Eau de Parfum 50ml", vendor: "Maison Nuit", description: "Notes of bergamot, oud, and white musk.", category: "beauty", price: 165, image: pickImg("fragrance"), options: [], tags: ["fragrance", "perfume"], styles: ["editorial", "romantic"] },
  { id: "b-fr-2", title: "Santal 33", vendor: "Le Labo", description: "Cult sandalwood signature, 50ml.", category: "beauty", price: 220, image: pickImg("fragrance"), options: [], tags: ["fragrance"], styles: ["editorial", "minimal"] },
  { id: "b-fr-3", title: "Discovery Set", vendor: "Maison Margiela", description: "5x replica fragrance discovery set.", category: "beauty", price: 50, image: pickImg("fragrance"), options: [], tags: ["fragrance", "set"], styles: ["editorial"] },
  { id: "b-fr-4", title: "Solid Perfume", vendor: "Diptyque", description: "Tam Dao solid perfume in compact.", category: "beauty", price: 65, image: pickImg("fragrance"), options: [], tags: ["fragrance"], styles: ["minimal", "boho"] },
  { id: "b-fr-5", title: "Body Oil Frangipani", vendor: "Sol de Janeiro", description: "Bum Bum scented body shimmer oil.", category: "beauty", price: 38, image: pickImg("fragrance"), options: [], tags: ["bodycare", "fragrance"], styles: ["boho", "y2k"] },

  // ===== BEAUTY — Makeup & Hair (8) =====
  { id: "b-mk-1", title: "Velvet Matte Lipstick", vendor: "Lumière Beauté", description: "Buttery matte finish, 12-hour wear.", category: "beauty", price: 38, image: pickImg("makeup"), options: [{ name: "Color", values: ["Brique", "Mauve", "Rouge", "Nude"] }], tags: ["makeup", "lipstick"], styles: ["minimal", "romantic"] },
  { id: "b-mk-2", title: "Cream Blush Stick", vendor: "Westman Atelier", description: "Skin-like cream blush in luxe twist tube.", category: "beauty", price: 48, image: pickImg("makeup"), options: [{ name: "Color", values: ["Petal", "Berry", "Coral"] }], tags: ["makeup", "blush"], styles: ["romantic", "minimal"] },
  { id: "b-mk-3", title: "Tinted Lip Oil", vendor: "Dior", description: "Glossy tinted lip oil with cherry shine.", category: "beauty", price: 42, image: pickImg("makeup"), options: [], tags: ["makeup", "lip"], styles: ["y2k", "romantic"] },
  { id: "b-mk-4", title: "Liquid Eyeliner Pen", vendor: "Stila", description: "Stay-all-day liquid eyeliner.", category: "beauty", price: 26, image: pickImg("makeup"), options: [], tags: ["makeup", "liner"], styles: ["editorial", "y2k"] },
  { id: "b-mk-5", title: "Bronzer Powder", vendor: "Hourglass", description: "Ambient bronzer in three tones.", category: "beauty", price: 58, image: pickImg("makeup"), options: [], tags: ["makeup", "bronzer"], styles: ["minimal", "boho"] },
  { id: "b-mk-6", title: "Brow Gel", vendor: "Anastasia", description: "Tinted brow gel for full natural brows.", category: "beauty", price: 24, image: pickImg("makeup"), options: [], tags: ["makeup", "brow"], styles: ["minimal"] },
  { id: "b-hr-1", title: "Hair Repair Serum", vendor: "Olaplex", description: "No.7 bonding hair oil.", category: "beauty", price: 32, image: pickImg("haircare"), options: [], tags: ["haircare", "oil"], styles: ["minimal"] },
  { id: "b-hr-2", title: "Silk Hair Scrunchies x3", vendor: "Slip", description: "Pure silk scrunchies, kind to hair.", category: "beauty", price: 39, image: pickImg("haircare"), options: [], tags: ["haircare", "accessories"], styles: ["romantic", "preppy"] },

  // ===== HOME — Decor & Textile (12) =====
  { id: "h-dc-1", title: "Ribbed Ceramic Vase", vendor: "Studio Cura", description: "Hand-thrown stoneware vase with matte bone glaze.", category: "home", price: 89, image: pickImg("decor"), options: [{ name: "Color", values: ["Bone", "Clay"] }], tags: ["decor", "ceramic"], styles: ["minimal"] },
  { id: "h-dc-2", title: "Glass Bud Vase Set", vendor: "Hay", description: "Set of three coloured glass bud vases.", category: "home", price: 65, image: pickImg("decor"), options: [], tags: ["decor", "glass"], styles: ["minimal", "editorial"] },
  { id: "h-dc-3", title: "Marble Coffee Tray", vendor: "Menu", description: "Carrara marble round tray, 16in.", category: "home", price: 145, image: pickImg("decor"), options: [], tags: ["decor", "tray"], styles: ["minimal", "editorial"] },
  { id: "h-dc-4", title: "Woven Rattan Mirror", vendor: "Soho Home", description: "Round rattan-frame mirror, 80cm.", category: "home", price: 240, image: pickImg("decor"), options: [], tags: ["decor", "mirror"], styles: ["boho", "romantic"] },
  { id: "h-dc-5", title: "Sculptural Bookend Pair", vendor: "Areaware", description: "Cast resin bookends in organic forms.", category: "home", price: 95, image: pickImg("decor"), options: [], tags: ["decor", "objet"], styles: ["editorial", "minimal"] },
  { id: "h-dc-6", title: "Modular Wall Shelf", vendor: "Muuto", description: "Powder-coated steel wall shelf.", category: "home", price: 220, image: pickImg("decor"), options: [], tags: ["furniture", "shelf"], styles: ["minimal"] },
  { id: "h-tx-1", title: "Stonewashed Linen Throw", vendor: "Maison Blanc", description: "Heavyweight Belgian linen throw, machine washable.", category: "home", price: 128, image: pickImg("textile"), options: [{ name: "Color", values: ["Ivory", "Sage", "Slate"] }], tags: ["textile", "throw"], styles: ["minimal", "boho"] },
  { id: "h-tx-2", title: "Boucle Cushion Cover", vendor: "Society Limonta", description: "Plush boucle 50x50 cushion cover.", category: "home", price: 95, image: pickImg("textile"), options: [{ name: "Color", values: ["Cream", "Camel"] }], tags: ["textile", "cushion"], styles: ["minimal", "romantic"] },
  { id: "h-tx-3", title: "Vintage Berber Rug 5x7", vendor: "Beni Ourain", description: "Hand-woven Moroccan wool rug.", category: "home", price: 685, image: pickImg("textile"), options: [], tags: ["textile", "rug"], styles: ["boho"] },
  { id: "h-cn-1", title: "Tobacco & Vetiver Candle", vendor: "Boy Smells", description: "Soy-coconut wax candle with notes of tobacco.", category: "home", price: 42, image: pickImg("candle"), options: [], tags: ["candle"], styles: ["editorial", "romantic"] },
  { id: "h-cn-2", title: "Fig Tree Candle 8oz", vendor: "Diptyque", description: "Iconic Figuier scented candle.", category: "home", price: 78, image: pickImg("candle"), options: [], tags: ["candle"], styles: ["editorial", "minimal"] },
  { id: "h-cn-3", title: "Travel Tin Candle", vendor: "P.F. Candle Co.", description: "Travel size soy candle in patchouli + sweet grapefruit.", category: "home", price: 18, image: pickImg("candle"), options: [], tags: ["candle"], styles: ["boho", "minimal"] },

  // ===== AFFORDABLE FINDS — Everyday picks under $80 =====
  // Dresses
  { id: "af-dress-1", title: "Smocked Mini Sundress", vendor: "Old Navy", description: "Cotton sundress with shirred bodice — easy summer staple.", category: "fashion", price: 38, image: pickImg("dress"), options: [{ name: "Size", values: SIZES_APPAREL }, { name: "Color", values: ["White", "Sage", "Black"] }], tags: ["dress", "mini", "summer", "budget"], styles: ["minimal", "romantic"] },
  { id: "af-dress-2", title: "Ribbed Tank Midi", vendor: "H&M", description: "Body-skimming ribbed knit midi dress.", category: "fashion", price: 29, image: pickImg("dress"), options: [{ name: "Size", values: SIZES_APPAREL }, { name: "Color", values: ["Black", "Mocha", "Cream"] }], tags: ["dress", "midi", "knit", "budget"], styles: ["minimal"] },
  { id: "af-dress-3", title: "Floral Wrap Dress", vendor: "Shein X Studio", description: "Wrap-style mini in painterly floral.", category: "fashion", price: 24, image: pickImg("dress"), options: [{ name: "Size", values: SIZES_APPAREL }], tags: ["dress", "floral", "budget"], styles: ["romantic", "boho"] },
  { id: "af-dress-4", title: "Linen-Blend Shirtdress", vendor: "Uniqlo", description: "Easy belted shirtdress in airy linen blend.", category: "fashion", price: 49, image: pickImg("dress"), options: [{ name: "Size", values: SIZES_APPAREL }, { name: "Color", values: ["Sand", "White"] }], tags: ["dress", "linen", "budget"], styles: ["minimal", "preppy"] },
  { id: "af-dress-5", title: "T-Shirt Maxi Dress", vendor: "Gap", description: "Soft jersey maxi with side slits.", category: "fashion", price: 45, image: pickImg("dress"), options: [{ name: "Size", values: SIZES_APPAREL }, { name: "Color", values: ["Black", "Navy", "Olive"] }], tags: ["dress", "maxi", "casual", "budget"], styles: ["minimal", "athleisure"] },
  { id: "af-dress-6", title: "Satin Slip Mini", vendor: "Princess Polly", description: "Affordable cowl-neck satin mini, going-out ready.", category: "fashion", price: 55, image: pickImg("dress"), options: [{ name: "Size", values: SIZES_APPAREL }, { name: "Color", values: ["Champagne", "Black", "Sage"] }], tags: ["dress", "satin", "going-out", "budget"], styles: ["romantic", "y2k"] },

  // Tops
  { id: "af-top-1", title: "Essential Crewneck Tee", vendor: "Uniqlo", description: "Soft Supima cotton crewneck in 8 shades.", category: "fashion", price: 15, image: pickImg("tee"), options: [{ name: "Size", values: SIZES_APPAREL }, { name: "Color", values: ["White", "Black", "Sand", "Navy"] }], tags: ["tee", "basic", "budget"], styles: ["minimal", "preppy"] },
  { id: "af-top-2", title: "Ribbed Tank Top", vendor: "H&M", description: "Stretchy ribbed tank, layer or wear solo.", category: "fashion", price: 12, image: pickImg("tee"), options: [{ name: "Size", values: SIZES_APPAREL }, { name: "Color", values: ["Black", "White", "Mocha"] }], tags: ["tank", "basic", "budget"], styles: ["minimal", "athleisure"] },
  { id: "af-top-3", title: "Oversized Boyfriend Tee", vendor: "Hanes Originals", description: "Heavyweight cotton tee, slouchy boxy fit.", category: "fashion", price: 22, image: pickImg("tee"), options: [{ name: "Size", values: SIZES_APPAREL }, { name: "Color", values: ["White", "Faded Black"] }], tags: ["tee", "oversized", "budget"], styles: ["streetwear", "minimal"] },
   { id: "af-top-4", title: "Cropped Hoodie", vendor: "Forever 21", description: "Soft fleece cropped hoodie.", category: "fashion", price: 32, image: pickImg("hoodie"), options: [{ name: "Size", values: SIZES_APPAREL }, { name: "Color", values: ["Cream", "Black", "Pink"] }], tags: ["hoodie", "cropped", "budget"], styles: ["streetwear", "y2k"] },
  { id: "af-top-5", title: "Puff-Sleeve Blouse", vendor: "Zara", description: "Cotton blouse with mini puff sleeves.", category: "fashion", price: 39, image: pickImg("knit"), options: [{ name: "Size", values: SIZES_APPAREL }, { name: "Color", values: ["White", "Powder Blue"] }], tags: ["blouse", "budget"], styles: ["romantic", "preppy"] },
  { id: "af-top-6", title: "Cotton Cardigan", vendor: "Mango", description: "Lightweight knit cardigan with pearl buttons.", category: "fashion", price: 49, image: pickImg("knit"), options: [{ name: "Size", values: SIZES_APPAREL }, { name: "Color", values: ["Cream", "Black", "Sage"] }], tags: ["cardigan", "knit", "budget"], styles: ["preppy", "romantic"] },
  { id: "af-top-7", title: "Bodysuit Square Neck", vendor: "Skims Dupe", description: "Stretch jersey bodysuit, square neckline.", category: "fashion", price: 28, image: pickImg("tee"), options: [{ name: "Size", values: SIZES_APPAREL }, { name: "Color", values: ["Mocha", "Black", "Bone"] }], tags: ["bodysuit", "basic", "budget"], styles: ["minimal", "y2k"] },

  // Bottoms
  { id: "af-bot-1", title: "Wide-Leg Linen Pants", vendor: "Old Navy", description: "Easy linen-blend pull-on pants.", category: "fashion", price: 42, image: pickImg("pants"), options: [{ name: "Size", values: SIZES_APPAREL }, { name: "Color", values: ["Natural", "Black"] }], tags: ["pants", "linen", "budget"], styles: ["minimal", "boho"] },
  { id: "af-bot-2", title: "High-Rise Mom Jeans", vendor: "Levi's Premium", description: "Vintage-feel rigid mom-fit jeans.", category: "fashion", price: 79, image: pickImg("denim"), options: [{ name: "Size", values: SIZES_DENIM }], tags: ["denim", "jeans", "budget"], styles: ["minimal", "y2k"] },
  { id: "af-bot-3", title: "Sweatpants Tapered", vendor: "Champion", description: "Brushed-back fleece tapered joggers.", category: "fashion", price: 38, image: pickImg("pants"), options: [{ name: "Size", values: SIZES_APPAREL }, { name: "Color", values: ["Heather", "Black"] }], tags: ["sweatpants", "athleisure", "budget"], styles: ["athleisure", "streetwear"] },
  { id: "af-bot-4", title: "Pleated Mini Skirt", vendor: "Brandy Melville", description: "Plaid pleated mini, schoolgirl classic.", category: "fashion", price: 35, image: pickImg("skirt"), options: [{ name: "Size", values: SIZES_APPAREL }], tags: ["skirt", "mini", "budget"], styles: ["preppy", "y2k"] },
  { id: "af-bot-5", title: "Bias Slip Midi Skirt", vendor: "ASOS Design", description: "Satin bias-cut midi skirt.", category: "fashion", price: 35, image: pickImg("skirt"), options: [{ name: "Size", values: SIZES_APPAREL }, { name: "Color", values: ["Black", "Champagne", "Wine"] }], tags: ["skirt", "satin", "budget"], styles: ["minimal", "romantic"] },
  { id: "af-bot-6", title: "Bike Shorts Two-Pack", vendor: "Target A New Day", description: "Soft jersey bike shorts, set of two.", category: "fashion", price: 18, image: pickImg("activewear"), options: [{ name: "Size", values: SIZES_APPAREL }, { name: "Color", values: ["Black", "Charcoal"] }], tags: ["shorts", "athleisure", "budget"], styles: ["athleisure"] },

  // Accessories — bags, jewelry, sunnies, hats
  { id: "af-acc-1", title: "Canvas Tote Everyday", vendor: "Baggu Mini", description: "Recycled canvas everyday tote, packs flat.", category: "accessories", price: 16, image: pickImg("bag"), options: [{ name: "Color", values: ["Sand", "Black", "Sky", "Olive"] }], tags: ["bag", "tote", "budget"], styles: ["minimal", "boho"] },
  { id: "af-acc-2", title: "Faux Leather Crossbody", vendor: "Madden NYC", description: "Quilted vegan leather crossbody.", category: "accessories", price: 35, image: pickImg("bag"), options: [{ name: "Color", values: ["Black", "Cream"] }], tags: ["bag", "crossbody", "budget"], styles: ["minimal", "preppy"] },
  { id: "af-acc-3", title: "Mini Shoulder Bag", vendor: "Charles & Keith", description: "Trendy mini shoulder bag with chain strap.", category: "accessories", price: 59, image: pickImg("bag"), options: [{ name: "Color", values: ["Black", "Pistachio", "Caramel"] }], tags: ["bag", "shoulder", "budget"], styles: ["editorial", "y2k"] },
  { id: "af-acc-4", title: "Gold-Tone Hoop Set", vendor: "BaubleBar", description: "Set of 3 gold-tone hoops in graduating sizes.", category: "accessories", price: 28, image: pickImg("jewelry"), options: [], tags: ["jewelry", "earrings", "budget"], styles: ["minimal", "y2k"] },
  { id: "af-acc-5", title: "Pearl Choker Necklace", vendor: "Mejuri Lite", description: "Freshwater pearl choker with extender.", category: "accessories", price: 45, image: pickImg("jewelry"), options: [], tags: ["jewelry", "necklace", "budget"], styles: ["romantic", "preppy"] },
  { id: "af-acc-6", title: "Stackable Ring Set 5pc", vendor: "Quince", description: "Five-piece stackable ring set, gold vermeil.", category: "accessories", price: 55, image: pickImg("jewelry"), options: [], tags: ["jewelry", "ring", "budget"], styles: ["minimal", "boho"] },
  { id: "af-acc-7", title: "Acetate Sunglasses", vendor: "Quay", description: "On-trend angular acetate sunnies.", category: "accessories", price: 65, image: pickImg("sunglasses"), options: [{ name: "Color", values: ["Tortoise", "Black"] }], tags: ["sunglasses", "budget"], styles: ["editorial", "y2k"] },
  { id: "af-acc-8", title: "Bucket Hat Cotton", vendor: "Kangol Lite", description: "Cotton twill bucket hat.", category: "accessories", price: 22, image: pickImg("hat"), options: [{ name: "Color", values: ["Black", "Khaki", "Cream"] }], tags: ["hat", "bucket", "budget"], styles: ["streetwear", "boho"] },
  { id: "af-acc-9", title: "Knit Beanie", vendor: "Carhartt", description: "Acrylic ribbed watch beanie.", category: "accessories", price: 20, image: pickImg("hat"), options: [{ name: "Color", values: ["Black", "Heather", "Olive"] }], tags: ["hat", "beanie", "budget"], styles: ["streetwear", "minimal"] },
  { id: "af-acc-10", title: "Canvas Sneaker", vendor: "Converse", description: "Iconic canvas low-top sneaker.", category: "accessories", price: 60, image: pickImg("sneaker"), options: [{ name: "Size", values: SIZES_SHOES }, { name: "Color", values: ["White", "Black", "Cream"] }], tags: ["sneakers", "budget"], styles: ["streetwear", "preppy"] },
  { id: "af-acc-11", title: "Slide Sandals", vendor: "Old Navy", description: "Padded faux-leather slide sandals.", category: "accessories", price: 19, image: pickImg("heels"), options: [{ name: "Size", values: SIZES_SHOES }, { name: "Color", values: ["Black", "Tan"] }], tags: ["sandals", "budget"], styles: ["minimal", "athleisure"] },
  { id: "af-acc-12", title: "Woven Belt", vendor: "ASOS Design", description: "Braided faux-leather waist belt.", category: "accessories", price: 18, image: pickImg("belt"), options: [{ name: "Color", values: ["Brown", "Black"] }], tags: ["belt", "budget"], styles: ["boho", "preppy"] },
];

export const localProducts: LocalProduct[] = seeds.map((s) => ({
  node: {
    id: s.id,
    handle: s.id,
    title: s.title,
    description: s.description,
    vendor: s.vendor,
    productType: s.category,
    tags: [...(s.tags || []), ...(s.styles || []).map((x) => `style:${x}`)],
    priceRange: { minVariantPrice: { amount: s.price.toFixed(2), currencyCode: "USD" } },
    images: { edges: [{ node: { url: s.image, altText: s.title } }] },
    options: s.options,
    variants: {
      edges: buildVariants(s.id, s.price, s.options).map((v) => ({ node: v })),
    },
  },
}));

// Export the raw seeds too — concierge edge function & swap logic use this.
export const productSeeds = seeds;

export const categoryLabels: Record<Exclude<ShopCategory, "all">, string> = {
  fashion: "Fashion",
  accessories: "Accessories",
  beauty: "Beauty",
  home: "Home",
};

export const allBrands = Array.from(
  new Set(localProducts.map((p) => p.node.vendor))
).sort();

export const allSizes = Array.from(
  new Set(
    localProducts.flatMap((p) =>
      p.node.options
        .filter((o) => o.name === "Size")
        .flatMap((o) => o.values)
    )
  )
);

export const allColors = Array.from(
  new Set(
    localProducts.flatMap((p) =>
      p.node.options
        .filter((o) => o.name === "Color")
        .flatMap((o) => o.values)
    )
  )
).sort();

export const priceBounds = {
  min: Math.min(...localProducts.map((p) => parseFloat(p.node.priceRange.minVariantPrice.amount))),
  max: Math.ceil(
    Math.max(...localProducts.map((p) => parseFloat(p.node.priceRange.minVariantPrice.amount)))
  ),
};
