import { Flame, Clock, ArrowRight } from "lucide-react";

const sales = [
  { brand: "ZARA", discount: "40%", endsIn: "2h 15m", tier: "Insider+" },
  { brand: "COS", discount: "30%", endsIn: "5h 42m", tier: "All Tiers" },
  { brand: "ARKET", discount: "50%", endsIn: "45m", tier: "Elite+" },
];

const FlashSalesPreview = () => {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-400" />
          <h3 className="font-serif text-lg font-semibold text-foreground">Flash Sales</h3>
        </div>
        <button className="flex items-center gap-1 text-sm text-primary hover:text-gold-light transition-colors">
          View all <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {sales.map((sale) => (
          <div
            key={sale.brand}
            className="flex items-center justify-between rounded-xl border border-border bg-secondary/30 p-4 transition-colors hover:border-primary/20"
          >
            <div>
              <h4 className="font-semibold text-foreground">{sale.brand}</h4>
              <p className="mt-0.5 text-xs text-muted-foreground">{sale.tier}</p>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-primary">{sale.discount}</span>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {sale.endsIn}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FlashSalesPreview;
