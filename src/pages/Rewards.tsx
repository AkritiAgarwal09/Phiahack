import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useProfile } from "@/hooks/useProfile";
import { getNextTierInfo } from "@/services/pointsService";
import { listVouchers, listMyVouchers, type Voucher, type UserVoucher, rewardLabel } from "@/services/voucherService";
import { Trophy, Crown, Gift, Wallet, Sparkles, Info, Check, Clock, Star } from "lucide-react";
import VoucherCard from "@/components/rewards/VoucherCard";
import VoucherDetailDialog from "@/components/rewards/VoucherDetailDialog";
import { useQueryClient } from "@tanstack/react-query";

const tierLabels: Record<string, string> = {
  explorer: "Explorer",
  insider: "Insider",
  elite: "Elite",
  circle_black: "Circle Black",
};

const tierColors: Record<string, string> = {
  explorer: "text-muted-foreground",
  insider: "text-primary",
  elite: "text-accent",
  circle_black: "text-foreground",
};

const tierBenefits: Record<string, string[]> = {
  explorer: ["Public flash sales", "Save items", "Community access"],
  insider: ["Insider-only flash sales", "Cart sharing rewards", "Mood board templates"],
  elite: ["Elite flash sales (up to 50% off)", "Early feature access", "VIP event invitations"],
  circle_black: ["Personal AI stylist", "Private sales up to 70% off", "Concierge service"],
};

const tierOrder = ["explorer", "insider", "elite", "circle_black"];

const Rewards = () => {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const lifetime = (profile as any)?.lifetime_points ?? profile?.points ?? 0;
  const available = profile?.points ?? 0;
  const tier = profile?.tier || "explorer";
  const info = getNextTierInfo(lifetime);
  const userTierIdx = tierOrder.indexOf(tier);

  const { data: vouchers = [], refetch: refetchVouchers } = useQuery({
    queryKey: ["vouchers"],
    queryFn: listVouchers,
  });
  const { data: myVouchers = [], refetch: refetchWallet } = useQuery({
    queryKey: ["my_vouchers", profile?.user_id],
    queryFn: listMyVouchers,
    enabled: !!profile,
  });

  const [selected, setSelected] = useState<Voucher | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const redeemedVoucherIds = new Set(
    myVouchers.filter((uv) => uv.status === "available").map((uv) => uv.voucher_id)
  );
  const wallet = myVouchers.filter((uv) => uv.status === "available");
  const usedHistory = myVouchers.filter((uv) => uv.status !== "available").slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Trophy className="h-6 w-6 text-primary" />
        <h2 className="font-serif text-2xl font-bold text-foreground">Rewards</h2>
      </div>

      {/* Top metrics: tier + lifetime + available */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Tier card */}
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 gradient-card p-5 shadow-gold lg:col-span-1">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Current tier</p>
              <p className={`mt-1 font-serif text-3xl font-bold ${tierColors[tier]}`}>{tierLabels[tier]}</p>
            </div>
            <Crown className="h-6 w-6 text-primary" />
          </div>
          {info.nextTier ? (
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">→ {tierLabels[info.nextTier]}</span>
                <span className="text-gold-light">{info.pointsToNext.toLocaleString()} pts</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full gradient-gold transition-all duration-700" style={{ width: `${info.progress}%` }} />
              </div>
            </div>
          ) : (
            <p className="mt-5 text-sm text-primary">🎉 Highest tier reached</p>
          )}
        </div>

        {/* Lifetime card */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Lifetime earned</p>
              <p className="mt-1 font-serif text-3xl font-bold text-gold">{lifetime.toLocaleString()}</p>
              <p className="mt-1 text-xs text-muted-foreground">Determines your tier — never goes down.</p>
            </div>
            <Star className="h-5 w-5 text-primary" />
          </div>
        </div>

        {/* Available card */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Available to spend</p>
              <p className="mt-1 font-serif text-3xl font-bold text-foreground">{available.toLocaleString()}</p>
              <p className="mt-1 text-xs text-muted-foreground">≈ ${(available / 10).toFixed(2)} cart value</p>
            </div>
            <Wallet className="h-5 w-5 text-primary" />
          </div>
        </div>
      </div>

      {/* Trust banner */}
      <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
        <p className="text-sm text-foreground/90">
          Your tier is based on <span className="font-semibold text-foreground">total points earned over time</span>.
          Redeeming points <span className="font-semibold text-foreground">will not reduce your tier</span>.
        </p>
      </div>

      {/* Vouchers grid */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            <h3 className="font-serif text-lg font-semibold text-foreground">Redeem points</h3>
          </div>
          <span className="text-xs text-muted-foreground">10 pts = $1</span>
        </div>
        {vouchers.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No rewards available yet — check back soon.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {vouchers.map((v) => (
              <VoucherCard
                key={v.id}
                voucher={v}
                available={available}
                redeemed={redeemedVoucherIds.has(v.id)}
                onClick={() => {
                  setSelected(v);
                  setDetailOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* My wallet */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          <h3 className="font-serif text-lg font-semibold text-foreground">My wallet</h3>
          <span className="ml-auto text-xs text-muted-foreground">{wallet.length} active</span>
        </div>
        {wallet.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No active vouchers. Redeem one above and use it at checkout.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {wallet.map((uv) => {
              const v = uv.voucher!;
              return (
                <div
                  key={uv.id}
                  className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3"
                >
                  <span className="text-2xl">{v.icon || "🎁"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{v.title}</p>
                    <p className="text-xs text-muted-foreground">{rewardLabel(v)} · use at checkout</p>
                  </div>
                  <Sparkles className="h-4 w-4 shrink-0 text-primary" />
                </div>
              );
            })}
          </div>
        )}

        {usedHistory.length > 0 && (
          <div className="mt-5 border-t border-border pt-4">
            <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Recently used</p>
            <div className="space-y-1.5">
              {usedHistory.map((uv) => (
                <div key={uv.id} className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-emerald-400" />
                    {uv.voucher?.title || "Voucher"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {uv.used_at ? new Date(uv.used_at).toLocaleDateString() : "Expired"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tier benefits */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Crown className="h-5 w-5 text-primary" />
          <h3 className="font-serif text-lg font-semibold text-foreground">Tier benefits</h3>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {tierOrder.map((t) => {
            const idx = tierOrder.indexOf(t);
            const unlocked = idx <= userTierIdx;
            return (
              <div
                key={t}
                className={`rounded-xl border p-4 ${
                  t === tier ? "border-primary/30 bg-primary/5" : "border-border bg-secondary/30"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${tierColors[t]}`}>{tierLabels[t]}</span>
                  {t === tier && (
                    <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-medium text-primary">Current</span>
                  )}
                </div>
                <ul className="mt-3 space-y-1.5">
                  {tierBenefits[t].map((b) => (
                    <li
                      key={b}
                      className={`flex items-start gap-2 text-xs ${unlocked ? "text-foreground" : "text-muted-foreground"}`}
                    >
                      <Star className={`mt-0.5 h-3 w-3 shrink-0 ${unlocked ? "text-primary" : "text-muted-foreground/50"}`} />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      <VoucherDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        voucher={selected}
        available={available}
        onRedeemed={() => {
          refetchVouchers();
          refetchWallet();
          queryClient.invalidateQueries({ queryKey: ["profile"] });
        }}
      />
    </div>
  );
};

export default Rewards;
