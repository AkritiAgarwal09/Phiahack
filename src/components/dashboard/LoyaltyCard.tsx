import { Crown, TrendingUp, Wallet } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { getNextTierInfo } from "@/services/pointsService";

const tierLabels: Record<string, string> = {
  explorer: "Explorer",
  insider: "Insider",
  elite: "Elite",
  circle_black: "Circle Black",
};

const LoyaltyCard = () => {
  const { data: profile } = useProfile();
  const lifetime = (profile as any)?.lifetime_points ?? profile?.points ?? 0;
  const available = profile?.points ?? 0;
  const tier = profile?.tier || "explorer";
  const info = getNextTierInfo(lifetime);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/20 p-6 gradient-card shadow-gold">
      <div className="pointer-events-none absolute inset-0 animate-shimmer" />

      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Lifetime points earned</p>
            <h2 className="mt-1 font-serif text-4xl font-bold text-gold">
              {lifetime.toLocaleString()}
            </h2>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-background/40 px-2.5 py-1 text-[11px] text-muted-foreground">
              <Wallet className="h-3 w-3 text-primary" />
              <span className="text-foreground font-medium">{available.toLocaleString()}</span>
              <span>available to spend</span>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5">
            <Crown className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-primary">{tierLabels[tier] || tier}</span>
          </div>
        </div>

        {info.nextTier ? (
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress to {tierLabels[info.nextTier]}</span>
              <span className="text-gold-light">{info.pointsToNext.toLocaleString()} pts to go</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full gradient-gold transition-all duration-700"
                style={{ width: `${info.progress}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="mt-6 text-sm text-primary">🎉 You've reached the highest tier!</p>
        )}

        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <TrendingUp className="h-4 w-4 text-green-400" />
          <span>Your tier is based on lifetime points — redeeming won't change it.</span>
        </div>
      </div>
    </div>
  );
};

export default LoyaltyCard;
