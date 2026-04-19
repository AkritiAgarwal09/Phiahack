import { supabase } from "@/integrations/supabase/client";
import type { ShopifyProduct } from "@/lib/shopify";
import { localProducts } from "@/data/shopProducts";

export interface PriceSnapshot {
  recorded_at: string;
  price: number;
}

export interface PriceVerdict {
  /** Heuristic position vs. category peers: 'lowest' | 'great' | 'fair' | 'high' */
  band: "lowest" | "great" | "fair" | "high";
  label: string;
  helper: string;
  /** Catalog peer reference */
  peerAverage: number;
  peerLowest: number;
  peerHighest: number;
  current: number;
  /** Percentile (0..100) where 0 = cheapest in category */
  percentile: number;
}

const PRICE_LOG_KEY_PREFIX = "phia.price-snap.";
const SNAPSHOT_TTL_MS = 1000 * 60 * 60 * 6; // 6h dedupe per browser

/**
 * Fire-and-forget snapshot of the product's current price into price_history.
 * Throttled per-browser to avoid spamming the table on every render.
 */
export async function snapshotPrice(product: ShopifyProduct | null | undefined) {
  try {
    if (!product) return;
    const node = product.node;
    if (!node) return;
    const price = parseFloat(node.priceRange.minVariantPrice.amount);
    if (!Number.isFinite(price) || price <= 0) return;

    const cacheKey = `${PRICE_LOG_KEY_PREFIX}${node.id}`;
    if (typeof localStorage !== "undefined") {
      const last = parseInt(localStorage.getItem(cacheKey) || "0", 10);
      if (Date.now() - last < SNAPSHOT_TTL_MS) return;
      localStorage.setItem(cacheKey, String(Date.now()));
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return; // RLS requires authenticated

    await supabase.from("price_history").insert({
      product_id: node.id,
      product_title: node.title,
      vendor: node.vendor,
      price,
      currency: node.priceRange.minVariantPrice.currencyCode,
    });
  } catch {
    /* swallow */
  }
}

export async function loadPriceHistory(productId: string, days = 90): Promise<PriceSnapshot[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("price_history")
    .select("recorded_at, price")
    .eq("product_id", productId)
    .gte("recorded_at", since)
    .order("recorded_at", { ascending: true })
    .limit(500);
  if (error) {
    console.warn("[price] history failed", error);
    return [];
  }
  return (data || []).map((d) => ({
    recorded_at: d.recorded_at as string,
    price: Number(d.price),
  }));
}

/**
 * Compute a heuristic price verdict by comparing this product to peers in the
 * same category. This works immediately, even before price_history accumulates.
 */
export function priceVerdict(product: ShopifyProduct): PriceVerdict {
  const node = product.node;
  const current = parseFloat(node.priceRange.minVariantPrice.amount);
  const peers = localProducts.filter((p) => p.node.productType === node.productType);
  const prices = peers
    .map((p) => parseFloat(p.node.priceRange.minVariantPrice.amount))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);

  if (prices.length === 0) {
    return {
      band: "fair",
      label: "Standard price",
      helper: "Not enough peers to compare yet.",
      peerAverage: current,
      peerLowest: current,
      peerHighest: current,
      current,
      percentile: 50,
    };
  }

  const peerLowest = prices[0];
  const peerHighest = prices[prices.length - 1];
  const peerAverage = prices.reduce((a, b) => a + b, 0) / prices.length;
  const idx = prices.findIndex((p) => p >= current);
  const percentile = Math.round(((idx === -1 ? prices.length : idx) / prices.length) * 100);

  let band: PriceVerdict["band"];
  let label: string;
  let helper: string;

  if (current <= peerLowest * 1.02) {
    band = "lowest";
    label = "At its lowest";
    helper = `Cheapest in ${prettyCategory(node.productType)} right now.`;
  } else if (percentile <= 30) {
    band = "great";
    label = "Great deal";
    helper = `Below ${100 - percentile}% of similar pieces.`;
  } else if (percentile <= 70) {
    band = "fair";
    label = "Regular price";
    helper = `Sits near the typical $${Math.round(peerAverage)} for this category.`;
  } else {
    band = "high";
    label = "Premium pricing";
    helper = `Above ${percentile}% of similar pieces — usually goes on sale.`;
  }

  return { band, label, helper, peerAverage, peerLowest, peerHighest, current, percentile };
}

function prettyCategory(c: string) {
  if (!c) return "this category";
  return c.charAt(0).toUpperCase() + c.slice(1);
}

export interface RealHistoryStats {
  count: number;
  lowest: number;
  highest: number;
  average: number;
  trend: "down" | "up" | "flat";
  recent: PriceSnapshot[];
}

export function summarizeHistory(snapshots: PriceSnapshot[]): RealHistoryStats {
  if (snapshots.length === 0) {
    return { count: 0, lowest: 0, highest: 0, average: 0, trend: "flat", recent: [] };
  }
  const prices = snapshots.map((s) => s.price);
  const lowest = Math.min(...prices);
  const highest = Math.max(...prices);
  const average = prices.reduce((a, b) => a + b, 0) / prices.length;

  let trend: "down" | "up" | "flat" = "flat";
  if (snapshots.length >= 2) {
    const first = snapshots[0].price;
    const last = snapshots[snapshots.length - 1].price;
    const delta = (last - first) / first;
    if (delta > 0.03) trend = "up";
    else if (delta < -0.03) trend = "down";
  }

  return {
    count: snapshots.length,
    lowest,
    highest,
    average,
    trend,
    recent: snapshots.slice(-30),
  };
}
