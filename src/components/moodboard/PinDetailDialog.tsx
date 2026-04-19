import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Bookmark, Heart, ShoppingBag, ImageOff, Loader2, ArrowLeft, Pencil, Save } from "lucide-react";
import { toast } from "sonner";
import { ShopifyProduct, formatMoney } from "@/lib/shopify";
import { localProducts } from "@/data/shopProducts";
import { useCartStore } from "@/stores/cartStore";
import { earnPoints } from "@/services/pointsService";
import { logEngagement } from "@/services/engagementService";
import { PinnableItem } from "@/components/shop/AddToBoardDialog";
import { cn } from "@/lib/utils";

interface PinItem {
  id: string;
  product_name: string;
  product_image: string | null;
  product_url: string | null;
  notes?: string | null;
}

interface Props {
  pin: PinItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToBoard: (item: PinnableItem) => void;
}

const PinDetailDialog = ({ pin, open, onOpenChange, onAddToBoard }: Props) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const addItem = useCartStore((s) => s.addItem);
  const setCartOpen = useCartStore((s) => s.setOpen);
  const isLoading = useCartStore((s) => s.isLoading);

  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");

  useEffect(() => {
    setNoteDraft(pin?.notes || "");
    setEditingNote(false);
  }, [pin?.id, pin?.notes]);

  const saveNote = useMutation({
    mutationFn: async () => {
      if (!pin) return;
      const { error } = await supabase
        .from("mood_board_items")
        .update({ notes: noteDraft.trim() || null })
        .eq("id", pin.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mood_board_items"] });
      setEditingNote(false);
      toast.success("Caption saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Look up the original product from the local catalog by id
  const product: ShopifyProduct | null = useMemo(() => {
    if (!pin?.product_url) return null;
    return localProducts.find((p) => p.node.id === pin.product_url) || null;
  }, [pin?.product_url]);

  // Related from local catalog excluding current
  const related: ShopifyProduct[] = useMemo(
    () => localProducts.filter((p) => p.node.id !== pin?.product_url).slice(0, 8),
    [pin?.product_url]
  );

  // Engagement signal whenever a pin is opened
  useEffect(() => {
    if (open && product) logEngagement(product, "view");
  }, [open, product]);

  if (!pin) return null;

  const handleAddToCart = async () => {
    if (!product) return;
    const variant = product.node.variants.edges[0]?.node;
    if (!variant?.availableForSale) {
      toast.error("Sold out");
      return;
    }
    await addItem({
      product,
      variantId: variant.id,
      variantTitle: variant.title,
      price: variant.price,
      quantity: 1,
      selectedOptions: variant.selectedOptions,
    });
    toast.success("Added to bag");
    onOpenChange(false);
    setCartOpen(true);
  };

  const price = product?.node.priceRange.minVariantPrice;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto p-0">
        {/* Hero */}
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="bg-secondary/30">
            <div className="aspect-square overflow-hidden md:aspect-auto md:h-full">
              {pin.product_image ? (
                <img src={pin.product_image} alt={pin.product_name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full min-h-[300px] items-center justify-center text-muted-foreground">
                  <ImageOff className="h-10 w-10" />
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4 p-6 md:p-8">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Pinned</p>
            <h2 className="font-serif text-2xl font-bold text-foreground sm:text-3xl">{pin.product_name}</h2>

            {price && (
              <p className="font-serif text-xl font-semibold text-foreground">
                {formatMoney(price.amount, price.currencyCode)}
              </p>
            )}

            {product?.node.description && (
              <p className="text-sm leading-relaxed text-muted-foreground line-clamp-6">
                {product.node.description}
              </p>
            )}

            {/* Caption / personal note */}
            <div className="rounded-2xl border border-border bg-secondary/30 p-3">
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Your caption
                </p>
                {!editingNote ? (
                  <button
                    onClick={() => setEditingNote(true)}
                    className="flex items-center gap-1 text-[11px] text-primary hover:opacity-80"
                  >
                    <Pencil className="h-3 w-3" /> {pin.notes ? "Edit" : "Add"}
                  </button>
                ) : (
                  <button
                    onClick={() => saveNote.mutate()}
                    disabled={saveNote.isPending}
                    className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:opacity-80 disabled:opacity-50"
                  >
                    {saveNote.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Save className="h-3 w-3" />
                    )}
                    Save
                  </button>
                )}
              </div>
              {editingNote ? (
                <textarea
                  autoFocus
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="Why does this piece move you?"
                  rows={3}
                  maxLength={280}
                  className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
                />
              ) : pin.notes ? (
                <p className="font-serif text-sm italic leading-relaxed text-foreground">
                  "{pin.notes}"
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Add a note so future-you remembers the spark.
                </p>
              )}
            </div>

            <div className="mt-2 flex flex-col gap-2">
              {product ? (
                <button
                  onClick={handleAddToCart}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-2 rounded-full gradient-gold px-5 py-3 text-sm font-semibold text-primary-foreground shadow-gold transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ShoppingBag className="h-4 w-4" /> Add to Bag</>}
                </button>
              ) : (
                <p className="rounded-xl bg-secondary/50 p-3 text-center text-xs text-muted-foreground">
                  Original product unavailable — pure inspiration ✨
                </p>
              )}

              <button
                onClick={() =>
                  onAddToBoard({
                    name: pin.product_name,
                    image: pin.product_image,
                    url: pin.product_url || pin.id,
                  })
                }
                className="flex items-center justify-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:border-foreground/40"
              >
                <Bookmark className="h-4 w-4 text-primary" /> Save to another board
              </button>
            </div>
          </div>
        </div>

        {/* Related (More like this) */}
        {related.length > 0 && (
          <div className="border-t border-border p-6 md:p-8">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">More like this</p>
            <h3 className="mt-1 font-serif text-xl font-bold text-foreground">You might also love</h3>
            <div className="mt-4 columns-2 gap-3 sm:columns-3 lg:columns-4 [&>*]:mb-3">
              {related.map((p) => {
                const img = p.node.images.edges[0]?.node?.url;
                return (
                  <button
                    key={p.node.id}
                    onClick={() =>
                      onAddToBoard({
                        name: p.node.vendor ? `${p.node.vendor} • ${p.node.title}` : p.node.title,
                        image: img || null,
                        url: p.node.id,
                      })
                    }
                    className="group block w-full break-inside-avoid overflow-hidden rounded-xl border border-border bg-card text-left transition-all hover:-translate-y-0.5 hover:shadow-elevated"
                  >
                    {img && <img src={img} alt={p.node.title} loading="lazy" className="w-full object-cover" />}
                    <div className="p-2.5">
                      <p className="line-clamp-1 text-xs font-medium text-foreground">{p.node.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatMoney(p.node.priceRange.minVariantPrice.amount, p.node.priceRange.minVariantPrice.currencyCode)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PinDetailDialog;
