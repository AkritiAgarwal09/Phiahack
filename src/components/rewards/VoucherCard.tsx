import { Lock, Sparkles, Check } from "lucide-react";
import type { Voucher } from "@/services/voucherService";
import { rewardLabel } from "@/services/voucherService";
import { cn } from "@/lib/utils";

interface Props {
  voucher: Voucher;
  available: number;
  redeemed?: boolean;
  onClick: () => void;
}

const VoucherCard = ({ voucher, available, redeemed, onClick }: Props) => {
  const canAfford = available >= voucher.cost_points;

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex flex-col gap-3 overflow-hidden rounded-2xl border bg-card p-4 text-left transition-all",
        canAfford
          ? "border-border hover:border-primary/40 hover:shadow-gold"
          : "border-border opacity-70 hover:opacity-100"
      )}
    >
      {/* Decorative perforation */}
      <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[radial-gradient(circle,hsl(var(--border))_1px,transparent_1px)] [background-size:1px_8px] opacity-30" />

      <div className="flex items-start justify-between">
        <span className="text-3xl">{voucher.icon || "🎁"}</span>
        <div className="flex flex-col items-end gap-1">
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
              canAfford ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"
            )}
          >
            {voucher.cost_points.toLocaleString()} pts
          </span>
          {redeemed && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
              <Check className="h-2.5 w-2.5" /> In wallet
            </span>
          )}
        </div>
      </div>

      <div className="min-h-[60px]">
        <h4 className="font-serif text-base font-semibold text-foreground leading-tight">
          {voucher.title}
        </h4>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{voucher.description}</p>
      </div>

      <div className="flex items-center justify-between border-t border-border/50 pt-2 text-xs">
        <span className="font-semibold text-primary">{rewardLabel(voucher)}</span>
        {canAfford ? (
          <span className="flex items-center gap-1 text-foreground/80 group-hover:text-primary">
            <Sparkles className="h-3 w-3" />
            Redeem
          </span>
        ) : (
          <span className="flex items-center gap-1 text-muted-foreground">
            <Lock className="h-3 w-3" />
            {(voucher.cost_points - available).toLocaleString()} pts to go
          </span>
        )}
      </div>
    </button>
  );
};

export default VoucherCard;
