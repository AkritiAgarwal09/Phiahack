import { useQuery } from "@tanstack/react-query";
import DiscoverProductCard from "./DiscoverProductCard";
import DiscoverSection from "./DiscoverSection";
import { loadFollowedActivity } from "@/services/socialFollowsService";
import { findProduct } from "@/lib/predictiveEngine";
import type { ShopifyProduct } from "@/lib/shopify";

interface Props {
  onSelect: (p: ShopifyProduct) => void;
  onAdd: (p: ShopifyProduct) => void;
}

const FollowedActivityRail = ({ onSelect, onAdd }: Props) => {
  const { data = [] } = useQuery({
    queryKey: ["followed_activity"],
    queryFn: () => loadFollowedActivity(14, 30),
  });

  const items = data
    .map((row) => findProduct(row.product_id))
    .filter((p): p is ShopifyProduct => !!p)
    .slice(0, 12);

  if (items.length === 0) return null;

  return (
    <DiscoverSection
      eyebrow="From people you follow"
      title="New from your curators"
      description="Fresh saves from the curators you follow — tap any board profile to follow more."
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {items.map((p) => (
          <DiscoverProductCard
            key={p.node.id}
            product={p}
            onClick={() => onSelect(p)}
            onAdd={() => onAdd(p)}
            badge={{ label: "From a curator you follow", intent: "matched" }}
          />
        ))}
      </div>
    </DiscoverSection>
  );
};

export default FollowedActivityRail;
