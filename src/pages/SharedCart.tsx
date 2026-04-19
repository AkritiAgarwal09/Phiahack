import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, ShoppingBag, Sparkles, ArrowLeft, ShoppingCart, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { getSharedCart, recordSharedCartView, type SharedCartFull, type SharedCartItemRecord } from "@/services/sharedCartService";
import { useCartStore, type CartItem } from "@/stores/cartStore";
import { useAuth } from "@/contexts/AuthContext";
import { localProducts } from "@/data/shopProducts";
import { formatMoney } from "@/lib/shopify";
import OrderConfirmDialog from "@/components/shop/OrderConfirmDialog";

function itemToCartItem(it: SharedCartItemRecord): CartItem {
  // Try to find the original product for full metadata; fall back to a stub.
  const found = localProducts.find((p) => p.node.id === it.product_id);
  const product =
    found ??
    ({
      node: {
        id: it.product_id,
        handle: it.product_id,
        title: it.product_title,
        description: "",
        vendor: it.vendor || "",
        productType: "",
        tags: [],
        priceRange: { minVariantPrice: { amount: it.unit_price.toFixed(2), currencyCode: it.currency } },
        images: it.product_image
          ? { edges: [{ node: { url: it.product_image, altText: it.product_title } }] }
          : { edges: [] },
        variants: { edges: [] },
        options: [],
      },
    } as CartItem["product"]);

  return {
    lineId: it.variant_id,
    product,
    variantId: it.variant_id,
    variantTitle: it.variant_title || "Default",
    price: { amount: it.unit_price.toFixed(2), currencyCode: it.currency },
    quantity: it.quantity,
    selectedOptions: it.selected_options || [],
  };
}

const SharedCartPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const addItem = useCartStore((s) => s.addItem);
  const placeOrder = useCartStore((s) => s.placeOrder);

  const [data, setData] = useState<SharedCartFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [buying, setBuying] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
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
      navigate(`/auth?redirect=/shared-cart/${id}`, { replace: true });
      return;
    }
    if (!id) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await getSharedCart(id);
        if (cancelled) return;
        if (!res) {
          setNotFound(true);
          return;
        }
        setData(res);
        // Auto-track in inbox (fire and forget)
        recordSharedCartView(id).catch(() => {});
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
        <h1 className="font-serif text-2xl text-foreground">Shared cart not found</h1>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          This link may have expired or been removed by the sharer.
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

  if (data.cart.revoked_at) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
        <AlertCircle className="mb-3 h-10 w-10 text-destructive" />
        <h1 className="font-serif text-2xl text-foreground">This shared cart is no longer available</h1>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          The sharer revoked this link. Ask them to send a new one.
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

  const sharerName = data.sharer?.display_name || "Someone in the Circle";
  const sharedDate = new Date(data.cart.created_at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const items = data.items;
  const currency = items[0]?.currency || "USD";
  const subtotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);

  const handleAddOne = async (it: SharedCartItemRecord) => {
    await addItem({
      product: itemToCartItem(it).product,
      variantId: it.variant_id,
      variantTitle: it.variant_title || "Default",
      price: { amount: it.unit_price.toFixed(2), currencyCode: it.currency },
      quantity: it.quantity,
      selectedOptions: it.selected_options || [],
    });
    toast.success(`Added ${it.product_title} to your bag`);
  };

  const handleAddAll = async () => {
    for (const it of items) await handleAddOne(it);
    toast.success("All items added to your bag");
  };

  const handleBuyAll = async () => {
    if (!items.length) return;
    setBuying(true);
    try {
      const cartItems = items.map(itemToCartItem);
      const subtotalNum = +cartItems.reduce((s, i) => s + parseFloat(i.price.amount) * i.quantity, 0).toFixed(2);
      const total = subtotalNum;
      const result = await placeOrder({
        items: cartItems,
        subtotal: subtotalNum,
        discount: 0,
        total,
        currency,
        sharedCartId: data.cart.id,
      });
      setSnapshot({ items: cartItems, subtotal: subtotalNum, discount: 0, total, currency });
      setConfirmOpen(true);
      if (result.pointsAwardedToSharer > 0) {
        toast.success(`${sharerName} earned ${result.pointsAwardedToSharer} points 🎉`);
      }
    } catch (e) {
      console.error(e);
      toast.error("Couldn't place order");
    } finally {
      setBuying(false);
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
        <h1 className="font-serif text-lg font-bold text-foreground">Shared Cart</h1>
        <div className="w-16" />
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-10">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full gradient-gold text-base font-bold text-primary-foreground">
              {sharerName[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Shared by
              </p>
              <p className="font-serif text-xl font-semibold text-foreground">
                {sharerName}
              </p>
              <p className="text-xs text-muted-foreground">{sharedDate}</p>
            </div>
          </div>

          {data.cart.title && (
            <h2 className="mt-5 font-serif text-2xl text-foreground">{data.cart.title}</h2>
          )}
          {data.cart.message && (
            <p className="mt-1 text-sm italic text-muted-foreground">"{data.cart.message}"</p>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p className="text-sm text-muted-foreground">
              {items.length} product{items.length !== 1 ? "s" : ""} · {totalQty} item
              {totalQty !== 1 ? "s" : ""} ·{" "}
              <span className="font-semibold text-foreground">
                {formatMoney(subtotal, currency)}
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleAddAll}
                disabled={!items.length}
                className="flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:border-foreground/40 disabled:opacity-50"
              >
                <ShoppingCart className="h-3.5 w-3.5" /> Add all to my cart
              </button>
              <button
                onClick={handleBuyAll}
                disabled={buying || !items.length}
                className="flex items-center gap-1.5 rounded-full gradient-gold px-4 py-2 text-xs font-semibold text-primary-foreground shadow-gold disabled:opacity-60"
              >
                {buying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Buy entire cart
              </button>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="mt-6 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-10 text-center">
              <ShoppingBag className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No items in this shared cart.</p>
            </div>
          ) : (
            items.map((it) => (
              <div
                key={it.id}
                className="flex gap-4 rounded-xl border border-border bg-card p-3 sm:p-4"
              >
                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-secondary/40">
                  {it.product_image && (
                    <img
                      src={it.product_image}
                      alt={it.product_title}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  {it.vendor && (
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      {it.vendor}
                    </p>
                  )}
                  <h3 className="line-clamp-2 font-serif text-base font-semibold text-foreground">
                    {it.product_title}
                  </h3>
                  {it.selected_options?.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {it.selected_options.map((o) => `${o.name}: ${o.value}`).join(" · ")}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">Qty {it.quantity}</p>
                  <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                    <p className="font-serif text-base font-semibold text-foreground">
                      {formatMoney(it.unit_price * it.quantity, it.currency)}
                    </p>
                    <button
                      onClick={() => handleAddOne(it)}
                      className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary"
                    >
                      Add to my cart
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <OrderConfirmDialog open={confirmOpen} onOpenChange={setConfirmOpen} order={snapshot} />
    </div>
  );
};

export default SharedCartPage;
