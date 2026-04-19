import { Share2, Heart, Zap, Gift } from "lucide-react";
import { earnPoints, PointAction } from "@/services/pointsService";
import { toast } from "sonner";
import { useState } from "react";

const actions: { icon: typeof Share2; label: string; desc: string; color: string; action: PointAction }[] = [
  { icon: Share2, label: "Share Cart", desc: "Earn 50 pts", color: "text-blue-400", action: "share_cart" },
  { icon: Heart, label: "Save Item", desc: "Earn 10 pts", color: "text-red-400", action: "save_item" },
  { icon: Zap, label: "Daily Check-in", desc: "Earn 5 pts", color: "text-primary", action: "daily_checkin" },
  { icon: Gift, label: "Refer Friend", desc: "Earn 500 pts", color: "text-green-400", action: "refer_friend" },
];

const QuickActions = () => {
  const [loading, setLoading] = useState<string | null>(null);

  const handleAction = async (action: PointAction, label: string) => {
    if (loading) return;
    setLoading(label);
    try {
      const result = await earnPoints(action);
      toast.success(`+${result.pointsEarned} pts! Available: ${result.availablePoints}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to earn points");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="grid grid-cols-4 gap-3">
      {actions.map((action) => {
        const Icon = action.icon;
        const isLoading = loading === action.label;
        return (
          <button
            key={action.label}
            onClick={() => handleAction(action.action, action.label)}
            disabled={isLoading}
            className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/20 hover:shadow-gold disabled:opacity-50"
          >
            <Icon className={`h-5 w-5 ${isLoading ? "animate-spin" : ""} ${action.color}`} />
            <span className="text-xs font-medium text-foreground">{action.label}</span>
            <span className="text-[10px] text-muted-foreground">{action.desc}</span>
          </button>
        );
      })}
    </div>
  );
};

export default QuickActions;
