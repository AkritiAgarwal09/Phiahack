import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, ArrowRight, TrendingUp, Target } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useRecentlyViewed } from "@/stores/recentlyViewedStore";
import { useCartStore } from "@/stores/cartStore";
import {
  loadMyEngagements,
  loadTrending,
} from "@/services/engagementService";
import {
  nextBuyPrediction,
  trendingInYourCircle,
  socialProofForProduct,
  styleProgression,
} from "@/lib/predictiveEngine";
import DiscoverProductCard from "@/components/discover/DiscoverProductCard";
import type { ShopifyProduct } from "@/lib/shopify";

interface Props {
  onOpenDiscover: () => void;
  onOpenProduct?: (p: ShopifyProduct) => void;
}

const HomeDiscoverRail = ({ onOpenDiscover, onOpenProduct }: Props) => {
  const { user } = useAuth();
  const recentIds = useRecentlyViewed((s) => s.ids);
  const addCartItem = useCartStore((s) => s.addItem);
  const setCartOpen = useCartStore((s) => s.setOpen);

  const { data: engagements = [] } = useQuery({
    queryKey: ["my_engagements_home", user?.id],
    queryFn: () => loadMyEngagements(120),
    enabled: !!user,
  });

  const { data: trending = [] } = useQuery({
    queryKey: ["trending_home"],
    queryFn: () => loadTrending(7, 24),
  });

  const { data: wishlist = [] } = useQuery({
    queryKey: ["wishlist_home_predict", user?.id],
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

  const circle = useMemo(
    () => trendingInYourCircle(trending, engagements),
    [trending, engagements]
  );

  const tribe = useMemo(
    () => styleProgression(engagements).current?.tribe,
    [engagements]
  );

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

  const nextBuyItems = nextBuy.items.slice(0, 8);
  const circleItems = circle.items.slice(0, 8);

  if (nextBuyItems.length === 0 && circleItems.length === 0) return null;

  return (
    <section className="relative z-10 mx-auto w-full max-w-7xl space-y-10 px-6 pb-20 pt-4 text-white">
      {/* Section header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-200/80">
            <Sparkles className="h-3 w-3" />
            Predictive Discovery
          </p>
          <h2 className="font-serif text-2xl text-white sm:text-3xl">
            Picked for where your taste is going
          </h2>
        </div>
        <button
          onClick={onOpenDiscover}
          className="group inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold text-white/90 backdrop-blur transition-colors hover:border-amber-200/40 hover:bg-white/10"
        >
          Open Discover
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>

      {/* Next-buy rail */}
      {nextBuyItems.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-white/85">
            <Target className="h-4 w-4 text-amber-200" />
            <h3 className="font-serif text-base italic">Next-buy predictor</h3>
            <span className="text-xs text-white/55">· {nextBuy.pitch}</span>
          </div>
          <div className="-mx-2 flex gap-3 overflow-x-auto px-2 pb-2 [scrollbar-width:thin]">
            {nextBuyItems.map((p) => (
              <div key={p.node.id} className="w-[180px] shrink-0 sm:w-[200px]">
                <DiscoverProductCard
                  product={p}
                  badge={socialProofForProduct(p.node.id, circle.trendingMeta, tribe)}
                  onClick={() => onOpenProduct?.(p)}
                  onAdd={() => quickAdd(p)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trending in your circle */}
      {circleItems.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-white/85">
            <TrendingUp className="h-4 w-4 text-amber-200" />
            <h3 className="font-serif text-base italic">Trending in your Circle</h3>
            <span className="text-xs text-white/55">· {circle.pitch}</span>
          </div>
          <div className="-mx-2 flex gap-3 overflow-x-auto px-2 pb-2 [scrollbar-width:thin]">
            {circleItems.map((p) => (
              <div key={p.node.id} className="w-[180px] shrink-0 sm:w-[200px]">
                <DiscoverProductCard
                  product={p}
                  badge={socialProofForProduct(p.node.id, circle.trendingMeta, tribe)}
                  onClick={() => onOpenProduct?.(p)}
                  onAdd={() => quickAdd(p)}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default HomeDiscoverRail;
