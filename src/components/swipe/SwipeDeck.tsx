import { useState, useRef, useEffect, useCallback } from "react";
import { Heart, X, Sparkles, RotateCcw, ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SwipeDirection } from "@/services/swipeService";

export interface SwipeDeckCard {
  id: string;
  title: string;
  subtitle?: string;
  image?: string;
  badge?: string;        // e.g. "Trending in your tribe"
  pricePill?: string;    // e.g. "$295" or "Outfit · $618"
  meta?: string;         // small caption under title (vendor / occasion)
  // Free-form extra (rendered above the action bar): outfit thumbnails, etc.
  extra?: React.ReactNode;
}

interface Props {
  cards: SwipeDeckCard[];
  onSwipe: (card: SwipeDeckCard, direction: SwipeDirection, dwellMs: number) => void;
  onUndo?: () => void;
  onTap?: (card: SwipeDeckCard) => void;
  onEmpty?: () => void;
  emptyState?: React.ReactNode;
  /** Show stack progress like "12 / 28" */
  progress?: { current: number; total: number };
  /** Optional render-prop slot for per-card action buttons (rendered between card and big buttons). */
  renderCardActions?: (card: SwipeDeckCard) => React.ReactNode;
}

const SWIPE_THRESHOLD = 110; // px
const VELOCITY_THRESHOLD = 0.45;

const SwipeDeck = ({ cards, onSwipe, onUndo, onTap, onEmpty, emptyState, progress, renderCardActions }: Props) => {
  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [exitDir, setExitDir] = useState<SwipeDirection | null>(null);
  const startRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const enterTime = useRef<number>(performance.now());

  const top = cards[0];
  const next = cards[1];
  const after = cards[2];

  useEffect(() => {
    enterTime.current = performance.now();
    setDragX(0);
    setDragY(0);
    setExitDir(null);
  }, [top?.id]);

  useEffect(() => {
    if (!cards.length) onEmpty?.();
  }, [cards.length, onEmpty]);

  const commit = useCallback(
    (direction: SwipeDirection) => {
      if (!top) return;
      const dwell = Math.round(performance.now() - enterTime.current);
      setExitDir(direction);
      // Let the exit animation play, then notify parent
      setTimeout(() => {
        onSwipe(top, direction, dwell);
      }, 180);
    },
    [onSwipe, top]
  );

  const onPointerDown = (e: React.PointerEvent) => {
    if (!top || exitDir) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    startRef.current = { x: e.clientX, y: e.clientY, t: performance.now() };
    setIsDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!startRef.current || !isDragging) return;
    setDragX(e.clientX - startRef.current.x);
    setDragY(e.clientY - startRef.current.y);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!startRef.current) return;
    const dt = Math.max(1, performance.now() - startRef.current.t);
    const vx = dragX / dt;
    const vy = dragY / dt;
    setIsDragging(false);

    const upStrong = dragY < -SWIPE_THRESHOLD * 0.9 || vy < -VELOCITY_THRESHOLD;
    const rightStrong = dragX > SWIPE_THRESHOLD || vx > VELOCITY_THRESHOLD;
    const leftStrong = dragX < -SWIPE_THRESHOLD || vx < -VELOCITY_THRESHOLD;

    if (upStrong && Math.abs(dragY) > Math.abs(dragX)) {
      commit("up");
    } else if (rightStrong) {
      commit("right");
    } else if (leftStrong) {
      commit("left");
    } else {
      // Snap back
      setDragX(0);
      setDragY(0);
    }
    startRef.current = null;
  };

  const handleAction = (dir: SwipeDirection) => {
    if (!top || exitDir) return;
    commit(dir);
  };

  if (!top) {
    return (
      <div className="flex h-full min-h-[420px] flex-col items-center justify-center text-center">
        {emptyState ?? (
          <>
            <Sparkles className="mb-3 h-8 w-8 text-primary" />
            <p className="text-sm text-muted-foreground">No more cards. Check back later.</p>
          </>
        )}
      </div>
    );
  }

  // Compute transforms
  const rotation = dragX / 18;
  const opacityRight = Math.max(0, Math.min(1, dragX / 110));
  const opacityLeft = Math.max(0, Math.min(1, -dragX / 110));
  const opacityUp = Math.max(0, Math.min(1, -dragY / 90));

  const exitTransform =
    exitDir === "right"
      ? "translate(140%, -10%) rotate(20deg)"
      : exitDir === "left"
      ? "translate(-140%, -10%) rotate(-20deg)"
      : exitDir === "up"
      ? "translate(0, -130%) rotate(0deg)"
      : undefined;

  return (
    <div className="relative mx-auto w-full max-w-md select-none">
      {/* Stack container */}
      <div className="relative h-[480px] sm:h-[520px]">
        {after && (
          <CardShell card={after} z={1} scale={0.92} translateY={20} dim />
        )}
        {next && (
          <CardShell card={next} z={2} scale={0.96} translateY={10} dim />
        )}
        <div
          className={cn(
            "absolute inset-0 z-10 touch-none",
            !isDragging && !exitDir && "transition-transform duration-200 ease-out"
          )}
          style={{
            transform:
              exitTransform ||
              `translate(${dragX}px, ${dragY}px) rotate(${rotation}deg)`,
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <CardBody
            card={top}
            opacityRight={opacityRight}
            opacityLeft={opacityLeft}
            opacityUp={opacityUp}
            onTap={onTap}
          />
        </div>
      </div>

      {/* Optional per-card action row */}
      {renderCardActions && top && (
        <div className="mx-auto mt-3 max-w-sm">{renderCardActions(top)}</div>
      )}

      {/* Action bar */}
      <div className="mt-5 flex items-center justify-center gap-4">
        {onUndo && (
          <button
            onClick={onUndo}
            aria-label="Undo last swipe"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-all hover:border-foreground/30 hover:text-foreground"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={() => handleAction("left")}
          aria-label="Pass"
          className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition-all hover:scale-105 hover:border-destructive/40 hover:text-destructive"
        >
          <X className="h-5 w-5" />
        </button>
        <button
          onClick={() => handleAction("up")}
          aria-label="Super like"
          className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-[0_12px_30px_-8px_hsl(var(--primary)/0.55)] transition-transform hover:scale-105"
        >
          <Sparkles className="h-6 w-6" />
        </button>
        <button
          onClick={() => handleAction("right")}
          aria-label="Like"
          className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition-all hover:scale-105 hover:border-primary/50 hover:text-primary"
        >
          <Heart className="h-5 w-5" />
        </button>
      </div>

      {progress && (
        <p className="mt-3 text-center text-[11px] uppercase tracking-wider text-muted-foreground">
          {progress.current} / {progress.total}
        </p>
      )}
    </div>
  );
};

interface ShellProps {
  card: SwipeDeckCard;
  z: number;
  scale: number;
  translateY: number;
  dim?: boolean;
}

const CardShell = ({ card, z, scale, translateY, dim }: ShellProps) => (
  <div
    className="absolute inset-0 overflow-hidden rounded-3xl border border-border bg-card shadow-elevated"
    style={{ zIndex: z, transform: `translateY(${translateY}px) scale(${scale})` }}
  >
    <div className={cn("h-full w-full", dim && "opacity-70")}>
      <CardImage src={card.image} title={card.title} />
    </div>
  </div>
);

interface BodyProps {
  card: SwipeDeckCard;
  opacityRight: number;
  opacityLeft: number;
  opacityUp: number;
  onTap?: (c: SwipeDeckCard) => void;
}

const CardBody = ({ card, opacityRight, opacityLeft, opacityUp, onTap }: BodyProps) => {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl border border-border bg-card shadow-elevated">
      <CardImage src={card.image} title={card.title} />

      {/* Gradient + meta */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-5 pt-20 text-white">
        {card.badge && (
          <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider backdrop-blur">
            <Sparkles className="h-3 w-3" />
            {card.badge}
          </span>
        )}
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-serif text-xl font-semibold leading-tight">{card.title}</h3>
            {card.meta && <p className="mt-0.5 truncate text-xs text-white/80">{card.meta}</p>}
            {card.subtitle && <p className="mt-2 line-clamp-2 text-xs text-white/85">{card.subtitle}</p>}
          </div>
          {card.pricePill && (
            <span className="shrink-0 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-foreground">
              {card.pricePill}
            </span>
          )}
        </div>
        {card.extra && <div className="pointer-events-auto mt-3">{card.extra}</div>}
      </div>

      {/* Tap target (info) — bottom right corner avoids dragging conflict */}
      {onTap && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTap(card);
          }}
          className="absolute right-3 top-3 z-10 rounded-full bg-white/85 px-3 py-1 text-[11px] font-semibold text-foreground shadow-sm backdrop-blur transition-colors hover:bg-white"
        >
          Details
        </button>
      )}

      {/* Swipe indicators */}
      <div
        className="pointer-events-none absolute left-5 top-5 rotate-[-12deg] rounded-xl border-2 border-emerald-400 px-3 py-1 text-sm font-bold uppercase tracking-wider text-emerald-300"
        style={{ opacity: opacityRight }}
      >
        Love
      </div>
      <div
        className="pointer-events-none absolute right-5 top-5 rotate-[12deg] rounded-xl border-2 border-destructive px-3 py-1 text-sm font-bold uppercase tracking-wider text-destructive"
        style={{ opacity: opacityLeft }}
      >
        Pass
      </div>
      <div
        className="pointer-events-none absolute left-1/2 top-10 -translate-x-1/2 rounded-xl border-2 border-primary px-3 py-1 text-sm font-bold uppercase tracking-wider text-primary"
        style={{ opacity: opacityUp }}
      >
        Super ★
      </div>
    </div>
  );
};

const CardImage = ({ src, title }: { src?: string; title: string }) => {
  const [errored, setErrored] = useState(false);
  if (!src || errored) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-secondary to-muted text-muted-foreground">
        <ImageOff className="h-8 w-8" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={title}
      onError={() => setErrored(true)}
      className="h-full w-full object-cover"
      draggable={false}
    />
  );
};

export default SwipeDeck;
