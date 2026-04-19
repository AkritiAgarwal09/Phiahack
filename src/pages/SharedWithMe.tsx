import { useEffect, useState } from "react";
import { Loader2, Inbox, ShoppingBag, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { listSharedWithMe, type InboxEntry } from "@/services/sharedCartService";

const SharedWithMe = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<InboxEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const list = await listSharedWithMe();
        if (!cancelled) setEntries(list);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold text-foreground sm:text-4xl">
          Shared With Me
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Carts your friends have curated for you. Add anything to your own bag — or buy the whole edit.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground" />
          <h2 className="font-serif text-xl text-foreground">Nothing here yet</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            When a friend shares a cart with you, it'll show up here. Open any
            shared link while signed in and we'll save it for you.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {entries.map((e) => {
            const sharerName = e.sharer?.display_name || "A Phia friend";
            const date = new Date(e.cart.created_at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            });
            return (
              <button
                key={e.shared_cart_id}
                onClick={() => navigate(`/shared-cart/${e.shared_cart_id}`)}
                className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card text-left transition-all hover:border-primary/60 hover:shadow-gold"
              >
                <div className="grid grid-cols-2 gap-px bg-border">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="aspect-square overflow-hidden bg-secondary/40"
                    >
                      {e.preview_images[i] ? (
                        <img
                          src={e.preview_images[i]}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
                          <ShoppingBag className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full gradient-gold text-xs font-bold text-primary-foreground">
                      {sharerName[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {sharerName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {date} · {e.item_count} item{e.item_count !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  {e.cart.title && (
                    <p className="mt-3 line-clamp-1 font-serif text-base text-foreground">
                      {e.cart.title}
                    </p>
                  )}
                  {e.source === "recipient" && (
                    <span className="mt-2 inline-block rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                      Sent to you
                    </span>
                  )}
                  <div className="mt-3 flex items-center justify-between text-xs font-semibold text-primary">
                    View cart <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SharedWithMe;
