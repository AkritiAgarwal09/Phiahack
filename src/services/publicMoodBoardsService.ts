import { supabase } from "@/integrations/supabase/client";

export interface PublicMoodBoardRow {
  id: string;
  name: string;
  description: string | null;
  cover_image: string | null;
  user_id: string;
  creator_name: string | null;
  creator_avatar: string | null;
  item_count: number;
  view_count: number;
  preview_images: string[];
  top_caption: string | null;
  top_caption_pin_id: string | null;
  created_at: string;
}

export type PublicBoardSort = "most_viewed" | "newest" | "most_pinned";

export async function loadPublicMoodBoards(
  searchQuery: string | null = null,
  max = 30,
  sort: PublicBoardSort = "most_viewed",
): Promise<PublicMoodBoardRow[]> {
  const { data, error } = await supabase.rpc("get_public_mood_boards" as never, {
    search_query: searchQuery,
    max_items: max,
  } as never);
  if (error) {
    console.warn("[public boards] failed", error);
    return [];
  }
  const rows = (data || []) as PublicMoodBoardRow[];
  const sorted = [...rows].sort((a, b) => {
    if (sort === "newest") return +new Date(b.created_at) - +new Date(a.created_at);
    if (sort === "most_pinned") return (b.item_count || 0) - (a.item_count || 0);
    return (b.view_count || 0) - (a.view_count || 0);
  });
  return sorted;
}

export async function recordBoardView(boardId: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // upsert via insert + onConflict-ignore behavior: try insert, if conflict update timestamp
    const { error: insertErr } = await supabase
      .from("mood_board_views")
      .insert({ board_id: boardId, viewer_id: user.id });
    if (insertErr && (insertErr as { code?: string }).code === "23505") {
      await supabase
        .from("mood_board_views")
        .update({ last_viewed_at: new Date().toISOString() })
        .eq("board_id", boardId)
        .eq("viewer_id", user.id);
    }
  } catch (e) {
    console.warn("[public boards] view failed", e);
  }
}

export async function getBoardViewCount(boardId: string): Promise<number> {
  const { data, error } = await supabase.rpc("get_mood_board_view_count" as never, { _board_id: boardId } as never);
  if (error) return 0;
  return Number(data || 0);
}

export interface MoodBoardPurchaseStats {
  purchase_count: number;
  total_revenue: number;
  total_points_earned: number;
}

export async function getMoodBoardPurchaseStats(boardId: string): Promise<MoodBoardPurchaseStats> {
  const { data, error } = await supabase.rpc("get_mood_board_purchase_stats" as never, { _board_id: boardId } as never);
  if (error) {
    console.warn("[stats] purchase failed", error);
    return { purchase_count: 0, total_revenue: 0, total_points_earned: 0 };
  }
  const row = (data as MoodBoardPurchaseStats[] | undefined)?.[0];
  return row || { purchase_count: 0, total_revenue: 0, total_points_earned: 0 };
}
