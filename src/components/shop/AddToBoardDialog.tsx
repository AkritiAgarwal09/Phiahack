import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Plus, LayoutGrid, Check } from "lucide-react";
import { toast } from "sonner";
import { earnPoints } from "@/services/pointsService";
import { logEngagement } from "@/services/engagementService";
import { localProducts } from "@/data/shopProducts";

export interface PinnableItem {
  name: string;
  image: string | null;
  url: string; // unique identifier (e.g. shopify handle or product gid)
}

interface Props {
  item: PinnableItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AddToBoardDialog = ({ item, open, onOpenChange }: Props) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const { data: boards = [] } = useQuery({
    queryKey: ["mood_boards", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mood_boards")
        .select("id, name")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && open,
  });

  const addToBoard = useMutation({
    mutationFn: async (boardId: string) => {
      if (!item) return;
      const { error } = await supabase.from("mood_board_items").insert({
        board_id: boardId,
        product_name: item.name,
        product_image: item.image,
        product_url: item.url,
      });
      if (error) throw error;
      await supabase.from("mood_boards").update({ updated_at: new Date().toISOString() }).eq("id", boardId);
      // Predictive engagement signal
      const matched = localProducts.find((p) => p.node.id === item.url);
      if (matched) logEngagement(matched, "moodboard");
      else logEngagement(null, "moodboard", { id: item.url, title: item.name });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mood_boards"] });
      qc.invalidateQueries({ queryKey: ["mood_board_items"] });
      qc.invalidateQueries({ queryKey: ["mood_board_previews"] });
      toast.success("Pinned to your mood board ✨");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const createAndAdd = useMutation({
    mutationFn: async () => {
      if (!item || !newName.trim()) return;
      const { data: board, error } = await supabase
        .from("mood_boards")
        .insert({ user_id: user!.id, name: newName.trim() })
        .select("id")
        .single();
      if (error) throw error;
      const { error: itemErr } = await supabase.from("mood_board_items").insert({
        board_id: board.id,
        product_name: item.name,
        product_image: item.image,
        product_url: item.url,
      });
      if (itemErr) throw itemErr;
      await earnPoints("create_board");
      const matched = localProducts.find((p) => p.node.id === item.url);
      if (matched) logEngagement(matched, "moodboard");
      else logEngagement(null, "moodboard", { id: item.url, title: item.name });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mood_boards"] });
      qc.invalidateQueries({ queryKey: ["mood_board_items"] });
      qc.invalidateQueries({ queryKey: ["mood_board_previews"] });
      toast.success("New board created and item pinned!");
      setCreating(false);
      setNewName("");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Add to Mood Board</DialogTitle>
          <DialogDescription>{item?.name || "Choose a board"}</DialogDescription>
        </DialogHeader>

        <div className="max-h-72 overflow-y-auto">
          {boards.length === 0 && !creating && (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No boards yet — create your first one below.
            </div>
          )}

          <ul className="space-y-2">
            {boards.map((b) => (
              <li key={b.id}>
                <button
                  onClick={() => addToBoard.mutate(b.id)}
                  disabled={addToBoard.isPending}
                  className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary/40 hover:bg-secondary"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-accent/15 text-primary">
                      <LayoutGrid className="h-4 w-4" />
                    </span>
                    <span className="font-medium text-foreground">{b.name}</span>
                  </span>
                  <Check className="h-4 w-4 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        </div>

        {creating ? (
          <div className="mt-2 space-y-2">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Board name (e.g. Spring Capsule)"
              className="w-full rounded-xl border border-border bg-secondary/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              onKeyDown={(e) => e.key === "Enter" && newName.trim() && createAndAdd.mutate()}
            />
            <div className="flex gap-2">
              <button
                onClick={() => createAndAdd.mutate()}
                disabled={!newName.trim() || createAndAdd.isPending}
                className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                Create & Pin
              </button>
              <button
                onClick={() => setCreating(false)}
                className="rounded-xl border border-border px-4 py-2.5 text-sm text-muted-foreground hover:bg-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            <Plus className="h-4 w-4" /> New board
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddToBoardDialog;
