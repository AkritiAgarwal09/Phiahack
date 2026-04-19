import { supabase } from "@/integrations/supabase/client";

const SEEDED_KEY = "phia.notifications.seeded.v1";

interface SeedNotification {
  type: string;
  title: string;
  body: string;
  link: string | null;
  offsetMs: number; // how long ago (so they appear in a natural order)
}

const SEEDS: SeedNotification[] = [
  {
    type: "welcome",
    title: "Welcome to Phia Circle ✨",
    body: "Your AI stylist is ready. Take the style quiz to unlock personalized picks.",
    link: "/app?tab=studio",
    offsetMs: 0,
  },
  {
    type: "tip",
    title: "Tip · Build your first Mood Board",
    body: "Save looks you love and your concierge will learn your taste in real time.",
    link: "/app?tab=boards",
    offsetMs: 1000 * 60 * 8, // 8 min ago
  },
  {
    type: "rewards",
    title: "You're an Explorer — earn 100 pts to reach Insider",
    body: "Every share, swipe and purchase moves you up. Spending points won't drop your tier.",
    link: "/app?tab=rewards",
    offsetMs: 1000 * 60 * 60, // 1 hour ago
  },
  {
    type: "update",
    title: "New: Hot or Not for Me 🔥",
    body: "Quick swipe sessions inside the AI Concierge sharpen your style profile in 30 seconds.",
    link: "/app?tab=concierge",
    offsetMs: 1000 * 60 * 60 * 6, // 6 hours ago
  },
  {
    type: "drop",
    title: "Flash sales just dropped",
    body: "Curated price drops on pieces that match your taste. Ends in 24h.",
    link: "/app?tab=flash-sales",
    offsetMs: 1000 * 60 * 60 * 20, // 20 hours ago
  },
];

/**
 * Seeds a small set of welcome / update notifications the first time a user
 * lands in the app. Idempotent — uses both a localStorage flag and a
 * server-side check (existing welcome notification) so we don't double up.
 */
export async function seedWelcomeNotificationsIfNeeded(userId: string) {
  try {
    const flagKey = `${SEEDED_KEY}.${userId}`;
    if (typeof window !== "undefined" && window.localStorage.getItem(flagKey)) {
      return;
    }

    // Server-side guard: if a welcome notification already exists, skip.
    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", userId)
      .eq("type", "welcome")
      .limit(1);

    if (existing && existing.length > 0) {
      if (typeof window !== "undefined") window.localStorage.setItem(flagKey, "1");
      return;
    }

    const now = Date.now();
    const rows = SEEDS.map((s) => ({
      user_id: userId,
      type: s.type,
      title: s.title,
      body: s.body,
      link: s.link,
      created_at: new Date(now - s.offsetMs).toISOString(),
    }));

    const { error } = await supabase.from("notifications").insert(rows);
    if (error) {
      console.warn("Failed to seed notifications", error);
      return;
    }
    if (typeof window !== "undefined") window.localStorage.setItem(flagKey, "1");
  } catch (e) {
    console.warn("seedWelcomeNotifications error", e);
  }
}
