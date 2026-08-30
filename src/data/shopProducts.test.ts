import { describe, expect, it } from "vitest";
import { localProducts } from "@/data/shopProducts";

const photoKey = (url: string) => {
  const m = url.match(/photo-([a-zA-Z0-9_-]+)/);
  return m?.[1] ?? url.split("?")[0];
};

describe("shop catalog images", () => {
  it("gives every product a unique image", () => {
    const urls = localProducts.map((p) => p.node.images.edges[0]?.node.url);
    expect(urls.every(Boolean)).toBe(true);
    expect(new Set(urls).size).toBe(localProducts.length);
    expect(new Set(urls.map((u) => photoKey(u!))).size).toBe(localProducts.length);
  });
});
