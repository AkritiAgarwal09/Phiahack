import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Calendar, Trash2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRecentlyViewed } from "@/stores/recentlyViewedStore";
import { useCartStore } from "@/stores/cartStore";
import { useConciergeBridge } from "@/stores/conciergeBridge";
import {
  loadMyEngagements,
  loadTrending,
} from "@/services/engagementService";
import {
  listUpcomingEvents,
  deleteUpcomingEvent,
  daysUntil,
  eventTypeMeta,
} from "@/services/upcomingEventsService";
import {
  nextBuyPrediction,
  occasionSuggestions,
  budgetSmartFeed,
  styleProgression,
  trendingInYourCircle,
  viralTrends,
  TRIBE_META,
  socialProofForProduct,
  tribeFeed,
  completeTheLook,
  findProduct,
} from "@/lib/predictiveEngine";
import DiscoverSection from "@/components/discover/DiscoverSection";
import DiscoverProductCard from "@/components/discover/DiscoverProductCard";
import AddEventDialog from "@/components/discover/AddEventDialog";
import ViralCard from "@/components/discover/ViralCard";
import FollowedActivityRail from "@/components/discover/FollowedActivityRail";
import PublicMoodBoardsGallery from "@/components/discover/PublicMoodBoardsGallery";
import ClusterTrendingRail from "@/components/discover/ClusterTrendingRail";
import ProductDetailDialog from "@/components/shop/ProductDetailDialog";
import { snapshotPrice } from "@/services/priceAnalyticsService";
import { toast } from "sonner";
import type { ShopifyProduct } from "@/lib/shopify";

const Discover = () => {
  const { user } = useAuth();
  const recentIds = useRecentlyViewed((s) => s.ids);
  const setPending = useConciergeBridge((s) => s.setPending);
  const addCartItem = useCartStore((s) => s.addItem);
  const setCartOpen = useCartStore((s) => s.setOpen);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [detail, setDetail] = useState<ShopifyProduct | null>(null);

  const { data: engagements = [], refetch: refetchEng } = useQuery({
    queryKey: ["my_engagements", user?.id],
    queryFn: () => loadMyEngagements(200),
    enabled: !!user,
  });

  const { data: trending = [] } = useQuery({
    queryKey: ["trending_products"],
    queryFn: () => loadTrending(7, 30),
  });

  const { data: events = [], refetch: refetchEvents } = useQuery({
    queryKey: ["upcoming_events", user?.id],
    queryFn: listUpcomingEvents,
    enabled: !!user,
  });

  const { data: profile } = useQuery({
    queryKey: ["profile_birthday", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("birthday, tier")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: wishlist = [] } = useQuery({
    queryKey: ["wishlist_for_predict", user?.id],
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

  const nextBuy = useMemo(
    () => nextBuyPrediction(engagements, wishlist, recentIds),
    [engagements, wishlist, recentIds]
  );

  const occasions = useMemo(
    () => occasionSuggestions(events, profile?.birthday),
    [events, profile?.birthday]
  );

  const budget = useMemo(() => budgetSmartFeed(engagements), [engagements]);
  const progression = useMemo(() => styleProgression(engagements), [engagements]);
  const circle = useMemo(
    () => trendingInYourCircle(trending, engagements),
    [trending, engagements]
  );
  const trends = useMemo(() => viralTrends(trending), [trending]);

  const myTribe = progression.current?.tribe;
  const tribePicks = useMemo(
    () => (myTribe ? tribeFeed(myTribe, 10) : []),
    [myTribe]
  );

  // Complete the look anchor = most recently viewed product
  const completionAnchor = useMemo(() => {
    for (const id of recentIds) {
      const p = findProduct(id);
      if (p) return p;
    }
    return null;
  }, [recentIds]);

  const completion = useMemo(
    () => (completionAnchor ? completeTheLook(completionAnchor) : null),
    [completionAnchor]
  );

  const askConcierge = (prompt: string) => {
    setPending(prompt);
    toast.success("Phia is on it ✨");
  };

  const quickAdd = async (product: ShopifyProduct) => {
    const variant = product.node.variants.edges[0]?.node;
    if (!variant) return;
    await addCartItem({
      product,
      variantId: variant.id,
      variantTitle: variant.title,
      price: variant.price,
      quantity: 1,
      selectedOptions: variant.selectedOptions,
    });
    setCartOpen(true);
  };

  const handleDeleteEvent = async (id: string) => {
    if (id.startsWith("synthetic-")) return;
    try {
      await deleteUpcomingEvent(id);
      refetchEvents();
    } catch {
      toast.error("Couldn't remove event");
    }
  };

  // Snapshot price each time a product detail opens so we build real history.
  useEffect(() => {
    if (detail) snapshotPrice(detail);
  }, [detail]);

  return (
    <div className="midnight relative min-h-[calc(100vh-72px)] overflow-hidden text-white">
      {/* Floating background silhouettes */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-20 h-[400px] w-[300px] rounded-[40%] bg-gradient-to-br from-white/10 to-transparent blur-3xl" style={{ animation: "drift 18s ease-in-out infinite" }} />
        <div className="absolute right-[-10%] top-40 h-[360px] w-[280px] rounded-full bg-gradient-to-br from-fuchsia-300/10 to-transparent blur-3xl" style={{ animation: "drift 22s ease-in-out infinite", animationDelay: "-5s" }} />
        <div className="absolute bottom-0 left-1/3 h-[420px] w-[380px] rounded-[60%] bg-gradient-to-br from-amber-200/10 to-transparent blur-3xl" style={{ animation: "drift 26s ease-in-out infinite", animationDelay: "-9s" }} />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl space-y-12 px-4 py-8 sm:px-6 sm:py-12 md:px-8">
        {/* Header */}
        <header className="space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-200/80">
            <Sparkles className="mr-1 inline h-3 w-3" />
            Predictive Discovery
          </p>
          <h1 className="font-serif text-3xl text-white sm:text-4xl md:text-5xl">
            Tailored to where your taste is going next
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
            Phia synthesizes your saves, mood boards, recent views, upcoming events, and what your style tribe is saving — so the right pieces find you before you go searching.
          </p>
          {myTribe && (
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/30 bg-white/5 px-3 py-1.5 text-xs text-white/85 backdrop-blur-md">
              <span>{TRIBE_META[myTribe].emoji}</span>
              <span>You currently align most with</span>
              <span className="font-semibold text-amber-100">{TRIBE_META[myTribe].label}</span>
            </div>
          )}
        </header>

        <ViralCard onSelect={(p) => setDetail(p)} />

        {/* A. Next-Buy Predictor */}
        <DiscoverSection
          eyebrow="Next-buy predictor"
          title="Probably what you're shopping for next"
          description={`${nextBuy.pitch} ${nextBuy.budgetHint}.`}
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {nextBuy.items.slice(0, 12).map((p) => (
              <DiscoverProductCard
                key={p.node.id}
                product={p}
                onClick={() => setDetail(p)}
                onAdd={() => quickAdd(p)}
                badge={socialProofForProduct(p.node.id, circle.trendingMeta, myTribe)}
              />
            ))}
          </div>
        </DiscoverSection>

        {/* B. Occasion-Aware */}
        <DiscoverSection
          eyebrow="Occasion-aware"
          title="What's on your calendar"
          description="Add a trip, wedding, or party and Phia will style it for you. Your birthday month is detected automatically."
          action={
            <button
              onClick={() => setEventDialogOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-amber-200/40 bg-amber-100/10 px-4 py-2 text-xs font-semibold text-amber-100 transition-colors hover:bg-amber-100/20"
            >
              <Plus className="h-3.5 w-3.5" /> Add event
            </button>
          }
        >
          {occasions.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-md">
              <Calendar className="mx-auto mb-3 h-8 w-8 text-amber-200/70" />
              <p className="text-sm text-white/80">No upcoming events yet.</p>
              <p className="mt-1 text-xs text-white/50">Add one to get curated outfit picks.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {occasions.map((o) => {
                const meta = eventTypeMeta(o.event.event_type);
                const days = daysUntil(o.event.event_date);
                return (
                  <div key={o.event.id} className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-amber-200/80">
                          {meta.emoji} {meta.label} · {days <= 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`}
                        </p>
                        <h3 className="font-serif text-lg text-white">{o.event.title}</h3>
                        {(o.event.location || o.event.vibe) && (
                          <p className="text-xs text-white/60">
                            {[o.event.location, o.event.vibe].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => askConcierge(`Build me 3 outfits for: ${o.event.title} (${meta.label}${o.event.vibe ? ", vibe: " + o.event.vibe : ""}${o.event.location ? ", in " + o.event.location : ""}).`)}
                          className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-[hsl(230_50%_12%)] hover:opacity-90"
                        >
                          Style this with Phia
                        </button>
                        {!o.event.id.startsWith("synthetic-") && (
                          <button
                            onClick={() => handleDeleteEvent(o.event.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white"
                            aria-label="Remove event"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {o.items.slice(0, 4).map((p) => (
                        <DiscoverProductCard
                          key={p.node.id}
                          product={p}
                          onClick={() => setDetail(p)}
                          onAdd={() => quickAdd(p)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DiscoverSection>

        {/* C. Budget-Smart */}
        <DiscoverSection
          eyebrow="Budget-smart"
          title={`Picks in your sweet spot · ~$${budget.averageSpend}`}
          description={budget.pitch}
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {budget.items.slice(0, 12).map((p) => (
              <DiscoverProductCard key={p.node.id} product={p} onClick={() => setDetail(p)} onAdd={() => quickAdd(p)} />
            ))}
          </div>
        </DiscoverSection>

        {/* D. Style Progression */}
        <DiscoverSection
          eyebrow="Style progression"
          title="How your taste is evolving"
          description={progression.pitch}
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {progression.items.slice(0, 10).map((p) => (
              <DiscoverProductCard key={p.node.id} product={p} onClick={() => setDetail(p)} onAdd={() => quickAdd(p)} />
            ))}
          </div>
        </DiscoverSection>

        {/* E. Complete the Look */}
        {completion && completion.items.length > 0 && (
          <DiscoverSection
            eyebrow="Complete the look"
            title={`Built around your ${completion.anchor.node.title}`}
            description={completion.pitch}
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
              {completion.items.map((p) => (
                <DiscoverProductCard key={p.node.id} product={p} onClick={() => setDetail(p)} onAdd={() => quickAdd(p)} />
              ))}
            </div>
          </DiscoverSection>
        )}

        {/* 2A. Trending in Your Circle */}
        <DiscoverSection
          eyebrow="Social signal"
          title="Trending in your Circle"
          description={circle.pitch}
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
            {circle.items.map((p) => (
              <DiscoverProductCard
                key={p.node.id}
                product={p}
                badge={socialProofForProduct(p.node.id, circle.trendingMeta, myTribe)}
                onClick={() => setDetail(p)}
                onAdd={() => quickAdd(p)}
              />
            ))}
          </div>
        </DiscoverSection>

        {/* New from people you follow */}
        <FollowedActivityRail
          onSelect={(p) => setDetail(p)}
          onAdd={(p) => quickAdd(p)}
        />

        {/* Style cluster signal — peers with your taste */}
        <ClusterTrendingRail variant="dark" />

        <DiscoverSection eyebrow="Viral trend detector" title="Spiking right now">
          <div className="grid gap-4 lg:grid-cols-3">
            {trends.map((t, i) => (
              <div key={i} className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
                <div>
                  <p className="font-serif text-base text-white">{t.headline}</p>
                  <p className="mt-1 text-xs text-white/60">{t.detail}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {t.items.slice(0, 4).map((p) => (
                    <DiscoverProductCard key={p.node.id} product={p} onClick={() => setDetail(p)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DiscoverSection>

        {/* 2C. Style Tribe */}
        {myTribe && tribePicks.length > 0 && (
          <DiscoverSection
            eyebrow="Style tribe"
            title={`New arrivals from ${TRIBE_META[myTribe].label}`}
            description={TRIBE_META[myTribe].description}
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
              {tribePicks.map((p) => (
                <DiscoverProductCard
                  key={p.node.id}
                  product={p}
                  onClick={() => setDetail(p)}
                  onAdd={() => quickAdd(p)}
                  badge={{ label: `${TRIBE_META[myTribe].emoji} ${TRIBE_META[myTribe].label}`, intent: "matched" }}
                />
              ))}
            </div>
          </DiscoverSection>
        )}

        {/* Public mood board gallery */}
        <PublicMoodBoardsGallery />
      </div>

      <AddEventDialog
        open={eventDialogOpen}
        onOpenChange={setEventDialogOpen}
        onCreated={() => refetchEvents()}
      />

      <ProductDetailDialog
        product={detail}
        open={!!detail}
        onOpenChange={(o) => !o && setDetail(null)}
        wished={false}
        onWishlist={() => {}}
        onAddToBoard={() => {}}
      />
    </div>
  );
};

export default Discover;
