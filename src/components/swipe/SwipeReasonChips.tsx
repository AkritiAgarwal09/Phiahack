import { useEffect } from "react";
import { Heart, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SwipeDirection } from "@/services/swipeService";

interface Props {
  open: boolean;
  direction: SwipeDirection | null;
  onPick: (reason: string) => void;
  onSkip: () => void;
}

const LIKE_REASONS = [
  "Love the vibe",
  "Great for work",
  "Good price",
  "Want for vacation",
  "Matches my wardrobe",
];
const SUPER_REASONS = [
  "Obsessed",
  "Add to wishlist",
  "Want this exact look",
  "Statement piece",
];
const PASS_REASONS = [
  "Too expensive",
  "Wrong color",
  "Not my style",
  "Poor fit",
  "Too basic",
  "Already own similar",
];

const SwipeReasonChips = ({ open, direction, onPick, onSkip }: Props) => {
  // Auto-skip after 2.6s so the deck never stalls
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(onSkip, 2600);
    return () => clearTimeout(t);
  }, [open, onSkip]);

  if (!open || !direction) return null;

  const reasons =
    direction === "left" ? PASS_REASONS : direction === "up" ? SUPER_REASONS : LIKE_REASONS;
  const Icon = direction === "left" ? X : Heart;
  const tone =
    direction === "left"
      ? "text-destructive"
      : direction === "up"
      ? "text-primary"
      : "text-emerald-500";

  return (
    <div className="animate-fade-up mx-auto mt-4 w-full max-w-md rounded-2xl border border-border bg-card p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className={cn("flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider", tone)}>
          <Icon className="h-3.5 w-3.5" />
          {direction === "left" ? "Why pass?" : direction === "up" ? "Why obsessed?" : "Why love?"}
        </div>
        <button
          onClick={onSkip}
          className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
        >
          Skip
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {reasons.map((r) => (
          <button
            key={r}
            onClick={() => onPick(r)}
            className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SwipeReasonChips;
