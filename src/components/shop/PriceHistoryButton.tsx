import { useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TrendingDown, TrendingUp, Minus, LineChart, Loader2, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ShopifyProduct } from "@/lib/shopify";
import {
  loadPriceHistory,
  priceVerdict,
  summarizeHistory,
  type PriceSnapshot,
  type PriceVerdict,
} from "@/services/priceAnalyticsService";

interface Props {
  product: ShopifyProduct;
  trending?: boolean;
  className?: string;
  /** "compact" = small button used inside cards. "inline" = wider pill. */
  variant?: "compact" | "inline";
}

const bandStyles: Record<PriceVerdict["band"], string> = {
  lowest: "bg-emerald-500/15 text-emerald-700 border-emerald-300/40 dark:text-emerald-300",
  great: "bg-sky-500/15 text-sky-700 border-sky-300/40 dark:text-sky-300",
  fair: "bg-amber-500/15 text-amber-800 border-amber-300/40 dark:text-amber-200",
  high: "bg-rose-500/15 text-rose-700 border-rose-300/40 dark:text-rose-300",
};

const PriceHistoryButton = ({ product, trending, className, variant = "compact" }: Props) => {
  const [open, setOpen] = useState(false);
  const [snaps, setSnaps] = useState<PriceSnapshot[] | null>(null);
  const [loading, setLoading] = useState(false);
  const verdict = priceVerdict(product);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    loadPriceHistory(product.node.id, 90)
      .then((rows) => {
        if (!cancelled) setSnaps(rows);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [open, product.node.id]);

  const stats = snaps ? summarizeHistory(snaps) : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          aria-label="View price analytics"
          className={cn(
            "relative flex shrink-0 items-center justify-center rounded-full border backdrop-blur-md transition-all hover:scale-105",
            variant === "compact" ? "h-9 w-9" : "h-9 gap-1.5 px-3",
            bandStyles[verdict.band],
            className
          )}
        >
          <LineChart className="h-4 w-4" />
          {variant === "inline" && (
            <span className="text-xs font-semibold">{verdict.label}</span>
          )}
          {trending && (
            <span
              className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-background bg-fuchsia-500 text-[8px] text-white shadow"
              aria-label="Trending"
              title="Trending"
            >
              <Flame className="h-2 w-2" />
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="z-50 w-72 border-border bg-card p-0 shadow-elevated"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header / verdict */}
        <div className="space-y-1 border-b border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                bandStyles[verdict.band]
              )}
            >
              {verdict.label}
            </span>
            <span className="font-serif text-base font-semibold text-foreground">
              ${verdict.current.toFixed(2)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{verdict.helper}</p>
        </div>

        {/* Catalog peers */}
        <div className="grid grid-cols-3 gap-2 border-b border-border px-4 py-3 text-center">
          <div>
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Lowest</p>
            <p className="mt-0.5 text-sm font-semibold text-emerald-600">
              ${verdict.peerLowest.toFixed(0)}
            </p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Avg</p>
            <p className="mt-0.5 text-sm font-semibold text-foreground">
              ${verdict.peerAverage.toFixed(0)}
            </p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Highest</p>
            <p className="mt-0.5 text-sm font-semibold text-rose-600">
              ${verdict.peerHighest.toFixed(0)}
            </p>
          </div>
        </div>

        {/* Real history */}
        <div className="px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Tracked price history
          </p>
          {loading ? (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : !stats || stats.count === 0 ? (
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              We just started tracking this. Each time it's viewed we save a snapshot — come back in a few days for live history.
            </p>
          ) : (
            <div className="mt-2 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{stats.count} snapshots</span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 font-semibold",
                    stats.trend === "down" && "text-emerald-600",
                    stats.trend === "up" && "text-rose-600",
                    stats.trend === "flat" && "text-muted-foreground"
                  )}
                >
                  {stats.trend === "down" && <><TrendingDown className="h-3 w-3" /> Trending down</>}
                  {stats.trend === "up" && <><TrendingUp className="h-3 w-3" /> Trending up</>}
                  {stats.trend === "flat" && <><Minus className="h-3 w-3" /> Stable</>}
                </span>
              </div>
              <Sparkline data={stats.recent} />
              <div className="grid grid-cols-3 gap-1 pt-1 text-center text-[10px]">
                <div>
                  <span className="block text-muted-foreground">Lo</span>
                  <span className="font-semibold text-emerald-600">${stats.lowest.toFixed(0)}</span>
                </div>
                <div>
                  <span className="block text-muted-foreground">Avg</span>
                  <span className="font-semibold text-foreground">${stats.average.toFixed(0)}</span>
                </div>
                <div>
                  <span className="block text-muted-foreground">Hi</span>
                  <span className="font-semibold text-rose-600">${stats.highest.toFixed(0)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

// Tiny dependency-free sparkline
const Sparkline = ({ data }: { data: PriceSnapshot[] }) => {
  if (data.length === 0) return null;
  const w = 240;
  const h = 50;
  const pad = 4;
  const prices = data.map((d) => d.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const points = data
    .map((d, i) => {
      const x = pad + (i / Math.max(1, data.length - 1)) * (w - pad * 2);
      const y = h - pad - ((d.price - min) / range) * (h - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <defs>
        <linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={points}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <polygon
        points={`${points} ${w - pad},${h - pad} ${pad},${h - pad}`}
        fill="url(#spark-fill)"
      />
    </svg>
  );
};

export default PriceHistoryButton;
