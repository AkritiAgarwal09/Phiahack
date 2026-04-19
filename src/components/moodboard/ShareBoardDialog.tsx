import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Link2, Mail, Share2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { setBoardPublic } from "@/services/moodBoardService";
import { earnPoints } from "@/services/pointsService";

interface ShareBoardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardId: string;
  boardName: string;
  isPublic: boolean;
  onPublicChange?: (isPublic: boolean) => void;
}

const ShareBoardDialog = ({
  open,
  onOpenChange,
  boardId,
  boardName,
  isPublic,
  onPublicChange,
}: ShareBoardDialogProps) => {
  const [copied, setCopied] = useState(false);
  const [working, setWorking] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(false);

  const shareUrl = useMemo(
    () => `${window.location.origin}/mood-board/${boardId}`,
    [boardId]
  );

  useEffect(() => {
    if (!open) {
      setCopied(false);
      setPointsEarned(false);
    }
  }, [open]);

  const ensurePublicAndAward = async () => {
    if (!isPublic) {
      try {
        await setBoardPublic(boardId, true);
        onPublicChange?.(true);
      } catch (e) {
        console.error(e);
      }
    }
    if (!pointsEarned) {
      try {
        await earnPoints("share_cart", boardId);
        setPointsEarned(true);
      } catch {
        // already earned or not authenticated — ignore
      }
    }
  };

  const handleCopy = async () => {
    setWorking(true);
    await ensurePublicAndAward();
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Share link copied", {
        description: "Anyone with this link can view your board.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy link");
    } finally {
      setWorking(false);
    }
  };

  const handleEmail = async () => {
    await ensurePublicAndAward();
    const subject = encodeURIComponent(`Check out my mood board: ${boardName}`);
    const body = encodeURIComponent(
      `I curated this on Phia Circle — take a look:\n\n${shareUrl}`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleNativeShare = async () => {
    if (!navigator.share) return handleCopy();
    await ensurePublicAndAward();
    try {
      await navigator.share({
        title: boardName,
        text: `Check out my mood board: ${boardName}`,
        url: shareUrl,
      });
    } catch {
      // user dismissed
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border/60 bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Share "{boardName}"</DialogTitle>
          <DialogDescription>
            Anyone with this link can browse the pieces you pinned. You'll earn points if a friend shops from it.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-3">
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/40 px-3 py-2.5">
            <Link2 className="h-4 w-4 shrink-0 text-primary/80" />
            <input
              readOnly
              value={shareUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none"
            />
            <Button
              size="sm"
              onClick={handleCopy}
              disabled={working}
              className="gradient-gold text-primary-foreground shadow-gold"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" /> Copy
                </>
              )}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={handleEmail}
              className="border-border/60 bg-background/40"
            >
              <Mail className="h-4 w-4" /> Email
            </Button>
            <Button
              variant="outline"
              onClick={handleNativeShare}
              className="border-border/60 bg-background/40"
            >
              <Share2 className="h-4 w-4" /> Share
            </Button>
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
            <span className="font-medium text-primary">Earn 5%</span> in points
            when a friend purchases an item from your shared board.
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShareBoardDialog;
