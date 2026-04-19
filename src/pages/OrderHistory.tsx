import { useEffect, useState } from "react";
import { Loader2, ShoppingBag, RefreshCcw, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { listMyOrders, reorder, type OrderWithItems } from "@/services/orderService";
import { useCartStore } from "@/stores/cartStore";
import { formatMoney } from "@/lib/shopify";

const OrderHistory = () => {
  const setCartOpen = useCartStore((s) => s.setOpen);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reordering, setReordering] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await listMyOrders();
        if (!cancelled) setOrders(list);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleReorder = async (o: OrderWithItems) => {
    setReordering(o.order.id);
    try {
      const res = await reorder(o.items);
      if (res.added.length && res.unavailable.length) {
        toast.success(
          `Added ${res.added.length} of ${res.added.length + res.unavailable.length} items — ${res.unavailable.length} no longer available.`
        );
      } else if (res.added.length) {
        toast.success(`Added ${res.added.length} item${res.added.length !== 1 ? "s" : ""} to your bag.`);
      } else {
        toast.error("None of these items are available anymore.");
      }
      if (res.added.length) setCartOpen(true);
    } catch (e) {
      toast.error("Couldn't reorder");
    } finally {
      setReordering(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold text-foreground sm:text-4xl">
          Order History
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every order you've placed. Reorder favorites in one tap.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center">
          <ShoppingBag className="h-10 w-10 text-muted-foreground" />
          <h2 className="font-serif text-xl text-foreground">No orders yet</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            When you check out, your orders will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(({ order, items }) => {
            const date = new Date(order.created_at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            });
            const totalQty = items.reduce((s, i) => s + i.quantity, 0);
            const isOpen = expanded === order.id;
            const orderShort = `PHC-${order.id.slice(-6).toUpperCase()}`;

            return (
              <div
                key={order.id}
                className="overflow-hidden rounded-2xl border border-border bg-card"
              >
                <button
                  onClick={() => setExpanded(isOpen ? null : order.id)}
                  className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-secondary/40 sm:px-5"
                >
                  <div className="flex -space-x-2">
                    {items.slice(0, 3).map((i) => (
                      <div
                        key={i.id}
                        className="h-10 w-10 overflow-hidden rounded-full border-2 border-card bg-secondary/40"
                      >
                        {i.product_image && (
                          <img src={i.product_image} alt="" className="h-full w-full object-cover" />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{orderShort}</p>
                    <p className="text-xs text-muted-foreground">
                      {date} · {items.length} product{items.length !== 1 ? "s" : ""} · {totalQty} item
                      {totalQty !== 1 ? "s" : ""}
                      {order.shared_cart_id && (
                        <>
                          {" "}· <span className="text-primary">from a shared cart</span>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-serif text-base font-semibold text-foreground">
                      {formatMoney(order.total, order.currency)}
                    </p>
                  </div>
                  <ChevronRight
                    className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                      isOpen ? "rotate-90" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="border-t border-border bg-secondary/20 px-4 py-3 sm:px-5">
                    <ul className="space-y-2">
                      {items.map((it) => (
                        <li key={it.id} className="flex items-center gap-3">
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-secondary/40">
                            {it.product_image && (
                              <img
                                src={it.product_image}
                                alt={it.product_title}
                                className="h-full w-full object-cover"
                              />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-1 text-sm font-medium text-foreground">
                              {it.product_title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Qty {it.quantity}
                              {it.selected_options?.length > 0 && (
                                <> · {it.selected_options.map((o) => o.value).join(" / ")}</>
                              )}
                            </p>
                          </div>
                          <p className="text-sm font-semibold text-foreground">
                            {formatMoney(it.unit_price * it.quantity, it.currency)}
                          </p>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
                      <p className="text-xs text-muted-foreground">
                        Subtotal {formatMoney(order.subtotal, order.currency)}
                        {order.discount > 0 && (
                          <> · Discount -{formatMoney(order.discount, order.currency)}</>
                        )}
                      </p>
                      <button
                        onClick={() => handleReorder({ order, items })}
                        disabled={reordering === order.id}
                        className="flex items-center gap-1.5 rounded-full gradient-gold px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-gold disabled:opacity-60"
                      >
                        {reordering === order.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCcw className="h-3.5 w-3.5" />
                        )}
                        Reorder
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrderHistory;
