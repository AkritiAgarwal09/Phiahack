import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, RefreshCw, Wand2, LineChart, User } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  loadMySwipes,
  loadMyStyleProfile,
  upsertMyStyleProfile,
} from "@/services/swipeService";
import {
  deriveStyleProfile,
  aestheticLabel,
  type AestheticCluster,
} from "@/lib/styleProfile";
import OutfitBuilder from "@/components/profile/OutfitBuilder";
import TasteEvolution from "@/components/profile/TasteEvolution";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const STYLE_SUMMARY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-style-summary`;

interface Props {
  onOpenStudio?: () => void;
  onOpenConcierge?: () => void;
}

const StyleProfilePage = ({ onOpenStudio, onOpenConcierge }: Props) => {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState<"overview" | "evolution">("overview");

  const { data: swipes = [] } = useQuery({
    queryKey: ["profile_page_swipes", user?.id],
    queryFn: () => loadMySwipes(300),
    enabled: !!user,
  });

  const { data: profile, refetch: refetchProfile } = useQuery({
    queryKey: ["profile_page_profile", user?.id],
    queryFn: loadMyStyleProfile,
    enabled: !!user,
  });

  const derived = useMemo(() => deriveStyleProfile(swipes), [swipes]);

  const regenerateSummary = async () => {
    try {
      const resp = await fetch(STYLE_SUMMARY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          swipes: swipes.slice(0, 80),
          derived,
        }),
      });
      if (resp.status === 429) return toast.error("Rate limited — try again in a moment.");
      if (resp.status === 402) return toast.error("AI credits needed — check workspace settings.");
      if (!resp.ok) throw new Error("AI summary failed");
      const json = await resp.json();
      const summary = json.summary || "";
      await upsertMyStyleProfile({
        ai_summary: summary,
        top_categories: derived.topCategories,
        color_palette: derived.colorPalette,
        aesthetic_clusters: derived.aestheticClusters,
        price_tolerance: derived.priceTolerance,
        bold_minimal_score: derived.boldMinimalScore,
        casual_formal_score: derived.casualFormalScore,
        brand_affinity: derived.brandAffinity,
        total_swipes: derived.totalSwipes,
      });
      await refetchProfile();
      toast.success("Style summary refreshed ✨");
    } catch (e) {
      console.error(e);
      toast.error("Couldn't regenerate summary");
    }
  };

  const summary = profile?.ai_summary;
  const hasSwipes = derived.totalSwipes > 0;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 px-4 py-8 sm:px-6 sm:py-10">
      <header className="space-y-2">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
          <Sparkles className="h-3 w-3" /> Personal style
        </p>
        <h1 className="font-serif text-3xl text-foreground sm:text-4xl">Your Style Profile</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          A living portrait of your taste — derived from your swipes, refined every session.
        </p>
      </header>

      {/* Section tabs */}
      <div className="flex gap-2 border-b border-border">
        {([
          { id: "overview" as const, label: "Overview", icon: User },
          { id: "evolution" as const, label: "Taste Evolution", icon: LineChart },
        ]).map((t) => {
          const Icon = t.icon;
          const isActive = activeSection === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveSection(t.id)}
              className={cn(
                "relative -mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors",
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {activeSection === "evolution" ? (
        <TasteEvolution swipes={swipes} />
      ) : (
        <>

      {/* AI summary */}
      <section className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-card p-5 sm:p-6">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
            <Wand2 className="mr-1 inline h-3 w-3" /> AI stylist summary
          </p>
          <button
            onClick={regenerateSummary}
            disabled={!hasSwipes}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold text-foreground transition-colors hover:border-primary/40 disabled:opacity-40"
          >
            <RefreshCw className="h-3 w-3" /> Refresh
          </button>
        </div>
        {summary ? (
          <p className="font-serif text-lg leading-relaxed text-foreground sm:text-xl">{summary}</p>
        ) : hasSwipes ? (
          <p className="text-sm text-muted-foreground">
            Click <span className="font-semibold text-foreground">Refresh</span> to generate
            your personal stylist summary.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Swipe a few cards in Studio first, and Phia will draft your summary here.
          </p>
        )}
      </section>

      {/* Sliders */}
      <section className="grid gap-4 sm:grid-cols-2">
        <SliderCard
          label="Bold ↔ Minimal"
          left="Minimal"
          right="Bold"
          value={derived.boldMinimalScore}
        />
        <SliderCard
          label="Casual ↔ Formal"
          left="Casual"
          right="Formal"
          value={derived.casualFormalScore}
        />
      </section>

      {/* Profile grid */}
      <section className="grid gap-4 sm:grid-cols-2">
        <ChipsCard
          title="Aesthetic clusters"
          chips={derived.aestheticClusters.map((c) => aestheticLabel(c as AestheticCluster))}
          empty="Swipe more to lock in your vibe."
        />
        <ChipsCard title="Color palette" chips={derived.colorPalette} empty="No palette yet." />
        <ChipsCard title="Top categories" chips={derived.topCategories} empty="No category bias yet." />
        <ChipsCard title="Brand affinity" chips={derived.brandAffinity} empty="No brand affinity yet." />
      </section>

      {/* Autonomous outfit builder */}
      <OutfitBuilder derived={derived} />

      {/* Stats */}
      <section className="grid grid-cols-3 gap-3">
        <StatTile label="Total swipes" value={derived.totalSwipes} />
        <StatTile label="Loves & supers" value={derived.loveSwipes} />
        <StatTile
          label="Onboarding"
          value={profile?.onboarding_completed_at ? "Done" : "Pending"}
        />
      </section>

      <div className="flex flex-wrap gap-3">
        {onOpenStudio && (
          <button
            onClick={onOpenStudio}
            className="rounded-full bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
          >
            Keep swiping in Studio →
          </button>
        )}
        {onOpenConcierge && (
          <button
            onClick={onOpenConcierge}
            className="rounded-full border border-border bg-card px-5 py-2.5 text-xs font-semibold text-foreground hover:border-primary/40"
          >
            Tell Phia what to build →
          </button>
        )}
      </div>
        </>
      )}
    </div>
  );
};

const SliderCard = ({
  label,
  left,
  right,
  value,
}: {
  label: string;
  left: string;
  right: string;
  value: number;
}) => (
  <div className="rounded-2xl border border-border bg-card p-5">
    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      {label}
    </p>
    <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
      <span>{left}</span>
      <span>{right}</span>
    </div>
    <div className="relative mt-1.5 h-2 rounded-full bg-secondary">
      <div
        className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-primary shadow-md"
        style={{ left: `calc(${Math.min(100, Math.max(0, value))}% - 8px)` }}
      />
    </div>
    <p className="mt-2 text-center text-xs font-semibold text-foreground">{value}/100</p>
  </div>
);

const ChipsCard = ({
  title,
  chips,
  empty,
}: {
  title: string;
  chips: string[];
  empty: string;
}) => (
  <div className="rounded-2xl border border-border bg-card p-5">
    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      {title}
    </p>
    {chips.length === 0 ? (
      <p className="mt-2 text-xs text-muted-foreground">{empty}</p>
    ) : (
      <div className="mt-2 flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <span
            key={c}
            className="rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] font-medium text-foreground"
          >
            {c}
          </span>
        ))}
      </div>
    )}
  </div>
);

const StatTile = ({ label, value }: { label: string; value: number | string }) => (
  <div className="rounded-2xl border border-border bg-card p-4 text-center">
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="mt-1 font-serif text-xl text-foreground sm:text-2xl">{value}</p>
  </div>
);

export default StyleProfilePage;
