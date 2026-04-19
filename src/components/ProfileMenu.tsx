import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Crown, Gift, LogOut, Mail, Cake, Receipt, Settings, Sparkles, Trophy, Wand2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface ProfileMenuProps {
  onTabChange: (tab: string) => void;
}

const TIER_LABEL: Record<string, string> = {
  explorer: "Explorer",
  insider: "Insider",
  elite: "Elite",
  circle_black: "Circle Black",
};

const formatBirthday = (value?: string | null) => {
  if (!value) return null;
  try {
    const d = new Date(value);
    return d.toLocaleDateString(undefined, { month: "long", day: "numeric" });
  } catch {
    return value;
  }
};

const ProfileMenu = ({ onTabChange }: ProfileMenuProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ["profile-menu", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, tier, points, birthday")
        .eq("user_id", user.id)
        .maybeSingle();
      return data as
        | {
            display_name: string | null;
            avatar_url: string | null;
            tier: string;
            points: number;
            birthday: string | null;
          }
        | null;
    },
    enabled: !!user,
  });

  const initial =
    profile?.display_name?.[0]?.toUpperCase() ||
    user?.email?.[0]?.toUpperCase() ||
    "P";
  const tierLabel = TIER_LABEL[profile?.tier ?? "explorer"] ?? "Explorer";
  const birthday = formatBirthday(profile?.birthday);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Open profile menu"
          className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full gradient-gold text-sm font-bold text-primary-foreground ring-offset-background transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            initial
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-72 overflow-hidden border-border/60 bg-card/95 p-0 backdrop-blur-xl"
      >
        {/* Header */}
        <div className="relative bg-gradient-to-br from-primary/10 via-card to-card px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full gradient-gold text-base font-bold text-primary-foreground">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                initial
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-serif text-base font-semibold text-foreground">
                {profile?.display_name || user?.email?.split("@")[0] || "Member"}
              </p>
              <div className="mt-0.5 inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
                <Crown className="h-3 w-3" />
                {tierLabel}
              </div>
            </div>
          </div>

          {/* Account details */}
          <div className="mt-3 space-y-1.5 rounded-lg border border-border/40 bg-background/40 p-2.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Mail className="h-3.5 w-3.5 shrink-0 text-primary/70" />
              <span className="truncate">{user?.email}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Cake className="h-3.5 w-3.5 shrink-0 text-primary/70" />
              <span>{birthday || "Add your birthday"}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary/70" />
              <span>
                <span className="text-foreground font-medium">{(profile?.points ?? 0).toLocaleString()}</span> available
                <span className="mx-1 text-border">·</span>
                {((profile as any)?.lifetime_points ?? profile?.points ?? 0).toLocaleString()} lifetime
              </span>
            </div>
          </div>

          <button
            onClick={() => navigate("/settings")}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-border/60 bg-background/40 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
          >
            <Settings className="h-3.5 w-3.5" />
            Edit Profile
          </button>
        </div>

        <DropdownMenuSeparator className="my-0" />

        {/* Actions */}
        <div className="p-1">
          <DropdownMenuItem onClick={() => onTabChange("style-profile")} className="cursor-pointer gap-2">
            <Wand2 className="h-4 w-4 text-muted-foreground" />
            Personal Style
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onTabChange("orders")} className="cursor-pointer gap-2">
            <Receipt className="h-4 w-4 text-muted-foreground" />
            Order History
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onTabChange("rewards")} className="cursor-pointer gap-2">
            <Trophy className="h-4 w-4 text-muted-foreground" />
            Rewards
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onTabChange("referrals")} className="cursor-pointer gap-2">
            <Gift className="h-4 w-4 text-muted-foreground" />
            Refer Friends
          </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator className="my-0" />

        <div className="p-1">
          <DropdownMenuItem
            onClick={() => signOut()}
            className="cursor-pointer gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProfileMenu;
