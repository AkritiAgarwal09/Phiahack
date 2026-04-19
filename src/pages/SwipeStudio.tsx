import { useEffect, useMemo, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Heart, X, ArrowUp, ArrowRight } from "lucide-react";
import SwipeDeck, { type SwipeDeckCard } from "@/components/swipe/SwipeDeck";
import SwipeReasonChips from "@/components/swipe/SwipeReasonChips";
import CardActionsBar from "@/components/swipe/CardActionsBar";
import AddToBoardDialog, { type PinnableItem } from "@/components/shop/AddToBoardDialog";
import {
  loadMySwipes,
  logSwipe,
  loadMyStyleProfile,
  upsertMyStyleProfile,
  loadClusterTrending,
  type SwipeEventRow,
  type StyleProfileRow,
} from "@/services/swipeService";
import { deriveStyleProfile, aestheticLabel, type AestheticCluster } from "@/lib/styleProfile";
import {
  buildStudioDeck,
  toSwipeInput,
  type StudioCard,
} from "@/lib/studioDeck";
import ClusterTrendingRail from "@/components/discover/ClusterTrendingRail";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useConciergeBridge } from "@/stores/conciergeBridge";
import { useNavigate, Link } from "react-router-dom";
import type { SwipeDirection } from "@/services/swipeService";
import { toast } from "sonner";

interface Props {
  onOpenProfile?: () => void;
}

const SwipeStudio = ({ onOpenProfile }: Props) => {
  const { user } = useAuth();

  const { data: swipes = [], refetch: refetchSwipes } = useQuery({
    queryKey: ["studio_swipes", user?.id],
    queryFn: () => loadMySwipes(300),
    enabled: !!user,
  });

  const { data: profile } = useQuery({
    queryKey: ["studio_profile", user?.id],
    queryFn: loadMyStyleProfile,
    enabled: !!user,
  });

  const derived = useMemo(() => deriveStyleProfile(swipes), [swipes]);

  const recentTargetIds = useMemo(
    () => swipes.slice(0, 60).map((s) => s.target_id),
    [swipes]
  );

  const [deck, setDeck] = useState<StudioCard[]>([]);
  const [historyStack, setHistoryStack] = useState<
    { card: StudioCard; direction: SwipeDirection; dwellMs: number }[]
  >([]);
  const [reasonState, setReasonState] = useState<{
    open: boolean;
    direction: SwipeDirection | null;
    pendingCard: StudioCard | null;
    dwellMs: number;
  }>({ open: false, direction: null, pendingCard: null, dwellMs: 0 });

  // (Re)build deck whenever the user's derived taste changes meaningfully
  useEffect(() => {
    const next = buildStudioDeck({
      topCategories: derived.topCategories,
      aestheticClusters: derived.aestheticClusters,
      brandAffinity: derived.brandAffinity,
      recentTargetIds,
      size: 30,
    });
    setDeck(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    derived.topCategories.join(","),
    derived.aestheticClusters.join(","),
    derived.brandAffinity.join(","),
  ]);

  const refreshProfile = useCallback(async () => {
    // Recompute derived after the new swipe lands and persist a snapshot
    const fresh = await loadMySwipes(300);
    const d = deriveStyleProfile(fresh);
    await upsertMyStyleProfile({
      top_categories: d.topCategories,
      color_palette: d.colorPalette,
      aesthetic_clusters: d.aestheticClusters,
      price_tolerance: d.priceTolerance,
      bold_minimal_score: d.boldMinimalScore,
      casual_formal_score: d.casualFormalScore,
      brand_affinity: d.brandAffinity,
      total_swipes: d.totalSwipes,
    });
    await refetchSwipes();
  }, [refetchSwipes]);

  const handleSwipe = useCallback(
    async (card: SwipeDeckCard, direction: SwipeDirection, dwellMs: number) => {
      const studio = card as StudioCard;
      // Pop the top card immediately for snappy UX
      setDeck((d) => d.slice(1));
      setHistoryStack((h) => [...h, { card: studio, direction, dwellMs }].slice(-20));

      // For pass / love / super, ask for an optional reason
      setReasonState({ open: true, direction, pendingCard: studio, dwellMs });

      // Optimistically log the swipe (no reason yet)
      try {
        await logSwipe(toSwipeInput(studio, direction, "studio", undefined, dwellMs));
      } catch (e) {
        console.warn("logSwipe failed", e);
      }
    },
    []
  );

  const handlePickReason = async (reason: string) => {
    if (reasonState.pendingCard) {
      try {
        await logSwipe(
          toSwipeInput(
            reasonState.pendingCard,
            reasonState.direction!,
            "studio",
            reason,
            reasonState.dwellMs
          )
        );
      } catch {}
    }
    setReasonState({ open: false, direction: null, pendingCard: null, dwellMs: 0 });
    void refreshProfile();
  };

  const handleSkipReason = () => {
    setReasonState({ open: false, direction: null, pendingCard: null, dwellMs: 0 });
    void refreshProfile();
  };

  const handleUndo = () => {
    setHistoryStack((h) => {
      if (!h.length) return h;
      const last = h[h.length - 1];
      setDeck((d) => [last.card, ...d]);
      return h.slice(0, -1);
    });
    toast("Last swipe undone", { description: "You can re-swipe it now." });
  };

  // ---------- Per-card actions ----------
  const navigate = useNavigate();
  const setPending = useConciergeBridge((s) => s.setPending);
  const [pinTarget, setPinTarget] = useState<PinnableItem | null>(null);

  const handleWishlist = useCallback(
    async (card: StudioCard) => {
      if (!user) {
        toast.error("Sign in to save items");
        return;
      }
      if (card.source.target_type !== "product") {
        toast("Wishlist supports products", {
          description: "Try pinning this look to a mood board instead.",
        });
        return;
      }
      const { error } = await supabase.from("wishlists").insert({
        user_id: user.id,
        product_name: card.source.target_title,
        product_image: card.source.target_image,
        product_url: card.source.target_id,
        current_price: card.source.price ?? null,
      });
      if (error) {
        if ((error as { code?: string }).code === "23505") {
          toast("Already in your wishlist");
        } else {
          toast.error(error.message);
        }
        return;
      }
      toast.success("Saved to wishlist ✨");
    },
    [user]
  );

  const handleAddToBoard = useCallback((card: StudioCard) => {
    setPinTarget({
      name: card.source.target_title,
      image: card.source.target_image,
      url: card.source.target_id,
    });
  }, []);

  const handleWhy = useCallback(
    (card: StudioCard) => {
      const reasons: string[] = [];
      const cat = (card.source.category || "").toLowerCase();
      const tags = card.source.tags.map((t) => t.toLowerCase());
      const matchedCat = derived.topCategories.find((c) =>
        cat.includes(c.toLowerCase())
      );
      if (matchedCat) reasons.push(`matches your love for **${matchedCat}**`);
      const matchedAes = derived.aestheticClusters.find((a) =>
        tags.includes(a.toLowerCase())
      );
      if (matchedAes) reasons.push(`leans **${aestheticLabel(matchedAes as AestheticCluster)}**`);
      if (
        card.source.vendor &&
        derived.brandAffinity.some((b) =>
          card.source.vendor!.toLowerCase().includes(b.toLowerCase())
        )
      ) {
        reasons.push(`brand fits your taste (${card.source.vendor})`);
      }
      if (
        card.source.price &&
        ((derived.priceTolerance === "budget" && card.source.price < 120) ||
          (derived.priceTolerance === "mid" && card.source.price < 360) ||
          derived.priceTolerance === "premium")
      ) {
        reasons.push(`fits your **${derived.priceTolerance}** price comfort`);
      }
      const text = reasons.length
        ? reasons.join(" · ")
        : "Fresh exploration — adding it would help me learn your taste faster.";
      toast(`Why this? ✨`, { description: text });
    },
    [derived]
  );

  const handleSimilar = useCallback(
    (card: StudioCard) => {
      const prompt = `Show me more styles similar to "${card.source.target_title}"${
        card.source.vendor ? ` by ${card.source.vendor}` : ""
      }${card.source.tags.length ? ` (vibe: ${card.source.tags.slice(0, 3).join(", ")})` : ""}.`;
      setPending(prompt, card.source.target_id);
      toast.success("Phia is curating similar picks…");
      navigate("/app?tab=concierge");
    },
    [setPending, navigate]
  );

  const totalCount = deck.length + historyStack.length;
  const currentIndex = historyStack.length + 1;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 pb-12 pt-6 sm:px-6 sm:pt-8">
      <header className="space-y-2 text-center sm:text-left">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
          <Sparkles className="h-3 w-3" /> Style Match
        </p>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl text-foreground sm:text-4xl">
              Swipe Studio
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Swipe to teach Phia your taste. Items, full looks, palettes — every
              swipe sharpens your style profile and concierge picks.
            </p>
          </div>
          {onOpenProfile && (
            <button
              onClick={onOpenProfile}
              className="rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary/40"
            >
              View style profile →
            </button>
          )}
        </div>
      </header>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2 rounded-2xl border border-border bg-card p-3 sm:gap-3">
        <Stat label="Swipes" value={derived.totalSwipes} />
        <Stat label="Loves" value={derived.loveSwipes} />
        <Stat
          label="Top vibe"
          value={derived.aestheticClusters[0] ? labelize(derived.aestheticClusters[0]) : "—"}
        />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-muted-foreground sm:justify-start">
        <span className="inline-flex items-center gap-1"><X className="h-3 w-3 text-destructive" /> Pass</span>
        <span className="inline-flex items-center gap-1"><ArrowUp className="h-3 w-3 text-primary" /> Super like</span>
        <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3 text-emerald-500" /> Love</span>
        <span className="inline-flex items-center gap-1 text-muted-foreground/70"><ArrowRight className="h-3 w-3" /> Drag or use the buttons</span>
      </div>

      {/* Deck */}
      <SwipeDeck
        cards={deck}
        onSwipe={handleSwipe}
        onUndo={historyStack.length ? handleUndo : undefined}
        progress={totalCount ? { current: Math.min(currentIndex, totalCount), total: totalCount } : undefined}
        renderCardActions={(card) => {
          const studio = card as StudioCard;
          return (
            <CardActionsBar
              onWishlist={
                studio.source.target_type === "product"
                  ? () => handleWishlist(studio)
                  : undefined
              }
              onAddToBoard={() => handleAddToBoard(studio)}
              onWhy={() => handleWhy(studio)}
              onSimilar={() => handleSimilar(studio)}
            />
          );
        }}
        emptyState={
          <div className="space-y-3">
            <Sparkles className="mx-auto h-8 w-8 text-primary" />
            <p className="text-sm text-muted-foreground">
              That's all for now. We'll refresh with new picks based on these.
            </p>
            <button
              onClick={() => {
                setDeck(
                  buildStudioDeck({
                    topCategories: derived.topCategories,
                    aestheticClusters: derived.aestheticClusters,
                    brandAffinity: derived.brandAffinity,
                    recentTargetIds: [],
                    size: 30,
                  })
                );
                setHistoryStack([]);
              }}
              className="rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:border-primary/40"
            >
              Reshuffle deck
            </button>
            {onOpenProfile && (
              <div>
                <button
                  onClick={onOpenProfile}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  See what we learned →
                </button>
              </div>
            )}
          </div>
        }
      />

      <SwipeReasonChips
        open={reasonState.open}
        direction={reasonState.direction}
        onPick={handlePickReason}
        onSkip={handleSkipReason}
      />

      <AddToBoardDialog
        item={pinTarget}
        open={!!pinTarget}
        onOpenChange={(o) => !o && setPinTarget(null)}
      />

      {/* Cluster trending rail */}
      <ClusterTrendingRail variant="light" />
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: number | string }) => (
  <div className="text-center">
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="mt-1 font-serif text-lg text-foreground sm:text-xl">{value}</p>
  </div>
);

function labelize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default SwipeStudio;
