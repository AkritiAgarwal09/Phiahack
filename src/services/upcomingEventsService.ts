import { supabase } from "@/integrations/supabase/client";

export type EventType = "trip" | "wedding" | "party" | "work" | "birthday" | "other";

export interface UpcomingEvent {
  id: string;
  user_id: string;
  title: string;
  event_type: EventType;
  event_date: string; // ISO date
  location: string | null;
  vibe: string | null;
  budget_hint: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export async function listUpcomingEvents(): Promise<UpcomingEvent[]> {
  const { data, error } = await supabase
    .from("upcoming_events")
    .select("*")
    .gte("event_date", new Date().toISOString().slice(0, 10))
    .order("event_date", { ascending: true });
  if (error) throw error;
  return (data || []) as UpcomingEvent[];
}

export async function createUpcomingEvent(
  userId: string,
  payload: Omit<UpcomingEvent, "id" | "user_id" | "created_at" | "updated_at">
) {
  const { data, error } = await supabase
    .from("upcoming_events")
    .insert({ user_id: userId, ...payload })
    .select()
    .single();
  if (error) throw error;
  return data as UpcomingEvent;
}

export async function deleteUpcomingEvent(id: string) {
  const { error } = await supabase.from("upcoming_events").delete().eq("id", id);
  if (error) throw error;
}

export function daysUntil(dateStr: string): number {
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

export function eventTypeMeta(type: EventType): { label: string; emoji: string; tags: string[] } {
  switch (type) {
    case "trip":
      return { label: "Trip", emoji: "🌴", tags: ["vacation", "linen", "summer", "resort"] };
    case "wedding":
      return { label: "Wedding", emoji: "💍", tags: ["formal", "gown", "evening", "satin", "silk"] };
    case "party":
      return { label: "Party", emoji: "🥂", tags: ["going-out", "evening", "satin", "mini"] };
    case "work":
      return { label: "Work event", emoji: "💼", tags: ["tailoring", "blazer", "trousers"] };
    case "birthday":
      return { label: "Birthday", emoji: "🎂", tags: ["going-out", "satin", "evening"] };
    default:
      return { label: "Event", emoji: "✨", tags: [] };
  }
}
