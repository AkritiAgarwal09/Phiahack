import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2 } from "lucide-react";
import { formatMoney } from "@/lib/shopify";
import type { CartItem } from "@/stores/cartStore";

interface OrderSnapshot {
  items: CartItem[];
  subtotal: number;
  discount: number;
  pointsRedeemed?: number;
  pointsDiscount?: number;
  total: number;
  currency: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: OrderSnapshot | null;
}

const OrderConfirmDialog = ({ open, onOpenChange, order }: Props) => {
  if (!order) return null;
  const orderId = `PHC-${Date.now().toString().slice(-6)}`;
  const totalItems = order.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0">
        <div className="flex flex-col items-center gap-2 border-b border-border px-6 pb-5 pt-7 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <DialogHeader className="space-y-1">
            <DialogTitle className="font-serif text-2xl">Order placed 🎉</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Order <span className="font-semibold text-foreground">{orderId}</span> ·{" "}
            {totalItems} item{totalItems !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="max-h-72 overflow-y-auto px-6 py-4">
          <ul className="space-y-3">
            {order.items.map((item) => (
              <li key={item.variantId} className="flex items-center gap-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-secondary/40">
                  {item.product.node.images.edges[0]?.node && (
                    <img
                      src={item.product.node.images.edges[0].node.url}
                      alt={item.product.node.title}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-medium text-foreground">
                    {item.product.node.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Qty {item.quantity}
                    {item.selectedOptions.length > 0 && (
                      <> · {item.selectedOptions.map((o) => o.value).join(" / ")}</>
                    )}
                  </p>
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {formatMoney(
                    parseFloat(item.price.amount) * item.quantity,
                    item.price.currencyCode
                  )}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2 border-t border-border bg-secondary/30 px-6 py-4 text-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>{formatMoney(order.subtotal, order.currency)}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex items-center justify-between text-primary">
              <span>Discount</span>
              <span>-{formatMoney(order.discount, order.currency)}</span>
            </div>
          )}
          {(order.pointsRedeemed ?? 0) > 0 && (
            <div className="flex items-center justify-between text-primary">
              <span>{order.pointsRedeemed!.toLocaleString()} pts redeemed</span>
              <span>-{formatMoney(order.pointsDiscount || 0, order.currency)}</span>
            </div>
          )}
          <div className="flex items-center justify-between pt-1">
            <span className="text-foreground">Total paid</span>
            <span className="font-serif text-lg font-semibold text-foreground">
              {formatMoney(order.total, order.currency)}
            </span>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="mt-3 w-full rounded-full gradient-gold px-5 py-3 text-sm font-semibold text-primary-foreground shadow-gold transition-opacity hover:opacity-90"
          >
            Continue shopping
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderConfirmDialog;
