import { supabase } from "@/integrations/supabase/client";

export type PointAction =
  | "daily_checkin"
  | "save_item"
  | "share_cart"
  | "follow_user"
  | "refer_friend"
  | "create_board"
  | "add_to_wishlist";

const POINT_VALUES: Record<PointAction, { amount: number; reason: string }> = {
  daily_checkin: { amount: 5, reason: "Daily check-in bonus" },
  save_item: { amount: 10, reason: "Saved an item" },
  share_cart: { amount: 50, reason: "Shared a cart" },
  follow_user: { amount: 15, reason: "Followed a user" },
  refer_friend: { amount: 500, reason: "Referred a friend" },
  create_board: { amount: 20, reason: "Created a mood board" },
  add_to_wishlist: { amount: 10, reason: "Added item to wishlist" },
};

const TIER_THRESHOLDS = [
  { tier: "explorer", min: 0 },
  { tier: "insider", min: 5000 },
  { tier: "elite", min: 20000 },
  { tier: "circle_black", min: 50000 },
];

/** 10 points = $1 */
export const POINTS_PER_DOLLAR = 10;

/** Max share of cart subtotal that can be paid with points (50%) */
export const MAX_POINTS_DISCOUNT_RATIO = 0.5;

export function pointsToDollars(points: number): number {
  return +(points / POINTS_PER_DOLLAR).toFixed(2);
}

export function dollarsToPoints(dollars: number): number {
  return Math.round(dollars * POINTS_PER_DOLLAR);
}

/** Tier is ALWAYS computed from lifetime points earned, never the spendable balance. */
export function getTierForLifetime(lifetimePoints: number): string {
  for (let i = TIER_THRESHOLDS.length - 1; i >= 0; i--) {
    if (lifetimePoints >= TIER_THRESHOLDS[i].min) return TIER_THRESHOLDS[i].tier;
  }
  return "explorer";
}

export function getNextTierInfo(lifetimePoints: number) {
  const currentIdx = TIER_THRESHOLDS.findIndex(
    (t, i) =>
      lifetimePoints >= t.min &&
      (i === TIER_THRESHOLDS.length - 1 || lifetimePoints < TIER_THRESHOLDS[i + 1].min)
  );
  if (currentIdx === TIER_THRESHOLDS.length - 1) {
    return {
      currentTier: TIER_THRESHOLDS[currentIdx].tier,
      nextTier: null as string | null,
      pointsToNext: 0,
      progress: 100,
    };
  }
  const current = TIER_THRESHOLDS[currentIdx];
  const next = TIER_THRESHOLDS[currentIdx + 1];
  const range = next.min - current.min;
  const progress = Math.round(((lifetimePoints - current.min) / range) * 100);
  return {
    currentTier: current.tier,
    nextTier: next.tier,
    pointsToNext: next.min - lifetimePoints,
    progress,
  };
}

/**
 * Earn points: increases BOTH lifetime_points (tier progression) AND
 * available points balance (spendable).
 */
export async function earnPoints(action: PointAction, sourceId?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const config = POINT_VALUES[action];

  const { error: ledgerError } = await supabase.from("point_ledger").insert({
    user_id: user.id,
    amount: config.amount,
    source_type: action,
    source_id: sourceId || null,
    reason: config.reason,
  });
  if (ledgerError) throw ledgerError;

  const { data: profile } = await supabase
    .from("profiles")
    .select("points, lifetime_points")
    .eq("user_id", user.id)
    .single();

  const newAvailable = (profile?.points || 0) + config.amount;
  const newLifetime = (profile?.lifetime_points || 0) + config.amount;
  const newTier = getTierForLifetime(newLifetime);

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ points: newAvailable, lifetime_points: newLifetime, tier: newTier })
    .eq("user_id", user.id);
  if (profileError) throw profileError;

  await supabase.from("activity_feed").insert({
    user_id: user.id,
    action_type: action,
    metadata: { points_earned: config.amount, reason: config.reason },
    is_public: true,
  });

  return {
    pointsEarned: config.amount,
    availablePoints: newAvailable,
    lifetimePoints: newLifetime,
    tier: newTier,
  };
}

/**
 * Spend points: DECREASES available points only — does NOT touch lifetime_points
 * or tier. Logs a negative ledger entry.
 */
export async function spendPoints(
  amount: number,
  sourceType: string,
  sourceId: string | null,
  reason: string
) {
  if (amount <= 0) throw new Error("Amount must be positive");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("points, lifetime_points, tier")
    .eq("user_id", user.id)
    .single();

  const available = profile?.points || 0;
  if (available < amount) throw new Error("Not enough points");

  const newAvailable = available - amount;

  await supabase.from("point_ledger").insert({
    user_id: user.id,
    amount: -amount,
    source_type: sourceType,
    source_id: sourceId,
    reason,
  });

  // Tier intentionally left unchanged — based on lifetime, not balance.
  const { error } = await supabase
    .from("profiles")
    .update({ points: newAvailable })
    .eq("user_id", user.id);
  if (error) throw error;

  return { availablePoints: newAvailable, lifetimePoints: profile?.lifetime_points || 0 };
}

export async function getPointHistory(userId: string) {
  const { data, error } = await supabase
    .from("point_ledger")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data;
}
