import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { ShoppingBag, Minus, Plus, Trash2, Loader2, Tag, X, Share2, Sparkles, ChevronDown, ChevronUp, Wallet, Check } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { formatMoney } from "@/lib/shopify";
import OrderConfirmDialog from "@/components/shop/OrderConfirmDialog";
import ShareCartDialog from "@/components/shop/ShareCartDialog";
import { useProfile } from "@/hooks/useProfile";
import { listMyVouchers, calcVoucherDiscount, isVoucherEligible, rewardLabel } from "@/services/voucherService";
import { POINTS_PER_DOLLAR, MAX_POINTS_DISCOUNT_RATIO, pointsToDollars } from "@/services/pointsService";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export const CartDrawer = () => {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const available = profile?.points ?? 0;

  const isOpen = useCartStore((s) => s.isOpen);
  const setOpen = useCartStore((s) => s.setOpen);
  const items = useCartStore((s) => s.items);
  const selected = useCartStore((s) => s.selected);
  const isLoading = useCartStore((s) => s.isLoading);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const toggleSelected = useCartStore((s) => s.toggleSelected);
  const selectAll = useCartStore((s) => s.selectAll);
  const deselectAll = useCartStore((s) => s.deselectAll);
  const appliedDiscount = useCartStore((s) => s.appliedDiscount);
  const applyDiscount = useCartStore((s) => s.applyDiscount);
  const removeDiscount = useCartStore((s) => s.removeDiscount);
  const appliedPoints = useCartStore((s) => s.appliedPoints);
  const setAppliedPoints = useCartStore((s) => s.setAppliedPoints);
  const clearAppliedPoints = useCartStore((s) => s.clearAppliedPoints);
  const appliedVoucher = useCartStore((s) => s.appliedVoucher);
  const setAppliedVoucher = useCartStore((s) => s.setAppliedVoucher);
  const placeOrder = useCartStore((s) => s.placeOrder);

  const [discountInput, setDiscountInput] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [usePoints, setUsePoints] = useState(false);
  const [showVouchers, setShowVouchers] = useState(false);
  const [snapshot, setSnapshot] = useState<{
    items: typeof items;
    subtotal: number;
    discount: number;
    pointsRedeemed: number;
    pointsDiscount: number;
    total: number;
    currency: string;
  } | null>(null);

  // Wallet vouchers
  const { data: myVouchers = [], refetch: refetchWallet } = useQuery({
    queryKey: ["my_vouchers", profile?.user_id],
    queryFn: listMyVouchers,
    enabled: !!profile,
  });
  const walletVouchers = myVouchers.filter((uv) => uv.status === "available");

  // Selected items + base totals
  const selectedItems = items.filter((i) => selected[i.variantId]);
  const selectedCount = selectedItems.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = selectedItems.reduce(
    (sum, i) => sum + parseFloat(i.price.amount) * i.quantity,
    0
  );
  const codeDiscount = appliedDiscount
    ? +(subtotal * (appliedDiscount.percent / 100)).toFixed(2)
    : 0;
  const subAfterCode = +(subtotal - codeDiscount).toFixed(2);

  // Voucher discount
  const voucherEffect = appliedVoucher
    ? calcVoucherDiscount(appliedVoucher, subAfterCode)
    : { amount: 0, freeShipping: false };
  const voucherDiscount = voucherEffect.amount;
  const subAfterVoucher = +(subAfterCode - voucherDiscount).toFixed(2);

  // Points cap: cannot exceed available, cannot exceed MAX_POINTS_DISCOUNT_RATIO of remaining
  const maxPointsByCart = Math.floor(subAfterVoucher * POINTS_PER_DOLLAR * MAX_POINTS_DISCOUNT_RATIO);
  const maxPointsApplicable = Math.max(0, Math.min(available, maxPointsByCart));

  // Clamp applied points whenever inputs change
  useEffect(() => {
    if (!usePoints && appliedPoints !== 0) clearAppliedPoints();
    else if (usePoints && appliedPoints > maxPointsApplicable) {
      setAppliedPoints(maxPointsApplicable);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usePoints, maxPointsApplicable]);

  const pointsDiscount = pointsToDollars(appliedPoints);
  const total = +(subAfterVoucher - pointsDiscount).toFixed(2);
  const totalDiscountAmount = +(codeDiscount + voucherDiscount + pointsDiscount).toFixed(2);
  const currency = selectedItems[0]?.price.currencyCode || items[0]?.price.currencyCode || "USD";

  const allSelected = items.length > 0 && items.every((i) => selected[i.variantId]);
  const someSelected = items.some((i) => selected[i.variantId]);

  useEffect(() => {
    if (!isOpen) setDiscountInput("");
  }, [isOpen]);

  // Auto-detach voucher if it stops being eligible
  useEffect(() => {
    if (appliedVoucher && !isVoucherEligible({ min_subtotal: appliedVoucher.voucher?.min_subtotal ?? 0, reward_type: appliedVoucher.reward_type }, subAfterCode)) {
      setAppliedVoucher(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subAfterCode]);

  const handleApplyDiscount = () => {
    const res = applyDiscount(discountInput);
    if (res.ok) toast.success(res.message);
    else toast.error(res.message);
    setDiscountInput("");
  };

  const handleCheckout = async () => {
    if (selectedItems.length === 0) return;
    setPlacing(true);
    try {
      const snap = {
        items: [...selectedItems],
        subtotal: +subtotal.toFixed(2),
        discount: +(codeDiscount + voucherDiscount).toFixed(2),
        pointsRedeemed: appliedPoints,
        pointsDiscount: +pointsDiscount.toFixed(2),
        total,
        currency,
      };
      await placeOrder({
        items: snap.items,
        subtotal: snap.subtotal,
        discount: snap.discount,
        pointsRedeemed: snap.pointsRedeemed,
        pointsDiscount: snap.pointsDiscount,
        appliedVoucher,
        total: snap.total,
        currency: snap.currency,
      });
      setSnapshot(snap);
      setConfirmOpen(true);
      setOpen(false);
      // Refresh balance & wallet
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      refetchWallet();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Couldn't place order");
    } finally {
      setPlacing(false);
    }
  };

  const handleMasterToggle = (next: boolean) => {
    if (next) selectAll();
    else deselectAll();
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setOpen}>
        <SheetContent className="flex w-full flex-col sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="font-serif text-2xl">Your Bag</SheetTitle>
            <p className="text-sm text-muted-foreground">
              {items.length === 0
                ? "Your bag is empty"
                : `${items.length} product${items.length !== 1 ? "s" : ""} · ${selectedCount} selected`}
            </p>
          </SheetHeader>

          <div className="flex min-h-0 flex-1 flex-col pt-4">
            {items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center text-center">
                <ShoppingBag className="mb-3 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Nothing here yet — start shopping the edit.
                </p>
              </div>
            ) : (
              <>
                {/* Master select bar */}
                <div className="mb-2 flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={(v) => handleMasterToggle(!!v)}
                      aria-label="Select all items"
                    />
                    {allSelected ? "Deselect all" : "Select all"}
                  </label>
                  <button
                    onClick={() => setShareOpen(true)}
                    disabled={!someSelected}
                    className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary disabled:opacity-50"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    Share selected
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto pr-2">
                  <div className="space-y-3">
                    {items.map((item) => {
                      const isChecked = !!selected[item.variantId];
                      return (
                        <div
                          key={item.variantId}
                          className={`flex gap-3 rounded-xl border p-3 transition-colors ${
                            isChecked
                              ? "border-primary/50 bg-primary/5"
                              : "border-border bg-card"
                          }`}
                        >
                          <div className="flex flex-col items-center pt-1">
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => toggleSelected(item.variantId)}
                              aria-label={`Select ${item.product.node.title}`}
                            />
                          </div>
                          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-secondary/40">
                            {item.product.node.images?.edges?.[0]?.node && (
                              <img
                                src={item.product.node.images.edges[0].node.url}
                                alt={item.product.node.title}
                                className="h-full w-full object-cover"
                              />
                            )}
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col">
                            <h4 className="line-clamp-1 font-serif text-sm font-semibold text-foreground">
                              {item.product.node.title}
                            </h4>
                            {item.product.node.vendor && (
                              <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                                {item.product.node.vendor}
                              </p>
                            )}
                            {item.selectedOptions.length > 0 && (
                              <p className="text-xs text-muted-foreground">
                                {item.selectedOptions
                                  .map((o) => `${o.name}: ${o.value}`)
                                  .join(" · ")}
                              </p>
                            )}
                            <p className="mt-1 font-serif text-sm font-semibold text-foreground">
                              {formatMoney(item.price.amount, item.price.currencyCode)}
                            </p>
                            <div className="mt-auto flex items-center justify-between pt-2">
                              <div className="flex items-center gap-1 rounded-full border border-border">
                                <button
                                  onClick={() =>
                                    updateQuantity(item.variantId, item.quantity - 1)
                                  }
                                  className="flex h-7 w-7 items-center justify-center text-muted-foreground hover:text-foreground"
                                  aria-label="Decrease"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="min-w-[24px] text-center text-xs font-medium">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() =>
                                    updateQuantity(item.variantId, item.quantity + 1)
                                  }
                                  className="flex h-7 w-7 items-center justify-center text-muted-foreground hover:text-foreground"
                                  aria-label="Increase"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                              <button
                                onClick={() => removeItem(item.variantId)}
                                className="text-muted-foreground hover:text-destructive"
                                aria-label="Remove"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3 border-t border-border pt-4">
                  {/* Discount code */}
                  {appliedDiscount ? (
                    <div className="flex items-center justify-between rounded-xl border border-primary/40 bg-primary/5 px-3 py-2 text-sm">
                      <span className="flex items-center gap-2 text-foreground">
                        <Tag className="h-3.5 w-3.5 text-primary" />
                        <span className="font-semibold">{appliedDiscount.code}</span>
                        <span className="text-muted-foreground">· {appliedDiscount.percent}% off</span>
                      </span>
                      <button onClick={removeDiscount} className="text-muted-foreground hover:text-destructive" aria-label="Remove discount">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        value={discountInput}
                        onChange={(e) => setDiscountInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleApplyDiscount()}
                        placeholder="Discount code"
                        className="flex-1 rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <button
                        onClick={handleApplyDiscount}
                        className="rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:border-foreground/40"
                      >
                        Apply
                      </button>
                    </div>
                  )}

                  {/* REWARDS REDEMPTION */}
                  {someSelected && profile && (
                    <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-3 space-y-3">
                      {/* Voucher row */}
                      {appliedVoucher ? (
                        <div className="flex items-center justify-between rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm">
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="text-base">{appliedVoucher.voucher?.icon || "🎁"}</span>
                            <span className="min-w-0">
                              <span className="block truncate text-xs font-semibold text-foreground">
                                {appliedVoucher.voucher?.title}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {rewardLabel({ reward_type: appliedVoucher.reward_type, reward_value: appliedVoucher.reward_value })}
                                {voucherDiscount > 0 && ` — −${formatMoney(voucherDiscount, currency)}`}
                              </span>
                            </span>
                          </span>
                          <button onClick={() => setAppliedVoucher(null)} className="shrink-0 text-muted-foreground hover:text-destructive" aria-label="Remove voucher">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : walletVouchers.length > 0 ? (
                        <div>
                          <button
                            onClick={() => setShowVouchers((v) => !v)}
                            className="flex w-full items-center justify-between text-xs font-semibold text-foreground"
                          >
                            <span className="flex items-center gap-2">
                              <Sparkles className="h-3.5 w-3.5 text-primary" />
                              Use a voucher ({walletVouchers.length})
                            </span>
                            {showVouchers ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </button>
                          {showVouchers && (
                            <div className="mt-2 space-y-1.5">
                              {walletVouchers.map((uv) => {
                                const v = uv.voucher!;
                                const eligible = isVoucherEligible(v, subAfterCode);
                                return (
                                  <button
                                    key={uv.id}
                                    onClick={() => {
                                      if (!eligible) {
                                        toast.error(`Needs $${v.min_subtotal} minimum subtotal`);
                                        return;
                                      }
                                      setAppliedVoucher(uv);
                                      setShowVouchers(false);
                                      toast.success(`${v.title} applied`);
                                    }}
                                    className={`flex w-full items-center justify-between rounded-lg border px-2.5 py-2 text-left text-xs transition-colors ${
                                      eligible
                                        ? "border-border bg-card hover:border-primary/40"
                                        : "border-border bg-card opacity-50"
                                    }`}
                                  >
                                    <span className="flex min-w-0 items-center gap-2">
                                      <span>{v.icon || "🎁"}</span>
                                      <span className="truncate">
                                        <span className="font-semibold text-foreground">{v.title}</span>
                                        <span className="ml-1 text-muted-foreground">— {rewardLabel(v)}</span>
                                      </span>
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ) : null}

                      {/* Points redemption */}
                      <div>
                        <label className="flex cursor-pointer items-center justify-between">
                          <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <Wallet className="h-4 w-4 text-primary" />
                            Use my points
                          </span>
                          <Checkbox
                            checked={usePoints}
                            onCheckedChange={(v) => {
                              const next = !!v;
                              setUsePoints(next);
                              if (next) {
                                // Default to applying max
                                setAppliedPoints(maxPointsApplicable);
                              } else {
                                clearAppliedPoints();
                              }
                            }}
                            disabled={available <= 0 || maxPointsApplicable <= 0}
                          />
                        </label>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {available.toLocaleString()} pts available · 10 pts = $1 · max 50% of cart
                        </p>

                        {usePoints && maxPointsApplicable > 0 && (
                          <div className="mt-3 space-y-2">
                            <Slider
                              value={[appliedPoints]}
                              max={maxPointsApplicable}
                              step={10}
                              onValueChange={(vals) => setAppliedPoints(vals[0] || 0)}
                            />
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">
                                {appliedPoints.toLocaleString()} / {maxPointsApplicable.toLocaleString()} pts
                              </span>
                              <span className="font-semibold text-primary">
                                −{formatMoney(pointsDiscount, currency)}
                              </span>
                            </div>
                            {appliedPoints > 0 && (
                              <div className="flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-300">
                                <Check className="h-3 w-3" />
                                Points applied · tier unaffected
                              </div>
                            )}
                          </div>
                        )}

                        {usePoints && maxPointsApplicable <= 0 && (
                          <p className="mt-2 text-[11px] text-muted-foreground">
                            {available <= 0
                              ? "No points to redeem yet."
                              : "Add more items to unlock points redemption."}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Totals */}
                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Subtotal ({selectedCount} selected)</span>
                      <span>{formatMoney(subtotal, currency)}</span>
                    </div>
                    {appliedDiscount && (
                      <div className="flex items-center justify-between text-primary">
                        <span>Code ({appliedDiscount.percent}%)</span>
                        <span>−{formatMoney(codeDiscount, currency)}</span>
                      </div>
                    )}
                    {voucherDiscount > 0 && (
                      <div className="flex items-center justify-between text-primary">
                        <span>Voucher</span>
                        <span>−{formatMoney(voucherDiscount, currency)}</span>
                      </div>
                    )}
                    {pointsDiscount > 0 && (
                      <div className="flex items-center justify-between text-primary">
                        <span>{appliedPoints.toLocaleString()} pts</span>
                        <span>−{formatMoney(pointsDiscount, currency)}</span>
                      </div>
                    )}
                    {voucherEffect.freeShipping && (
                      <div className="flex items-center justify-between text-primary">
                        <span>Shipping</span>
                        <span>FREE</span>
                      </div>
                    )}
                    {totalDiscountAmount > 0 && (
                      <div className="flex items-center justify-between border-t border-border/40 pt-1 text-xs text-muted-foreground">
                        <span>You saved</span>
                        <span className="font-semibold text-primary">{formatMoney(totalDiscountAmount, currency)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-sm text-muted-foreground">Total</span>
                      <span className="font-serif text-xl font-semibold text-foreground">
                        {formatMoney(total, currency)}
                      </span>
                    </div>
                  </div>
                  {!someSelected && (
                    <p className="rounded-lg bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
                      Select items above to checkout. Unselected items stay in your bag.
                    </p>
                  )}
                  <button
                    onClick={handleCheckout}
                    disabled={isLoading || placing || !someSelected}
                    className="flex w-full items-center justify-center gap-2 rounded-full gradient-gold px-5 py-3 text-sm font-semibold text-primary-foreground shadow-gold transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {placing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : someSelected ? (
                      <>Checkout · {formatMoney(total, currency)}</>
                    ) : (
                      <>No items selected</>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <OrderConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        order={snapshot}
      />

      <ShareCartDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        items={selectedItems}
      />
    </>
  );
};

export default CartDrawer;
