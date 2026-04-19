import { Heart, ShoppingBag, Bookmark } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCartStore } from "@/stores/cartStore";
import { getProduct, type CardSection } from "@/lib/conciergeCards";

interface Props {
  sections: CardSection[];
}

const SmartActions = ({ sections }: Props) => {
  const { user } = useAuth();
  const addItem = useCartStore((s) => s.addItem);
  const setOpen = useCartStore((s) => s.setOpen);

  const allIds = Array.from(new Set(sections.flatMap((s) => s.items.map((i) => i.id))));
  if (allIds.length === 0) return null;

  const handleSaveAll = async () => {
    if (!user) {
      toast.error("Sign in to save");
      return;
    }
    let saved = 0;
    for (const id of allIds) {
      const p = getProduct(id);
      if (!p) continue;
      const { error } = await supabase.from("wishlists").insert({
        user_id: user.id,
        product_name: p.node.title,
        product_url: p.node.id,
        product_image: p.node.images.edges[0]?.node?.url,
        current_price: parseFloat(p.node.priceRange.minVariantPrice.amount),
      });
      if (!error || error.message.toLowerCase().includes("duplicate")) saved++;
    }
    toast.success(`${saved} item${saved === 1 ? "" : "s"} saved to wishlist 💖`);
  };

  const handleAddAll = async () => {
    let added = 0;
    for (const id of allIds) {
      const p = getProduct(id);
      const v = p?.node.variants.edges[0]?.node;
      if (!p || !v) continue;
      await addItem({
        product: p,
        variantId: v.id,
        variantTitle: v.title,
        price: v.price,
        quantity: 1,
        selectedOptions: v.selectedOptions,
      });
      added++;
    }
    toast.success(`${added} added to bag`);
    setOpen(true);
  };

  const handleCreateBoard = async () => {
    if (!user) {
      toast.error("Sign in to create a board");
      return;
    }
    const name = `Phia picks · ${new Date().toLocaleDateString()}`;
    const { data: board, error } = await supabase
      .from("mood_boards")
      .insert({ user_id: user.id, name, is_public: false })
      .select()
      .single();
    if (error || !board) {
      toast.error("Could not create board");
      return;
    }
    const items = allIds
      .map((id, idx) => {
        const p = getProduct(id);
        if (!p) return null;
        return {
          board_id: board.id,
          product_name: p.node.title,
          product_image: p.node.images.edges[0]?.node?.url,
          product_url: p.node.id,
          position: idx,
        };
      })
      .filter(Boolean) as any[];
    if (items.length) await supabase.from("mood_board_items").insert(items);
    toast.success(`Mood board "${name}" created ✨`);
  };

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button
        onClick={handleSaveAll}
        className="flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
      >
        <Heart className="h-3.5 w-3.5" /> Save all
      </button>
      <button
        onClick={handleAddAll}
        className="flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-xs font-medium text-background transition-opacity hover:opacity-85"
      >
        <ShoppingBag className="h-3.5 w-3.5" /> Add all to cart
      </button>
      <button
        onClick={handleCreateBoard}
        className="flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
      >
        <Bookmark className="h-3.5 w-3.5" /> Create mood board
      </button>
    </div>
  );
};

export default SmartActions;
