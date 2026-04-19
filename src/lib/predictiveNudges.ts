/**
 * Generates short, premium proactive nudges for the AI Concierge using the
 * same predictive engine that powers Discover. Pure function — surface-agnostic.
 */
import {
  nextBuyPrediction,
  occasionSuggestions,
  trendingInYourCircle,
  styleProgression,
  TRIBE_META,
} from "@/lib/predictiveEngine";
import { eventTypeMeta, daysUntil } from "@/services/upcomingEventsService";
import type { EngagementRow, TrendingRow } from "@/services/engagementService";
import type { UpcomingEvent } from "@/services/upcomingEventsService";

export interface ConciergeNudge {
  icon: string;
  text: string;
  /** The prompt that gets sent to the assistant when the user taps it. */
  prompt: string;
}

export interface NudgeInputs {
  engagements: EngagementRow[];
  trending: TrendingRow[];
  events: UpcomingEvent[];
  birthday?: string | null;
  wishlist?: { product_url: string; product_name: string }[];
  recentlyViewedIds?: string[];
}

/**
 * Returns up to `max` ranked nudges. Always returns at least one (cold-start
 * curated) so the empty chat state never feels empty.
 */
export function buildConciergeNudges(
  { engagements, trending, events, birthday, wishlist = [], recentlyViewedIds = [] }: NudgeInputs,
  max = 3
): ConciergeNudge[] {
  const nudges: ConciergeNudge[] = [];

  // 1) Occasion-aware (highest signal — time-bounded)
  const occasions = occasionSuggestions(events, birthday).slice(0, 2);
  for (const o of occasions) {
    const meta = eventTypeMeta(o.event.event_type);
    const days = daysUntil(o.event.event_date);
    const tail = days <= 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;
    nudges.push({
      icon: meta.emoji,
      text: `${o.event.title} is ${tail} — want outfit options?`,
      prompt: `Build me 3 outfits for: ${o.event.title} (${meta.label}${
        o.event.vibe ? ", vibe: " + o.event.vibe : ""
      }${o.event.location ? ", in " + o.event.location : ""}).`,
    });
  }

  // 2) Next-buy (only if we have signal)
  const nb = nextBuyPrediction(engagements, wishlist, recentlyViewedIds);
  if (nb.signalCount >= 3 && nb.items.length > 0) {
    nudges.push({
      icon: "🎯",
      text: nb.pitch,
      prompt: `Show me ${nb.items.length} options ${nb.budgetHint.toLowerCase()} that match my recent saves.`,
    });
  }

  // 3) Style tribe alignment
  const prog = styleProgression(engagements);
  if (prog.current && prog.current.share > 0.25) {
    const t = TRIBE_META[prog.current.tribe];
    nudges.push({
      icon: t.emoji,
      text: `You're aligning with ${t.label} — see new arrivals?`,
      prompt: `Show me new arrivals from the ${t.label} aesthetic.`,
    });
  }

  // 4) Trending in circle
  const circle = trendingInYourCircle(trending, engagements);
  if (circle.items.length > 0) {
    const first = circle.items[0];
    nudges.push({
      icon: "🔥",
      text: `Trending in your Circle: ${first.node.title}`,
      prompt: `What's trending in my style circle right now?`,
    });
  }

  // Cold-start fallback
  if (nudges.length === 0) {
    nudges.push(
      {
        icon: "✨",
        text: "Tell me a vibe and I'll curate looks for you",
        prompt: "Curate 3 outfits that feel quietly luxurious for everyday wear.",
      },
      {
        icon: "💸",
        text: "Looking for a deal? Show me what's on sale",
        prompt: "What's on sale right now that matches a clean, minimal aesthetic?",
      }
    );
  }

  return nudges.slice(0, max);
}
