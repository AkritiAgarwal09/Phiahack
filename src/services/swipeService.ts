import { supabase } from "@/integrations/supabase/client";

export type SwipeDirection = "left" | "right" | "up" | "tap";
export type SwipeTargetType = "product" | "outfit" | "moodboard" | "aesthetic" | "color";
export type SwipeContext = "onboarding" | "studio" | "concierge";

export interface SwipeEventInput {
  target_type: SwipeTargetType;
  target_id: string;
  target_title?: string | null;
  target_image?: string | null;
  vendor?: string | null;
  category?: string | null;
  tags?: string[];
  price?: number | null;
  direction: SwipeDirection;
  reason?: string | null;
  dwell_ms?: number;
  context?: SwipeContext;
}

export interface SwipeEventRow {
  id: string;
  user_id: string;
  target_type: SwipeTargetType;
  target_id: string;
  target_title: string | null;
  target_image: string | null;
  vendor: string | null;
  category: string | null;
  tags: string[] | null;
  price: number | null;
  direction: SwipeDirection;
  reason: string | null;
  dwell_ms: number | null;
  context: string | null;
  created_at: string;
}

export interface StyleProfileRow {
  id: string;
  user_id: string;
  top_categories: string[];
  color_palette: string[];
  aesthetic_clusters: string[];
  price_tolerance: "budget" | "mid" | "premium" | "luxury";
  bold_minimal_score: number;
  casual_formal_score: number;
  brand_affinity: string[];
  ai_summary: string | null;
  total_swipes: number;
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function logSwipe(input: SwipeEventInput): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  const { error } = await supabase.from("swipe_events").insert({
    user_id: u.user.id,
    target_type: input.target_type,
    target_id: input.target_id,
    target_title: input.target_title ?? null,
    target_image: input.target_image ?? null,
    vendor: input.vendor ?? null,
    category: input.category ?? null,
    tags: input.tags ?? [],
    price: input.price ?? null,
    direction: input.direction,
    reason: input.reason ?? null,
    dwell_ms: input.dwell_ms ?? 0,
    context: input.context ?? "studio",
  });
  if (error) console.warn("logSwipe failed", error.message);
}

export async function loadMySwipes(limit = 200): Promise<SwipeEventRow[]> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return [];
  const { data, error } = await supabase
    .from("swipe_events")
    .select("*")
    .eq("user_id", u.user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.warn("loadMySwipes failed", error.message);
    return [];
  }
  return (data || []) as SwipeEventRow[];
}

export async function loadMyStyleProfile(): Promise<StyleProfileRow | null> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data, error } = await supabase
    .from("style_profiles")
    .select("*")
    .eq("user_id", u.user.id)
    .maybeSingle();
  if (error) {
    console.warn("loadMyStyleProfile failed", error.message);
    return null;
  }
  return (data as StyleProfileRow) || null;
}

export async function upsertMyStyleProfile(
  patch: Partial<Omit<StyleProfileRow, "id" | "user_id" | "created_at" | "updated_at">>
): Promise<StyleProfileRow | null> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data, error } = await supabase
    .from("style_profiles")
    .upsert(
      { user_id: u.user.id, ...patch, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    )
    .select()
    .single();
  if (error) {
    console.warn("upsertMyStyleProfile failed", error.message);
    return null;
  }
  return data as StyleProfileRow;
}

export async function markOnboardingCompleted(): Promise<void> {
  const { error } = await supabase.rpc("mark_onboarding_completed");
  if (error) console.warn("markOnboardingCompleted failed", error.message);
}

export interface ClusterTrendingRow {
  target_id: string;
  target_title: string | null;
  target_image: string | null;
  vendor: string | null;
  category: string | null;
  tags: string[] | null;
  price: number | null;
  love_count: number;
  unique_users: number;
}

export async function loadClusterTrending(maxItems = 12): Promise<ClusterTrendingRow[]> {
  const { data, error } = await supabase.rpc("get_style_cluster_trending", {
    days_back: 14,
    max_items: maxItems,
  });
  if (error) {
    console.warn("loadClusterTrending failed", error.message);
    return [];
  }
  return (data || []) as ClusterTrendingRow[];
}
