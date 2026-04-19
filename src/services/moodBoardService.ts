import { supabase } from "@/integrations/supabase/client";

export interface SharedMoodBoardItem {
  id: string;
  product_name: string;
  product_image: string | null;
  product_url: string | null;
  notes: string | null;
}

export interface SharedMoodBoardFull {
  board: {
    id: string;
    name: string;
    description: string | null;
    cover_image: string | null;
    user_id: string;
    is_public: boolean;
    created_at: string;
  };
  items: SharedMoodBoardItem[];
  creator: { display_name: string | null; avatar_url: string | null } | null;
}

export async function getSharedMoodBoard(id: string): Promise<SharedMoodBoardFull | null> {
  const { data: board, error } = await supabase
    .from("mood_boards")
    .select("id, name, description, cover_image, user_id, is_public, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!board) return null;

  const [{ data: items }, { data: creator }] = await Promise.all([
    supabase
      .from("mood_board_items")
      .select("id, product_name, product_image, product_url, notes")
      .eq("board_id", id)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("user_id", board.user_id)
      .maybeSingle(),
  ]);

  return {
    board,
    items: (items || []) as SharedMoodBoardItem[],
    creator: creator as SharedMoodBoardFull["creator"],
  };
}

export async function setBoardPublic(id: string, isPublic: boolean) {
  const { error } = await supabase
    .from("mood_boards")
    .update({ is_public: isPublic })
    .eq("id", id);
  if (error) throw error;
}
