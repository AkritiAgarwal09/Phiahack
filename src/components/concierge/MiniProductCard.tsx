import { Heart, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useCartStore } from "@/stores/cartStore";
import { formatMoney } from "@/lib/shopify";
import { getProduct } from "@/lib/conciergeCards";
import { cn } from "@/lib/utils";
import PriceHistoryButton from "@/components/shop/PriceHistoryButton";

interface Props {
  productId: string;
  note?: string;
  role?: string;
  compact?: boolean;
}

const MiniProductCard = ({ productId, note, role, compact = false }: Props) => {
  const product = getProduct(productId);
  const { user } = useAuth();
  const addItem = useCartStore((s) => s.addItem);
  const [wished, setWished] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!product) return null;
  const node = product.node;
  const image = node.images.edges[0]?.node?.url;
  const price = node.priceRange.minVariantPrice;
  const variant = node.variants.edges[0]?.node;

  const handleAdd = async () => {
    if (!variant) return;
    setBusy(true);
    try {
      await addItem({
        product,
        variantId: variant.id,
        variantTitle: variant.title,
        price: variant.price,
        quantity: 1,
        selectedOptions: variant.selectedOptions,
      });
      toast.success(`Added ${node.title}`);
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast.error("Sign in to save");
      return;
    }
    if (wished) {
      setWished(false);
      return;
    }
    const { error } = await supabase.from("wishlists").insert({
      user_id: user.id,
      product_name: node.title,
      product_url: node.id,
      product_image: image,
      current_price: parseFloat(price.amount),
    });
    if (error && !error.message.toLowerCase().includes("duplicate")) {
      toast.error("Could not save");
      return;
    }
    setWished(true);
    toast.success("Saved to wishlist");
  };

  return (
    <article
      className={cn(
        "group flex shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-elevated",
        compact ? "w-[150px]" : "w-[180px]"
      )}
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-secondary/40">
        {image && (
          <img
            src={image}
            alt={node.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
          />
        )}
        {role && (
          <span className="absolute left-2 top-2 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground backdrop-blur">
            {role}
          </span>
        )}
        <button
          onClick={handleSave}
          aria-label="Save"
          className={cn(
            "absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full backdrop-blur-md transition-all",
            wished
              ? "bg-primary text-primary-foreground"
              : "bg-background/80 text-foreground hover:bg-background"
          )}
        >
          <Heart className={cn("h-3.5 w-3.5", wished && "fill-current")} />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-2.5">
        <p className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">
          {node.vendor}
        </p>
        <h4 className="line-clamp-2 text-xs font-semibold leading-tight text-foreground">
          {node.title}
        </h4>
        {note && (
          <p className="line-clamp-2 text-[11px] italic text-muted-foreground">{note}</p>
        )}
        <div className="mt-auto flex items-center justify-between pt-1.5">
          <span className="font-serif text-sm font-semibold text-foreground">
            {formatMoney(price.amount, price.currencyCode)}
          </span>
          <div className="flex items-center gap-1">
            <PriceHistoryButton
              product={product}
              className="!h-7 !w-7"
            />
            <button
              onClick={handleAdd}
              disabled={busy}
              aria-label="Add to cart"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-background transition-opacity hover:opacity-85 disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};

export default MiniProductCard;
