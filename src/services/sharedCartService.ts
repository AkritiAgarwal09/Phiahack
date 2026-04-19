import { supabase } from "@/integrations/supabase/client";
import type { CartItem } from "@/stores/cartStore";

export interface SharedCartRecord {
  id: string;
  sharer_id: string;
  title: string | null;
  message: string | null;
  recipient_user_id: string | null;
  recipient_email: string | null;
  created_at: string;
  last_opened_at: string | null;
  revoked_at: string | null;
}

export interface SharedCartItemRecord {
  id: string;
  shared_cart_id: string;
  product_id: string;
  variant_id: string;
  product_title: string;
  product_image: string | null;
  vendor: string | null;
  variant_title: string | null;
  selected_options: { name: string; value: string }[];
  unit_price: number;
  currency: string;
  quantity: number;
}

export interface SharedCartFull {
  cart: SharedCartRecord;
  items: SharedCartItemRecord[];
  sharer: { display_name: string | null; avatar_url: string | null } | null;
}

export async function createSharedCart(opts: {
  items: CartItem[];
  title?: string;
  message?: string;
  recipientEmail?: string;
}): Promise<string> {
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) throw new Error("Not authenticated");
  if (!opts.items.length) throw new Error("No items to share");

  // Optional: resolve recipient email -> user_id if they have an account
  let recipientUserId: string | null = null;
  if (opts.recipientEmail) {
    const { data: maybeProfile } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .ilike("display_name", opts.recipientEmail)
      .maybeSingle();
    if (maybeProfile?.user_id) recipientUserId = maybeProfile.user_id;
  }

  const { data: cart, error } = await supabase
    .from("shared_carts")
    .insert({
      sharer_id: user.id,
      title: opts.title?.trim() || null,
      message: opts.message?.trim() || null,
      recipient_email: opts.recipientEmail?.trim().toLowerCase() || null,
      recipient_user_id: recipientUserId,
    })
    .select("id")
    .single();
  if (error || !cart) throw error || new Error("Failed to create shared cart");

  const rows = opts.items.map((i) => ({
    shared_cart_id: cart.id,
    product_id: i.product.node.id,
    variant_id: i.variantId,
    product_title: i.product.node.title,
    product_image: i.product.node.images?.edges?.[0]?.node?.url ?? null,
    vendor: i.product.node.vendor ?? null,
    variant_title: i.variantTitle,
    selected_options: i.selectedOptions,
    unit_price: parseFloat(i.price.amount),
    currency: i.price.currencyCode,
    quantity: i.quantity,
  }));
  const { error: itemsErr } = await supabase.from("shared_cart_items").insert(rows);
  if (itemsErr) throw itemsErr;

  return cart.id;
}

export async function getSharedCart(id: string): Promise<SharedCartFull | null> {
  const { data: cart, error } = await supabase
    .from("shared_carts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!cart) return null;

  const [{ data: items }, { data: sharer }] = await Promise.all([
    supabase
      .from("shared_cart_items")
      .select("*")
      .eq("shared_cart_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("user_id", cart.sharer_id)
      .maybeSingle(),
  ]);

  return {
    cart: cart as SharedCartRecord,
    items: ((items || []) as unknown) as SharedCartItemRecord[],
    sharer: sharer as SharedCartFull["sharer"],
  };
}

/**
 * Marks a shared cart as viewed by the current user (auto-saves to inbox).
 * Idempotent: updates last_opened_at if already exists.
 */
export async function recordSharedCartView(sharedCartId: string) {
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) return;

  // Don't record the sharer's own opens
  const { data: cart } = await supabase
    .from("shared_carts")
    .select("sharer_id")
    .eq("id", sharedCartId)
    .maybeSingle();
  if (!cart || cart.sharer_id === user.id) return;

  const { data: existing } = await supabase
    .from("shared_cart_views")
    .select("id")
    .eq("shared_cart_id", sharedCartId)
    .eq("viewer_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("shared_cart_views")
      .update({ last_opened_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await supabase.from("shared_cart_views").insert({
      shared_cart_id: sharedCartId,
      viewer_id: user.id,
    });
  }

  // Bubble up "last_opened_at" on the cart for the sharer's reference
  await supabase
    .from("shared_carts")
    .update({ last_opened_at: new Date().toISOString() })
    .eq("id", sharedCartId);
}

export interface InboxEntry {
  shared_cart_id: string;
  cart: SharedCartRecord;
  sharer: { display_name: string | null; avatar_url: string | null } | null;
  item_count: number;
  preview_images: string[];
  source: "view" | "recipient";
}

export async function listSharedWithMe(): Promise<InboxEntry[]> {
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) return [];

  // 1. Carts where I'm the targeted recipient
  const { data: targetedCarts } = await supabase
    .from("shared_carts")
    .select("*")
    .eq("recipient_user_id", user.id)
    .order("created_at", { ascending: false });

  // 2. Carts I have opened (from views)
  const { data: views } = await supabase
    .from("shared_cart_views")
    .select("shared_cart_id, last_opened_at")
    .eq("viewer_id", user.id)
    .order("last_opened_at", { ascending: false });

  const viewedIds = (views || []).map((v) => v.shared_cart_id);
  const { data: viewedCarts } = viewedIds.length
    ? await supabase.from("shared_carts").select("*").in("id", viewedIds)
    : { data: [] as SharedCartRecord[] };

  const all = new Map<string, { cart: SharedCartRecord; source: "view" | "recipient" }>();
  (targetedCarts || []).forEach((c) =>
    all.set(c.id, { cart: c as SharedCartRecord, source: "recipient" })
  );
  (viewedCarts || []).forEach((c) => {
    if (!all.has(c.id)) all.set(c.id, { cart: c as SharedCartRecord, source: "view" });
  });

  // Filter out my own carts
  const entries = Array.from(all.values()).filter((e) => e.cart.sharer_id !== user.id);
  if (!entries.length) return [];

  const cartIds = entries.map((e) => e.cart.id);
  const sharerIds = Array.from(new Set(entries.map((e) => e.cart.sharer_id)));

  const [{ data: items }, { data: sharers }] = await Promise.all([
    supabase
      .from("shared_cart_items")
      .select("shared_cart_id, product_image")
      .in("shared_cart_id", cartIds),
    supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", sharerIds),
  ]);

  const byCart = new Map<string, { count: number; previews: string[] }>();
  (items || []).forEach((it: { shared_cart_id: string; product_image: string | null }) => {
    const cur = byCart.get(it.shared_cart_id) || { count: 0, previews: [] };
    cur.count += 1;
    if (it.product_image && cur.previews.length < 4) cur.previews.push(it.product_image);
    byCart.set(it.shared_cart_id, cur);
  });

  const sharerMap = new Map<string, { display_name: string | null; avatar_url: string | null }>();
  (sharers || []).forEach((s: { user_id: string; display_name: string | null; avatar_url: string | null }) =>
    sharerMap.set(s.user_id, { display_name: s.display_name, avatar_url: s.avatar_url })
  );

  return entries
    .map((e) => ({
      shared_cart_id: e.cart.id,
      cart: e.cart,
      sharer: sharerMap.get(e.cart.sharer_id) || null,
      item_count: byCart.get(e.cart.id)?.count ?? 0,
      preview_images: byCart.get(e.cart.id)?.previews ?? [],
      source: e.source,
    }))
    .sort((a, b) => +new Date(b.cart.created_at) - +new Date(a.cart.created_at));
}

// ============================================================
// MY SHARED CARTS — sharer's outbox
// ============================================================
export interface MySharedCartEntry {
  cart: SharedCartRecord;
  item_count: number;
  preview_images: string[];
  purchase_count: number;
  total_points_earned: number;
}

export async function listMySharedCarts(): Promise<MySharedCartEntry[]> {
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) return [];

  const { data: carts } = await supabase
    .from("shared_carts")
    .select("*")
    .eq("sharer_id", user.id)
    .order("created_at", { ascending: false });

  if (!carts || !carts.length) return [];

  const cartIds = carts.map((c) => c.id);
  const [{ data: items }, { data: orders }] = await Promise.all([
    supabase
      .from("shared_cart_items")
      .select("shared_cart_id, product_image")
      .in("shared_cart_id", cartIds),
    supabase
      .from("orders")
      .select("shared_cart_id, points_awarded_to_sharer")
      .in("shared_cart_id", cartIds),
  ]);

  const byCart = new Map<string, { count: number; previews: string[] }>();
  (items || []).forEach((it: { shared_cart_id: string; product_image: string | null }) => {
    const cur = byCart.get(it.shared_cart_id) || { count: 0, previews: [] };
    cur.count += 1;
    if (it.product_image && cur.previews.length < 4) cur.previews.push(it.product_image);
    byCart.set(it.shared_cart_id, cur);
  });

  const orderStats = new Map<string, { purchases: number; points: number }>();
  (orders || []).forEach((o: { shared_cart_id: string; points_awarded_to_sharer: number }) => {
    const cur = orderStats.get(o.shared_cart_id) || { purchases: 0, points: 0 };
    cur.purchases += 1;
    cur.points += o.points_awarded_to_sharer || 0;
    orderStats.set(o.shared_cart_id, cur);
  });

  return carts.map((c) => ({
    cart: c as SharedCartRecord,
    item_count: byCart.get(c.id)?.count ?? 0,
    preview_images: byCart.get(c.id)?.previews ?? [],
    purchase_count: orderStats.get(c.id)?.purchases ?? 0,
    total_points_earned: orderStats.get(c.id)?.points ?? 0,
  }));
}

export async function updateSharedCartTitle(id: string, title: string) {
  const { error } = await supabase
    .from("shared_carts")
    .update({ title: title.trim() || null })
    .eq("id", id);
  if (error) throw error;
}

export async function revokeSharedCart(id: string) {
  const { error } = await supabase
    .from("shared_carts")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function unrevokeSharedCart(id: string) {
  const { error } = await supabase
    .from("shared_carts")
    .update({ revoked_at: null })
    .eq("id", id);
  if (error) throw error;
}

export async function removeSharedCartItem(itemId: string) {
  const { error } = await supabase.from("shared_cart_items").delete().eq("id", itemId);
  if (error) throw error;
}

export async function updateSharedCartItemQuantity(itemId: string, quantity: number) {
  if (quantity <= 0) return removeSharedCartItem(itemId);
  const { error } = await supabase
    .from("shared_cart_items")
    .update({ quantity })
    .eq("id", itemId);
  if (error) throw error;
}

export async function addItemToSharedCart(opts: {
  sharedCartId: string;
  item: CartItem;
}) {
  const { item, sharedCartId } = opts;
  const { error } = await supabase.from("shared_cart_items").insert({
    shared_cart_id: sharedCartId,
    product_id: item.product.node.id,
    variant_id: item.variantId,
    product_title: item.product.node.title,
    product_image: item.product.node.images?.edges?.[0]?.node?.url ?? null,
    vendor: item.product.node.vendor ?? null,
    variant_title: item.variantTitle,
    selected_options: item.selectedOptions,
    unit_price: parseFloat(item.price.amount),
    currency: item.price.currencyCode,
    quantity: item.quantity,
  });
  if (error) throw error;
}


