import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Copy, Check, Share2 } from "lucide-react";
import { toast } from "sonner";
import { createSharedCart } from "@/services/sharedCartService";
import type { CartItem } from "@/stores/cartStore";
import { formatMoney } from "@/lib/shopify";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CartItem[];
}

const ShareCartDialog = ({ open, onOpenChange, items }: Props) => {
  const [title, setTitle] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce((s, i) => s + parseFloat(i.price.amount) * i.quantity, 0);
  const currency = items[0]?.price.currencyCode || "USD";

  const reset = () => {
    setTitle("");
    setRecipientEmail("");
    setMessage("");
    setShareUrl(null);
    setCopied(false);
  };

  const handleClose = (next: boolean) => {
    onOpenChange(next);
    if (!next) setTimeout(reset, 200);
  };

  const handleCreate = async () => {
    if (!items.length) {
      toast.error("Select at least one item to share");
      return;
    }
    setCreating(true);
    try {
      const id = await createSharedCart({
        items,
        title,
        message,
        recipientEmail: recipientEmail || undefined,
      });
      const url = `${window.location.origin}/shared-cart/${id}`;
      setShareUrl(url);
      toast.success("Share link created");
    } catch (err) {
      console.error(err);
      toast.error("Couldn't create share link");
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif text-2xl">
            <Share2 className="h-5 w-5 text-primary" />
            Share your cart
          </DialogTitle>
          <DialogDescription>
            Send {totalItems} item{totalItems !== 1 ? "s" : ""} ·{" "}
            {formatMoney(subtotal, currency)} to a friend. You'll earn 5% in points
            when they buy.
          </DialogDescription>
        </DialogHeader>

        {!shareUrl ? (
          <div className="space-y-3 pt-1">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Title (optional)
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Spring picks for you"
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Recipient email (optional)
              </label>
              <input
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="friend@email.com"
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                If they have an account, this lands in their "Shared With Me" inbox.
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Note (optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                placeholder="Thought you'd love these ✨"
                className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={creating || !items.length}
              className="flex w-full items-center justify-center gap-2 rounded-full gradient-gold px-5 py-3 text-sm font-semibold text-primary-foreground shadow-gold transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create share link"}
            </button>
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            <div className="rounded-xl border border-border bg-secondary/40 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Your share link
              </p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={shareUrl}
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-xs"
                />
                <button
                  onClick={handleCopy}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground hover:border-primary"
                  aria-label="Copy link"
                >
                  {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Anyone with the link (and an account) can view this cart and shop from it.
              You'll earn points when they check out.
            </p>
            <button
              onClick={() => handleClose(false)}
              className="w-full rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground hover:border-foreground/40"
            >
              Done
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ShareCartDialog;
