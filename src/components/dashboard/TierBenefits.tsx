import { Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

const tiers = [
  {
    name: "Explorer",
    points: "0",
    color: "tier-explorer",
    active: true,
    benefits: ["Save items", "Basic alerts", "Community access"],
  },
  {
    name: "Insider",
    points: "5,000",
    color: "tier-insider",
    active: true,
    current: true,
    benefits: ["Early sale access", "Cart sharing", "Mood boards"],
  },
  {
    name: "Elite",
    points: "20,000",
    color: "tier-elite",
    active: false,
    benefits: ["Flash sales", "Exclusive drops", "Priority support"],
  },
  {
    name: "Circle Black",
    points: "50,000",
    color: "tier-black",
    active: false,
    benefits: ["AI Concierge", "Brand events", "Personal stylist"],
  },
];

const TierBenefits = () => {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h3 className="font-serif text-lg font-semibold text-foreground">Tier Benefits</h3>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className={cn(
              "rounded-xl border p-4 transition-all",
              tier.current
                ? "border-primary/30 bg-primary/5"
                : "border-border bg-secondary/30"
            )}
          >
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "text-sm font-semibold",
                  tier.current ? "text-primary" : tier.active ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {tier.name}
              </span>
              {tier.current && (
                <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
                  CURRENT
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{tier.points} pts</p>
            <ul className="mt-3 space-y-1.5">
              {tier.benefits.map((b) => (
                <li key={b} className="flex items-center gap-1.5 text-xs">
                  {tier.active ? (
                    <Check className="h-3 w-3 text-green-400" />
                  ) : (
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  )}
                  <span className={tier.active ? "text-foreground" : "text-muted-foreground"}>
                    {b}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TierBenefits;
