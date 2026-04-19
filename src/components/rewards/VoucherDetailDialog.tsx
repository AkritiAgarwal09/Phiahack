import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Lock, Sparkles, Check, Loader2, ShieldCheck } from "lucide-react";
import { rewardLabel, redeemVoucher, type Voucher } from "@/services/voucherService";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  voucher: Voucher | null;
  available: number;
  onRedeemed: () => void;
}

const tierLabels: Record<string, string> = {
  explorer: "Explorer",
  insider: "Insider",
  elite: "Elite",
  circle_black: "Circle Black",
};

const VoucherDetailDialog = ({ open, onOpenChange, voucher, available, onRedeemed }: Props) => {
  const [loading, setLoading] = useState(false);

  const eligibility = useMemo(() => {
    if (!voucher) return { canAfford: false, missing: 0 };
    const canAfford = available >= voucher.cost_points;
    return { canAfford, missing: Math.max(0, voucher.cost_points - available) };
  }, [voucher, available]);

  if (!voucher) return null;

  const handleRedeem = async () => {
    if (!eligibility.canAfford) return;
    setLoading(true);
    try {
      await redeemVoucher(voucher);
      toast.success("Voucher added to your wallet");
      onRedeemed();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Couldn't redeem voucher");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">{voucher.title}</DialogTitle>
        </DialogHeader>

        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-transparent p-5">
          <div className="flex items-center justify-between">
            <span className="text-4xl">{voucher.icon || "🎁"}</span>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Reward</p>
              <p className="font-serif text-lg font-semibold text-foreground">{rewardLabel(voucher)}</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-foreground/80">{voucher.description}</p>
        </div>

        <div className="space-y-2 rounded-xl border border-border bg-secondary/30 p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Cost</span>
            <span className="font-semibold text-foreground">{voucher.cost_points.toLocaleString()} pts</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Your available balance</span>
            <span className="font-semibold text-foreground">{available.toLocaleString()} pts</span>
          </div>
          {voucher.min_subtotal > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Min. cart subtotal</span>
              <span className="font-semibold text-foreground">${voucher.min_subtotal}</span>
            </div>
          )}
          {voucher.required_tier && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Required tier</span>
              <span className="font-semibold text-foreground">{tierLabels[voucher.required_tier]}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Expires</span>
            <span className="font-semibold text-foreground">90 days after redemption</span>
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-200/90">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
          <p>Redeeming spends your <span className="font-semibold">available balance only</span>. Your tier stays the same.</p>
        </div>

        {!eligibility.canAfford ? (
          <button
            disabled
            className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-secondary px-5 py-3 text-sm font-semibold text-muted-foreground"
          >
            <Lock className="h-4 w-4" />
            Earn {eligibility.missing.toLocaleString()} more pts to unlock
          </button>
        ) : (
          <button
            onClick={handleRedeem}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-full gradient-gold px-5 py-3 text-sm font-semibold text-primary-foreground shadow-gold transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Redeem for {voucher.cost_points.toLocaleString()} pts
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default VoucherDetailDialog;
