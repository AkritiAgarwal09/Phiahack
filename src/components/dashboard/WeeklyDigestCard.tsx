import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Calendar, TrendingUp, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useRecentlyViewed } from "@/stores/recentlyViewedStore";
import { supabase } from "@/integrations/supabase/client";
import { loadMyEngagements, loadTrending } from "@/services/engagementService";
import { listUpcomingEvents, daysUntil, eventTypeMeta } from "@/services/upcomingEventsService";
import {
  nextBuyPrediction,
  occasionSuggestions,
  styleProgression,
  TRIBE_META,
} from "@/lib/predictiveEngine";

interface Props {
  onOpenDiscover: () => void;
  onOpenConcierge: () => void;
}

const WeeklyDigestCard = ({ onOpenDiscover, onOpenConcierge }: Props) => {
  const { user } = useAuth();
  const recentIds = useRecentlyViewed((s) => s.ids);

  const { data: engagements = [] } = useQuery({
    queryKey: ["digest_engagements", user?.id],
    queryFn: () => loadMyEngagements(120),
    enabled: !!user,
  });
  const { data: trending = [] } = useQuery({
    queryKey: ["digest_trending"],
    queryFn: () => loadTrending(7, 20),
  });
  const { data: events = [] } = useQuery({
    queryKey: ["digest_events", user?.id],
    queryFn: listUpcomingEvents,
    enabled: !!user,
  });
  const { data: profile } = useQuery({
    queryKey: ["digest_profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("birthday, display_name")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });
  const { data: wishlist = [] } = useQuery({
    queryKey: ["digest_wishlist", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("wishlists")
        .select("product_url, product_name")
        .eq("user_id", user.id);
      return data || [];
    },
    enabled: !!user,
  });

  const tribe = useMemo(() => styleProgression(engagements).current, [engagements]);
  const nextBuy = useMemo(
    () => nextBuyPrediction(engagements, wishlist, recentIds),
    [engagements, wishlist, recentIds]
  );
  const occasions = useMemo(
    () => occasionSuggestions(events, profile?.birthday),
    [events, profile?.birthday]
  );

  const top3 = nextBuy.items.slice(0, 3);
  const upcoming = occasions.slice(0, 2);
  const firstName = profile?.display_name?.split(" ")[0] || "you";

  if (!user) return null;

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pb-2 sm:px-6 md:px-8">
      <div className="overflow-hidden rounded-3xl border border-amber-200/20 bg-gradient-to-br from-amber-300/5 via-fuchsia-300/5 to-sky-300/5 p-6 backdrop-blur-md sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-200/80">
              <Sparkles className="mr-1 inline h-3 w-3" /> Your weekly digest
            </p>
            <h2 className="mt-1 font-serif text-2xl text-white sm:text-3xl">
              This week, for {firstName}
            </h2>
            <p className="mt-1 max-w-lg text-sm text-white/60">
              A snapshot of where your taste is going next, what's on your calendar, and the pieces Phia thinks you'll love most.
            </p>
          </div>
          <button
            onClick={onOpenDiscover}
            className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-[hsl(230_50%_12%)] hover:opacity-90"
          >
            See full discover <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {/* Tribe */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-200/80">
              Style tribe
            </p>
            {tribe ? (
              <div className="mt-1 space-y-1">
                <p className="font-serif text-lg text-white">
                  {TRIBE_META[tribe.tribe].emoji} {TRIBE_META[tribe.tribe].label}
                </p>
                <p className="text-xs text-white/60">{TRIBE_META[tribe.tribe].description}</p>
                <p className="pt-1 text-[11px] text-white/40">
                  Confidence {Math.round(tribe.share * 100)}%
                </p>
              </div>
            ) : (
              <p className="mt-2 text-xs text-white/60">
                Save a few more pieces and we'll map your tribe.
              </p>
            )}
          </div>

          {/* Top 3 next-buy */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-200/80">
              <TrendingUp className="mr-1 inline h-3 w-3" /> Top picks for you
            </p>
            {top3.length === 0 ? (
              <p className="mt-2 text-xs text-white/60">Browse a few pieces to seed your picks.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {top3.map((p) => {
                  const img = p.node.images.edges[0]?.node?.url;
                  return (
                    <li key={p.node.id} className="flex items-center gap-2">
                      {img && (
                        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-white/10">
                          <img src={img} alt={p.node.title} className="h-full w-full object-cover" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="line-clamp-1 text-xs font-medium text-white">{p.node.title}</p>
                        <p className="text-[10px] text-white/50">
                          {p.node.vendor} · ${parseFloat(p.node.priceRange.minVariantPrice.amount).toFixed(0)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Events */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-200/80">
              <Calendar className="mr-1 inline h-3 w-3" /> On your calendar
            </p>
            {upcoming.length === 0 ? (
              <p className="mt-2 text-xs text-white/60">
                No upcoming events.{" "}
                <Link to="?tab=discover" className="text-amber-200 underline">Add one</Link>{" "}
                and Phia will style it.
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {upcoming.map((o) => {
                  const meta = eventTypeMeta(o.event.event_type);
                  const days = daysUntil(o.event.event_date);
                  return (
                    <li key={o.event.id} className="space-y-0.5">
                      <p className="text-xs font-medium text-white">
                        {meta.emoji} {o.event.title}
                      </p>
                      <p className="text-[10px] text-white/50">
                        {meta.label} · {days <= 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`}
                      </p>
                      <button
                        onClick={onOpenConcierge}
                        className="text-[10px] font-semibold text-amber-200 underline hover:text-amber-100"
                      >
                        Style this with Phia →
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WeeklyDigestCard;
