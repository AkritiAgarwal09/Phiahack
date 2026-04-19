import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bot, Send, User, Sparkles, ImagePlus, X, Plus, MessageSquare, Trash2, PanelLeft, Flame } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import HotOrNotMode from "@/components/concierge/HotOrNotMode";
import MemoryChips from "@/components/concierge/MemoryChips";
import MiniProductCard from "@/components/concierge/MiniProductCard";
import SmartActions from "@/components/concierge/SmartActions";
import { parseMessage, getOutfitTotal, type CardSection } from "@/lib/conciergeCards";
import { useConciergeMemory, memoryForPrompt } from "@/stores/conciergeMemory";
import { useConciergeBridge } from "@/stores/conciergeBridge";
import { formatMoney } from "@/lib/shopify";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useRecentlyViewed } from "@/stores/recentlyViewedStore";
import {
  loadMyEngagements,
  loadTrending,
  logEngagement,
} from "@/services/engagementService";
import { listUpcomingEvents } from "@/services/upcomingEventsService";
import { buildConciergeNudges } from "@/lib/predictiveNudges";
import {
  listConversations,
  createConversation,
  loadMessages,
  appendMessage,
  updateMessageContent,
  deleteConversation,
  deriveTitle,
  renameConversation,
  type ConciergeConvo,
} from "@/services/conciergeService";

type Msg = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  imageDataUrl?: string;
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-concierge`;

const suggestions = [
  "Clean girl summer outfits under $200",
  "Build me 3 outfits under $300 for a Europe trip",
  "Find me a dress for a beach wedding",
  "What's trending in accessories?",
];

const AIConcierge = () => {
  const { user } = useAuth();
  const recentIds = useRecentlyViewed((s) => s.ids);
  const consumeBridge = useConciergeBridge((s) => s.consume);
  const pendingPrompt = useConciergeBridge((s) => s.pendingPrompt);
  const [conversations, setConversations] = useState<ConciergeConvo[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hotOrNotOpen, setHotOrNotOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const memory = useConciergeMemory();
  const localConvoIds = useRef<Set<string>>(new Set());

  // Predictive nudges data
  const { data: nudgeEng = [] } = useQuery({
    queryKey: ["concierge_nudge_eng", user?.id],
    queryFn: () => loadMyEngagements(120),
    enabled: !!user,
  });
  const { data: nudgeTrending = [] } = useQuery({
    queryKey: ["concierge_nudge_trending"],
    queryFn: () => loadTrending(7, 24),
  });
  const { data: nudgeEvents = [] } = useQuery({
    queryKey: ["concierge_nudge_events", user?.id],
    queryFn: listUpcomingEvents,
    enabled: !!user,
  });
  const { data: nudgeProfile } = useQuery({
    queryKey: ["concierge_nudge_profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("birthday")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });
  const { data: nudgeWishlist = [] } = useQuery({
    queryKey: ["concierge_nudge_wish", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("wishlists")
        .select("product_url, product_name")
        .eq("user_id", user.id);
      return data || [];
    },
    enabled: !!user,
  });

  const proactiveNudges = useMemo(
    () =>
      buildConciergeNudges({
        engagements: nudgeEng,
        trending: nudgeTrending,
        events: nudgeEvents,
        birthday: nudgeProfile?.birthday,
        wishlist: nudgeWishlist,
        recentlyViewedIds: recentIds,
      }),
    [nudgeEng, nudgeTrending, nudgeEvents, nudgeProfile?.birthday, nudgeWishlist, recentIds]
  );

  // Load conversation list
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        setHistoryLoading(true);
        const list = await listConversations();
        setConversations(list);
      } catch (e) {
        console.error("Failed to load conversations", e);
      } finally {
        setHistoryLoading(false);
      }
    })();
  }, [user]);

  // Load messages for the active conversation (only when switching to one
  // that wasn't just created in this session).
  useEffect(() => {
    if (!activeConvoId) {
      setMessages([]);
      return;
    }
    if (localConvoIds.current.has(activeConvoId)) {
      // Already have authoritative local state — skip refetch.
      return;
    }
    (async () => {
      try {
        const rows = await loadMessages(activeConvoId);
        setMessages(
          rows.map((r) => ({
            id: r.id,
            role: r.role,
            content: r.content,
            imageDataUrl: r.image_url || undefined,
          }))
        );
      } catch (e) {
        console.error(e);
        toast.error("Couldn't load conversation");
      }
    })();
  }, [activeConvoId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Consume cross-page pending prompt (e.g. from Discover "Style this with Phia")
  useEffect(() => {
    if (!user || !pendingPrompt) return;
    const consumed = consumeBridge();
    if (consumed?.prompt) {
      setTimeout(() => send(consumed.prompt), 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, pendingPrompt]);

  const handleFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image too large (max 5MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPendingImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const startNewChat = () => {
    setActiveConvoId(null);
    setMessages([]);
    setInput("");
    setPendingImage(null);
  };

  const handleDeleteConvo = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this chat? This can't be undone.")) return;
    try {
      await deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConvoId === id) startNewChat();
    } catch {
      toast.error("Couldn't delete chat");
    }
  };

  const send = async (text: string, imageOverride?: string | null) => {
    const image = imageOverride !== undefined ? imageOverride : pendingImage;
    const trimmed = text.trim();
    if ((!trimmed && !image) || isLoading || !user) return;

    const userMsg: Msg = {
      role: "user",
      content: trimmed || (image ? "Find styles like this." : ""),
      imageDataUrl: image || undefined,
    };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setPendingImage(null);
    setIsLoading(true);

    // Ensure we have a conversation
    let convoId = activeConvoId;
    try {
      if (!convoId) {
        const convo = await createConversation(user.id, deriveTitle(userMsg.content));
        convoId = convo.id;
        // Mark BEFORE setting active id so the load-effect skips the refetch.
        localConvoIds.current.add(convo.id);
        setActiveConvoId(convo.id);
        setConversations((prev) => [convo, ...prev]);
      } else if (messages.length === 0) {
        // First message of a previously empty convo — set its title
        const newTitle = deriveTitle(userMsg.content);
        await renameConversation(convoId, newTitle).catch(() => {});
        setConversations((prev) =>
          prev.map((c) => (c.id === convoId ? { ...c, title: newTitle } : c))
        );
      }
      // Persist user message
      await appendMessage(convoId, "user", userMsg.content, userMsg.imageDataUrl || null);
    } catch (e) {
      console.error("Persist user message failed", e);
    }

    // Log a concierge_query engagement so the predictive engine learns from chat intent
    void logEngagement(null, "concierge_query", {
      id: `concierge:${convoId || "new"}:${Date.now()}`,
      title: userMsg.content.slice(0, 120),
      category: "concierge",
      tags: [],
    });

    let assistantSoFar = "";
    let assistantMsgId: string | null = null;

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
          memory: memoryForPrompt(memory),
          imageDataUrl: image || undefined,
        }),
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: "Failed" }));
        throw new Error(err.error || "AI unavailable");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
                  );
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (e: any) {
      const errorText = `Sorry, I'm having trouble right now. ${e.message}`;
      assistantSoFar = errorText;
      setMessages((prev) => [...prev, { role: "assistant", content: errorText }]);
    } finally {
      setIsLoading(false);
      // Persist final assistant message
      if (convoId && assistantSoFar) {
        try {
          const saved = await appendMessage(convoId, "assistant", assistantSoFar, null);
          assistantMsgId = saved.id;
          // Bump conversation in list
          setConversations((prev) => {
            const cur = prev.find((c) => c.id === convoId);
            if (!cur) return prev;
            const updated = { ...cur, updated_at: new Date().toISOString() };
            return [updated, ...prev.filter((c) => c.id !== convoId)];
          });
        } catch (e) {
          console.error("Persist assistant message failed", e);
        }
      }
    }
  };

  return (
    <div className="flex h-full bg-background">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-60" : "w-0"
        } hidden shrink-0 overflow-hidden border-r border-border bg-sidebar transition-[width] duration-200 md:block`}
      >
        <div className="flex h-full w-60 flex-col">
          <div className="flex items-center justify-between p-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Chats
            </span>
            <button
              onClick={startNewChat}
              className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/20"
            >
              <Plus className="h-3 w-3" /> New
            </button>
          </div>
          <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
            {historyLoading ? (
              <p className="px-2 py-1 text-xs text-muted-foreground">Loading…</p>
            ) : conversations.length === 0 ? (
              <p className="px-2 py-1 text-xs text-muted-foreground">No chats yet</p>
            ) : (
              conversations.map((c) => {
                const isActive = c.id === activeConvoId;
                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveConvoId(c.id)}
                    className={`group flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-secondary"
                    }`}
                  >
                    <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                    <span className="line-clamp-1 flex-1">{c.title || "New chat"}</span>
                    <button
                      onClick={(e) => handleDeleteConvo(c.id, e)}
                      className="opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                      aria-label="Delete chat"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </aside>

      {/* Main chat area */}
      <div className="flex h-full min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3 sm:px-6 sm:py-4">
          <button
            onClick={() => setSidebarOpen((s) => !s)}
            className="hidden h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground md:flex"
            title={sidebarOpen ? "Hide chats" : "Show chats"}
            aria-label="Toggle chats sidebar"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
          <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-gold">
            <Bot className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-serif text-lg font-semibold text-foreground">Phia AI Concierge</h2>
            <p className="truncate text-xs text-muted-foreground">Your personal fashion assistant</p>
          </div>
          <button
            onClick={startNewChat}
            className="flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary md:hidden"
          >
            <Plus className="h-3 w-3" /> New
          </button>
        </div>

        <MemoryChips />

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Sparkles className="mb-4 h-10 w-10 text-primary" />
              <h3 className="font-serif text-xl font-semibold text-foreground">Hi! I'm Phia ✨</h3>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                Describe your vibe, upload an inspiration photo, or ask me to build a full outfit.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-xs text-foreground transition-colors hover:border-primary/20 hover:bg-primary/5"
                  >
                    {s}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setHotOrNotOpen(true)}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-accent px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-md transition-transform hover:scale-105"
              >
                <Flame className="h-4 w-4" />
                Try "Hot or Not for Me"
              </button>

              <div className="mt-8 w-full max-w-md space-y-2">
                {proactiveNudges.map((t) => (
                  <button
                    key={t.text}
                    onClick={() => send(t.prompt)}
                    className="flex w-full items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-left text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:bg-secondary"
                  >
                    <span className="text-base">{t.icon}</span>
                    <span className="flex-1">{t.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <MessageBubble key={msg.id || i} msg={msg} />
          ))}

          {isLoading && messages[messages.length - 1]?.role !== "assistant" && <TypingIndicator />}
        </div>

        {/* Input bar */}
        <div className="border-t border-border bg-background p-3 sm:p-4">
          {pendingImage && (
            <div className="mb-2 flex items-center gap-2 rounded-xl border border-border bg-secondary/40 p-2">
              <img src={pendingImage} alt="upload" className="h-12 w-12 rounded-lg object-cover" />
              <span className="text-xs text-muted-foreground">Image attached</span>
              <button
                onClick={() => setPendingImage(null)}
                className="ml-auto rounded-full p-1 text-muted-foreground hover:bg-background hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary text-foreground hover:bg-secondary/80"
              aria-label="Upload image"
            >
              <ImagePlus className="h-4 w-4" />
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe your vibe, paste a link, or upload a photo..."
              className="flex-1 rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={(!input.trim() && !pendingImage) || isLoading}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity hover:bg-primary/90 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Hot or Not for Me — inline mini swipe session */}
      <HotOrNotMode
        open={hotOrNotOpen}
        onClose={() => setHotOrNotOpen(false)}
        onInsight={async (text) => {
          // Show in chat immediately
          setMessages((prev) => [...prev, { role: "assistant", content: text }]);
          // Ensure a conversation exists, then persist
          try {
            let convoId = activeConvoId;
            if (!convoId && user) {
              const convo = await createConversation(user.id, "Hot or Not session");
              convoId = convo.id;
              localConvoIds.current.add(convo.id);
              setActiveConvoId(convo.id);
              setConversations((prev) => [convo, ...prev]);
            }
            if (convoId) {
              await appendMessage(convoId, "assistant", text, null);
              setConversations((prev) => {
                const cur = prev.find((c) => c.id === convoId);
                if (!cur) return prev;
                const updated = { ...cur, updated_at: new Date().toISOString() };
                return [updated, ...prev.filter((c) => c.id !== convoId)];
              });
            }
          } catch (e) {
            console.warn("Persist Hot-or-Not insight failed", e);
          }
        }}
      />
    </div>
  );
};

const TypingIndicator = () => (
  <div className="flex gap-3">
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
      <Bot className="h-4 w-4 text-primary" />
    </div>
    <div className="rounded-2xl bg-secondary px-4 py-3">
      <div className="flex gap-1">
        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "0ms" }} />
        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "150ms" }} />
        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  </div>
);

const MessageBubble = ({ msg }: { msg: Msg }) => {
  const isUser = msg.role === "user";
  const parsed = isUser ? { text: msg.content, cards: null } : parseMessage(msg.content);

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : ""}`}>
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Bot className="h-4 w-4 text-primary" />
        </div>
      )}
      <div className={`flex max-w-[88%] flex-col gap-3 ${isUser ? "items-end" : "items-start"}`}>
        {(parsed.text || msg.imageDataUrl) && (
          <div
            className={`rounded-2xl px-4 py-3 text-sm ${
              isUser ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
            }`}
          >
            {msg.imageDataUrl && (
              <img
                src={msg.imageDataUrl}
                alt="upload"
                className="mb-2 max-h-48 rounded-lg object-cover"
              />
            )}
            {!isUser ? (
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown>{parsed.text}</ReactMarkdown>
              </div>
            ) : (
              parsed.text
            )}
          </div>
        )}

        {!isUser && parsed.cards && parsed.cards.length > 0 && (
          <div className="w-full space-y-4">
            {parsed.cards.map((section, idx) => (
              <SectionRow key={idx} section={section} index={idx} />
            ))}
            <SmartActions sections={parsed.cards} />
          </div>
        )}
      </div>
      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
          <User className="h-4 w-4 text-foreground" />
        </div>
      )}
    </div>
  );
};

const SectionRow = ({ section, index }: { section: CardSection; index: number }) => {
  const isOutfit = section.kind === "outfit";
  const total = isOutfit ? getOutfitTotal([section], 0) : null;

  return (
    <div className="rounded-2xl border border-border bg-card/50 p-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <h4 className="font-serif text-sm font-semibold text-foreground">{section.title}</h4>
        {total !== null && (
          <span className="text-xs font-medium text-primary">
            Total {formatMoney(total.toFixed(2))}
          </span>
        )}
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:thin]">
        {section.items.map((it, i) => (
          <MiniProductCard
            key={`${it.id}-${i}`}
            productId={it.id}
            note={it.note}
            role={it.role}
          />
        ))}
      </div>
    </div>
  );
};

export default AIConcierge;
