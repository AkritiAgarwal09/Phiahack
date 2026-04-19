import { useQuery } from "@tanstack/react-query";
import { Flame, TrendingUp, Users } from "lucide-react";
import { loadViralProduct, type SparklinePoint } from "@/services/viralProductService";
import { findProduct } from "@/lib/predictiveEngine";
import type { ShopifyProduct } from "@/lib/shopify";

interface Props {
  onSelect: (p: ShopifyProduct) => void;
}

const ViralCard = ({ onSelect }: Props) => {
  const { data: viral } = useQuery({
    queryKey: ["viral_product"],
    queryFn: () => loadViralProduct(7),
  });

  if (!viral) return null;
  const product = findProduct(viral.product_id);
  if (!product) return null;

  const node = product.node;
  const img = node.images.edges[0]?.node?.url;
  const growth = Number(viral.growth_pct) || 0;

  return (
    <button
      onClick={() => onSelect(product)}
      className="group relative w-full overflow-hidden rounded-2xl border border-amber-200/30 bg-gradient-to-br from-amber-300/10 via-rose-300/10 to-fuchsia-300/10 p-5 text-left backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-amber-200/60"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[hsl(230_50%_12%)]">
            <Flame className="h-3 w-3" /> Viral this week
          </span>
          <p className="font-serif text-lg text-white sm:text-xl">{node.title}</p>
          <p className="text-xs text-white/60">{node.vendor}</p>
        </div>
        {img && (
          <div className="h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-white/10 sm:h-24 sm:w-20">
            <img src={img} alt={node.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 items-end gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-white/50">Growth</p>
          <p className="flex items-center gap-1 font-serif text-xl font-bold text-emerald-200">
            <TrendingUp className="h-4 w-4" />
            +{growth.toFixed(0)}%
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-white/50">Users saving</p>
          <p className="flex items-center gap-1 font-serif text-base text-white">
            <Users className="h-4 w-4 text-white/60" /> {viral.unique_users}
          </p>
        </div>
        <div className="col-span-3 mt-1 sm:col-span-1 sm:mt-0">
          <p className="text-[10px] uppercase tracking-wider text-white/50">Last 7 days</p>
          <Sparkline data={viral.sparkline || []} />
        </div>
      </div>
    </button>
  );
};

const Sparkline = ({ data }: { data: SparklinePoint[] }) => {
  if (!data || data.length === 0) {
    return <div className="h-8 rounded bg-white/5" />;
  }
  const w = 120;
  const h = 32;
  const pad = 2;
  const scores = data.map((d) => Number(d.score));
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const range = max - min || 1;
  const points = data
    .map((d, i) => {
      const x = pad + (i / Math.max(1, data.length - 1)) * (w - pad * 2);
      const y = h - pad - ((Number(d.score) - min) / range) * (h - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke="hsl(45 90% 65%)"
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
};

export default ViralCard;
