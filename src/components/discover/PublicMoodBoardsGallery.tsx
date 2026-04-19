import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Eye, Layers, Sparkles, ImageOff, Quote, Clock, Pin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { loadPublicMoodBoards, type PublicBoardSort } from "@/services/publicMoodBoardsService";
import FollowButton from "@/components/social/FollowButton";

interface Props {
  /** "dark" = original glass-on-dark styling for the Discover page; "light" = card-themed for embedding inside Mood Boards page */
  variant?: "dark" | "light";
}

const SORT_OPTIONS: { id: PublicBoardSort; label: string; icon: typeof Eye }[] = [
  { id: "most_viewed", label: "Most viewed", icon: Eye },
  { id: "newest", label: "Newest", icon: Clock },
  { id: "most_pinned", label: "Most pinned", icon: Pin },
];

const PublicMoodBoardsGallery = ({ variant = "dark" }: Props) => {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<PublicBoardSort>("most_viewed");
  const navigate = useNavigate();

  const { data: boards = [], isLoading } = useQuery({
    queryKey: ["public_mood_boards", query, sort],
    queryFn: () => loadPublicMoodBoards(query || null, 30, sort),
  });

  const isLight = variant === "light";

  // Token-driven palette so the gallery blends with whichever surface it's on
  const t = isLight
    ? {
        eyebrow: "text-primary",
        heading: "text-foreground",
        subhead: "text-muted-foreground",
        searchWrap: "border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:border-primary",
        searchIcon: "text-muted-foreground",
        skeleton: "bg-secondary",
        emptyCard: "border-border bg-card",
        emptyIcon: "text-muted-foreground",
        emptyText: "text-foreground",
        card: "border-border bg-card hover:border-primary/40",
        cardGradient: "from-blue-500/10 via-indigo-500/5 to-violet-500/10",
        captionWrap: "from-foreground/80 via-foreground/40 to-transparent hover:from-foreground/90",
        captionIcon: "text-primary",
        captionText: "text-background",
        countChip: "bg-background/85 text-foreground",
        title: "text-foreground",
        creator: "text-muted-foreground",
        avatar: "gradient-gold text-primary-foreground",
      }
    : {
        eyebrow: "text-amber-200/80",
        heading: "text-white",
        subhead: "text-white/60",
        searchWrap: "border-white/15 bg-white/5 text-white placeholder:text-white/40 focus:border-amber-200/40",
        searchIcon: "text-white/40",
        skeleton: "bg-white/5",
        emptyCard: "border-white/10 bg-white/5",
        emptyIcon: "text-white/40",
        emptyText: "text-white/80",
        card: "border-white/10 bg-white/5 hover:border-amber-200/30",
        cardGradient: "from-amber-300/10 via-fuchsia-300/10 to-sky-300/10",
        captionWrap: "from-black/75 via-black/40 to-transparent hover:from-black/85",
        captionIcon: "text-amber-200",
        captionText: "text-white",
        countChip: "bg-black/60 text-white",
        title: "text-white",
        creator: "text-white/70",
        avatar: "gradient-gold text-primary-foreground",
      };

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${t.eyebrow}`}>
            <Sparkles className="mr-1 inline h-3 w-3" /> Discover gallery
          </p>
          <h2 className={`font-serif text-xl sm:text-2xl ${t.heading}`}>
            Public mood boards from the Circle
          </h2>
          <p className={`mt-1 text-xs ${t.subhead}`}>
            Browse boards other curators have shared. Follow your favorites to see what they save next.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className={`pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 ${t.searchIcon}`} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search boards or curators"
            className={`w-full rounded-full border py-2 pl-9 pr-4 text-xs backdrop-blur-md focus:outline-none ${t.searchWrap}`}
          />
        </div>
      </div>

      {/* Sort chips */}
      <div className="flex flex-wrap items-center gap-2">
        {SORT_OPTIONS.map(({ id, label, icon: Icon }) => {
          const active = sort === id;
          const activeCls = isLight
            ? "border-primary bg-primary text-primary-foreground"
            : "border-amber-200/50 bg-amber-200/15 text-amber-100";
          const idleCls = isLight
            ? "border-border bg-secondary/50 text-muted-foreground hover:text-foreground"
            : "border-white/15 bg-white/5 text-white/60 hover:text-white";
          return (
            <button
              key={id}
              type="button"
              onClick={() => setSort(id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium backdrop-blur-md transition-colors ${active ? activeCls : idleCls}`}
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`aspect-[4/5] animate-pulse rounded-2xl ${t.skeleton}`} />
          ))}
        </div>
      ) : boards.length === 0 ? (
        <div className={`rounded-2xl border p-8 text-center backdrop-blur-md ${t.emptyCard}`}>
          <Layers className={`mx-auto h-8 w-8 ${t.emptyIcon}`} />
          <p className={`mt-2 text-sm ${t.emptyText}`}>
            {query ? "No boards match that search." : "No public boards yet — be the first to share one!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {boards.map((b) => {
            const initials = (b.creator_name || "P")[0]?.toUpperCase();
            return (
              <article
                key={b.id}
                className={`group cursor-pointer overflow-hidden rounded-2xl border backdrop-blur-md transition-all hover:-translate-y-0.5 ${t.card}`}
                onClick={() => navigate(`/mood-board/${b.id}`)}
              >
                <div className={`relative aspect-[4/5] bg-gradient-to-br ${t.cardGradient}`}>
                  {b.preview_images.length > 0 ? (
                    <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-0.5">
                      {[0, 1, 2, 3].map((i) => (
                        <div key={i} className={isLight ? "overflow-hidden bg-secondary/40" : "overflow-hidden bg-black/20"}>
                          {b.preview_images[i] ? (
                            <img
                              src={b.preview_images[i]}
                              alt=""
                              loading="lazy"
                              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ImageOff className={`h-8 w-8 ${t.emptyIcon}`} />
                    </div>
                  )}

                  {/* Top caption overlay — clickable, deep-links to the pin */}
                  {b.top_caption && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const target = b.top_caption_pin_id
                          ? `/mood-board/${b.id}#pin-${b.top_caption_pin_id}`
                          : `/mood-board/${b.id}`;
                        navigate(target);
                      }}
                      title="Jump to this pin"
                      className={`absolute inset-x-0 top-0 cursor-pointer bg-gradient-to-b p-3 text-left transition-colors ${t.captionWrap}`}
                    >
                      <div className={`flex gap-1.5 ${t.captionText}`}>
                        <Quote className={`mt-0.5 h-3 w-3 shrink-0 ${t.captionIcon}`} />
                        <p className="line-clamp-2 font-serif text-[11px] italic leading-snug">
                          {b.top_caption}
                        </p>
                      </div>
                    </button>
                  )}

                  {/* Counts */}
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] backdrop-blur-md ${t.countChip}`}>
                      <Layers className="h-2.5 w-2.5" /> {b.item_count}
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] backdrop-blur-md ${t.countChip}`}>
                      <Eye className="h-2.5 w-2.5" /> {b.view_count}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 p-3">
                  <h3 className={`line-clamp-1 font-serif text-sm font-semibold ${t.title}`}>
                    {b.name}
                  </h3>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className={`flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full text-[10px] font-bold ${t.avatar}`}>
                        {b.creator_avatar ? (
                          <img src={b.creator_avatar} alt="" className="h-full w-full object-cover" />
                        ) : (
                          initials
                        )}
                      </div>
                      <span className={`line-clamp-1 text-[11px] ${t.creator}`}>
                        {b.creator_name || "Curator"}
                      </span>
                    </div>
                    <FollowButton
                      targetUserId={b.user_id}
                      targetName={b.creator_name}
                      size="sm"
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default PublicMoodBoardsGallery;
