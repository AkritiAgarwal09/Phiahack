import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, LayoutGrid, Trash2, ArrowLeft, ImageOff, Sparkles, Loader2, Share2, Layers, Compass, Globe, Lock } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { earnPoints } from "@/services/pointsService";
import { ShopifyProduct, formatMoney } from "@/lib/shopify";
import { localProducts } from "@/data/shopProducts";
import AddToBoardDialog, { PinnableItem } from "@/components/shop/AddToBoardDialog";
import PinDetailDialog from "@/components/moodboard/PinDetailDialog";
import ShareBoardDialog from "@/components/moodboard/ShareBoardDialog";
import BoardStatsChip from "@/components/moodboard/BoardStatsChip";
import PublicMoodBoardsGallery from "@/components/discover/PublicMoodBoardsGallery";
import { Switch } from "@/components/ui/switch";
import { setBoardPublic } from "@/services/moodBoardService";

const boardGradients = [
  "from-blue-500/15 via-indigo-500/10 to-violet-500/15",
  "from-rose-500/15 via-pink-500/10 to-fuchsia-500/15",
  "from-amber-400/15 via-orange-400/10 to-rose-400/15",
  "from-emerald-400/15 via-teal-400/10 to-cyan-400/15",
  "from-violet-500/15 via-purple-500/10 to-indigo-500/15",
  "from-slate-400/15 via-zinc-400/10 to-stone-400/15",
];

interface MoodBoard {
  id: string;
  name: string;
  updated_at: string;
  is_public: boolean;
}

interface PinItem {
  id: string;
  product_name: string;
  product_image: string | null;
  product_url: string | null;
}

const MoodBoards = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [pinTarget, setPinTarget] = useState<PinnableItem | null>(null);
  const [openPin, setOpenPin] = useState<PinItem | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const subTab: "mine" | "discover" = searchParams.get("sub") === "discover" ? "discover" : "mine";
  const setSubTab = (next: "mine" | "discover") => {
    const params = new URLSearchParams(searchParams);
    if (next === "mine") params.delete("sub");
    else params.set("sub", next);
    setSearchParams(params, { replace: true });
  };

  const { data: boards = [], isLoading } = useQuery({
    queryKey: ["mood_boards", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mood_boards")
        .select("id, name, updated_at, is_public")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as MoodBoard[];
    },
    enabled: !!user,
  });

  const { data: previews = {} } = useQuery({
    queryKey: ["mood_board_previews", user?.id, boards.map((b) => b.id).join(",")],
    queryFn: async () => {
      if (boards.length === 0) return {};
      const { data, error } = await supabase
        .from("mood_board_items")
        .select("board_id, product_image, created_at")
        .in("board_id", boards.map((b) => b.id))
        .order("created_at", { ascending: false });
      if (error) throw error;
      const map: Record<string, { count: number; images: string[] }> = {};
      for (const row of data) {
        const entry = (map[row.board_id] ||= { count: 0, images: [] });
        entry.count += 1;
        if (entry.images.length < 4 && row.product_image) entry.images.push(row.product_image);
      }
      return map;
    },
    enabled: !!user && boards.length > 0,
  });

  const createBoard = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("mood_boards").insert({ user_id: user!.id, name });
      if (error) throw error;
      await earnPoints("create_board");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mood_boards"] });
      setNewName("");
      setShowCreate(false);
      toast.success("Board created · +20 pts");
    },
  });

  const deleteBoard = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("mood_board_items").delete().eq("board_id", id);
      const { error } = await supabase.from("mood_boards").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mood_boards"] });
      toast.success("Board deleted");
    },
  });

  const togglePublic = useMutation({
    mutationFn: async ({ id, isPublic }: { id: string; isPublic: boolean }) => {
      await setBoardPublic(id, isPublic);
      return { id, isPublic };
    },
    onSuccess: ({ isPublic }) => {
      qc.invalidateQueries({ queryKey: ["mood_boards"] });
      qc.invalidateQueries({ queryKey: ["public_mood_boards"] });
      toast.success(isPublic ? "Board is now public" : "Board set to private");
    },
    onError: () => toast.error("Couldn't update visibility"),
  });

  const activeBoard = useMemo(
    () => boards.find((b) => b.id === activeBoardId) || null,
    [boards, activeBoardId]
  );

  if (activeBoard) {
    return (
      <>
        <BoardDetail
          board={activeBoard}
          onBack={() => setActiveBoardId(null)}
          onPickProduct={setPinTarget}
          onOpenPin={setOpenPin}
        />
        <AddToBoardDialog item={pinTarget} open={!!pinTarget} onOpenChange={(o) => !o && setPinTarget(null)} />
        <PinDetailDialog
          pin={openPin}
          open={!!openPin}
          onOpenChange={(o) => !o && setOpenPin(null)}
          onAddToBoard={(item) => {
            setOpenPin(null);
            setPinTarget(item);
          }}
        />
      </>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Your Edit</p>
          <h2 className="mt-1 flex items-center gap-2 font-serif text-3xl font-bold text-foreground sm:text-4xl">
            Mood Boards
            <Sparkles className="h-5 w-5 text-primary" />
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pin pieces that move you — build your own visual edit.
          </p>
        </div>
        {subTab === "mine" && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center justify-center gap-2 rounded-full gradient-gold px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-gold transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> New Board
          </button>
        )}
      </div>

      {/* Sub-tabs */}
      <div className="inline-flex rounded-full border border-border bg-card p-1">
        <button
          onClick={() => setSubTab("mine")}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
            subTab === "mine"
              ? "bg-primary text-primary-foreground shadow-gold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Layers className="h-4 w-4" />
          My Mood Boards
        </button>
        <button
          onClick={() => setSubTab("discover")}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
            subTab === "discover"
              ? "bg-primary text-primary-foreground shadow-gold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Compass className="h-4 w-4" />
          Discover Mood Boards
        </button>
      </div>

      {subTab === "discover" ? (
        <PublicMoodBoardsGallery variant="light" />
      ) : (
        <>
          {showCreate && (
            <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 sm:flex-row">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Board name (e.g. Quiet Luxury)"
                className="flex-1 rounded-xl border border-border bg-secondary/50 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                onKeyDown={(e) => e.key === "Enter" && newName.trim() && createBoard.mutate(newName.trim())}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => newName.trim() && createBoard.mutate(newName.trim())}
                  className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 sm:flex-none"
                >
                  Create
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="rounded-xl border border-border px-4 py-2.5 text-sm text-muted-foreground hover:bg-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Boards grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="aspect-[4/5] animate-pulse rounded-2xl bg-secondary" />
              ))}
            </div>
          ) : boards.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
              <LayoutGrid className="h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-foreground">No boards yet</p>
              <p className="text-sm text-muted-foreground">Create your first mood board to start pinning.</p>
              <button
                onClick={() => setShowCreate(true)}
                className="mt-5 flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                <Plus className="h-4 w-4" /> Create board
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {boards.map((board, i) => {
                const preview = previews[board.id];
                const images = preview?.images || [];
                return (
                  <button
                    key={board.id}
                    onClick={() => setActiveBoardId(board.id)}
                    className="group relative overflow-hidden rounded-2xl border border-border bg-card text-left transition-all hover:-translate-y-0.5 hover:shadow-elevated"
                  >
                    <div className={`relative aspect-[4/5] bg-gradient-to-br ${boardGradients[i % boardGradients.length]}`}>
                      {images.length > 0 ? (
                        <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-0.5">
                          {[0, 1, 2, 3].map((idx) => (
                            <div key={idx} className="overflow-hidden bg-secondary/40">
                              {images[idx] ? (
                                <img
                                  src={images[idx]}
                                  alt=""
                                  loading="lazy"
                                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <ImageOff className="h-8 w-8" />
                        </div>
                      )}

                      <div className="absolute right-2 top-2 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            togglePublic.mutate({ id: board.id, isPublic: !board.is_public });
                          }}
                          className={`rounded-full p-1.5 backdrop-blur-md transition-colors ${
                            board.is_public
                              ? "bg-primary/20 text-primary hover:bg-primary/30"
                              : "bg-background/85 text-muted-foreground hover:bg-secondary"
                          }`}
                          aria-label={board.is_public ? "Make private" : "Make public"}
                          title={board.is_public ? "Public · click to make private" : "Private · click to make public"}
                        >
                          {board.is_public ? <Globe className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); e.preventDefault(); deleteBoard.mutate(board.id); }}
                          className="rounded-full bg-background/85 p-1.5 backdrop-blur-md transition-opacity hover:bg-destructive/15 hover:text-destructive"
                          aria-label="Delete board"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="flex items-center gap-1.5">
                        <h3 className="line-clamp-1 flex-1 font-serif text-base font-semibold text-foreground">{board.name}</h3>
                        {board.is_public && (
                          <Globe className="h-3 w-3 shrink-0 text-primary" aria-label="Public" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{preview?.count || 0} items</p>
                      <BoardStatsChip boardId={board.id} isPublic={board.is_public} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      <AddToBoardDialog
        item={pinTarget}
        open={!!pinTarget}
        onOpenChange={(o) => !o && setPinTarget(null)}
      />
    </div>
  );
};

interface BoardDetailProps {
  board: MoodBoard;
  onBack: () => void;
  onPickProduct: (item: PinnableItem) => void;
  onOpenPin: (pin: PinItem) => void;
}

const BoardDetail = ({ board, onBack, onPickProduct, onOpenPin }: BoardDetailProps) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [shareOpen, setShareOpen] = useState(false);
  const [isPublic, setIsPublic] = useState(board.is_public);

  const { data: items = [] } = useQuery({
    queryKey: ["mood_board_items", board.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mood_board_items")
        .select("*")
        .eq("board_id", board.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Suggestions: local catalog products not pinned yet
  const suggestions: ShopifyProduct[] = localProducts;
  const loadingSuggest = false;

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mood_board_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mood_board_items", board.id] });
      qc.invalidateQueries({ queryKey: ["mood_board_previews"] });
      toast.success("Removed from board");
    },
  });

  const pinnedUrls = new Set(items.map((i: any) => i.product_url).filter(Boolean));
  const filteredSuggest = suggestions.filter((p) => !pinnedUrls.has(p.node.id)).slice(0, 12);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> All boards
        </button>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted-foreground">{items.length} pins</p>
          <label className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs">
            {isPublic ? <Globe className="h-3.5 w-3.5 text-primary" /> : <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
            <span className={isPublic ? "font-medium text-foreground" : "text-muted-foreground"}>
              {isPublic ? "Public" : "Private"}
            </span>
            <Switch
              checked={isPublic}
              onCheckedChange={async (checked) => {
                setIsPublic(checked);
                try {
                  await setBoardPublic(board.id, checked);
                  toast.success(checked ? "Board is now public" : "Board set to private");
                } catch {
                  setIsPublic(!checked);
                  toast.error("Couldn't update visibility");
                }
              }}
            />
          </label>
          <button
            onClick={() => setShareOpen(true)}
            className="flex items-center gap-1.5 rounded-full gradient-gold px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-gold transition-opacity hover:opacity-90"
          >
            <Share2 className="h-3.5 w-3.5" /> Share Board
          </button>
        </div>
      </div>

      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Mood Board</p>
        <div className="mt-1 flex items-center gap-3">
          <h2 className="font-serif text-3xl font-bold text-foreground sm:text-4xl">{board.name}</h2>
          {isPublic && (
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
              <Share2 className="h-3 w-3" /> Shareable
            </span>
          )}
        </div>
      </div>

      {/* Pinterest masonry */}
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center">
          <p className="text-foreground">This board is empty</p>
          <p className="mt-1 text-sm text-muted-foreground">Pin from the suggestions below.</p>
        </div>
      ) : (
        <div className="columns-2 gap-3 sm:columns-3 lg:columns-4 [&>*]:mb-3">
          {items.map((item: any) => (
            <figure
              key={item.id}
              onClick={() => onOpenPin(item)}
              className="group relative cursor-pointer break-inside-avoid overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-elevated"
            >
              {item.product_image ? (
                <img
                  src={item.product_image}
                  alt={item.product_name}
                  loading="lazy"
                  className="w-full object-cover"
                />
              ) : (
                <div className="flex aspect-square items-center justify-center bg-secondary text-muted-foreground">
                  <ImageOff className="h-6 w-6" />
                </div>
              )}
              <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="line-clamp-2 text-xs font-medium text-white">{item.product_name}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); removeItem.mutate(item.id); }}
                  className="shrink-0 rounded-full bg-background/90 p-1.5 text-foreground hover:bg-destructive/20 hover:text-destructive"
                  aria-label="Remove pin"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      {/* Add more from shop (live Shopify) */}
      <div className="space-y-4 border-t border-border pt-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Browse to pin</p>
            <h3 className="mt-1 font-serif text-2xl font-bold text-foreground">Add more to this board</h3>
          </div>
        </div>
        {loadingSuggest ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : filteredSuggest.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No more products to suggest. Add new products from chat to expand the catalog.
          </p>
        ) : (
          <div className="columns-2 gap-3 sm:columns-3 lg:columns-4 [&>*]:mb-3">
            {filteredSuggest.map((p) => {
              const img = p.node.images.edges[0]?.node?.url;
              return (
                <button
                  key={p.node.id}
                  onClick={() =>
                    onPickProduct({
                      name: p.node.vendor ? `${p.node.vendor} • ${p.node.title}` : p.node.title,
                      image: img || null,
                      url: p.node.id,
                    })
                  }
                  className="group block w-full break-inside-avoid overflow-hidden rounded-2xl border border-border bg-card text-left transition-all hover:-translate-y-0.5 hover:shadow-elevated"
                >
                  {img ? (
                    <img src={img} alt={p.node.title} loading="lazy" className="w-full object-cover" />
                  ) : (
                    <div className="flex aspect-square items-center justify-center bg-secondary text-muted-foreground">
                      <ImageOff className="h-6 w-6" />
                    </div>
                  )}
                  <div className="p-3">
                    <p className="line-clamp-1 font-serif text-sm font-semibold text-foreground">{p.node.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatMoney(p.node.priceRange.minVariantPrice.amount, p.node.priceRange.minVariantPrice.currencyCode)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <ShareBoardDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        boardId={board.id}
        boardName={board.name}
        isPublic={isPublic}
        onPublicChange={(v) => {
          setIsPublic(v);
          qc.invalidateQueries({ queryKey: ["mood_boards"] });
        }}
      />
    </div>
  );
};

export default MoodBoards;
