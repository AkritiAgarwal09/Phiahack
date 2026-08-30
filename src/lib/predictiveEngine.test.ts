import { describe, expect, it } from "vitest";
import { findProduct, inferTribeFromEngagements, nextBuyPrediction, priceOf } from "@/lib/predictiveEngine";
import type { EngagementRow } from "@/services/engagementService";

describe("predictiveEngine", () => {
  it("finds a catalog product and parses its price", () => {
    const product = findProduct("f-dress-1");
    expect(product).toBeDefined();
    expect(product?.node.title).toMatch(/dress/i);
    expect(priceOf(product!)).toBeGreaterThan(0);
  });

  it("returns starter picks when the user has no signals", () => {
    const result = nextBuyPrediction([], [], []);
    expect(result.signalCount).toBe(0);
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.pitch.toLowerCase()).toMatch(/starter|curated/);
  });

  it("infers street-utility from cargo and sneaker tags", () => {
    const rows: EngagementRow[] = [
      {
        id: "e1",
        user_id: "u1",
        product_id: "p1",
        product_title: "Cargo pant",
        vendor: null,
        price: 80,
        category: "fashion",
        tags: ["cargo", "sneakers", "utility", "style:streetwear"],
        action: "wishlist",
        weight: 3,
        created_at: new Date().toISOString(),
      },
    ];
    const { tribe, share } = inferTribeFromEngagements(rows);
    expect(tribe).toBe("street-utility");
    expect(share).toBeGreaterThan(0);
  });
});
