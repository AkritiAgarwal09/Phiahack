import { supabase } from "@/integrations/supabase/client";

export async function getOrCreateInviteCode(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Check for an existing pending referral code for this user
  const { data: existing } = await supabase
    .from("referrals")
    .select("invite_code")
    .eq("referrer_id", user.id)
    .eq("status", "pending")
    .limit(1)
    .maybeSingle();

  if (existing?.invite_code) return existing.invite_code;

  // Generate a new code
  const code = generateCode();
  const { error } = await supabase.from("referrals").insert({
    referrer_id: user.id,
    invite_code: code,
    status: "pending",
  });
  if (error) throw error;
  return code;
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export function buildInviteUrl(code: string): string {
  return `${window.location.origin}/auth?ref=${code}`;
}

export async function getReferralStats(userId: string) {
  const { data, error } = await supabase
    .from("referrals")
    .select("*")
    .eq("referrer_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const completed = (data || []).filter((r) => r.status === "completed");
  return {
    referrals: data || [],
    totalCompleted: completed.length,
    totalPointsEarned: completed.reduce((sum, r) => sum + (r.points_awarded || 0), 0),
  };
}
