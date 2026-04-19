import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, Eye, ImageOff, Loader2, Quote, ShoppingBag, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { getSharedMoodBoard, type SharedMoodBoardFull } from "@/services/moodBoardService";
import { localProducts } from "@/data/shopProducts";
import { useCartStore, type CartItem } from "@/stores/cartStore";
import { formatMoney } from "@/lib/shopify";
import OrderConfirmDialog from "@/components/shop/OrderConfirmDialog";
import { getBoardViewCount, recordBoardView } from "@/services/publicMoodBoardsService";

const SharedMoodBoard = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const addItem = useCartStore((s) => s.addItem);
  const placeOrder = useCartStore((s) => s.placeOrder);
  const pinRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [data, setData] = useState<SharedMoodBoardFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [viewCount, setViewCount] = useState<number>(0);
  const [snapshot, setSnapshot] = useState<{
    items: CartItem[];
    subtotal: number;
    discount: number;
    total: number;
    currency: string;
  } | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate(`/auth?redirect=/mood-board/${id}`, { replace: true });
      return;
    }
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await getSharedMoodBoard(id);
        if (cancelled) return;
        if (!res) {
          setNotFound(true);
          return;
        }
        setData(res);
        // Record view + load count (only meaningful for public boards or non-owners)
        if (res.board.is_public && res.board.user_id !== user.id) {
          await recordBoardView(res.board.id);
        }
        const count = await getBoardViewCount(res.board.id);
        if (!cancelled) setViewCount(count);
      } catch (e) {
        console.error(e);
        setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, user, authLoading, navigate]);

  // Deep-link to a specific pin via #pin-<id>
  useEffect(() => {
    if (!data || !location.hash) return;
    const m = location.hash.match(/^#pin-(.+)$/);
    if (!m) return;
    const pinId = m[1];
    // Wait one frame for DOM to render
    const t = window.setTimeout(() => {
      const el = pinRefs.current[pinId];
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-primary", "ring-offset-2", "ring-offset-background");
        window.setTimeout(() => {
          el.classList.remove("ring-2", "ring-primary", "ring-offset-2", "ring-offset-background");
        }, 2400);
      }
    }, 80);
    return () => window.clearTimeout(t);
  }, [data, location.hash]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
        <AlertCircle className="mb-3 h-10 w-10 text-muted-foreground" />
        <h1 className="font-serif text-2xl text-foreground">Mood board not found</h1>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          This link may have been removed or set to private.
        </p>
        <button
          onClick={() => navigate("/")}
          className="mt-5 rounded-full gradient-gold px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-gold"
        >
          Go home
        </button>
      </div>
    );
  }

  if (!data.board.is_public && data.board.user_id !== user!.id) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
        <AlertCircle className="mb-3 h-10 w-10 text-destructive" />
        <h1 className="font-serif text-2xl text-foreground">This mood board is private</h1>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Ask the creator to share it again.
        </p>
        <button
          onClick={() => navigate("/")}
          className="mt-5 rounded-full gradient-gold px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-gold"
        >
          Go home
        </button>
      </div>
    );
  }

  const creatorName = data.creator?.display_name || "Someone in the Circle";
  const initials = creatorName[0]?.toUpperCase() || "P";
  const created = new Date(data.board.created_at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const findProduct = (productId: string | null) =>
    productId ? localProducts.find((p) => p.node.id === productId) : null;

  const itemToCartItem = (item: SharedMoodBoardFull["items"][0]): CartItem | null => {
    const product = findProduct(item.product_url);
    if (!product) return null;
    const variant = product.node.variants?.edges?.[0]?.node;
    if (!variant) return null;
    return {
      lineId: variant.id,
      product,
      variantId: variant.id,
      variantTitle: variant.title,
      price: variant.price,
      quantity: 1,
      selectedOptions: variant.selectedOptions || [],
    };
  };

  const handleAddOne = async (item: SharedMoodBoardFull["items"][0]) => {
    const ci = itemToCartItem(item);
    if (!ci) {
      toast.error("This item isn't shoppable right now");
      return;
    }
    await addItem({
      product: ci.product,
      variantId: ci.variantId,
      variantTitle: ci.variantTitle,
      price: ci.price,
      quantity: ci.quantity,
      selectedOptions: ci.selectedOptions,
    });
    toast.success(`Added ${ci.product.node.title} to your bag`);
  };

  const handleBuyOne = async (item: SharedMoodBoardFull["items"][0]) => {
    const ci = itemToCartItem(item);
    if (!ci) {
      toast.error("This item isn't shoppable right now");
      return;
    }
    setBuying(item.id);
    try {
      const subtotal = +(parseFloat(ci.price.amount) * ci.quantity).toFixed(2);
      const result = await placeOrder({
        items: [ci],
        subtotal,
        discount: 0,
        total: subtotal,
        currency: ci.price.currencyCode,
        sharedMoodBoardId: data.board.id,
      });
      setSnapshot({
        items: [ci],
        subtotal,
        discount: 0,
        total: subtotal,
        currency: ci.price.currencyCode,
      });
      setConfirmOpen(true);
      if (result.pointsAwardedToBoardCreator > 0) {
        toast.success(`${creatorName} earned ${result.pointsAwardedToBoardCreator} points 🎉`);
      }
    } catch (e) {
      console.error(e);
      toast.error("Couldn't place order");
    } finally {
      setBuying(null);
    }
  };

  const shoppableItems = data.items.filter((i) => findProduct(i.product_url));

  const handleBuyAll = async () => {
    if (!shoppableItems.length) return;
    setBuying("all");
    try {
      const cartItems = shoppableItems
        .map(itemToCartItem)
        .filter((x): x is CartItem => !!x);
      const subtotal = +cartItems
        .reduce((s, i) => s + parseFloat(i.price.amount) * i.quantity, 0)
        .toFixed(2);
      const currency = cartItems[0]?.price.currencyCode || "USD";
      const result = await placeOrder({
        items: cartItems,
        subtotal,
        discount: 0,
        total: subtotal,
        currency,
        sharedMoodBoardId: data.board.id,
      });
      setSnapshot({ items: cartItems, subtotal, discount: 0, total: subtotal, currency });
      setConfirmOpen(true);
      if (result.pointsAwardedToBoardCreator > 0) {
        toast.success(`${creatorName} earned ${result.pointsAwardedToBoardCreator} points 🎉`);
      }
    } catch (e) {
      console.error(e);
      toast.error("Couldn't place order");
    } finally {
      setBuying(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur-xl sm:px-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <h1 className="font-serif text-lg font-bold text-foreground">Shared Mood Board</h1>
        <div className="w-16" />
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-10">
        {/* Header card */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="relative bg-gradient-to-br from-primary/10 via-card to-card px-5 py-6 sm:px-8 sm:py-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full gradient-gold text-base font-bold text-primary-foreground">
                {data.creator?.avatar_url ? (
                  <img
                    src={data.creator.avatar_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  Curated by
                </p>
                <p className="font-serif text-xl font-semibold text-foreground">
                  {creatorName}
                </p>
                <p className="text-xs text-muted-foreground">{created}</p>
              </div>
            </div>

            <h2 className="mt-5 font-serif text-3xl font-bold text-foreground sm:text-4xl">
              {data.board.name}
            </h2>
            {data.board.description && (
              <p className="mt-2 text-sm italic text-muted-foreground">
                "{data.board.description}"
              </p>
            )}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  {data.items.length} pin{data.items.length !== 1 ? "s" : ""} ·{" "}
                  <span className="font-semibold text-foreground">
                    {shoppableItems.length} shoppable
                  </span>
                </p>
                {data.board.is_public && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/60 px-2.5 py-0.5 text-[11px] font-medium text-foreground">
                    <Eye className="h-3 w-3" /> {viewCount} view{viewCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              {shoppableItems.length > 0 && (
                <button
                  onClick={handleBuyAll}
                  disabled={buying === "all"}
                  className="flex items-center gap-1.5 rounded-full gradient-gold px-4 py-2 text-xs font-semibold text-primary-foreground shadow-gold disabled:opacity-60"
                >
                  {buying === "all" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  Shop entire board
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Pins */}
        {data.items.length === 0 ? (
          <div className="mt-6 flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-10 text-center">
            <ShoppingBag className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No pins on this board yet.</p>
          </div>
        ) : (
          <div className="mt-6 columns-2 gap-3 sm:columns-3 lg:columns-4 [&>*]:mb-3">
            {data.items.map((item) => {
              const product = findProduct(item.product_url);
              const price = product?.node.priceRange.minVariantPrice;
              return (
                <div
                  key={item.id}
                  id={`pin-${item.id}`}
                  ref={(el) => {
                    pinRefs.current[item.id] = el;
                  }}
                  className="group relative break-inside-avoid overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-elevated"
                >
                  {item.product_image ? (
                    <img
                      src={item.product_image}
                      alt={item.product_name}
                      loading="lazy"
                      className="w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-square items-center justify-center bg-secondary text-muted-foreground">
                      <ImageOff className="h-6 w-6" />
                    </div>
                  )}
                  <div className="space-y-2 p-3">
                    <p className="line-clamp-2 font-serif text-sm font-semibold text-foreground">
                      {item.product_name}
                    </p>
                    {price && (
                      <p className="text-xs font-medium text-primary">
                        {formatMoney(price.amount, price.currencyCode)}
                      </p>
                    )}
                    {item.notes && (
                      <div className="rounded-lg border-l-2 border-primary/60 bg-primary/5 px-2.5 py-1.5">
                        <Quote className="mb-0.5 h-3 w-3 text-primary/70" />
                        <p className="font-serif text-xs italic leading-snug text-foreground">
                          {item.notes}
                        </p>
                      </div>
                    )}
                    {product ? (
                      <div className="flex gap-1.5 pt-1">
                        <button
                          onClick={() => handleAddOne(item)}
                          className="flex-1 rounded-full border border-border bg-background/40 px-2.5 py-1.5 text-[11px] font-semibold text-foreground hover:border-primary"
                        >
                          Add to bag
                        </button>
                        <button
                          onClick={() => handleBuyOne(item)}
                          disabled={buying === item.id}
                          className="flex-1 rounded-full gradient-gold px-2.5 py-1.5 text-[11px] font-semibold text-primary-foreground shadow-gold disabled:opacity-60"
                        >
                          {buying === item.id ? (
                            <Loader2 className="mx-auto h-3 w-3 animate-spin" />
                          ) : (
                            "Shop"
                          )}
                        </button>
                      </div>
                    ) : (
                      <p className="pt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                        Inspiration only
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <OrderConfirmDialog open={confirmOpen} onOpenChange={setConfirmOpen} order={snapshot} />
    </div>
  );
};

export default SharedMoodBoard;
