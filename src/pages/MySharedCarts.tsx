import { useEffect, useState } from "react";
import { Loader2, Inbox, Send, ShoppingBag, ArrowRight, Edit3, Ban, Plus, Minus, Trash2, Copy, Check, Trophy } from "lucide-react";
import { toast } from "sonner";
import {
  listMySharedCarts,
  type MySharedCartEntry,
  getSharedCart,
  type SharedCartItemRecord,
  updateSharedCartTitle,
  revokeSharedCart,
  unrevokeSharedCart,
  removeSharedCartItem,
  updateSharedCartItemQuantity,
} from "@/services/sharedCartService";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatMoney } from "@/lib/shopify";

interface EditState {
  cartId: string;
  title: string;
  items: SharedCartItemRecord[];
}

const MySharedCarts = () => {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<MySharedCartEntry[]>([]);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [savingTitle, setSavingTitle] = useState(false);
  const [copied, setCopied] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const list = await listMySharedCarts();
      setEntries(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const openEdit = async (cartId: string) => {
    try {
      const data = await getSharedCart(cartId);
      if (!data) return;
      setEditing({
        cartId,
        title: data.cart.title || "",
        items: data.items,
      });
    } catch (e) {
      toast.error("Couldn't load cart");
    }
  };

  const handleRevokeToggle = async (entry: MySharedCartEntry) => {
    try {
      if (entry.cart.revoked_at) {
        await unrevokeSharedCart(entry.cart.id);
        toast.success("Link is live again");
      } else {
        if (!confirm("Revoke this share link? Anyone with the link will see 'no longer available'.")) return;
        await revokeSharedCart(entry.cart.id);
        toast.success("Share link revoked");
      }
      await refresh();
    } catch (e) {
      toast.error("Couldn't update link");
    }
  };

  const handleSaveTitle = async () => {
    if (!editing) return;
    setSavingTitle(true);
    try {
      await updateSharedCartTitle(editing.cartId, editing.title);
      toast.success("Title updated");
      await refresh();
    } catch {
      toast.error("Couldn't save title");
    } finally {
      setSavingTitle(false);
    }
  };

  const handleQty = async (it: SharedCartItemRecord, delta: number) => {
    if (!editing) return;
    const next = it.quantity + delta;
    try {
      await updateSharedCartItemQuantity(it.id, next);
      setEditing({
        ...editing,
        items: editing.items
          .map((x) => (x.id === it.id ? { ...x, quantity: next } : x))
          .filter((x) => x.quantity > 0),
      });
    } catch {
      toast.error("Couldn't update quantity");
    }
  };

  const handleRemoveItem = async (it: SharedCartItemRecord) => {
    if (!editing) return;
    try {
      await removeSharedCartItem(it.id);
      setEditing({ ...editing, items: editing.items.filter((x) => x.id !== it.id) });
      toast.success("Item removed");
    } catch {
      toast.error("Couldn't remove item");
    }
  };

  const handleCopy = async (id: string) => {
    const url = `${window.location.origin}/shared-cart/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <Send className="h-6 w-6 text-primary" />
          <h1 className="font-serif text-3xl font-bold text-foreground sm:text-4xl">
            My Shared Carts
          </h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Carts you've curated and sent. Edit, revoke, or track purchases earned from each one.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground" />
          <h2 className="font-serif text-xl text-foreground">You haven't shared anything yet</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Open your bag, select items, and tap "Share selected" to send a curated cart to a friend.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {entries.map((e) => {
            const date = new Date(e.cart.created_at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            });
            const revoked = !!e.cart.revoked_at;
            return (
              <div
                key={e.cart.id}
                className={`flex flex-col overflow-hidden rounded-2xl border bg-card transition-colors ${
                  revoked ? "border-destructive/40 opacity-80" : "border-border"
                }`}
              >
                <div className="grid grid-cols-2 gap-px bg-border">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="aspect-square overflow-hidden bg-secondary/40">
                      {e.preview_images[i] ? (
                        <img src={e.preview_images[i]} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
                          <ShoppingBag className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="line-clamp-1 font-serif text-base text-foreground">
                      {e.cart.title || "Untitled cart"}
                    </p>
                    {revoked && (
                      <span className="shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-destructive">
                        Revoked
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {date} · {e.item_count} item{e.item_count !== 1 ? "s" : ""}
                  </p>
                  {e.cart.recipient_email && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      To <span className="text-foreground">{e.cart.recipient_email}</span>
                    </p>
                  )}

                  <div className="mt-3 flex items-center gap-3 border-t border-border pt-3 text-xs">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <ShoppingBag className="h-3.5 w-3.5" />
                      {e.purchase_count} purchase{e.purchase_count !== 1 ? "s" : ""}
                    </span>
                    {e.total_points_earned > 0 && (
                      <span className="flex items-center gap-1 text-primary">
                        <Trophy className="h-3.5 w-3.5" />
                        +{e.total_points_earned} pts
                      </span>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleCopy(e.cart.id)}
                      disabled={revoked}
                      className="flex items-center justify-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary disabled:opacity-40"
                    >
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      Copy link
                    </button>
                    <button
                      onClick={() => openEdit(e.cart.id)}
                      className="flex items-center justify-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Edit
                    </button>
                  </div>
                  <button
                    onClick={() => handleRevokeToggle(e)}
                    className={`mt-2 flex items-center justify-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                      revoked
                        ? "bg-primary/15 text-primary hover:bg-primary/25"
                        : "bg-destructive/10 text-destructive hover:bg-destructive/20"
                    }`}
                  >
                    {revoked ? (
                      <>
                        <ArrowRight className="h-3.5 w-3.5" /> Restore link
                      </>
                    ) : (
                      <>
                        <Ban className="h-3.5 w-3.5" /> Revoke link
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Edit shared cart</DialogTitle>
            <DialogDescription>
              Updates apply instantly to anyone who opens the link.
            </DialogDescription>
          </DialogHeader>

          {editing && (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Title
                </label>
                <div className="flex gap-2">
                  <input
                    value={editing.title}
                    onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                    placeholder="Untitled"
                    className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    onClick={handleSaveTitle}
                    disabled={savingTitle}
                    className="rounded-full gradient-gold px-4 py-2 text-xs font-semibold text-primary-foreground shadow-gold disabled:opacity-50"
                  >
                    {savingTitle ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
                  </button>
                </div>
              </div>

              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {editing.items.length === 0 ? (
                  <p className="rounded-lg bg-secondary/40 p-4 text-center text-sm text-muted-foreground">
                    This cart is now empty.
                  </p>
                ) : (
                  editing.items.map((it) => (
                    <div
                      key={it.id}
                      className="flex items-center gap-3 rounded-lg border border-border bg-card p-2"
                    >
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-secondary/40">
                        {it.product_image && (
                          <img src={it.product_image} alt={it.product_title} className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm font-medium text-foreground">
                          {it.product_title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatMoney(it.unit_price, it.currency)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 rounded-full border border-border">
                        <button
                          onClick={() => handleQty(it, -1)}
                          className="flex h-7 w-7 items-center justify-center text-muted-foreground hover:text-foreground"
                          aria-label="Decrease"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="min-w-[20px] text-center text-xs font-medium">
                          {it.quantity}
                        </span>
                        <button
                          onClick={() => handleQty(it, 1)}
                          className="flex h-7 w-7 items-center justify-center text-muted-foreground hover:text-foreground"
                          aria-label="Increase"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <button
                        onClick={() => handleRemoveItem(it)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                <Plus className="mr-1 inline h-3 w-3" />
                To add new items, share a fresh selection from your bag.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MySharedCarts;
