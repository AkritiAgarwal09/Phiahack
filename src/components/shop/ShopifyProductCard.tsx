import { Heart, ShoppingBag, Bookmark, Sparkles } from "lucide-react";
import { ShopifyProduct, formatMoney } from "@/lib/shopify";
import { cn } from "@/lib/utils";
import type { SocialProofBadge } from "@/lib/predictiveEngine";
import PriceHistoryButton from "@/components/shop/PriceHistoryButton";

interface Props {
  product: ShopifyProduct;
  wished: boolean;
  onWishlist: () => void;
  onAddToCart: () => void;
  onAddToBoard: () => void;
  onOpenDetail: () => void;
  socialBadge?: SocialProofBadge | null;
  trending?: boolean;
}

const intentChip: Record<SocialProofBadge["intent"], string> = {
  popular: "bg-amber-100 text-amber-900 border-amber-200",
  trend: "bg-fuchsia-100 text-fuchsia-900 border-fuchsia-200",
  rising: "bg-emerald-100 text-emerald-900 border-emerald-200",
  matched: "bg-sky-100 text-sky-900 border-sky-200",
};

const ShopifyProductCard = ({
  product,
  wished,
  onWishlist,
  onAddToCart,
  onAddToBoard,
  onOpenDetail,
  socialBadge,
  trending,
}: Props) => {
  const node = product.node;
  const image = node.images?.edges?.[0]?.node?.url;
  const price = node.priceRange.minVariantPrice;
  const firstVariant = node.variants.edges[0]?.node;
  const available = firstVariant?.availableForSale ?? false;

  return (
    <article className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-elevated">
      <div
        onClick={onOpenDetail}
        className="relative aspect-[4/5] cursor-pointer overflow-hidden bg-secondary/40"
      >
        {image ? (
          <img
            src={image}
            alt={node.images.edges[0].node.altText || node.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            No image
          </div>
        )}

        <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onWishlist();
            }}
            aria-label={wished ? "Remove from wishlist" : "Save to wishlist"}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-md transition-all",
              wished
                ? "bg-primary text-primary-foreground shadow-gold"
                : "bg-background/80 text-foreground hover:bg-background"
            )}
          >
            <Heart className={cn("h-4 w-4", wished && "fill-current")} />
          </button>
          <PriceHistoryButton product={product} trending={trending} />
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddToBoard();
          }}
          className="absolute bottom-3 left-3 right-3 flex items-center justify-center gap-1.5 rounded-full bg-background/90 px-3 py-2 text-xs font-semibold text-foreground backdrop-blur-md transition-all hover:bg-background sm:translate-y-2 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100"
        >
          <Bookmark className="h-3.5 w-3.5 text-primary" />
          Add to Mood Board
        </button>

        {!available && (
          <span className="absolute left-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur">
            Sold out
          </span>
        )}

        {available && socialBadge && (
          <span
            className={cn(
              "absolute left-3 top-3 inline-flex max-w-[85%] items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold backdrop-blur-md",
              intentChip[socialBadge.intent]
            )}
          >
            <Sparkles className="h-2.5 w-2.5 shrink-0" />
            <span className="truncate">{socialBadge.label}</span>
          </span>
        )}
      </div>

      <div className="space-y-3 p-4">
        <div className="min-h-[44px]" onClick={onOpenDetail} role="button">
          {node.vendor && (
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{node.vendor}</p>
          )}
          <h3 className="mt-0.5 line-clamp-1 cursor-pointer font-serif text-base font-semibold text-foreground">
            {node.title}
          </h3>
        </div>

        <div className="flex items-center justify-between">
          <p className="font-serif text-lg font-semibold text-foreground">
            {formatMoney(price.amount, price.currencyCode)}
          </p>
          <button
            onClick={onAddToCart}
            disabled={!available}
            className="flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-2 text-xs font-semibold text-background transition-opacity hover:opacity-85 disabled:opacity-40"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            Add
          </button>
        </div>
      </div>
    </article>
  );
};

export default ShopifyProductCard;
