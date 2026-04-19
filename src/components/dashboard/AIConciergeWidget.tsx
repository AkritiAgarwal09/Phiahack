import { Bot, Sparkles, ArrowRight } from "lucide-react";

const suggestions = [
  "Find me a summer dress under $100",
  "What's trending in sneakers?",
  "Build an outfit for a wedding",
];

const AIConciergeWidget = () => {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-card p-6">
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/5 blur-2xl" />
      <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-primary/5 blur-2xl" />

      <div className="relative z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-gold animate-pulse-gold">
            <Bot className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-semibold text-foreground">AI Concierge</h3>
            <p className="text-xs text-muted-foreground">Your personal style assistant</p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {suggestions.map((s) => (
            <button
              key={s}
              className="flex w-full items-center gap-2 rounded-lg border border-border bg-secondary/30 px-3 py-2.5 text-left text-sm text-muted-foreground transition-all hover:border-primary/20 hover:bg-secondary hover:text-foreground"
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
              {s}
            </button>
          ))}
        </div>

        <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl gradient-gold px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90">
          Start Chat <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default AIConciergeWidget;
