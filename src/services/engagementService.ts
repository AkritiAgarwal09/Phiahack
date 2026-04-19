import { supabase } from "@/integrations/supabase/client";
import type { ShopifyProduct } from "@/lib/shopify";

export type EngagementAction =
  | "view"
  | "wishlist"
  | "moodboard"
  | "cart"
  | "purchase"
  | "concierge_query";

const ACTION_WEIGHT: Record<EngagementAction, number> = {
  view: 1,
  wishlist: 4,
  moodboard: 5,
  cart: 6,
  purchase: 10,
  concierge_query: 2,
};

export interface EngagementRow {
  id: string;
  user_id: string;
  product_id: string;
  product_title: string | null;
  vendor: string | null;
  price: number | null;
  category: string | null;
  tags: string[] | null;
  action: string;
  weight: number;
  created_at: string;
}

export interface TrendingRow {
  product_id: string;
  product_title: string | null;
  vendor: string | null;
  category: string | null;
  tags: string[] | null;
  total_score: number;
  unique_users: number;
}

/**
 * Fire-and-forget engagement logger. Silently swallows errors so it never
 * blocks the user-facing flow.
 */
export async function logEngagement(
  product: ShopifyProduct | null | undefined,
  action: EngagementAction,
  productOverrides?: { id?: string; title?: string; vendor?: string; price?: number; category?: string; tags?: string[] }
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const node = product?.node;
    const productId = productOverrides?.id || node?.id;
    if (!productId) return;

    const tags = productOverrides?.tags ?? node?.tags ?? [];
    const price =
      productOverrides?.price ??
      (node ? parseFloat(node.priceRange.minVariantPrice.amount) : null);

    await supabase.from("product_engagements").insert({
      user_id: user.id,
      product_id: productId,
      product_title: productOverrides?.title ?? node?.title ?? null,
      vendor: productOverrides?.vendor ?? node?.vendor ?? null,
      price,
      category: productOverrides?.category ?? node?.productType ?? null,
      tags,
      action,
      weight: ACTION_WEIGHT[action] ?? 1,
    });
  } catch (e) {
    // never throw
    console.warn("[engagement] log failed", e);
  }
}

export async function loadMyEngagements(limit = 200): Promise<EngagementRow[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("product_engagements")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.warn("[engagement] loadMy failed", error);
    return [];
  }
  return (data || []) as EngagementRow[];
}

export async function loadTrending(daysBack = 7, max = 20): Promise<TrendingRow[]> {
  const { data, error } = await supabase.rpc("get_trending_products", {
    days_back: daysBack,
    max_items: max,
  });
  if (error) {
    console.warn("[engagement] trending failed", error);
    return [];
  }
  return (data || []) as TrendingRow[];
}
