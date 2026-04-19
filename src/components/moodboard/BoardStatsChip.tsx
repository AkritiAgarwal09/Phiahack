import { useQuery } from "@tanstack/react-query";
import { Eye, ShoppingBag, Sparkles } from "lucide-react";
import { getBoardViewCount, getMoodBoardPurchaseStats } from "@/services/publicMoodBoardsService";

interface Props {
  boardId: string;
  isPublic: boolean;
}

/**
 * Creator-only stats badge for an owned mood board.
 * Shows: public view count (if shareable), purchase count, total points earned.
 * Renders nothing if there's no signal yet on a private board.
 */
const BoardStatsChip = ({ boardId, isPublic }: Props) => {
  const { data: stats } = useQuery({
    queryKey: ["mood_board_purchase_stats", boardId],
    queryFn: () => getMoodBoardPurchaseStats(boardId),
    staleTime: 60_000,
  });

  const { data: views = 0 } = useQuery({
    queryKey: ["mood_board_view_count", boardId],
    queryFn: () => getBoardViewCount(boardId),
    enabled: isPublic,
    staleTime: 60_000,
  });

  const purchases = stats?.purchase_count || 0;
  const points = stats?.total_points_earned || 0;
  const showViews = isPublic && views > 0;

  if (!showViews && !purchases && !points) return null;

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5">
      {showViews && (
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/70 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          <Eye className="h-2.5 w-2.5" /> {views}
        </span>
      )}
      {purchases > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
          <ShoppingBag className="h-2.5 w-2.5" /> {purchases}
        </span>
      )}
      {points > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
          <Sparkles className="h-2.5 w-2.5" /> +{points} pts
        </span>
      )}
    </div>
  );
};

export default BoardStatsChip;
