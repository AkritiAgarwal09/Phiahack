import { useQuery } from "@tanstack/react-query";
import { Users, Heart } from "lucide-react";
import { loadClusterTrending } from "@/services/swipeService";
import { cn } from "@/lib/utils";

interface Props {
  variant?: "light" | "dark";
  maxItems?: number;
}

const ClusterTrendingRail = ({ variant = "light", maxItems = 12 }: Props) => {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["cluster_trending", maxItems],
    queryFn: () => loadClusterTrending(maxItems),
  });

  if (isLoading) return null;
  if (!items.length) return null;

  const isDark = variant === "dark";

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p
            className={cn(
              "text-[10px] font-semibold uppercase tracking-[0.18em]",
              isDark ? "text-amber-200/80" : "text-primary"
            )}
          >
            <Users className="mr-1 inline h-3 w-3" /> Style cluster signal
          </p>
          <h2
            className={cn(
              "mt-1 font-serif text-xl sm:text-2xl",
              isDark ? "text-white" : "text-foreground"
            )}
          >
            Users with your taste are loving these
          </h2>
        </div>
      </div>
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-3 pb-2 sm:grid sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-6">
          {items.map((it) => (
            <div
              key={it.target_id}
              className={cn(
                "group min-w-[160px] overflow-hidden rounded-2xl border transition-all sm:min-w-0",
                isDark
                  ? "border-white/10 bg-white/5 backdrop-blur-md hover:border-amber-200/30"
                  : "border-border bg-card hover:border-primary/40"
              )}
            >
              <div className="aspect-[3/4] overflow-hidden">
                {it.target_image ? (
                  <img
                    src={it.target_image}
                    alt={it.target_title || ""}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div
                    className={cn(
                      "h-full w-full",
                      isDark ? "bg-white/5" : "bg-secondary"
                    )}
                  />
                )}
              </div>
              <div className="space-y-1 p-3">
                <p
                  className={cn(
                    "line-clamp-1 font-serif text-sm",
                    isDark ? "text-white" : "text-foreground"
                  )}
                >
                  {it.target_title}
                </p>
                {it.vendor && (
                  <p
                    className={cn(
                      "line-clamp-1 text-[11px]",
                      isDark ? "text-white/60" : "text-muted-foreground"
                    )}
                  >
                    {it.vendor}
                  </p>
                )}
                <div
                  className={cn(
                    "flex items-center justify-between pt-1 text-[11px]",
                    isDark ? "text-white/70" : "text-muted-foreground"
                  )}
                >
                  <span className="inline-flex items-center gap-1">
                    <Heart
                      className={cn(
                        "h-3 w-3",
                        isDark ? "text-amber-200" : "text-primary"
                      )}
                    />
                    {it.love_count}
                  </span>
                  {it.price ? <span>${Math.round(Number(it.price))}</span> : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ClusterTrendingRail;
