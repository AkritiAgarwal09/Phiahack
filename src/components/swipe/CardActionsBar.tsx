import { Heart, LayoutGrid, Sparkles, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onWishlist?: () => void;
  onAddToBoard?: () => void;
  onWhy?: () => void;
  onSimilar?: () => void;
  className?: string;
}

const actionBtn =
  "flex flex-1 items-center justify-center gap-1 rounded-full border border-border bg-card/80 px-2 py-1.5 text-[11px] font-semibold text-foreground backdrop-blur transition-colors hover:border-primary/40 hover:bg-secondary";

const CardActionsBar = ({ onWishlist, onAddToBoard, onWhy, onSimilar, className }: Props) => {
  return (
    <div className={cn("mt-3 flex items-center gap-2", className)}>
      {onWishlist && (
        <button onClick={onWishlist} className={actionBtn} aria-label="Save to wishlist">
          <Heart className="h-3.5 w-3.5" /> Save
        </button>
      )}
      {onAddToBoard && (
        <button onClick={onAddToBoard} className={actionBtn} aria-label="Add to mood board">
          <LayoutGrid className="h-3.5 w-3.5" /> Pin
        </button>
      )}
      {onWhy && (
        <button onClick={onWhy} className={actionBtn} aria-label="Why was this recommended?">
          <Sparkles className="h-3.5 w-3.5" /> Why?
        </button>
      )}
      {onSimilar && (
        <button onClick={onSimilar} className={actionBtn} aria-label="Show similar styles">
          <Search className="h-3.5 w-3.5" /> Similar
        </button>
      )}
    </div>
  );
};

export default CardActionsBar;
