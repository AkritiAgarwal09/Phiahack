import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ShopifyProduct } from "@/lib/shopify";
import { supabase } from "@/integrations/supabase/client";
import { getTierForLifetime, POINTS_PER_DOLLAR, MAX_POINTS_DISCOUNT_RATIO, dollarsToPoints, pointsToDollars } from "@/services/pointsService";
import { calcVoucherDiscount, type UserVoucher } from "@/services/voucherService";

export interface CartItem {
  lineId: string | null;
  product: ShopifyProduct;
  variantId: string;
  variantTitle: string;
  price: { amount: string; currencyCode: string };
  quantity: number;
  selectedOptions: { name: string; value: string }[];
}

interface PlaceOrderInput {
  items: CartItem[];
  subtotal: number;
  discount: number;
  pointsRedeemed?: number;
  pointsDiscount?: number;
  appliedVoucher?: UserVoucher | null;
  total: number;
  currency: string;
  sharedCartId?: string | null;
  sharedMoodBoardId?: string | null;
}

interface PlaceOrderResult {
  orderId: string;
  pointsAwardedToSharer: number;
  pointsAwardedToBoardCreator: number;
}

interface CartStore {
  items: CartItem[];
  selected: Record<string, boolean>;
  isLoading: boolean;
  isSyncing: boolean;
  isOpen: boolean;
  appliedDiscount: { code: string; percent: number } | null;
  appliedPoints: number;
  appliedVoucher: UserVoucher | null;

  setOpen: (open: boolean) => void;
  addItem: (item: Omit<CartItem, "lineId">) => Promise<void>;
  updateQuantity: (variantId: string, quantity: number) => Promise<void>;
  removeItem: (variantId: string) => Promise<void>;
  clearCart: () => void;
  removeItems: (variantIds: string[]) => void;

  toggleSelected: (variantId: string) => void;
  setSelected: (variantId: string, value: boolean) => void;
  selectAll: () => void;
  deselectAll: () => void;
  getSelectedItems: () => CartItem[];

  applyDiscount: (code: string) => { ok: boolean; message: string };
  removeDiscount: () => void;

  setAppliedPoints: (points: number) => void;
  clearAppliedPoints: () => void;
  setAppliedVoucher: (v: UserVoucher | null) => void;

  placeOrder: (input: PlaceOrderInput) => Promise<PlaceOrderResult>;
  syncCart: () => Promise<void>;
}

const DISCOUNTS: Record<string, number> = {
  WELCOME10: 10,
  PHIA15: 15,
  CIRCLE20: 20,
};

const SHARER_COMMISSION_RATE = 0.05;

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      selected: {},
      isLoading: false,
      isSyncing: false,
      isOpen: false,
      appliedDiscount: null,
      appliedPoints: 0,
      appliedVoucher: null,

      setOpen: (open) => set({ isOpen: open }),

      addItem: async (item) => {
        const { items, selected } = get();
        const existing = items.find((i) => i.variantId === item.variantId);
        if (existing) {
          set({
            items: items.map((i) =>
              i.variantId === item.variantId
                ? { ...i, quantity: i.quantity + item.quantity }
                : i
            ),
            selected: { ...selected, [item.variantId]: true },
          });
        } else {
          set({
            items: [...items, { ...item, lineId: item.variantId }],
            selected: { ...selected, [item.variantId]: true },
          });
        }
        try {
          const { logEngagement } = await import("@/services/engagementService");
          logEngagement(item.product, "cart");
        } catch { /* ignore */ }
      },

      updateQuantity: async (variantId, quantity) => {
        if (quantity <= 0) {
          await get().removeItem(variantId);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.variantId === variantId ? { ...i, quantity } : i
          ),
        });
      },

      removeItem: async (variantId) => {
        const next = get().items.filter((i) => i.variantId !== variantId);
        const { [variantId]: _drop, ...restSelected } = get().selected;
        set({ items: next, selected: restSelected });
        if (next.length === 0) set({ appliedDiscount: null, appliedPoints: 0, appliedVoucher: null });
      },

      removeItems: (variantIds) => {
        const setIds = new Set(variantIds);
        const next = get().items.filter((i) => !setIds.has(i.variantId));
        const sel = { ...get().selected };
        variantIds.forEach((id) => delete sel[id]);
        set({ items: next, selected: sel });
        if (next.length === 0) set({ appliedDiscount: null, appliedPoints: 0, appliedVoucher: null });
      },

      clearCart: () => set({ items: [], selected: {}, appliedDiscount: null, appliedPoints: 0, appliedVoucher: null }),

      toggleSelected: (variantId) => {
        const sel = get().selected;
        set({ selected: { ...sel, [variantId]: !sel[variantId] } });
      },

      setSelected: (variantId, value) => {
        set({ selected: { ...get().selected, [variantId]: value } });
      },

      selectAll: () => {
        const sel: Record<string, boolean> = {};
        get().items.forEach((i) => (sel[i.variantId] = true));
        set({ selected: sel });
      },

      deselectAll: () => set({ selected: {} }),

      getSelectedItems: () => {
        const sel = get().selected;
        return get().items.filter((i) => sel[i.variantId]);
      },

      applyDiscount: (code) => {
        const normalized = code.trim().toUpperCase();
        if (!normalized) return { ok: false, message: "Enter a code" };
        const percent = DISCOUNTS[normalized];
        if (!percent) return { ok: false, message: "Invalid code" };
        set({ appliedDiscount: { code: normalized, percent } });
        return { ok: true, message: `${percent}% off applied` };
      },
      removeDiscount: () => set({ appliedDiscount: null }),

      setAppliedPoints: (points) => set({ appliedPoints: Math.max(0, Math.round(points)) }),
      clearAppliedPoints: () => set({ appliedPoints: 0 }),
      setAppliedVoucher: (v) => set({ appliedVoucher: v }),

      placeOrder: async ({ items, subtotal, discount, pointsRedeemed = 0, pointsDiscount = 0, appliedVoucher = null, total, currency, sharedCartId, sharedMoodBoardId }) => {
        const { data: userRes } = await supabase.auth.getUser();
        const user = userRes.user;
        if (!user) throw new Error("Not authenticated");
        if (items.length === 0) throw new Error("No items selected");

        // Validate available points if any are being redeemed
        if (pointsRedeemed > 0) {
          const { data: prof } = await supabase
            .from("profiles").select("points").eq("user_id", user.id).maybeSingle();
          if ((prof?.points ?? 0) < pointsRedeemed) {
            throw new Error("Not enough available points");
          }
        }

        // Sharer attribution
        let sharerId: string | null = null;
        let alreadyAwardedSharer = false;
        if (sharedCartId) {
          const { data: cart } = await supabase
            .from("shared_carts").select("sharer_id").eq("id", sharedCartId).maybeSingle();
          if (cart && cart.sharer_id !== user.id) {
            sharerId = cart.sharer_id;
            const { data: prevOrder } = await supabase
              .from("orders").select("id, shared_cart_id").eq("user_id", user.id).gt("points_awarded_to_sharer", 0).limit(50);
            if (prevOrder && prevOrder.length) {
              const cartIds = prevOrder.map((o) => o.shared_cart_id).filter(Boolean) as string[];
              if (cartIds.length) {
                const { data: theirCarts } = await supabase
                  .from("shared_carts").select("id").in("id", cartIds).eq("sharer_id", sharerId);
                if (theirCarts && theirCarts.length) alreadyAwardedSharer = true;
              }
            }
          }
        }
        const pointsToAwardSharer = sharerId && !alreadyAwardedSharer ? Math.max(1, Math.round(total * SHARER_COMMISSION_RATE)) : 0;

        // Mood board attribution
        let boardCreatorId: string | null = null;
        let alreadyAwardedCreator = false;
        if (sharedMoodBoardId) {
          const { data: board } = await supabase
            .from("mood_boards").select("user_id").eq("id", sharedMoodBoardId).maybeSingle();
          if (board && board.user_id !== user.id) {
            boardCreatorId = board.user_id;
            const { data: prevBoardOrders } = await supabase
              .from("orders").select("id, shared_mood_board_id").eq("user_id", user.id).gt("points_awarded_to_board_creator", 0).limit(50);
            if (prevBoardOrders && prevBoardOrders.length) {
              const boardIds = prevBoardOrders.map((o: any) => o.shared_mood_board_id).filter(Boolean) as string[];
              if (boardIds.length) {
                const { data: theirBoards } = await supabase
                  .from("mood_boards").select("id").in("id", boardIds).eq("user_id", boardCreatorId);
                if (theirBoards && theirBoards.length) alreadyAwardedCreator = true;
              }
            }
          }
        }
        const pointsToAwardCreator = boardCreatorId && !alreadyAwardedCreator ? Math.max(1, Math.round(total * SHARER_COMMISSION_RATE)) : 0;

        // Insert order with redemption details
        const { data: order, error: orderErr } = await supabase
          .from("orders")
          .insert({
            user_id: user.id,
            subtotal,
            discount,
            total,
            currency,
            shared_cart_id: sharedCartId ?? null,
            points_awarded_to_sharer: pointsToAwardSharer,
            shared_mood_board_id: sharedMoodBoardId ?? null,
            points_awarded_to_board_creator: pointsToAwardCreator,
            points_redeemed: pointsRedeemed,
            points_discount: pointsDiscount,
            applied_voucher_id: appliedVoucher?.id ?? null,
          } as any)
          .select("id")
          .single();
        if (orderErr || !order) throw orderErr || new Error("Order insert failed");

        // Order items
        const rows = items.map((i) => ({
          order_id: order.id,
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
        if (rows.length) {
          const { error: itemsErr } = await supabase.from("order_items").insert(rows);
          if (itemsErr) throw itemsErr;
        }

        // Spend buyer's points (decrement available, leave lifetime untouched)
        if (pointsRedeemed > 0) {
          try {
            const { data: prof } = await supabase
              .from("profiles").select("points").eq("user_id", user.id).maybeSingle();
            const newAvail = Math.max(0, (prof?.points ?? 0) - pointsRedeemed);
            await supabase.from("point_ledger").insert({
              user_id: user.id,
              amount: -pointsRedeemed,
              source_type: "cart_redemption",
              source_id: order.id,
              reason: `Redeemed ${pointsRedeemed} points for $${pointsDiscount.toFixed(2)} off`,
            });
            await supabase.from("profiles").update({ points: newAvail }).eq("user_id", user.id);
          } catch (e) {
            console.error("Failed to deduct redeemed points", e);
          }
        }

        // Mark applied voucher used
        if (appliedVoucher) {
          try {
            await supabase
              .from("user_vouchers")
              .update({ status: "used", used_at: new Date().toISOString(), used_order_id: order.id })
              .eq("id", appliedVoucher.id);
          } catch (e) {
            console.error("Failed to consume voucher", e);
          }
        }

        // Award sharer (lifetime + available both go up)
        if (sharerId && pointsToAwardSharer > 0) {
          try {
            const { data: sharerProfile } = await supabase
              .from("profiles").select("points, lifetime_points").eq("user_id", sharerId).maybeSingle();
            const newAvailable = (sharerProfile?.points ?? 0) + pointsToAwardSharer;
            const newLifetime = (sharerProfile?.lifetime_points ?? 0) + pointsToAwardSharer;
            const newTier = getTierForLifetime(newLifetime);
            await supabase.from("point_ledger").insert({
              user_id: sharerId,
              amount: pointsToAwardSharer,
              source_type: "shared_cart_purchase",
              source_id: order.id,
              reason: `Friend purchased from your shared cart (5% commission)`,
            });
            await supabase.from("profiles")
              .update({ points: newAvailable, lifetime_points: newLifetime, tier: newTier })
              .eq("user_id", sharerId);
            await supabase.from("activity_feed").insert({
              user_id: sharerId,
              action_type: "shared_cart_purchase",
              metadata: { points_earned: pointsToAwardSharer, order_id: order.id },
              is_public: true,
            });
          } catch (e) {
            console.error("Failed to award sharer points", e);
          }
        }

        // Award mood board creator
        if (boardCreatorId && pointsToAwardCreator > 0) {
          try {
            const { data: creatorProfile } = await supabase
              .from("profiles").select("points, lifetime_points").eq("user_id", boardCreatorId).maybeSingle();
            const newAvailable = (creatorProfile?.points ?? 0) + pointsToAwardCreator;
            const newLifetime = (creatorProfile?.lifetime_points ?? 0) + pointsToAwardCreator;
            const newTier = getTierForLifetime(newLifetime);
            await supabase.from("point_ledger").insert({
              user_id: boardCreatorId,
              amount: pointsToAwardCreator,
              source_type: "mood_board_purchase",
              source_id: order.id,
              reason: `Mood Board Purchase Reward — earned from shared board conversion`,
            });
            await supabase.from("profiles")
              .update({ points: newAvailable, lifetime_points: newLifetime, tier: newTier })
              .eq("user_id", boardCreatorId);
            await supabase.from("activity_feed").insert({
              user_id: boardCreatorId,
              action_type: "mood_board_purchase",
              metadata: {
                points_earned: pointsToAwardCreator,
                order_id: order.id,
                mood_board_id: sharedMoodBoardId,
              },
              is_public: true,
            });
          } catch (e) {
            console.error("Failed to award mood board creator points", e);
          }
        }

        // Remove purchased items, clear redemption state
        get().removeItems(items.map((i) => i.variantId));
        set({ appliedPoints: 0, appliedVoucher: null });

        try {
          const { logEngagement } = await import("@/services/engagementService");
          for (const i of items) {
            logEngagement(i.product, "purchase", {
              price: parseFloat(i.price.amount) * i.quantity,
            });
          }
        } catch { /* ignore */ }

        return {
          orderId: order.id,
          pointsAwardedToSharer: pointsToAwardSharer,
          pointsAwardedToBoardCreator: pointsToAwardCreator,
        };
      },

      syncCart: async () => { /* local cart */ },
    }),
    {
      name: "phia-local-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        items: state.items,
        selected: state.selected,
        appliedDiscount: state.appliedDiscount,
        // intentionally NOT persisting appliedPoints / appliedVoucher
        // (they should be re-chosen each session)
      }),
    }
  )
);

export { POINTS_PER_DOLLAR, MAX_POINTS_DISCOUNT_RATIO, dollarsToPoints, pointsToDollars };
