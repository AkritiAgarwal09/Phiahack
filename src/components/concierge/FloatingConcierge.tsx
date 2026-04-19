import { useEffect, useRef, useState } from "react";
import { Sparkles, X, Maximize2, Send, ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConciergeBridge } from "@/stores/conciergeBridge";

interface Props {
  /** "landing" hides the auth requirement, just routes to /app on expand */
  variant?: "landing" | "app";
  /** Called when user hits the maximize icon — typically navigate to full Concierge */
  onExpand?: () => void;
}

const QUICK_CHIPS = ["Find my vibe", "Upload a look", "Best deals today"];
const STORAGE_KEY = "phia-concierge-greeted";

const FloatingConcierge = ({ variant = "app", onExpand }: Props) => {
  const [open, setOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [input, setInput] = useState("");
  const setPending = useConciergeBridge((s) => s.setPending);
  const collapseTimer = useRef<number | null>(null);

  // Auto-expand welcome bubble once after page load
  useEffect(() => {
    const greeted = sessionStorage.getItem(STORAGE_KEY);
    if (greeted) return;
    const showTimer = window.setTimeout(() => setShowWelcome(true), 900);
    collapseTimer.current = window.setTimeout(() => {
      setShowWelcome(false);
      sessionStorage.setItem(STORAGE_KEY, "1");
    }, 4200);
    return () => {
      window.clearTimeout(showTimer);
      if (collapseTimer.current) window.clearTimeout(collapseTimer.current);
    };
  }, []);

  const handleSend = (text?: string) => {
    const value = (text ?? input).trim();
    if (!value) return;
    setPending(value);
    setInput("");
    setOpen(false);
    onExpand?.();
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 sm:bottom-8 sm:right-8">
      {/* Welcome bubble (auto) */}
      {showWelcome && !open && (
        <div className="animate-bubble-pop absolute bottom-20 right-0 w-[280px] origin-bottom-right rounded-2xl border border-white/15 bg-[hsl(230_55%_8%_/_0.92)] p-4 text-white shadow-[0_24px_60px_-12px_hsl(230_80%_5%_/_0.6)] backdrop-blur-xl">
          <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-amber-200/90">
            <Sparkles className="h-3 w-3" />
            AI Concierge
          </div>
          <p className="text-sm leading-relaxed text-white/85">
            Hi, I'm your AI concierge. I can help you find your vibe, compare styles, and shop smarter.
          </p>
          {/* tail */}
          <span className="absolute -bottom-1.5 right-7 h-3 w-3 rotate-45 border-b border-r border-white/15 bg-[hsl(230_55%_8%)]" />
        </div>
      )}

      {/* Mini panel */}
      {open && (
        <div className="animate-panel-slide-up absolute bottom-20 right-0 w-[min(360px,calc(100vw-2.5rem))] overflow-hidden rounded-2xl border border-white/15 bg-[hsl(230_55%_8%_/_0.95)] text-white shadow-[0_30px_80px_-10px_hsl(230_80%_5%_/_0.7)] backdrop-blur-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-200/30 to-fuchsia-300/20">
                <Sparkles className="h-4 w-4 text-amber-100" />
              </span>
              <div>
                <p className="font-serif text-sm italic text-white">Phia Concierge</p>
                <p className="text-[10px] uppercase tracking-wider text-white/50">Online · Ready to style</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setOpen(false);
                  onExpand?.();
                }}
                aria-label="Open full concierge"
                className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Greeting */}
          <div className="space-y-3 px-4 py-4">
            <p className="text-sm leading-relaxed text-white/85">
              Hi, I'm <span className="font-serif italic text-amber-100">Phia</span> — your AI stylist.
              Tell me a vibe, an occasion, or upload a look you love.
            </p>

            {/* Quick chips */}
            <div className="flex flex-wrap gap-2">
              {QUICK_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleSend(chip)}
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/85 transition-all hover:border-amber-200/40 hover:bg-white/10"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="border-t border-white/10 bg-black/20 px-3 py-3"
          >
            <div className="flex items-end gap-2 rounded-2xl border border-white/15 bg-white/5 p-2 focus-within:border-amber-200/40">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onExpand?.();
                }}
                aria-label="Upload image"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              >
                <ImagePlus className="h-4 w-4" />
              </button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                rows={1}
                placeholder="Describe your style, occasion, or dream look..."
                className="max-h-24 flex-1 resize-none bg-transparent px-1 py-1.5 text-sm text-white placeholder:text-white/40 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                aria-label="Send"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 text-[hsl(230_50%_12%)] transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 px-1 text-[10px] text-white/40">
              Press Enter to send · Shift+Enter for new line
            </p>
          </form>
        </div>
      )}

      {/* Floating bubble button */}
      <button
        onClick={() => {
          setShowWelcome(false);
          sessionStorage.setItem(STORAGE_KEY, "1");
          setOpen((v) => !v);
        }}
        aria-label="Open AI concierge"
        className={cn(
          "group relative flex h-14 w-14 items-center justify-center rounded-full",
          "bg-gradient-to-br from-amber-100 to-amber-200 text-[hsl(230_50%_12%)]",
          "shadow-[0_20px_50px_-10px_hsl(40_90%_60%_/_0.5),0_0_0_1px_hsl(0_0%_100%_/_0.2)_inset]",
          "transition-transform duration-300 hover:scale-105"
        )}
      >
        <span className="absolute inset-0 -z-10 animate-pulse-gold rounded-full" aria-hidden />
        <Sparkles className="h-5 w-5" />
        <span className="sr-only">Concierge</span>
        {/* Subtle online dot */}
        <span className="absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full border border-white bg-emerald-400" />
      </button>
    </div>
  );
};

export default FloatingConcierge;
