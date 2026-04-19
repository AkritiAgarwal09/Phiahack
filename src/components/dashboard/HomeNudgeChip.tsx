import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useRecentlyViewed } from "@/stores/recentlyViewedStore";
import { useConciergeBridge } from "@/stores/conciergeBridge";
import {
  loadMyEngagements,
  loadTrending,
} from "@/services/engagementService";
import { listUpcomingEvents } from "@/services/upcomingEventsService";
import { buildConciergeNudges } from "@/lib/predictiveNudges";

interface Props {
  onOpenConcierge: () => void;
}

/**
 * Small floating chip on the home page that surfaces the top predictive nudge
 * and prefills the concierge with the matching prompt when tapped.
 */
const HomeNudgeChip = ({ onOpenConcierge }: Props) => {
  const { user } = useAuth();
  const recentIds = useRecentlyViewed((s) => s.ids);
  const setPending = useConciergeBridge((s) => s.setPending);
  const [dismissed, setDismissed] = useState(false);

  const { data: engagements = [] } = useQuery({
    queryKey: ["nudgechip_eng", user?.id],
    queryFn: () => loadMyEngagements(120),
    enabled: !!user,
  });
  const { data: trending = [] } = useQuery({
    queryKey: ["nudgechip_trending"],
    queryFn: () => loadTrending(7, 24),
  });
  const { data: events = [] } = useQuery({
    queryKey: ["nudgechip_events", user?.id],
    queryFn: listUpcomingEvents,
    enabled: !!user,
  });
  const { data: profile } = useQuery({
    queryKey: ["nudgechip_profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("birthday")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });
  const { data: wishlist = [] } = useQuery({
    queryKey: ["nudgechip_wish", user?.id],
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

  const topNudge = useMemo(() => {
    const all = buildConciergeNudges({
      engagements,
      trending,
      events,
      birthday: profile?.birthday,
      wishlist,
      recentlyViewedIds: recentIds,
    });
    return all[0] || null;
  }, [engagements, trending, events, profile?.birthday, wishlist, recentIds]);

  if (dismissed || !topNudge) return null;

  return (
    <div className="pointer-events-none fixed bottom-24 right-4 z-30 flex justify-end sm:bottom-28 sm:right-6">
      <div className="pointer-events-auto group flex max-w-xs items-center gap-2 rounded-full border border-primary/30 bg-card/95 py-2 pl-3 pr-1 shadow-[0_10px_40px_-12px_hsl(var(--primary)/0.4)] backdrop-blur-xl transition-all hover:border-primary/60">
        <button
          onClick={() => {
            setPending(topNudge.prompt);
            onOpenConcierge();
          }}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full gradient-gold">
            <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
          </span>
          <span className="line-clamp-2 text-xs font-medium text-foreground">
            {topNudge.text}
          </span>
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export default HomeNudgeChip;
