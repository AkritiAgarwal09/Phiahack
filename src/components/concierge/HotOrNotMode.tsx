import { useEffect, useMemo, useState, useCallback } from "react";
import { Sparkles, X } from "lucide-react";
import SwipeDeck, { type SwipeDeckCard } from "@/components/swipe/SwipeDeck";
import {
  buildStudioDeck,
  toSwipeInput,
  type StudioCard,
} from "@/lib/studioDeck";
import {
  loadMySwipes,
  logSwipe,
  upsertMyStyleProfile,
} from "@/services/swipeService";
import { deriveStyleProfile, aestheticLabel, type AestheticCluster } from "@/lib/styleProfile";
import type { SwipeDirection } from "@/services/swipeService";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  open: boolean;
  onClose: () => void;
  onInsight: (text: string) => void;
}

const STYLE_SUMMARY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-style-summary`;
const SESSION_SIZE = 10;

const HotOrNotMode = ({ open, onClose, onInsight }: Props) => {
  const { user } = useAuth();
  const [deck, setDeck] = useState<StudioCard[]>([]);
  const [swiped, setSwiped] = useState<{ card: StudioCard; direction: SwipeDirection }[]>([]);
  const [generating, setGenerating] = useState(false);

  const buildDeck = useCallback(async () => {
    const swipes = await loadMySwipes(200);
    const d = deriveStyleProfile(swipes);
    const next = buildStudioDeck({
      topCategories: d.topCategories,
      aestheticClusters: d.aestheticClusters,
      brandAffinity: d.brandAffinity,
      recentTargetIds: swipes.slice(0, 60).map((s) => s.target_id),
      size: SESSION_SIZE,
    });
    setDeck(next);
    setSwiped([]);
  }, []);

  useEffect(() => {
    if (open) void buildDeck();
  }, [open, buildDeck]);

  const finishSession = useCallback(async () => {
    if (!user || generating) return;
    setGenerating(true);
    try {
      const swipes = await loadMySwipes(200);
      const d = deriveStyleProfile(swipes);
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

      let summary = "";
      try {
        const resp = await fetch(STYLE_SUMMARY_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ swipes: swipes.slice(0, 60), derived: d }),
        });
        if (resp.ok) {
          const json = await resp.json();
          summary = json.summary || "";
        }
      } catch {}

      const aesText = d.aestheticClusters.length
        ? d.aestheticClusters.map((c) => aestheticLabel(c as AestheticCluster)).join(" · ")
        : "still forming";

      const insight = [
        `**Hot or Not session done** ✨ I just learned a lot about your taste.`,
        summary ? `\n${summary}\n` : "",
        `**Updated profile**`,
        `- Aesthetic: ${aesText}`,
        `- Bold↔Minimal: ${d.boldMinimalScore}/100`,
        `- Casual↔Formal: ${d.casualFormalScore}/100`,
        `- Price comfort: ${d.priceTolerance}`,
        d.colorPalette.length ? `- Palette: ${d.colorPalette.slice(0, 4).join(", ")}` : "",
        ``,
        `Want me to build 3 outfits using this updated taste?`,
      ]
        .filter(Boolean)
        .join("\n");

      onInsight(insight);
      onClose();
    } finally {
      setGenerating(false);
    }
  }, [user, generating, onInsight, onClose]);

  const handleSwipe = useCallback(
    async (card: SwipeDeckCard, direction: SwipeDirection, dwellMs: number) => {
      const studio = card as StudioCard;
      setDeck((d) => d.slice(1));
      setSwiped((s) => [...s, { card: studio, direction }]);
      try {
        await logSwipe(toSwipeInput(studio, direction, "concierge", undefined, dwellMs));
      } catch {}
    },
    []
  );

  // Auto finish when deck empties
  useEffect(() => {
    if (open && deck.length === 0 && swiped.length > 0 && !generating) {
      void finishSession();
    }
  }, [open, deck.length, swiped.length, generating, finishSession]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
      <div className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-border bg-background p-4 shadow-2xl sm:rounded-3xl sm:p-6">
        <div className="mb-3 flex items-center justify-between">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            <Sparkles className="h-3 w-3" /> Hot or Not for Me
          </p>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <h2 className="font-serif text-xl text-foreground">
          {generating ? "Reading your taste…" : "Swipe through 10 picks"}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {generating
            ? "Phia is updating your profile and writing fresh insights."
            : "I'll refine your style profile and share what I learned in chat."}
        </p>

        <div className="mt-4">
          {generating ? (
            <div className="flex h-[420px] items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <SwipeDeck
              cards={deck}
              onSwipe={handleSwipe}
              progress={{
                current: Math.min(swiped.length + 1, SESSION_SIZE),
                total: SESSION_SIZE,
              }}
              emptyState={<p className="text-sm text-muted-foreground">Wrapping up…</p>}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default HotOrNotMode;
