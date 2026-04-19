import { useState, useMemo, useEffect, useCallback } from "react";
import { Sparkles, X } from "lucide-react";
import SwipeDeck, { type SwipeDeckCard } from "@/components/swipe/SwipeDeck";
import { buildOnboardingDeck } from "@/data/onboardingDeck";
import { onboardingToStudio, toSwipeInput, type StudioCard } from "@/lib/studioDeck";
import {
  logSwipe,
  upsertMyStyleProfile,
  markOnboardingCompleted,
  loadMySwipes,
} from "@/services/swipeService";
import { deriveStyleProfile, aestheticLabel, describePriceTolerance } from "@/lib/styleProfile";
import type { SwipeDirection } from "@/services/swipeService";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  onComplete: () => void;
  onSkip: () => void;
}

const STYLE_SUMMARY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-style-summary`;

const Onboarding = ({ onComplete, onSkip }: Props) => {
  const { user } = useAuth();
  const allCards = useMemo<StudioCard[]>(
    () => buildOnboardingDeck().map(onboardingToStudio),
    []
  );

  const [deck, setDeck] = useState<StudioCard[]>(allCards);
  const [done, setDone] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [summary, setSummary] = useState<string>("");
  const [derived, setDerived] = useState(deriveStyleProfile([]));

  const swiped = allCards.length - deck.length;
  const minSwipes = 16; // user can finish early after this many

  const handleSwipe = useCallback(
    async (card: SwipeDeckCard, direction: SwipeDirection, dwellMs: number) => {
      const studio = card as StudioCard;
      setDeck((d) => d.slice(1));
      try {
        await logSwipe(toSwipeInput(studio, direction, "onboarding", undefined, dwellMs));
      } catch (e) {
        console.warn("onboarding logSwipe failed", e);
      }
    },
    []
  );

  const finish = useCallback(async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const swipes = await loadMySwipes(300);
      const d = deriveStyleProfile(swipes);
      setDerived(d);

      // Try AI summary (non-blocking on failure)
      let aiSummary = "";
      try {
        const resp = await fetch(STYLE_SUMMARY_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            swipes: swipes.slice(0, 60),
            derived: {
              topCategories: d.topCategories,
              colorPalette: d.colorPalette,
              aestheticClusters: d.aestheticClusters,
              priceTolerance: d.priceTolerance,
              boldMinimalScore: d.boldMinimalScore,
              casualFormalScore: d.casualFormalScore,
              brandAffinity: d.brandAffinity,
              totalSwipes: d.totalSwipes,
              loveSwipes: d.loveSwipes,
            },
          }),
        });
        if (resp.ok) {
          const json = await resp.json();
          aiSummary = json.summary || "";
        }
      } catch (e) {
        console.warn("ai-style-summary failed", e);
      }
      setSummary(aiSummary);

      await upsertMyStyleProfile({
        top_categories: d.topCategories,
        color_palette: d.colorPalette,
        aesthetic_clusters: d.aestheticClusters,
        price_tolerance: d.priceTolerance,
        bold_minimal_score: d.boldMinimalScore,
        casual_formal_score: d.casualFormalScore,
        brand_affinity: d.brandAffinity,
        total_swipes: d.totalSwipes,
        ai_summary: aiSummary || null,
      });
      await markOnboardingCompleted();
      setDone(true);
    } catch (e: any) {
      console.error(e);
      toast.error("Couldn't finish onboarding — try again.");
    } finally {
      setGenerating(false);
    }
  }, [user]);

  // Auto-finish when the deck empties
  useEffect(() => {
    if (deck.length === 0 && !done && !generating) {
      void finish();
    }
  }, [deck.length, done, generating, finish]);

  if (done) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8 text-center sm:px-6 sm:py-12">
        <Sparkles className="mx-auto h-10 w-10 text-primary" />
        <h2 className="font-serif text-3xl text-foreground sm:text-4xl">
          Your style profile is live
        </h2>
        {summary ? (
          <p className="mx-auto max-w-xl text-base leading-relaxed text-muted-foreground">
            {summary}
          </p>
        ) : (
          <p className="mx-auto max-w-xl text-sm text-muted-foreground">
            We've captured the start of your taste. The more you swipe in Studio,
            the sharper Phia gets.
          </p>
        )}

        <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 text-left sm:grid-cols-2">
          <ProfileLine label="Aesthetic" value={derived.aestheticClusters.map(aestheticLabel).join(" · ") || "Still forming"} />
          <ProfileLine label="Palette" value={derived.colorPalette.slice(0, 4).join(", ") || "—"} />
          <ProfileLine label="Categories" value={derived.topCategories.slice(0, 3).join(", ") || "—"} />
          <ProfileLine label="Price tolerance" value={describePriceTolerance(derived.priceTolerance)} />
        </div>

        <button
          onClick={onComplete}
          className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          Start exploring →
        </button>
      </div>
    );
  }

  if (generating) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <h2 className="font-serif text-2xl text-foreground">Reading your taste…</h2>
        <p className="text-sm text-muted-foreground">
          Phia is deriving your style profile from your swipes.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6 sm:px-6 sm:py-10">
      <div className="flex items-center justify-between">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
          <Sparkles className="h-3 w-3" /> Onboarding
        </p>
        <button
          onClick={onSkip}
          className="text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          Skip <X className="ml-0.5 inline h-3 w-3" />
        </button>
      </div>

      <header className="space-y-2 text-center sm:text-left">
        <h1 className="font-serif text-3xl text-foreground sm:text-4xl">
          Teach Phia your taste
        </h1>
        <p className="text-sm text-muted-foreground">
          Swipe right on what you love, left on what you don't. Tap super like
          for obsessions. After ~20 swipes, we'll generate your style profile.
        </p>
      </header>

      <SwipeDeck
        cards={deck}
        onSwipe={handleSwipe}
        progress={{ current: swiped + 1, total: allCards.length }}
        emptyState={<p className="text-sm text-muted-foreground">Wrapping up…</p>}
      />

      {swiped >= minSwipes && deck.length > 0 && (
        <div className="text-center">
          <button
            onClick={finish}
            className="rounded-full border border-primary bg-primary/10 px-5 py-2 text-xs font-semibold text-primary hover:bg-primary/20"
          >
            That's enough — show me my style profile →
          </button>
        </div>
      )}
    </div>
  );
};

const ProfileLine = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
  </div>
);

export default Onboarding;
