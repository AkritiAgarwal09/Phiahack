import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ShopifyProduct, formatMoney } from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";
import { Heart, Bookmark, ShoppingBag, Loader2, Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { completeTheLook } from "@/lib/predictiveEngine";
import { snapshotPrice } from "@/services/priceAnalyticsService";

interface Props {
  product: ShopifyProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wished: boolean;
  onWishlist: () => void;
  onAddToBoard: () => void;
  allProducts?: ShopifyProduct[];
  onSelectRelated?: (p: ShopifyProduct) => void;
}

const ProductDetailDialog = ({
  product,
  open,
  onOpenChange,
  wished,
  onWishlist,
  onAddToBoard,
  allProducts = [],
  onSelectRelated,
}: Props) => {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [activeImage, setActiveImage] = useState(0);
  const addItem = useCartStore((s) => s.addItem);
  const setCartOpen = useCartStore((s) => s.setOpen);
  const isLoading = useCartStore((s) => s.isLoading);

  const node = product?.node;

  // Pick variant based on selected options (default to first)
  const selectedVariant = useMemo(() => {
    if (!node) return null;
    const variants = node.variants.edges;
    if (Object.keys(selectedOptions).length === 0) return variants[0]?.node || null;
    return (
      variants.find((v) =>
        v.node.selectedOptions.every((o) => selectedOptions[o.name] === o.value)
      )?.node || variants[0]?.node || null
    );
  }, [node, selectedOptions]);

  // Snapshot price + compute complements when product opens
  useEffect(() => {
    if (product) snapshotPrice(product);
  }, [product]);

  const complement = useMemo(
    () => (product ? completeTheLook(product) : null),
    [product]
  );

  if (!node) return null;
  const images = node.images.edges;
  const price = selectedVariant?.price || node.priceRange.minVariantPrice;

  const handleAdd = async () => {
    if (!selectedVariant) return;
    await addItem({
      product,
      variantId: selectedVariant.id,
      variantTitle: selectedVariant.title,
      price: selectedVariant.price,
      quantity: 1,
      selectedOptions: selectedVariant.selectedOptions,
    });
    onOpenChange(false);
    setCartOpen(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto p-0">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Gallery */}
          <div className="bg-secondary/30">
            <div className="aspect-square overflow-hidden">
              {images[activeImage]?.node && (
                <img
                  src={images[activeImage].node.url}
                  alt={images[activeImage].node.altText || node.title}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto p-3">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={cn(
                      "h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-all",
                      activeImage === i ? "border-primary" : "border-transparent opacity-70"
                    )}
                  >
                    <img src={img.node.url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col gap-4 p-6 md:p-8">
            {node.vendor && (
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{node.vendor}</p>
            )}
            <h2 className="font-serif text-2xl font-bold text-foreground sm:text-3xl">{node.title}</h2>
            <p className="font-serif text-2xl font-semibold text-foreground">
              {formatMoney(price.amount, price.currencyCode)}
            </p>

            {node.description && (
              <p className="text-sm leading-relaxed text-muted-foreground">{node.description}</p>
            )}

            {/* Options */}
            {node.options
              .filter((opt) => !(opt.values.length === 1 && opt.values[0] === "Default Title"))
              .map((opt) => (
                <div key={opt.name} className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {opt.name}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {opt.values.map((val) => {
                      const isSelected =
                        (selectedOptions[opt.name] || selectedVariant?.selectedOptions.find((o) => o.name === opt.name)?.value) === val;
                      return (
                        <button
                          key={val}
                          onClick={() => setSelectedOptions({ ...selectedOptions, [opt.name]: val })}
                          className={cn(
                            "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all",
                            isSelected
                              ? "border-foreground bg-foreground text-background"
                              : "border-border bg-card text-foreground hover:border-foreground/40"
                          )}
                        >
                          {val}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

            <div className="mt-2 flex flex-col gap-2">
              <button
                onClick={handleAdd}
                disabled={isLoading || !selectedVariant?.availableForSale}
                className="flex items-center justify-center gap-2 rounded-full gradient-gold px-5 py-3 text-sm font-semibold text-primary-foreground shadow-gold transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <ShoppingBag className="h-4 w-4" />
                    {selectedVariant?.availableForSale ? "Add to Bag" : "Sold Out"}
                  </>
                )}
              </button>
              <div className="flex gap-2">
                <button
                  onClick={onWishlist}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-all",
                    wished
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-foreground hover:border-foreground/40"
                  )}
                >
                  {wished ? <Check className="h-4 w-4" /> : <Heart className="h-4 w-4" />}
                  {wished ? "Saved" : "Wishlist"}
                </button>
                <button
                  onClick={onAddToBoard}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:border-foreground/40"
                >
                  <Bookmark className="h-4 w-4 text-primary" />
                  Pin
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Predictive Complementary Items — complete the look */}
        {complement && complement.items.length > 0 && (
          <div className="border-t border-border p-6 md:p-8">
            <p className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-primary">
              <Sparkles className="h-3 w-3" /> Complete the look
            </p>
            <h3 className="mt-1 font-serif text-xl font-bold text-foreground">
              Pieces that pair perfectly
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Curated by Phia to round out your {node.title}.
            </p>
            <div className="-mx-1 mt-4 flex gap-3 overflow-x-auto px-1 pb-1">
              {complement.items.slice(0, 4).map((p) => {
                const cImg = p.node.images.edges[0]?.node?.url;
                return (
                  <button
                    key={p.node.id}
                    onClick={() => onSelectRelated?.(p)}
                    className="group w-40 shrink-0 overflow-hidden rounded-xl border border-primary/20 bg-card text-left transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-gold"
                  >
                    <div className="aspect-[4/5] overflow-hidden bg-secondary/40">
                      {cImg && (
                        <img
                          src={cImg}
                          alt={p.node.title}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      )}
                    </div>
                    <div className="space-y-0.5 p-2.5">
                      <p className="line-clamp-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                        {p.node.vendor}
                      </p>
                      <p className="line-clamp-1 font-serif text-xs font-semibold text-foreground">
                        {p.node.title}
                      </p>
                      <p className="font-serif text-xs font-semibold text-primary">
                        {formatMoney(
                          p.node.priceRange.minVariantPrice.amount,
                          p.node.priceRange.minVariantPrice.currencyCode
                        )}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* You may also like rail */}
        {(() => {
          const related = allProducts
            .filter(
              (p) =>
                p.node.id !== node.id &&
                (p.node.productType === node.productType ||
                  p.node.vendor === node.vendor)
            )
            .slice(0, 6);
          if (related.length === 0) return null;
          return (
            <div className="border-t border-border p-6 md:p-8">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Curated for you
              </p>
              <h3 className="mt-1 font-serif text-xl font-bold text-foreground">
                You may also like
              </h3>
              <div className="-mx-1 mt-4 flex gap-3 overflow-x-auto px-1 pb-1">
                {related.map((p) => {
                  const img = p.node.images.edges[0]?.node?.url;
                  return (
                    <button
                      key={p.node.id}
                      onClick={() => onSelectRelated?.(p)}
                      className="group w-40 shrink-0 overflow-hidden rounded-xl border border-border bg-card text-left transition-all hover:-translate-y-0.5 hover:shadow-elevated"
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
                      <div className="space-y-0.5 p-2.5">
                        <p className="line-clamp-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                          {p.node.vendor}
                        </p>
                        <p className="line-clamp-1 font-serif text-xs font-semibold text-foreground">
                          {p.node.title}
                        </p>
                        <p className="font-serif text-xs font-semibold text-foreground">
                          {formatMoney(
                            p.node.priceRange.minVariantPrice.amount,
                            p.node.priceRange.minVariantPrice.currencyCode
                          )}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </DialogContent>
    </Dialog>
  );
};

export default ProductDetailDialog;
