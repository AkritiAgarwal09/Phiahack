import { useEffect, useMemo, useState } from "react";
import { Flame, Clock, Tag, Sparkles, Lock, X, ShoppingBag } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { localProducts, type LocalProduct } from "@/data/shopProducts";
import { formatMoney } from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";
import { toast } from "sonner";

interface FlashSale {
  id: string;
  brand: string;
  product: string; // headline
  discount: number;
  originalPrice: number;
  endsIn: string;
  endsAt: number; // ms timestamp
  tier: "explorer" | "insider" | "elite" | "circle_black";
  image: string;
  // catalog tag(s) to curate items into the sale view
  tagFilters: string[];
  description: string;
}

const HOUR = 60 * 60 * 1000;
const now = Date.now();

const allSales: FlashSale[] = [
  { id: "fs-1", brand: "ZARA", product: "Oversized Blazer Drop", discount: 40, originalPrice: 129, endsIn: "2h 15m", endsAt: now + 2.25 * HOUR, tier: "insider", image: "🧥", tagFilters: ["blazer", "tailoring"], description: "Soft-shouldered tailoring, 40% off across the curated capsule." },
  { id: "fs-2", brand: "COS", product: "Cashmere Edit", discount: 30, originalPrice: 190, endsIn: "5h 42m", endsAt: now + 5.7 * HOUR, tier: "explorer", image: "🧶", tagFilters: ["knit", "cashmere", "sweater"], description: "Layer-ready knits in fine merino and cashmere blends." },
  { id: "fs-3", brand: "ARKET", product: "Linen Lounge", discount: 50, originalPrice: 89, endsIn: "45m", endsAt: now + 0.75 * HOUR, tier: "elite", image: "👖", tagFilters: ["linen", "pants"], description: "Half off the linen capsule — flying fast." },
  { id: "fs-4", brand: "& Other Stories", product: "Leather Goods", discount: 35, originalPrice: 249, endsIn: "3h 10m", endsAt: now + 3.16 * HOUR, tier: "insider", image: "👜", tagFilters: ["bag", "leather"], description: "Handcrafted leather bags — limited curation." },
  { id: "fs-5", brand: "H&M Studio", product: "Silk Slip Sale", discount: 60, originalPrice: 159, endsIn: "1h 30m", endsAt: now + 1.5 * HOUR, tier: "circle_black", image: "👗", tagFilters: ["silk", "satin", "dress"], description: "Private archive sale — slips, satins, after-dark pieces." },
  { id: "fs-6", brand: "MASSIMO DUTTI", product: "Wool Outerwear", discount: 45, originalPrice: 299, endsIn: "8h 20m", endsAt: now + 8.33 * HOUR, tier: "explorer", image: "🧥", tagFilters: ["coat", "wool", "outerwear"], description: "Heritage wool coats and trenches at insider pricing." },
  { id: "fs-7", brand: "Reformation", product: "Going-Out Edit", discount: 35, originalPrice: 178, endsIn: "6h 00m", endsAt: now + 6 * HOUR, tier: "insider", image: "✨", tagFilters: ["going-out", "satin", "mini"], description: "Date-night ready dresses, hand-picked." },
  { id: "fs-8", brand: "Aritzia", product: "Everyday Basics", discount: 25, originalPrice: 65, endsIn: "12h", endsAt: now + 12 * HOUR, tier: "explorer", image: "👕", tagFilters: ["basic", "tee", "tank", "knit"], description: "Wardrobe foundations — tees, tanks, and ribbed staples." },
];

const tierOrder = ["explorer", "insider", "elite", "circle_black"] as const;
const tierLabels: Record<string, string> = {
  explorer: "Explorer",
  insider: "Insider",
  elite: "Elite",
  circle_black: "Circle Black",
};

const tierAccent: Record<string, string> = {
  explorer: "text-muted-foreground",
  insider: "text-primary",
  elite: "text-purple-300",
  circle_black: "text-foreground",
};

const NOTIF_KEY = "phia-flash-notified-v1";

function getCuratedItems(sale: FlashSale, max = 12): LocalProduct[] {
  const score = (p: LocalProduct) => {
    const haystack = [...p.node.tags, p.node.title.toLowerCase(), p.node.productType].join(" ").toLowerCase();
    return sale.tagFilters.reduce((acc, f) => acc + (haystack.includes(f.toLowerCase()) ? 1 : 0), 0);
  };
  return [...localProducts]
    .map((p) => ({ p, s: score(p) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, max)
    .map((x) => x.p);
}

const FlashSales = () => {
  const { data: profile } = useProfile();
  const { user } = useAuth();
  const userTierIdx = tierOrder.indexOf((profile?.tier as typeof tierOrder[number]) || "explorer");
  const [activeSale, setActiveSale] = useState<FlashSale | null>(null);
  const addItem = useCartStore((s) => s.addItem);
  const setCartOpen = useCartStore((s) => s.setOpen);

  const eligibleSales = useMemo(
    () => allSales.filter((s) => tierOrder.indexOf(s.tier) <= userTierIdx),
    [userTierIdx]
  );
  const lockedCount = allSales.length - eligibleSales.length;

  // Fire personalized notifications once per user-tier-sale combo
  useEffect(() => {
    if (!user || !profile) return;
    let key: Record<string, true> = {};
    try {
      key = JSON.parse(localStorage.getItem(NOTIF_KEY) || "{}");
    } catch {}
    const fresh = eligibleSales.filter((s) => !key[`${user.id}:${s.id}`]);
    if (fresh.length === 0) return;

    (async () => {
      try {
        const rows = fresh.map((s) => ({
          user_id: user.id,
          type: "flash_sale_drop",
          title: `${s.brand} · ${s.product}`,
          body: `A new ${tierLabels[s.tier]} drop is live for you — up to ${s.discount}% off.`,
          link: "/app?tab=flash-sales",
          metadata: { sale_id: s.id, tier: s.tier, discount: s.discount } as Record<string, unknown>,
        }));
        // Silent; ignore failures (RLS denies INSERT — best-effort optimistic write)
        await supabase.from("notifications").insert(rows as never);
      } catch (e) {
        // No-op
      } finally {
        fresh.forEach((s) => (key[`${user.id}:${s.id}`] = true));
        localStorage.setItem(NOTIF_KEY, JSON.stringify(key));
      }
    })();
  }, [user, profile, eligibleSales]);

  const handleQuickAdd = async (p: LocalProduct, salePercent: number) => {
    const variant = p.node.variants.edges[0]?.node;
    if (!variant) return;
    const discounted = parseFloat(variant.price.amount) * (1 - salePercent / 100);
    await addItem({
      product: p,
      variantId: variant.id,
      variantTitle: variant.title,
      price: { amount: discounted.toFixed(2), currencyCode: variant.price.currencyCode },
      quantity: 1,
      selectedOptions: variant.selectedOptions,
    });
    toast.success(`${p.node.title} added with ${salePercent}% off`);
    setCartOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Flame className="h-6 w-6 text-orange-400" />
          <h2 className="font-serif text-2xl font-bold text-foreground">Flash Sales</h2>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>
            {eligibleSales.length} live for{" "}
            <span className={`font-semibold ${tierAccent[profile?.tier || "explorer"]}`}>
              {tierLabels[profile?.tier || "explorer"]}
            </span>
          </span>
          {lockedCount > 0 && (
            <span className="ml-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
              {lockedCount} locked
            </span>
          )}
        </div>
      </div>

      {eligibleSales.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 py-16 text-center">
          <Flame className="h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            No sales for your tier yet. Earn points to unlock Insider drops.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {eligibleSales.map((sale) => (
            <button
              key={sale.id}
              onClick={() => setActiveSale(sale)}
              className="group relative overflow-hidden rounded-2xl border border-primary/20 bg-card p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-gold"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-3xl">{sale.image}</span>
                  <h3 className="mt-2 font-serif text-base font-semibold text-foreground">{sale.product}</h3>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{sale.brand}</p>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-lg font-bold text-primary">
                  {sale.discount}%
                </span>
              </div>
              <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{sale.description}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className={`rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${tierAccent[sale.tier]}`}>
                  {tierLabels[sale.tier]}
                </span>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {sale.endsIn}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Locked tiers preview */}
      {lockedCount > 0 && (
        <div className="rounded-2xl border border-border bg-card/40 p-5">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-serif text-sm font-semibold text-foreground">Locked sales</h3>
            <span className="text-xs text-muted-foreground">— level up to access</span>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {allSales
              .filter((s) => tierOrder.indexOf(s.tier) > userTierIdx)
              .map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-secondary/20 px-3 py-2.5 opacity-70"
                >
                  <span className="text-xl">{sale.image}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-foreground">{sale.product}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {tierLabels[sale.tier]}+ · {sale.discount}% off
                    </p>
                  </div>
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Sale detail dialog */}
      <Dialog open={!!activeSale} onOpenChange={(o) => !o && setActiveSale(null)}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto p-0">
          {activeSale && (
            <div>
              <div className="border-b border-border p-6">
                <DialogHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        {activeSale.brand}
                      </p>
                      <DialogTitle className="mt-1 font-serif text-2xl font-bold text-foreground">
                        {activeSale.product}
                      </DialogTitle>
                      <DialogDescription className="mt-1 text-sm text-muted-foreground">
                        {activeSale.description}
                      </DialogDescription>
                    </div>
                    <span className="shrink-0 rounded-full bg-primary px-3 py-1 text-base font-bold text-primary-foreground">
                      {activeSale.discount}% off
                    </span>
                  </div>
                </DialogHeader>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                  <span className={`rounded-full bg-secondary px-2.5 py-1 font-medium uppercase tracking-wider ${tierAccent[activeSale.tier]}`}>
                    {tierLabels[activeSale.tier]} access
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" /> Ends in {activeSale.endsIn}
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Tag className="h-3 w-3" /> Curated for you
                  </span>
                </div>
              </div>

              <div className="p-6">
                {(() => {
                  const items = getCuratedItems(activeSale);
                  if (items.length === 0) {
                    return (
                      <p className="text-sm text-muted-foreground">No curated items yet — check back soon.</p>
                    );
                  }
                  return (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {items.map((p) => {
                        const variant = p.node.variants.edges[0]?.node;
                        const orig = parseFloat(p.node.priceRange.minVariantPrice.amount);
                        const disc = orig * (1 - activeSale.discount / 100);
                        const img = p.node.images.edges[0]?.node?.url;
                        return (
                          <div
                            key={p.node.id}
                            className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/40"
                          >
                            <div className="aspect-[4/5] overflow-hidden bg-secondary/40">
                              {img && (
                                <img
                                  src={img}
                                  alt={p.node.title}
                                  loading="lazy"
                                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                              )}
                            </div>
                            <div className="flex flex-1 flex-col gap-1 p-2.5">
                              <p className="line-clamp-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                                {p.node.vendor}
                              </p>
                              <p className="line-clamp-1 font-serif text-xs font-semibold text-foreground">
                                {p.node.title}
                              </p>
                              <div className="flex items-center gap-1.5 text-xs">
                                <span className="font-semibold text-primary">${disc.toFixed(0)}</span>
                                <span className="text-muted-foreground line-through">${orig.toFixed(0)}</span>
                              </div>
                              <button
                                onClick={() => handleQuickAdd(p, activeSale.discount)}
                                disabled={!variant}
                                className="mt-1 flex items-center justify-center gap-1 rounded-full gradient-gold px-2 py-1.5 text-[11px] font-semibold text-primary-foreground shadow-gold hover:opacity-90 disabled:opacity-50"
                              >
                                <ShoppingBag className="h-3 w-3" /> Add
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FlashSales;
