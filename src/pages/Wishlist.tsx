import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Heart, Trash2, Bell, BellOff, ExternalLink, ShoppingBag, Maximize2, Check, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useCartStore, type CartItem } from "@/stores/cartStore";
import { localProducts } from "@/data/shopProducts";
import ProductDetailDialog from "@/components/shop/ProductDetailDialog";
import PriceHistoryButton from "@/components/shop/PriceHistoryButton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { ShopifyProduct } from "@/lib/shopify";
import { loadMyEngagements, loadTrending } from "@/services/engagementService";
import {
  trendingInYourCircle,
  styleProgression,
  socialProofForProduct,
  type SocialProofBadge,
} from "@/lib/predictiveEngine";
import { cn } from "@/lib/utils";

const intentChip: Record<SocialProofBadge["intent"], string> = {
  popular: "bg-amber-100 text-amber-900 border-amber-200",
  trend: "bg-fuchsia-100 text-fuchsia-900 border-fuchsia-200",
  rising: "bg-emerald-100 text-emerald-900 border-emerald-200",
  matched: "bg-sky-100 text-sky-900 border-sky-200",
};

interface WishlistRow {
  id: string;
  product_name: string;
  product_url: string;
  product_image: string | null;
  current_price: number | null;
  target_price: number | null;
  alert_enabled: boolean;
}

function findProductForWishlist(it: WishlistRow): ShopifyProduct | null {
  const lower = it.product_name.toLowerCase();
  return (
    (localProducts.find(
      (p) =>
        p.node.title.toLowerCase().includes(lower) ||
        lower.includes(p.node.title.toLowerCase())
    ) as ShopifyProduct | undefined) || null
  );
}

const Wishlist = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const addToCart = useCartStore((s) => s.addItem);
  const setCartOpen = useCartStore((s) => s.setOpen);
  const [quickViewProduct, setQuickViewProduct] = useState<ShopifyProduct | null>(null);
  const [openSizeFor, setOpenSizeFor] = useState<string | null>(null);

  const { data: rawItems = [], isLoading } = useQuery({
    queryKey: ["wishlists", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlists")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as WishlistRow[];
    },
    enabled: !!user,
  });

  // Predictive social-proof signals
  const { data: wishEngagements = [] } = useQuery({
    queryKey: ["wishlist_engagements", user?.id],
    queryFn: () => loadMyEngagements(120),
    enabled: !!user,
  });
  const { data: wishTrending = [] } = useQuery({
    queryKey: ["wishlist_trending"],
    queryFn: () => loadTrending(7, 30),
  });
  const circle = useMemo(
    () => trendingInYourCircle(wishTrending, wishEngagements),
    [wishTrending, wishEngagements]
  );
  const myTribe = useMemo(
    () => styleProgression(wishEngagements).current?.tribe,
    [wishEngagements]
  );
  const trendingIds = useMemo(
    () => new Set(wishTrending.slice(0, 8).map((t) => t.product_id)),
    [wishTrending]
  );

  const items = (() => {
    const seen = new Set<string>();
    const out: WishlistRow[] = [];
    for (const it of rawItems) {
      const key = (it.product_url || it.product_name).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(it);
    }
    return out;
  })();

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("wishlists").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wishlists"] }),
  });

  const toggleAlert = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase.from("wishlists").update({ alert_enabled: enabled }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wishlists"] }),
  });

  const handleQuickView = (it: WishlistRow) => {
    const product = findProductForWishlist(it);
    if (!product) {
      toast.error("This item isn't in our catalog yet");
      return;
    }
    setQuickViewProduct(product);
  };

  const handleAddWithSize = async (it: WishlistRow, sizeValue: string | null) => {
    const product = findProductForWishlist(it);
    if (!product) {
      toast.error("This item isn't in our catalog yet");
      return;
    }
    const variants = product.node.variants.edges;
    const variantNode = sizeValue
      ? variants.find((v) =>
          v.node.selectedOptions.some((o) => o.name === "Size" && o.value === sizeValue)
        )?.node
      : variants[0]?.node;
    const variant = variantNode || variants[0]?.node;
    if (!variant) {
      toast.error("No variants available");
      return;
    }
    const cartItem: Omit<CartItem, "lineId"> = {
      product,
      variantId: variant.id,
      variantTitle: variant.title,
      price: variant.price,
      quantity: 1,
      selectedOptions: variant.selectedOptions,
    };
    await addToCart(cartItem);
    toast.success(`${product.node.title} added to bag`);
    setOpenSizeFor(null);
    setCartOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Heart className="h-6 w-6 text-primary" />
        <h2 className="font-serif text-3xl font-bold text-foreground sm:text-4xl">Wishlist</h2>
        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground">
          {items.length}
        </span>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-secondary" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 py-16 text-center">
          <Heart className="h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-muted-foreground">
            Your wishlist is empty. Start saving items you love!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => {
            const matched = findProductForWishlist(item);
            const sizeOption = matched?.node.options.find((o) => o.name === "Size");
            const availableSizes = sizeOption?.values || [];
            const badge = matched
              ? socialProofForProduct(matched.node.id, circle.trendingMeta, myTribe)
              : null;
            return (
              <div
                key={item.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-primary/40 hover:shadow-gold"
              >
                <div className="relative aspect-square overflow-hidden bg-secondary/40">
                  {item.product_image ? (
                    <img
                      src={item.product_image}
                      alt={item.product_name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : matched ? (
                    <img
                      src={matched.node.images.edges[0]?.node?.url}
                      alt={item.product_name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
                      <ShoppingBag className="h-8 w-8" />
                    </div>
                  )}
                  {badge && (
                    <span
                      className={cn(
                        "absolute left-2 top-2 inline-flex max-w-[88%] items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold backdrop-blur-md",
                        intentChip[badge.intent]
                      )}
                    >
                      <Sparkles className="h-2.5 w-2.5 shrink-0" />
                      <span className="truncate">{badge.label}</span>
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="line-clamp-2 font-serif text-base font-semibold text-foreground">
                    {item.product_name}
                  </h3>
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    {item.current_price != null && (
                      <span className="font-semibold text-foreground">
                        ${Number(item.current_price).toFixed(2)}
                      </span>
                    )}
                    {item.target_price != null && (
                      <span className="text-primary">
                        Target ${Number(item.target_price).toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-1 pt-3">
                    {/* Add to bag — opens size picker if sizes exist */}
                    {availableSizes.length > 0 ? (
                      <Popover
                        open={openSizeFor === item.id}
                        onOpenChange={(o) => setOpenSizeFor(o ? item.id : null)}
                      >
                        <PopoverTrigger asChild>
                          <button
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-full gradient-gold px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-gold hover:opacity-90"
                          >
                            <ShoppingBag className="h-3.5 w-3.5" />
                            Add to bag
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          align="start"
                          className="w-56 border-border bg-card p-3"
                        >
                          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                            Pick a size
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {availableSizes.map((sz) => (
                              <button
                                key={sz}
                                onClick={() => handleAddWithSize(item, sz)}
                                className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground transition-all hover:border-primary hover:bg-primary/10 hover:text-primary"
                              >
                                {sz}
                              </button>
                            ))}
                          </div>
                          <button
                            onClick={() => handleAddWithSize(item, null)}
                            className="mt-3 flex w-full items-center justify-center gap-1 rounded-full border border-border px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-secondary"
                          >
                            <Check className="h-3 w-3" /> Skip — add default
                          </button>
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <button
                        onClick={() => handleAddWithSize(item, null)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-full gradient-gold px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-gold hover:opacity-90"
                      >
                        <ShoppingBag className="h-3.5 w-3.5" />
                        Add to bag
                      </button>
                    )}
                    {matched && (
                      <PriceHistoryButton
                        product={matched}
                        trending={trendingIds.has(matched.node.id)}
                        className="!h-7 !w-7"
                      />
                    )}
                    <button
                      onClick={() =>
                        toggleAlert.mutate({ id: item.id, enabled: !item.alert_enabled })
                      }
                      className={`rounded-full p-1.5 transition-colors ${
                        item.alert_enabled
                          ? "text-primary hover:bg-primary/10"
                          : "text-muted-foreground hover:bg-secondary"
                      }`}
                      title={item.alert_enabled ? "Alerts on" : "Alerts off"}
                    >
                      {item.alert_enabled ? (
                        <Bell className="h-3.5 w-3.5" />
                      ) : (
                        <BellOff className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => handleQuickView(item)}
                      className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      title="Quick view"
                      aria-label="Quick view"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                    </button>
                    {item.product_url && !matched && (
                      <a
                        href={item.product_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <button
                      onClick={() => deleteItem.mutate(item.id)}
                      className="rounded-full p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ProductDetailDialog
        product={quickViewProduct}
        open={!!quickViewProduct}
        onOpenChange={(o) => !o && setQuickViewProduct(null)}
        wished={true}
        onWishlist={() => {}}
        onAddToBoard={() => {}}
        allProducts={localProducts as unknown as ShopifyProduct[]}
        onSelectRelated={(p) => setQuickViewProduct(p)}
      />
    </div>
  );
};

export default Wishlist;
