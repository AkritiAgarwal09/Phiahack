import { supabase } from "@/integrations/supabase/client";
import type { TrendingRow } from "./engagementService";

export async function followUser(targetUserId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  if (user.id === targetUserId) throw new Error("You can't follow yourself");
  const { error } = await supabase
    .from("social_follows")
    .insert({ follower_id: user.id, following_id: targetUserId });
  if (error && (error as { code?: string }).code !== "23505") throw error;
}

export async function unfollowUser(targetUserId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { error } = await supabase
    .from("social_follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("following_id", targetUserId);
  if (error) throw error;
}

export async function isFollowing(targetUserId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("social_follows")
    .select("id")
    .eq("follower_id", user.id)
    .eq("following_id", targetUserId)
    .maybeSingle();
  return !!data;
}

export async function followingCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from("social_follows")
    .select("id", { count: "exact", head: true })
    .eq("follower_id", userId);
  return count || 0;
}

export async function followerCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from("social_follows")
    .select("id", { count: "exact", head: true })
    .eq("following_id", userId);
  return count || 0;
}

/**
 * Recent activity from people the current user follows.
 * Returns an aggregated view by product so we can surface a "New from people you follow" rail.
 */
export async function loadFollowedActivity(daysBack = 14, max = 30): Promise<TrendingRow[]> {
  const { data, error } = await supabase.rpc("get_followed_user_engagements" as never, {
    days_back: daysBack,
    max_items: max,
  } as never);
  if (error) {
    console.warn("[follows] activity failed", error);
    return [];
  }
  return (data || []) as TrendingRow[];
}
