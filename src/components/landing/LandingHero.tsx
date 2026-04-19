import { ArrowRight, Sparkles } from "lucide-react";

interface Props {
  /** Called when the primary CTA is pressed */
  onStart?: () => void;
  /** Optional secondary CTA (e.g. open concierge) */
  onSecondary?: () => void;
  secondaryLabel?: string;
  ctaLabel?: string;
}

/**
 * Reusable luxury midnight-blue editorial hero used both on the public landing
 * route and as the in-app "Home" experience.
 */
const LandingHero = ({
  onStart,
  onSecondary,
  secondaryLabel = "Talk to Concierge",
  ctaLabel = "Let's Start Shopping",
}: Props) => {
  return (
    <div className="midnight relative min-h-[calc(100vh-72px)] overflow-hidden text-white">
      {/* Floating fashion silhouettes */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -left-20 top-24 h-[420px] w-[320px] rounded-[40%] bg-gradient-to-br from-white/10 to-transparent blur-3xl"
          style={{ animation: "drift 14s ease-in-out infinite" }}
        />
        <div
          className="absolute right-[-10%] top-10 h-[380px] w-[300px] rounded-full bg-gradient-to-br from-indigo-300/10 to-transparent blur-3xl"
          style={{ animation: "drift 18s ease-in-out infinite", animationDelay: "-3s" }}
        />
        <div
          className="absolute bottom-[-10%] left-1/3 h-[460px] w-[420px] rounded-[60%] bg-gradient-to-br from-fuchsia-300/10 to-transparent blur-3xl"
          style={{ animation: "drift 22s ease-in-out infinite", animationDelay: "-6s" }}
        />
        <div
          className="absolute right-[12%] bottom-[8%] h-[260px] w-[200px] rounded-full bg-gradient-to-br from-amber-200/10 to-transparent blur-3xl"
          style={{ animation: "drift 16s ease-in-out infinite", animationDelay: "-9s" }}
        />
      </div>

      {/* Particles */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {Array.from({ length: 28 }).map((_, i) => (
          <span
            key={i}
            className="absolute h-[3px] w-[3px] rounded-full bg-white/40"
            style={{
              top: `${(i * 37) % 100}%`,
              left: `${(i * 53) % 100}%`,
              animation: `float ${4 + (i % 5)}s ease-in-out infinite`,
              animationDelay: `${i * 0.2}s`,
              opacity: 0.2 + ((i % 4) * 0.15),
              boxShadow: "0 0 8px hsl(40 80% 80% / 0.6)",
            }}
          />
        ))}
      </div>

      {/* Hero content */}
      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-72px)] max-w-5xl flex-col items-center justify-center px-6 py-16 text-center">
        <div className="animate-fade-up mb-6 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-white/60">
          <Sparkles className="h-3 w-3" aria-hidden />
          Trusted by 1M+ smarter shoppers
          <Sparkles className="h-3 w-3" aria-hidden />
        </div>

        <h2 className="animate-fade-up-2 font-serif text-5xl font-normal leading-[1.05] tracking-tight text-white sm:text-6xl md:text-7xl lg:text-[88px]">
          Welcome to <span className="italic text-shimmer">Phia Circle</span>
        </h2>

        <p className="animate-fade-up-3 mt-6 font-serif text-xl italic text-white/80 sm:text-2xl md:text-3xl">
          find, shop, save, slay
        </p>

        <p className="animate-fade-up-4 mx-auto mt-8 max-w-2xl text-sm leading-relaxed text-white/65 sm:text-base md:text-lg">
          Your AI-powered fashion circle for discovering the best styles, smartest deals,
          and most wanted picks — all in one place.
        </p>

        <div className="animate-fade-up-5 mt-12 flex flex-col items-center gap-4 sm:flex-row">
          <button
            onClick={onStart}
            className="group inline-flex items-center gap-3 rounded-full ivory-pill px-8 py-4 text-sm font-semibold tracking-wide transition-all duration-500 hover:scale-[1.02] sm:text-base"
          >
            {ctaLabel}
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </button>
          {onSecondary && (
            <button
              onClick={onSecondary}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-4 text-sm font-medium text-white/85 backdrop-blur transition-colors hover:bg-white/10"
            >
              <Sparkles className="h-4 w-4" />
              {secondaryLabel}
            </button>
          )}
        </div>

        <div className="animate-fade-up-5 mt-10 text-[11px] uppercase tracking-[0.25em] text-white/40">
          AI Stylist · Luxury Concierge · Smart Deals
        </div>
      </section>
    </div>
  );
};

export default LandingHero;
