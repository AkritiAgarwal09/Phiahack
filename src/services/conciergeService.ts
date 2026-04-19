import { supabase } from "@/integrations/supabase/client";

export interface ConciergeConvo {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ConciergeMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  image_url: string | null;
  created_at: string;
}

export async function listConversations() {
  const { data, error } = await supabase
    .from("concierge_conversations")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []) as ConciergeConvo[];
}

export async function createConversation(userId: string, title = "New chat") {
  const { data, error } = await supabase
    .from("concierge_conversations")
    .insert({ user_id: userId, title })
    .select()
    .single();
  if (error) throw error;
  return data as ConciergeConvo;
}

export async function renameConversation(id: string, title: string) {
  const { error } = await supabase
    .from("concierge_conversations")
    .update({ title })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteConversation(id: string) {
  const { error } = await supabase
    .from("concierge_conversations")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function loadMessages(conversationId: string) {
  const { data, error } = await supabase
    .from("concierge_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []) as ConciergeMessage[];
}

export async function appendMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string,
  imageUrl?: string | null
) {
  const { data, error } = await supabase
    .from("concierge_messages")
    .insert({
      conversation_id: conversationId,
      role,
      content,
      image_url: imageUrl || null,
    })
    .select()
    .single();
  if (error) throw error;
  // Bump conversation updated_at
  await supabase
    .from("concierge_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);
  return data as ConciergeMessage;
}

export async function updateMessageContent(messageId: string, content: string) {
  const { error } = await supabase
    .from("concierge_messages")
    .update({ content })
    .eq("id", messageId);
  if (error) throw error;
}

// Generates a short title from the first user message
export function deriveTitle(text: string): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length <= 48) return t || "New chat";
  return t.slice(0, 45).trimEnd() + "…";
}
