import { ShoppingBag, Sparkles } from "lucide-react";
import type { ShopifyProduct } from "@/lib/shopify";
import { formatMoney } from "@/lib/shopify";
import type { SocialProofBadge } from "@/lib/predictiveEngine";
import { cn } from "@/lib/utils";

interface Props {
  product: ShopifyProduct;
  badge?: SocialProofBadge | null;
  onClick?: () => void;
  onAdd?: () => void;
  compact?: boolean;
}

const intentStyles: Record<SocialProofBadge["intent"], string> = {
  popular: "bg-amber-200/15 text-amber-200 border-amber-200/30",
  trend: "bg-fuchsia-300/15 text-fuchsia-200 border-fuchsia-300/30",
  rising: "bg-emerald-300/15 text-emerald-200 border-emerald-300/30",
  matched: "bg-sky-300/15 text-sky-200 border-sky-300/30",
};

const DiscoverProductCard = ({ product, badge, onClick, onAdd, compact }: Props) => {
  const node = product.node;
  const img = node.images.edges[0]?.node?.url;
  const price = node.priceRange.minVariantPrice;

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 text-left backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-amber-200/30 hover:bg-white/10",
        compact ? "w-[180px] sm:w-[200px]" : "w-full"
      )}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-secondary/20">
        {img && (
          <img
            src={img}
            alt={node.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        )}
        {badge && (
          <span
            className={cn(
              "absolute left-2 top-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold backdrop-blur-md",
              intentStyles[badge.intent]
            )}
          >
            <Sparkles className="h-2.5 w-2.5" />
            {badge.label}
          </span>
        )}
        {onAdd && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAdd();
            }}
            className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-amber-100/90 text-[hsl(230_50%_12%)] opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
            aria-label="Add to bag"
          >
            <ShoppingBag className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="flex-1 space-y-1 p-3">
        <p className="text-[10px] uppercase tracking-wider text-white/50">{node.vendor}</p>
        <p className="line-clamp-2 text-sm font-medium text-white/90">{node.title}</p>
        <p className="text-sm font-semibold text-amber-100">{formatMoney(price.amount, price.currencyCode)}</p>
      </div>
    </button>
  );
};

export default DiscoverProductCard;
