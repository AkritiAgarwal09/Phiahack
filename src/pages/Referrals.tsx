import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getOrCreateInviteCode, buildInviteUrl, getReferralStats } from "@/services/referralService";
import { useToast } from "@/hooks/use-toast";
import { Copy, Share2, Users, Sparkles, Check } from "lucide-react";

const Referrals = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [code, setCode] = useState<string | null>(null);
  const [stats, setStats] = useState<{ totalCompleted: number; totalPointsEarned: number; referrals: any[] }>({
    totalCompleted: 0,
    totalPointsEarned: 0,
    referrals: [],
  });
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [c, s] = await Promise.all([getOrCreateInviteCode(), getReferralStats(user.id)]);
        setCode(c);
        setStats(s);
      } catch (e: any) {
        toast({ title: "Error", description: e.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [user, toast]);

  const inviteUrl = code ? buildInviteUrl(code) : "";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast({ title: "Copied!", description: "Invite link copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Phia Circle",
          text: "Join me on Phia Circle and unlock exclusive fashion drops!",
          url: inviteUrl,
        });
      } catch {}
    } else {
      handleCopy();
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold text-foreground sm:text-3xl">Refer Friends</h2>
        <p className="mt-1 text-sm text-muted-foreground">Earn 500 points for every friend who joins</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span className="text-xs sm:text-sm">Friends Joined</span>
          </div>
          <p className="mt-2 font-serif text-2xl font-bold text-foreground sm:text-3xl">{stats.totalCompleted}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs sm:text-sm">Points Earned</span>
          </div>
          <p className="mt-2 font-serif text-2xl font-bold text-primary sm:text-3xl">{stats.totalPointsEarned.toLocaleString()}</p>
        </div>
      </div>

      {/* Invite link */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-elevated">
        <h3 className="text-base font-semibold text-foreground sm:text-lg">Your Invite Link</h3>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">Share this link — when a friend signs up, you both win.</p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <div className="flex-1 rounded-xl border border-border bg-secondary/50 px-3 py-3 text-xs text-foreground sm:text-sm break-all">
            {inviteUrl}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-secondary px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary/70 sm:flex-none"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span className="sm:hidden">{copied ? "Copied" : "Copy"}</span>
            </button>
            <button
              onClick={handleShare}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl gradient-gold px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:flex-none"
            >
              <Share2 className="h-4 w-4" />
              <span>Share</span>
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-primary/5 p-3 text-xs text-muted-foreground">
          Code: <span className="font-mono font-semibold text-primary">{code}</span>
        </div>
      </div>

      {/* History */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h3 className="text-base font-semibold text-foreground sm:text-lg">Referral History</h3>
        {stats.referrals.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No referrals yet — share your link to get started!</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {stats.referrals.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-mono text-sm text-foreground">{r.invite_code}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${
                      r.status === "completed"
                        ? "bg-primary/10 text-primary"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {r.status === "completed" ? `+${r.points_awarded} pts` : "Pending"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Referrals;
