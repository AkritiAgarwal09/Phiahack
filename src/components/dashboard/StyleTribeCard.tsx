import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { loadMyEngagements } from "@/services/engagementService";
import { inferTribeFromEngagements, TRIBE_META } from "@/lib/predictiveEngine";

interface Props {
  onOpenDiscover: () => void;
}

/**
 * 'You're aligning with [Tribe]' summary card — only renders when we have
 * enough signal (>= ~25% share) to feel confident.
 */
const StyleTribeCard = ({ onOpenDiscover }: Props) => {
  const { user } = useAuth();
  const { data: engagements = [] } = useQuery({
    queryKey: ["tribe_card_eng", user?.id],
    queryFn: () => loadMyEngagements(150),
    enabled: !!user,
  });

  const alignment = useMemo(() => {
    if (engagements.length < 4) return null;
    const a = inferTribeFromEngagements(engagements);
    if (a.share < 0.25) return null;
    return a;
  }, [engagements]);

  if (!alignment) return null;

  const meta = TRIBE_META[alignment.tribe];
  const sharePct = Math.round(alignment.share * 100);

  return (
    <section className="px-4 sm:px-6 md:px-10">
      <div className="mx-auto max-w-7xl">
        <button
          onClick={onOpenDiscover}
          className="group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border border-border bg-card p-5 text-left transition-all hover:border-primary/40 hover:shadow-[0_10px_40px_-12px_hsl(var(--primary)/0.3)] sm:gap-6 sm:p-6"
        >
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-primary/5 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-3xl sm:h-16 sm:w-16">
            {meta.emoji}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
              Your style tribe
            </p>
            <h3 className="mt-1 font-serif text-lg font-semibold text-foreground sm:text-xl">
              You're aligning with {meta.label}
            </h3>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground sm:text-sm">
              {meta.description} · {sharePct}% of your recent saves match.
            </p>
          </div>

          <div className="hidden shrink-0 items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-xs font-semibold text-primary transition-colors group-hover:bg-primary/10 sm:flex">
            See tribe picks
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 text-primary sm:hidden" />
        </button>
      </div>
    </section>
  );
};

export default StyleTribeCard;
