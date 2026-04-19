import { supabase } from "@/integrations/supabase/client";
import { spendPoints } from "./pointsService";

export type RewardType = "amount_off" | "percent_off" | "free_shipping" | "perk";

export interface Voucher {
  id: string;
  code: string;
  title: string;
  description: string | null;
  cost_points: number;
  reward_type: RewardType;
  reward_value: number;
  min_subtotal: number;
  required_tier: string | null;
  active: boolean;
  icon: string | null;
}

export interface UserVoucher {
  id: string;
  voucher_id: string;
  redeemed_at: string;
  used_at: string | null;
  used_order_id: string | null;
  expires_at: string | null;
  cost_points: number;
  reward_type: RewardType;
  reward_value: number;
  status: "available" | "used" | "expired";
  voucher?: Voucher | null;
}

export async function listVouchers(): Promise<Voucher[]> {
  const { data, error } = await supabase
    .from("vouchers")
    .select("*")
    .eq("active", true)
    .order("cost_points", { ascending: true });
  if (error) throw error;
  return (data || []) as Voucher[];
}

export async function listMyVouchers(): Promise<UserVoucher[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("user_vouchers")
    .select("*, voucher:vouchers(*)")
    .eq("user_id", user.id)
    .order("redeemed_at", { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as UserVoucher[];
}

export async function redeemVoucher(voucher: Voucher): Promise<UserVoucher> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Charge points first (validates balance)
  await spendPoints(
    voucher.cost_points,
    "voucher_redemption",
    voucher.id,
    `Redeemed: ${voucher.title}`
  );

  // Vouchers expire 90 days after redemption
  const expires = new Date();
  expires.setDate(expires.getDate() + 90);

  const { data, error } = await supabase
    .from("user_vouchers")
    .insert({
      user_id: user.id,
      voucher_id: voucher.id,
      cost_points: voucher.cost_points,
      reward_type: voucher.reward_type,
      reward_value: voucher.reward_value,
      expires_at: expires.toISOString(),
      status: "available",
    })
    .select("*, voucher:vouchers(*)")
    .single();
  if (error) throw error;
  return data as unknown as UserVoucher;
}

/** Marks a wallet voucher as consumed by an order. */
export async function consumeVoucher(userVoucherId: string, orderId: string) {
  const { error } = await supabase
    .from("user_vouchers")
    .update({
      status: "used",
      used_at: new Date().toISOString(),
      used_order_id: orderId,
    })
    .eq("id", userVoucherId);
  if (error) throw error;
}

/** Compute the dollar discount a voucher would apply on a given subtotal. */
export function calcVoucherDiscount(
  uv: Pick<UserVoucher, "reward_type" | "reward_value">,
  subtotal: number
): { amount: number; freeShipping: boolean } {
  switch (uv.reward_type) {
    case "amount_off":
      return { amount: Math.min(uv.reward_value, subtotal), freeShipping: false };
    case "percent_off":
      return { amount: +((subtotal * uv.reward_value) / 100).toFixed(2), freeShipping: false };
    case "free_shipping":
      return { amount: 0, freeShipping: true };
    case "perk":
    default:
      return { amount: 0, freeShipping: false };
  }
}

export function isVoucherEligible(
  v: Pick<Voucher, "min_subtotal" | "reward_type">,
  subtotal: number
): boolean {
  if (v.reward_type === "perk") return true;
  return subtotal >= (v.min_subtotal || 0);
}

export function rewardLabel(v: Pick<Voucher, "reward_type" | "reward_value">): string {
  switch (v.reward_type) {
    case "amount_off": return `$${v.reward_value} off`;
    case "percent_off": return `${v.reward_value}% off`;
    case "free_shipping": return "Free shipping";
    case "perk": return "Member perk";
  }
}
