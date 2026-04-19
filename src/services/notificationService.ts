import { supabase } from "@/integrations/supabase/client";

export interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export async function listNotifications(limit = 30): Promise<NotificationRow[]> {
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return [];
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userRes.user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as unknown as NotificationRow[];
}

export async function markNotificationRead(id: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function markAllNotificationsRead() {
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return;
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userRes.user.id)
    .is("read_at", null);
  if (error) throw error;
}

export async function countUnread(): Promise<number> {
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return 0;
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userRes.user.id)
    .is("read_at", null);
  if (error) return 0;
  return count ?? 0;
}
