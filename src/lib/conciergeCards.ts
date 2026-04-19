import { localProducts, type LocalProduct } from "@/data/shopProducts";

export interface CardItem {
  id: string;
  note?: string;
  role?: string; // for outfits: top / bottom / shoes / accessory / layer
}

export interface CardSection {
  title: string;
  kind?: "section" | "outfit";
  items: CardItem[];
}

export interface ParsedMessage {
  text: string; // markdown without the cards block
  cards: CardSection[] | null;
}

const CARDS_BLOCK_RE = /```cards\s*\n([\s\S]*?)```/i;
// Also tolerate an unclosed block while streaming
const CARDS_OPEN_RE = /```cards\s*\n([\s\S]*)$/i;

export function parseMessage(content: string): ParsedMessage {
  if (!content) return { text: "", cards: null };

  const closed = content.match(CARDS_BLOCK_RE);
  if (closed) {
    const before = content.slice(0, closed.index!).trim();
    const json = closed[1].trim();
    return { text: before, cards: safeParse(json) };
  }
  const open = content.match(CARDS_OPEN_RE);
  if (open) {
    // Streaming mid-block: hide the partial JSON, show only prose so far
    return { text: content.slice(0, open.index!).trim(), cards: null };
  }
  return { text: content.trim(), cards: null };
}

function safeParse(json: string): CardSection[] | null {
  try {
    const v = JSON.parse(json);
    if (!Array.isArray(v)) return null;
    return v
      .filter((s) => s && typeof s === "object" && Array.isArray(s.items))
      .map((s) => ({
        title: String(s.title || "Picks"),
        kind: s.kind === "outfit" ? "outfit" : "section",
        items: s.items
          .filter((i: any) => i && typeof i.id === "string")
          .map((i: any) => ({ id: i.id, note: i.note, role: i.role })),
      }));
  } catch {
    return null;
  }
}

const productsById = new Map<string, LocalProduct>(
  localProducts.map((p) => [p.node.id, p])
);

export function getProduct(id: string): LocalProduct | undefined {
  return productsById.get(id);
}

export function getAllItemIds(sections: CardSection[]): string[] {
  return sections.flatMap((s) => s.items.map((i) => i.id));
}

export function getOutfitTotal(sections: CardSection[], idx: number): number {
  const sec = sections[idx];
  if (!sec) return 0;
  return sec.items.reduce((sum, it) => {
    const p = getProduct(it.id);
    if (!p) return sum;
    return sum + parseFloat(p.node.priceRange.minVariantPrice.amount);
  }, 0);
}
