import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus, Sparkles } from "lucide-react";
import { aestheticLabel, type AestheticCluster } from "@/lib/styleProfile";
import type { SwipeEventRow } from "@/services/swipeService";

interface Props {
  swipes: SwipeEventRow[];
}

const AESTHETIC_KEYS: AestheticCluster[] = [
  "minimal",
  "streetwear",
  "romantic",
  "editorial",
  "boho",
  "athleisure",
  "preppy",
  "y2k",
];

const AESTHETIC_COLORS: Record<AestheticCluster, string> = {
  minimal: "hsl(var(--primary))",
  streetwear: "hsl(280 60% 60%)",
  romantic: "hsl(340 70% 70%)",
  editorial: "hsl(220 60% 60%)",
  boho: "hsl(30 60% 55%)",
  athleisure: "hsl(160 50% 50%)",
  preppy: "hsl(200 70% 60%)",
  y2k: "hsl(320 80% 65%)",
};

interface WeekBucket {
  weekStart: Date;
  label: string;
  totals: Record<AestheticCluster, number>;
  totalSwipes: number;
}

function weightFor(direction: SwipeEventRow["direction"]): number {
  if (direction === "up") return 3;
  if (direction === "right") return 2;
  if (direction === "tap") return 1;
  return 0; // ignore left for evolution (we want positive signal)
}

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function bucketByWeek(swipes: SwipeEventRow[], maxWeeks = 6): WeekBucket[] {
  // Build last N week buckets ending this week
  const today = new Date();
  const thisMonday = getMonday(today);
  const buckets: WeekBucket[] = [];
  for (let i = maxWeeks - 1; i >= 0; i--) {
    const weekStart = new Date(thisMonday);
    weekStart.setDate(thisMonday.getDate() - i * 7);
    const totals: Record<AestheticCluster, number> = {
      minimal: 0,
      streetwear: 0,
      romantic: 0,
      editorial: 0,
      boho: 0,
      athleisure: 0,
      preppy: 0,
      y2k: 0,
    };
    buckets.push({
      weekStart,
      label: weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      totals,
      totalSwipes: 0,
    });
  }

  for (const s of swipes) {
    const w = weightFor(s.direction);
    if (w === 0) continue;
    const created = new Date(s.created_at);
    const wkMonday = getMonday(created);
    const idx = buckets.findIndex((b) => b.weekStart.getTime() === wkMonday.getTime());
    if (idx === -1) continue;
    buckets[idx].totalSwipes += 1;
    const tags = (s.tags || []).map((t) => t.toLowerCase());
    for (const k of AESTHETIC_KEYS) {
      if (tags.includes(k)) buckets[idx].totals[k] += w;
    }
  }

  return buckets;
}

const TasteEvolution = ({ swipes }: Props) => {
  const buckets = useMemo(() => bucketByWeek(swipes, 6), [swipes]);

  const activeAesthetics = useMemo(() => {
    const sums: Record<AestheticCluster, number> = {
      minimal: 0, streetwear: 0, romantic: 0, editorial: 0,
      boho: 0, athleisure: 0, preppy: 0, y2k: 0,
    };
    buckets.forEach((b) => AESTHETIC_KEYS.forEach((k) => (sums[k] += b.totals[k])));
    return AESTHETIC_KEYS.filter((k) => sums[k] > 0).sort((a, b) => sums[b] - sums[a]).slice(0, 5);
  }, [buckets]);

  const maxValue = useMemo(() => {
    let max = 0;
    buckets.forEach((b) => activeAesthetics.forEach((k) => (max = Math.max(max, b.totals[k]))));
    return max || 1;
  }, [buckets, activeAesthetics]);

  // Compare last 2 weeks for trend
  const trends = useMemo(() => {
    const last = buckets[buckets.length - 1];
    const prev = buckets[buckets.length - 2];
    if (!last || !prev) return {} as Record<AestheticCluster, number>;
    const t: Record<string, number> = {};
    activeAesthetics.forEach((k) => {
      t[k] = last.totals[k] - prev.totals[k];
    });
    return t as Record<AestheticCluster, number>;
  }, [buckets, activeAesthetics]);

  const hasData = activeAesthetics.length > 0;

  if (!hasData) {
    return (
      <section className="rounded-2xl border border-border bg-card p-6 text-center">
        <Sparkles className="mx-auto h-6 w-6 text-primary/60" />
        <p className="mt-2 text-sm text-muted-foreground">
          Swipe more cards in Studio over the next few weeks — your taste evolution will start showing here.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
          <Sparkles className="h-3 w-3" /> Taste evolution
        </p>
        <h2 className="font-serif text-2xl text-foreground sm:text-3xl">How your style has shifted</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          The strength of each aesthetic, week by week — based on what you swipe right and super-like in Studio.
        </p>
      </header>

      {/* Stacked bar chart */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-end justify-between gap-2 sm:gap-4">
          {buckets.map((b) => {
            const totalForWeek = activeAesthetics.reduce((sum, k) => sum + b.totals[k], 0);
            const heightPct = totalForWeek === 0 ? 0 : (totalForWeek / maxValue / activeAesthetics.length) * 100;
            return (
              <div key={b.weekStart.toISOString()} className="flex flex-1 flex-col items-center gap-2">
                <div className="relative flex h-32 w-full items-end overflow-hidden rounded-md bg-secondary/40 sm:h-40">
                  {totalForWeek > 0 && (
                    <div className="flex w-full flex-col-reverse" style={{ height: `${Math.max(8, heightPct * 4)}%` }}>
                      {activeAesthetics.map((k) => {
                        const segHeight = totalForWeek === 0 ? 0 : (b.totals[k] / totalForWeek) * 100;
                        if (segHeight === 0) return null;
                        return (
                          <div
                            key={k}
                            style={{ height: `${segHeight}%`, backgroundColor: AESTHETIC_COLORS[k] }}
                            title={`${aestheticLabel(k)}: ${b.totals[k]}`}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{b.label}</p>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
          {activeAesthetics.map((k) => (
            <div
              key={k}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/40 px-2.5 py-1 text-[11px] font-medium text-foreground"
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: AESTHETIC_COLORS[k] }} />
              {aestheticLabel(k)}
            </div>
          ))}
        </div>
      </section>

      {/* Trend cards */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {activeAesthetics.map((k) => {
          const delta = trends[k] || 0;
          const TrendIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
          const trendClass =
            delta > 0
              ? "text-primary"
              : delta < 0
              ? "text-muted-foreground"
              : "text-muted-foreground";
          const trendLabel =
            delta > 0
              ? `+${delta} vs last week`
              : delta < 0
              ? `${delta} vs last week`
              : "Steady";
          return (
            <article
              key={k}
              className="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: AESTHETIC_COLORS[k] }}
                  />
                  <h3 className="mt-2 font-serif text-base text-foreground">{aestheticLabel(k)}</h3>
                </div>
                <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${trendClass}`}>
                  <TrendIcon className="h-3 w-3" />
                  {trendLabel}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {buckets.reduce((sum, b) => sum + b.totals[k], 0)} positive signals over {buckets.length} weeks
              </p>
            </article>
          );
        })}
      </section>
    </div>
  );
};

export default TasteEvolution;
