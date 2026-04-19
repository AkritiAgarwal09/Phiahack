// Mirror of the client catalog (kept compact: id, title, vendor, price, category, tags, styles).
// Edit BOTH places when adding products. The concierge filters this list before
// passing a small slice into the model prompt to keep context windows small.

export interface CatalogItem {
  id: string;
  title: string;
  vendor: string;
  price: number;
  category: "fashion" | "accessories" | "beauty" | "home";
  tags: string[];
  styles: string[];
}

export const CATALOG: CatalogItem[] = [
  // Dresses
  { id: "f-dress-1", title: "Silk Slip Dress", vendor: "Atelier Noir", price: 289, category: "fashion", tags: ["dress","silk","evening"], styles: ["minimal","romantic"] },
  { id: "f-dress-2", title: "Cotton Poplin Midi Dress", vendor: "Études", price: 165, category: "fashion", tags: ["dress","cotton","summer"], styles: ["minimal","preppy"] },
  { id: "f-dress-3", title: "Floral Wrap Maxi", vendor: "Réalisation", price: 320, category: "fashion", tags: ["dress","maxi","floral"], styles: ["romantic","boho"] },
  { id: "f-dress-4", title: "Ribbed Knit Mini Dress", vendor: "House of Sunny", price: 95, category: "fashion", tags: ["dress","knit","mini"], styles: ["minimal","y2k"] },
  { id: "f-dress-5", title: "Linen Sundress", vendor: "Faithfull the Brand", price: 218, category: "fashion", tags: ["dress","linen","vacation"], styles: ["boho","romantic"] },
  { id: "f-dress-6", title: "Black Tie Gown", vendor: "Galvan", price: 1250, category: "fashion", tags: ["dress","gown","formal"], styles: ["editorial","romantic"] },
  { id: "f-dress-7", title: "Mesh Bodycon Mini", vendor: "I.AM.GIA", price: 75, category: "fashion", tags: ["dress","going-out"], styles: ["y2k","streetwear"] },
  { id: "f-dress-8", title: "Tailored Shirt Dress", vendor: "Toteme", price: 480, category: "fashion", tags: ["dress","shirtdress"], styles: ["minimal","editorial"] },
  { id: "f-dress-9", title: "Tiered Cotton Maxi", vendor: "Doen", price: 268, category: "fashion", tags: ["dress","maxi"], styles: ["romantic","boho"] },
  { id: "f-dress-10", title: "Slip Mini in Satin", vendor: "Reformation", price: 148, category: "fashion", tags: ["dress","satin"], styles: ["romantic","minimal"] },
  { id: "f-dress-11", title: "Cargo Cargo Dress", vendor: "Acne Studios", price: 395, category: "fashion", tags: ["dress","utility"], styles: ["streetwear","editorial"] },
  { id: "f-dress-12", title: "Ditsy Floral Mini", vendor: "& Other Stories", price: 89, category: "fashion", tags: ["dress","floral","mini"], styles: ["romantic"] },
  { id: "f-dress-13", title: "Cut-Out Jersey Dress", vendor: "Mugler", price: 890, category: "fashion", tags: ["dress","jersey","going-out"], styles: ["editorial","y2k"] },
  { id: "f-dress-14", title: "Sweater Midi Dress", vendor: "COS", price: 175, category: "fashion", tags: ["dress","knit"], styles: ["minimal"] },
  { id: "f-dress-15", title: "Polka Dot Tea Dress", vendor: "Rixo", price: 365, category: "fashion", tags: ["dress","vintage"], styles: ["romantic"] },
  // Outerwear
  { id: "f-outer-1", title: "Cashmere Wrap Trench", vendor: "Maison Lune", price: 642, category: "fashion", tags: ["coat","outerwear","cashmere"], styles: ["minimal","editorial"] },
  { id: "f-outer-2", title: "Oversized Wool Coat", vendor: "Toteme", price: 1120, category: "fashion", tags: ["coat","wool"], styles: ["minimal"] },
  { id: "f-outer-3", title: "Vintage Leather Jacket", vendor: "AllSaints", price: 498, category: "fashion", tags: ["jacket","leather"], styles: ["streetwear","editorial"] },
  { id: "f-outer-4", title: "Quilted Puffer", vendor: "Ganni", price: 295, category: "fashion", tags: ["jacket","puffer"], styles: ["streetwear"] },
  { id: "f-outer-5", title: "Faux Shearling Aviator", vendor: "Stand Studio", price: 425, category: "fashion", tags: ["jacket","shearling"], styles: ["editorial","boho"] },
  { id: "f-outer-6", title: "Classic Trench Coat", vendor: "Burberry", price: 1890, category: "fashion", tags: ["trench","outerwear"], styles: ["preppy","minimal"] },
  { id: "f-outer-7", title: "Cropped Denim Jacket", vendor: "Levi's", price: 98, category: "fashion", tags: ["jacket","denim"], styles: ["streetwear","preppy"] },
  { id: "f-outer-8", title: "Wool-Blend Bomber", vendor: "Acne Studios", price: 695, category: "fashion", tags: ["jacket","bomber"], styles: ["streetwear","editorial"] },
  { id: "f-outer-9", title: "Padded Liner Vest", vendor: "Arket", price: 125, category: "fashion", tags: ["vest","outerwear"], styles: ["minimal","athleisure"] },
  { id: "f-outer-10", title: "Linen Duster Coat", vendor: "Doen", price: 348, category: "fashion", tags: ["coat","linen"], styles: ["boho","minimal"] },
  // Tops
  { id: "f-top-1", title: "Oversized Linen Blazer", vendor: "Études", price: 410, category: "fashion", tags: ["blazer","linen","tailoring"], styles: ["editorial","minimal"] },
  { id: "f-top-2", title: "Cropped Tweed Blazer", vendor: "Self-Portrait", price: 425, category: "fashion", tags: ["blazer","tweed"], styles: ["preppy","romantic"] },
  { id: "f-top-3", title: "Cashmere Crewneck", vendor: "Naadam", price: 145, category: "fashion", tags: ["sweater","cashmere","knit"], styles: ["minimal","preppy"] },
  { id: "f-top-4", title: "Chunky Cable Knit", vendor: "& Other Stories", price: 169, category: "fashion", tags: ["sweater","cardigan"], styles: ["preppy","boho"] },
  { id: "f-top-5", title: "Ribbed Mock Neck", vendor: "COS", price: 65, category: "fashion", tags: ["top","ribbed","basic"], styles: ["minimal"] },
  { id: "f-top-6", title: "Vintage Wash Tee", vendor: "RE/DONE", price: 95, category: "fashion", tags: ["tee","basic"], styles: ["minimal","streetwear"] },
  { id: "f-top-7", title: "Logo Heavyweight Tee", vendor: "Stüssy", price: 55, category: "fashion", tags: ["tee","logo"], styles: ["streetwear"] },
  { id: "f-top-8", title: "Boxy Hoodie", vendor: "Essentials", price: 110, category: "fashion", tags: ["hoodie","fleece"], styles: ["streetwear","athleisure"] },
  { id: "f-top-9", title: "Silk Camisole", vendor: "La Perla", price: 180, category: "fashion", tags: ["top","silk","camisole"], styles: ["romantic"] },
  { id: "f-top-10", title: "Puff Sleeve Blouse", vendor: "Sandy Liang", price: 245, category: "fashion", tags: ["top","blouse"], styles: ["romantic","editorial"] },
  { id: "f-top-11", title: "Mesh Long Sleeve", vendor: "Diesel", price: 145, category: "fashion", tags: ["top","mesh"], styles: ["y2k","streetwear"] },
  { id: "f-top-12", title: "Merino Polo Shirt", vendor: "Sunspel", price: 225, category: "fashion", tags: ["polo","knit"], styles: ["preppy","minimal"] },
  { id: "f-top-13", title: "Crochet Halter Top", vendor: "Sir.", price: 195, category: "fashion", tags: ["top","crochet"], styles: ["boho","y2k"] },
  { id: "f-top-14", title: "Boxy Button-Down", vendor: "The Frankie Shop", price: 195, category: "fashion", tags: ["shirt","button-down"], styles: ["minimal","editorial"] },
  { id: "f-top-15", title: "Quarter-Zip Sweatshirt", vendor: "Aimé Leon Dore", price: 178, category: "fashion", tags: ["sweatshirt","quarter-zip"], styles: ["preppy","streetwear"] },
  // Bottoms
  { id: "f-bot-1", title: "High-Rise Wide-Leg Denim", vendor: "Kōji Denim", price: 245, category: "fashion", tags: ["denim","jeans"], styles: ["minimal","editorial"] },
  { id: "f-bot-2", title: "Baggy Carpenter Jeans", vendor: "Carhartt WIP", price: 168, category: "fashion", tags: ["denim","jeans","baggy"], styles: ["streetwear"] },
  { id: "f-bot-3", title: "Low-Rise Bootcut Jeans", vendor: "Re/Done", price: 295, category: "fashion", tags: ["denim","jeans"], styles: ["y2k"] },
  { id: "f-bot-4", title: "Skinny Black Jeans", vendor: "Frame", price: 198, category: "fashion", tags: ["denim","skinny"], styles: ["minimal"] },
  { id: "f-bot-5", title: "Pleated Trousers", vendor: "Toteme", price: 425, category: "fashion", tags: ["trousers","tailoring"], styles: ["minimal","editorial"] },
  { id: "f-bot-6", title: "Cargo Parachute Pants", vendor: "JNCO", price: 135, category: "fashion", tags: ["pants","cargo"], styles: ["streetwear","y2k"] },
  { id: "f-bot-7", title: "Linen Drawstring Pants", vendor: "Faherty", price: 158, category: "fashion", tags: ["pants","linen"], styles: ["boho","minimal"] },
  { id: "f-bot-8", title: "Mini Cargo Skirt", vendor: "Dion Lee", price: 295, category: "fashion", tags: ["skirt","mini","cargo"], styles: ["streetwear","y2k"] },
  { id: "f-bot-9", title: "Pleated Tennis Skirt", vendor: "Lacoste", price: 95, category: "fashion", tags: ["skirt","tennis"], styles: ["preppy"] },
  { id: "f-bot-10", title: "Maxi Slip Skirt", vendor: "Vince", price: 285, category: "fashion", tags: ["skirt","maxi","silk"], styles: ["minimal","romantic"] },
  { id: "f-bot-11", title: "Wide-Leg Trousers", vendor: "Arket", price: 135, category: "fashion", tags: ["pants","wide-leg"], styles: ["minimal"] },
  { id: "f-bot-12", title: "Faux Leather Pants", vendor: "Commando", price: 168, category: "fashion", tags: ["pants","leather"], styles: ["editorial","y2k"] },
  // Activewear
  { id: "f-act-1", title: "Yoga Bra Top", vendor: "Alo Yoga", price: 64, category: "fashion", tags: ["activewear","bra"], styles: ["athleisure"] },
  { id: "f-act-2", title: "High-Waist Leggings", vendor: "Lululemon", price: 128, category: "fashion", tags: ["leggings","activewear"], styles: ["athleisure"] },
  { id: "f-act-3", title: "Tennis Polo Dress", vendor: "Halara", price: 55, category: "fashion", tags: ["activewear","dress"], styles: ["athleisure","preppy"] },
  { id: "f-act-4", title: "Compression Bike Shorts", vendor: "Sweaty Betty", price: 68, category: "fashion", tags: ["activewear","shorts"], styles: ["athleisure"] },
  { id: "f-act-5", title: "Track Jacket", vendor: "Adidas Originals", price: 95, category: "fashion", tags: ["activewear","jacket"], styles: ["athleisure","streetwear"] },
  // Bags
  { id: "a-bag-1", title: "Lumière Leather Tote", vendor: "Studio Lumière", price: 640, category: "accessories", tags: ["bag","leather","tote"], styles: ["minimal","editorial"] },
  { id: "a-bag-2", title: "Mini Crescent Bag", vendor: "Khaite", price: 1450, category: "accessories", tags: ["bag","shoulder"], styles: ["minimal","editorial"] },
  { id: "a-bag-3", title: "Quilted Chain Bag", vendor: "Aupen", price: 525, category: "accessories", tags: ["bag","quilted"], styles: ["editorial","preppy"] },
  { id: "a-bag-4", title: "Canvas Crossbody", vendor: "Baggu", price: 48, category: "accessories", tags: ["bag","canvas"], styles: ["minimal","boho"] },
  { id: "a-bag-5", title: "Beaded Evening Clutch", vendor: "Cult Gaia", price: 295, category: "accessories", tags: ["bag","clutch"], styles: ["romantic","boho"] },
  { id: "a-bag-6", title: "Nylon Sling", vendor: "Prada", price: 1090, category: "accessories", tags: ["bag","nylon"], styles: ["streetwear","y2k"] },
  { id: "a-bag-7", title: "Woven Raffia Bag", vendor: "Loewe", price: 720, category: "accessories", tags: ["bag","raffia"], styles: ["boho"] },
  { id: "a-bag-8", title: "Suede Bucket Bag", vendor: "Mansur Gavriel", price: 495, category: "accessories", tags: ["bag","suede"], styles: ["minimal","boho"] },
  { id: "a-bag-9", title: "Mini Top Handle", vendor: "JW Pei", price: 99, category: "accessories", tags: ["bag","mini"], styles: ["minimal","preppy"] },
  { id: "a-bag-10", title: "Backpack 25L", vendor: "Herschel", price: 95, category: "accessories", tags: ["bag","backpack"], styles: ["streetwear","athleisure"] },
  { id: "a-bag-11", title: "Soft Hobo Shoulder", vendor: "The Row", price: 1990, category: "accessories", tags: ["bag","hobo"], styles: ["minimal","editorial"] },
  { id: "a-bag-12", title: "Beach Tote XL", vendor: "Hermès Inspired", price: 89, category: "accessories", tags: ["bag","beach"], styles: ["boho"] },
  // Shoes
  { id: "a-shoe-1", title: "Italian Leather Mules", vendor: "Bottega Veneta", price: 950, category: "accessories", tags: ["shoes","mules"], styles: ["minimal","editorial"] },
  { id: "a-shoe-2", title: "Strappy Stiletto", vendor: "Aquazzura", price: 695, category: "accessories", tags: ["shoes","heels"], styles: ["romantic","editorial"] },
  { id: "a-shoe-3", title: "Square Toe Pump", vendor: "By Far", price: 425, category: "accessories", tags: ["shoes","pump"], styles: ["minimal","y2k"] },
  { id: "a-shoe-4", title: "Cowboy Boots", vendor: "Ganni", price: 645, category: "accessories", tags: ["boots","cowboy"], styles: ["boho","editorial"] },
  { id: "a-shoe-5", title: "Knee-High Leather Boots", vendor: "Stuart Weitzman", price: 798, category: "accessories", tags: ["boots","knee-high"], styles: ["editorial","minimal"] },
  { id: "a-shoe-6", title: "Combat Boots", vendor: "Dr. Martens", price: 170, category: "accessories", tags: ["boots","combat"], styles: ["streetwear"] },
  { id: "a-shoe-7", title: "Chunky Trail Sneakers", vendor: "Salomon", price: 175, category: "accessories", tags: ["sneakers"], styles: ["streetwear","athleisure"] },
  { id: "a-shoe-8", title: "Court Sneakers", vendor: "Common Projects", price: 425, category: "accessories", tags: ["sneakers"], styles: ["minimal","preppy"] },
  { id: "a-shoe-9", title: "Retro Runners", vendor: "New Balance", price: 199, category: "accessories", tags: ["sneakers","running"], styles: ["streetwear","athleisure"] },
  { id: "a-shoe-10", title: "Strappy Flat Sandals", vendor: "Ancient Greek Sandals", price: 245, category: "accessories", tags: ["sandals"], styles: ["boho","minimal"] },
  { id: "a-shoe-11", title: "Ballet Flats", vendor: "Repetto", price: 295, category: "accessories", tags: ["flats","ballet"], styles: ["romantic","preppy"] },
  { id: "a-shoe-12", title: "Sport Slide", vendor: "Adidas", price: 35, category: "accessories", tags: ["slides"], styles: ["athleisure","streetwear"] },
  // Jewelry/Eyewear/Other
  { id: "a-jew-1", title: "Sculpted Gold Hoops", vendor: "Aurelia", price: 145, category: "accessories", tags: ["jewelry","earrings"], styles: ["minimal"] },
  { id: "a-jew-2", title: "Pearl Drop Earrings", vendor: "Sophie Bille Brahe", price: 380, category: "accessories", tags: ["jewelry","earrings","pearl"], styles: ["romantic","editorial"] },
  { id: "a-jew-3", title: "Layered Chain Necklace", vendor: "Missoma", price: 198, category: "accessories", tags: ["jewelry","necklace"], styles: ["minimal","streetwear"] },
  { id: "a-jew-4", title: "Vintage Signet Ring", vendor: "Mejuri", price: 250, category: "accessories", tags: ["jewelry","ring"], styles: ["minimal","editorial"] },
  { id: "a-jew-5", title: "Diamond Tennis Bracelet", vendor: "Anita Ko", price: 4250, category: "accessories", tags: ["jewelry","bracelet"], styles: ["editorial","romantic"] },
  { id: "a-jew-6", title: "Beaded Friendship Bracelet Stack", vendor: "Roxanne Assoulin", price: 95, category: "accessories", tags: ["jewelry","bracelet"], styles: ["boho"] },
  { id: "a-eye-1", title: "Tortoise Acetate Sunglasses", vendor: "Vela", price: 215, category: "accessories", tags: ["sunglasses","eyewear"], styles: ["minimal"] },
  { id: "a-eye-2", title: "Oversized Cat-Eye Shades", vendor: "Saint Laurent", price: 425, category: "accessories", tags: ["sunglasses"], styles: ["editorial","y2k"] },
  { id: "a-eye-3", title: "Aviator Sunglasses", vendor: "Ray-Ban", price: 175, category: "accessories", tags: ["sunglasses"], styles: ["preppy","minimal"] },
  { id: "a-eye-4", title: "Sport Wrap Shades", vendor: "Oakley", price: 220, category: "accessories", tags: ["sunglasses","sport"], styles: ["athleisure","y2k"] },
  { id: "a-hat-1", title: "Wool Felt Fedora", vendor: "Janessa Leoné", price: 245, category: "accessories", tags: ["hat","fedora"], styles: ["boho","editorial"] },
  { id: "a-hat-2", title: "Logo Trucker Cap", vendor: "Patagonia", price: 35, category: "accessories", tags: ["hat","cap"], styles: ["streetwear","athleisure"] },
  { id: "a-scf-1", title: "Silk Twill Scarf", vendor: "Hermès Inspired", price: 365, category: "accessories", tags: ["scarf","silk"], styles: ["preppy","editorial"] },
  { id: "a-blt-1", title: "Western Buckle Belt", vendor: "B-Low the Belt", price: 225, category: "accessories", tags: ["belt"], styles: ["boho","editorial"] },
  { id: "a-wat-1", title: "Minimalist Field Watch", vendor: "Timex", price: 165, category: "accessories", tags: ["watch"], styles: ["minimal","preppy"] },
  { id: "a-wat-2", title: "Two-Tone Bracelet Watch", vendor: "Cartier Inspired", price: 895, category: "accessories", tags: ["watch"], styles: ["editorial","preppy"] },
  // Beauty
  { id: "b-sk-1", title: "Rose Facial Oil", vendor: "Botanica", price: 64, category: "beauty", tags: ["skincare","oil"], styles: ["minimal","romantic"] },
  { id: "b-sk-2", title: "Vitamin C Serum 15%", vendor: "Drunk Elephant", price: 80, category: "beauty", tags: ["skincare","serum"], styles: ["minimal"] },
  { id: "b-sk-3", title: "Hyaluronic Hydrator", vendor: "The Ordinary", price: 9, category: "beauty", tags: ["skincare","serum"], styles: ["minimal"] },
  { id: "b-sk-4", title: "Daily SPF 50", vendor: "Supergoop!", price: 38, category: "beauty", tags: ["skincare","spf"], styles: ["minimal","athleisure"] },
  { id: "b-sk-5", title: "Cleansing Balm", vendor: "Augustinus Bader", price: 80, category: "beauty", tags: ["skincare","cleanser"], styles: ["minimal"] },
  { id: "b-sk-6", title: "Retinol Night Cream", vendor: "Sunday Riley", price: 130, category: "beauty", tags: ["skincare","retinol"], styles: ["minimal"] },
  { id: "b-sk-7", title: "Face Mist Toner", vendor: "Tatcha", price: 48, category: "beauty", tags: ["skincare","mist"], styles: ["minimal","boho"] },
  { id: "b-sk-8", title: "Body Lotion 250ml", vendor: "Aesop", price: 49, category: "beauty", tags: ["bodycare"], styles: ["minimal","editorial"] },
  { id: "b-sk-9", title: "Lip Mask Overnight", vendor: "Laneige", price: 24, category: "beauty", tags: ["lipcare"], styles: ["romantic","minimal"] },
  { id: "b-sk-10", title: "Bakuchiol Treatment", vendor: "Herbivore", price: 54, category: "beauty", tags: ["skincare","treatment"], styles: ["boho"] },
  { id: "b-fr-1", title: "Nuit · Eau de Parfum 50ml", vendor: "Maison Nuit", price: 165, category: "beauty", tags: ["fragrance","perfume"], styles: ["editorial","romantic"] },
  { id: "b-fr-2", title: "Santal 33", vendor: "Le Labo", price: 220, category: "beauty", tags: ["fragrance"], styles: ["editorial","minimal"] },
  { id: "b-fr-3", title: "Discovery Set", vendor: "Maison Margiela", price: 50, category: "beauty", tags: ["fragrance","set"], styles: ["editorial"] },
  { id: "b-fr-4", title: "Solid Perfume", vendor: "Diptyque", price: 65, category: "beauty", tags: ["fragrance"], styles: ["minimal","boho"] },
  { id: "b-fr-5", title: "Body Oil Frangipani", vendor: "Sol de Janeiro", price: 38, category: "beauty", tags: ["bodycare","fragrance"], styles: ["boho","y2k"] },
  { id: "b-mk-1", title: "Velvet Matte Lipstick", vendor: "Lumière Beauté", price: 38, category: "beauty", tags: ["makeup","lipstick"], styles: ["minimal","romantic"] },
  { id: "b-mk-2", title: "Cream Blush Stick", vendor: "Westman Atelier", price: 48, category: "beauty", tags: ["makeup","blush"], styles: ["romantic","minimal"] },
  { id: "b-mk-3", title: "Tinted Lip Oil", vendor: "Dior", price: 42, category: "beauty", tags: ["makeup","lip"], styles: ["y2k","romantic"] },
  { id: "b-mk-4", title: "Liquid Eyeliner Pen", vendor: "Stila", price: 26, category: "beauty", tags: ["makeup","liner"], styles: ["editorial","y2k"] },
  { id: "b-mk-5", title: "Bronzer Powder", vendor: "Hourglass", price: 58, category: "beauty", tags: ["makeup","bronzer"], styles: ["minimal","boho"] },
  { id: "b-mk-6", title: "Brow Gel", vendor: "Anastasia", price: 24, category: "beauty", tags: ["makeup","brow"], styles: ["minimal"] },
  { id: "b-hr-1", title: "Hair Repair Serum", vendor: "Olaplex", price: 32, category: "beauty", tags: ["haircare","oil"], styles: ["minimal"] },
  { id: "b-hr-2", title: "Silk Hair Scrunchies x3", vendor: "Slip", price: 39, category: "beauty", tags: ["haircare","accessories"], styles: ["romantic","preppy"] },
  // Home
  { id: "h-dc-1", title: "Ribbed Ceramic Vase", vendor: "Studio Cura", price: 89, category: "home", tags: ["decor","ceramic"], styles: ["minimal"] },
  { id: "h-dc-2", title: "Glass Bud Vase Set", vendor: "Hay", price: 65, category: "home", tags: ["decor","glass"], styles: ["minimal","editorial"] },
  { id: "h-dc-3", title: "Marble Coffee Tray", vendor: "Menu", price: 145, category: "home", tags: ["decor","tray"], styles: ["minimal","editorial"] },
  { id: "h-dc-4", title: "Woven Rattan Mirror", vendor: "Soho Home", price: 240, category: "home", tags: ["decor","mirror"], styles: ["boho","romantic"] },
  { id: "h-dc-5", title: "Sculptural Bookend Pair", vendor: "Areaware", price: 95, category: "home", tags: ["decor","objet"], styles: ["editorial","minimal"] },
  { id: "h-dc-6", title: "Modular Wall Shelf", vendor: "Muuto", price: 220, category: "home", tags: ["furniture","shelf"], styles: ["minimal"] },
  { id: "h-tx-1", title: "Stonewashed Linen Throw", vendor: "Maison Blanc", price: 128, category: "home", tags: ["textile","throw"], styles: ["minimal","boho"] },
  { id: "h-tx-2", title: "Boucle Cushion Cover", vendor: "Society Limonta", price: 95, category: "home", tags: ["textile","cushion"], styles: ["minimal","romantic"] },
  { id: "h-tx-3", title: "Vintage Berber Rug 5x7", vendor: "Beni Ourain", price: 685, category: "home", tags: ["textile","rug"], styles: ["boho"] },
  { id: "h-cn-1", title: "Tobacco & Vetiver Candle", vendor: "Boy Smells", price: 42, category: "home", tags: ["candle"], styles: ["editorial","romantic"] },
  { id: "h-cn-2", title: "Fig Tree Candle 8oz", vendor: "Diptyque", price: 78, category: "home", tags: ["candle"], styles: ["editorial","minimal"] },
  { id: "h-cn-3", title: "Travel Tin Candle", vendor: "P.F. Candle Co.", price: 18, category: "home", tags: ["candle"], styles: ["boho","minimal"] },
];

// Score-based filter so we only send a relevant slice (~40 items) to the model.
export function shortlistCatalog(opts: {
  budget?: string | null;
  styles?: string[];
  query?: string;
  excludeId?: string;
  role?: string;
  priceMin?: number;
  priceMax?: number;
  limit?: number;
}): CatalogItem[] {
  const { budget, styles = [], query = "", excludeId, role, priceMin, priceMax, limit = 40 } = opts;

  // Parse budget like "<$200" or "$500+"
  let budgetMax: number | null = null;
  if (budget) {
    const m = budget.match(/(\d+)/);
    if (m) budgetMax = parseInt(m[1], 10);
    if (budget.includes("+")) budgetMax = null; // open-ended
  }

  const q = query.toLowerCase();
  const styleSet = new Set(styles.map((s) => s.toLowerCase()));
  const roleHints: Record<string, string[]> = {
    top: ["top","tee","blouse","shirt","sweater","knit","camisole","blazer","hoodie","sweatshirt"],
    bottom: ["pants","trousers","jeans","denim","skirt","shorts","leggings"],
    shoes: ["shoes","sneakers","boots","heels","sandals","mules","flats","slides","pump"],
    accessory: ["bag","jewelry","sunglasses","hat","scarf","belt","watch"],
    layer: ["jacket","coat","blazer","cardigan","trench","vest","puffer","bomber","duster"],
    dress: ["dress","gown"],
  };
  const roleTags = role ? roleHints[role.toLowerCase()] || [] : [];

  const scored = CATALOG
    .filter((p) => p.id !== excludeId)
    .filter((p) => budgetMax == null || p.price <= budgetMax)
    .filter((p) => priceMin == null || p.price >= priceMin)
    .filter((p) => priceMax == null || p.price <= priceMax)
    .filter((p) => roleTags.length === 0 || p.tags.some((t) => roleTags.includes(t)))
    .map((p) => {
      let score = 0;
      if (styleSet.size) {
        const matches = p.styles.filter((s) => styleSet.has(s.toLowerCase())).length;
        score += matches * 5;
      }
      if (q) {
        const hay = `${p.title} ${p.vendor} ${p.tags.join(" ")} ${p.styles.join(" ")}`.toLowerCase();
        const tokens = q.split(/\s+/).filter(Boolean);
        score += tokens.filter((t) => hay.includes(t)).length * 3;
      }
      // Slight randomness to keep results diverse across calls
      score += Math.random();
      return { p, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.p);

  return scored;
}

export function findById(id: string): CatalogItem | undefined {
  return CATALOG.find((p) => p.id === id);
}
