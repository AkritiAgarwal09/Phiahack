import { useEffect, useState } from "react";
import { UserPlus, UserMinus, Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { followUser, unfollowUser, isFollowing } from "@/services/socialFollowsService";

interface FollowButtonProps {
  targetUserId: string;
  targetName?: string | null;
  size?: "sm" | "md";
  className?: string;
}

const FollowButton = ({ targetUserId, targetName, size = "md", className }: FollowButtonProps) => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: following = false, isLoading } = useQuery({
    queryKey: ["is_following", user?.id, targetUserId],
    queryFn: () => isFollowing(targetUserId),
    enabled: !!user && !!targetUserId && user.id !== targetUserId,
  });

  const toggle = useMutation({
    mutationFn: async () => {
      if (following) await unfollowUser(targetUserId);
      else await followUser(targetUserId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["is_following", user?.id, targetUserId] });
      qc.invalidateQueries({ queryKey: ["follow_counts"] });
      qc.invalidateQueries({ queryKey: ["followed_activity"] });
      toast.success(following ? `Unfollowed ${targetName || "curator"}` : `Following ${targetName || "curator"} ✨`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!user || user.id === targetUserId) return null;

  const sizeCls =
    size === "sm"
      ? "h-7 px-3 text-[11px]"
      : "h-9 px-4 text-xs";

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        toggle.mutate();
      }}
      disabled={isLoading || toggle.isPending}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold transition-all disabled:opacity-50",
        following
          ? "border border-border bg-card text-foreground hover:border-destructive/40 hover:text-destructive"
          : "gradient-gold text-primary-foreground shadow-gold hover:opacity-90",
        sizeCls,
        className
      )}
    >
      {toggle.isPending ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : following ? (
        <>
          <UserMinus className="h-3 w-3" /> Following
        </>
      ) : (
        <>
          <UserPlus className="h-3 w-3" /> Follow
        </>
      )}
    </button>
  );
};

export default FollowButton;
