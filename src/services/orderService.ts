import { supabase } from "@/integrations/supabase/client";
import { localProducts } from "@/data/shopProducts";
import { useCartStore, type CartItem } from "@/stores/cartStore";

export interface OrderRow {
  id: string;
  user_id: string;
  total: number;
  subtotal: number;
  discount: number;
  currency: string;
  shared_cart_id: string | null;
  points_awarded_to_sharer: number;
  created_at: string;
}

export interface OrderItemRow {
  id: string;
  order_id: string;
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

export interface OrderWithItems {
  order: OrderRow;
  items: OrderItemRow[];
}

export async function listMyOrders(): Promise<OrderWithItems[]> {
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return [];

  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", userRes.user.id)
    .order("created_at", { ascending: false });

  if (!orders || orders.length === 0) return [];

  const ids = orders.map((o) => o.id);
  const { data: items } = await supabase
    .from("order_items")
    .select("*")
    .in("order_id", ids);

  const byOrder = new Map<string, OrderItemRow[]>();
  ((items || []) as unknown as OrderItemRow[]).forEach((it) => {
    const arr = byOrder.get(it.order_id) || [];
    arr.push(it);
    byOrder.set(it.order_id, arr);
  });

  return (orders as unknown as OrderRow[]).map((o) => ({
    order: o,
    items: byOrder.get(o.id) || [],
  }));
}

export interface ReorderResult {
  added: string[];
  unavailable: string[];
}

/**
 * Re-adds available catalog items from a past order to the user's cart.
 * Items whose product is no longer in the catalog are returned in `unavailable`.
 */
export async function reorder(items: OrderItemRow[]): Promise<ReorderResult> {
  const added: string[] = [];
  const unavailable: string[] = [];
  const addItem = useCartStore.getState().addItem;

  for (const it of items) {
    const product = localProducts.find((p) => p.node.id === it.product_id);
    if (!product) {
      unavailable.push(it.product_title);
      continue;
    }
    const cartItem: Omit<CartItem, "lineId"> = {
      product,
      variantId: it.variant_id,
      variantTitle: it.variant_title || "Default",
      price: { amount: it.unit_price.toFixed(2), currencyCode: it.currency },
      quantity: it.quantity,
      selectedOptions: it.selected_options || [],
    };
    await addItem(cartItem);
    added.push(it.product_title);
  }

  return { added, unavailable };
}
