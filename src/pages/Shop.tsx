import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Search,
  ShoppingBag,
  SlidersHorizontal,
  X,
  ArrowUpDown,
  History,
} from "lucide-react";
import { toast } from "sonner";
import { earnPoints } from "@/services/pointsService";
import { logEngagement, loadMyEngagements, loadTrending } from "@/services/engagementService";
import {
  trendingInYourCircle,
  styleProgression,
  socialProofForProduct,
} from "@/lib/predictiveEngine";
import { ShopifyProduct, formatMoney } from "@/lib/shopify";
import {
  localProducts,
  categoryLabels,
  allBrands,
  allColors,
  allSizes,
  priceBounds,
  type ShopCategory,
} from "@/data/shopProducts";
import ShopifyProductCard from "@/components/shop/ShopifyProductCard";
import ProductDetailDialog from "@/components/shop/ProductDetailDialog";
import AddToBoardDialog, { PinnableItem } from "@/components/shop/AddToBoardDialog";
import { useCartStore } from "@/stores/cartStore";
import { useRecentlyViewed } from "@/stores/recentlyViewedStore";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

type SortKey = "featured" | "price-asc" | "price-desc" | "name-asc";

const sortOptions: { value: SortKey; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name-asc", label: "Name: A → Z" },
];

interface FilterState {
  category: ShopCategory;
  brands: string[];
  sizes: string[];
  colors: string[];
  priceRange: [number, number];
}

const defaultFilters: FilterState = {
  category: "all",
  brands: [],
  sizes: [],
  colors: [],
  priceRange: [priceBounds.min, priceBounds.max],
};

const Shop = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [sort, setSort] = useState<SortKey>("featured");
  const [boardTarget, setBoardTarget] = useState<PinnableItem | null>(null);
  const [detailProduct, setDetailProduct] = useState<ShopifyProduct | null>(null);
  const [filtersMobileOpen, setFiltersMobileOpen] = useState(false);

  const setCartOpen = useCartStore((s) => s.setOpen);
  const addItem = useCartStore((s) => s.addItem);
  const recentIds = useRecentlyViewed((s) => s.ids);
  const addRecent = useRecentlyViewed((s) => s.add);

  const products: ShopifyProduct[] = localProducts;

  const { data: wished = [] } = useQuery({
    queryKey: ["wishlist_urls", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlists")
        .select("product_url")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data.map((d) => d.product_url);
    },
    enabled: !!user,
  });
  const wishedSet = useMemo(() => new Set(wished), [wished]);

  // Predictive social-proof signals
  const { data: shopEngagements = [] } = useQuery({
    queryKey: ["shop_engagements", user?.id],
    queryFn: () => loadMyEngagements(120),
    enabled: !!user,
  });
  const { data: shopTrending = [] } = useQuery({
    queryKey: ["shop_trending"],
    queryFn: () => loadTrending(7, 30),
  });
  const circle = useMemo(
    () => trendingInYourCircle(shopTrending, shopEngagements),
    [shopTrending, shopEngagements]
  );
  const myTribe = useMemo(
    () => styleProgression(shopEngagements).current?.tribe,
    [shopEngagements]
  );
  const trendingIds = useMemo(
    () => new Set(shopTrending.slice(0, 8).map((t) => t.product_id)),
    [shopTrending]
  );

  const toggleWishlist = useMutation({
    mutationFn: async (product: ShopifyProduct) => {
      const url = product.node.id;
      if (wishedSet.has(url)) {
        const { error } = await supabase
          .from("wishlists")
          .delete()
          .eq("user_id", user!.id)
          .eq("product_url", url);
        if (error) throw error;
        return { added: false };
      }
      const price = parseFloat(product.node.priceRange.minVariantPrice.amount);
      const { error } = await supabase.from("wishlists").insert({
        user_id: user!.id,
        product_name: product.node.vendor
          ? `${product.node.vendor} • ${product.node.title}`
          : product.node.title,
        product_url: url,
        product_image: product.node.images.edges[0]?.node?.url || null,
        current_price: isNaN(price) ? null : price,
      });
      if (error) throw error;
      await earnPoints("add_to_wishlist");
      logEngagement(product, "wishlist");
      return { added: true };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["wishlist_urls"] });
      qc.invalidateQueries({ queryKey: ["wishlists"] });
      toast.success(
        res?.added ? "Saved to wishlist · +10 pts" : "Removed from wishlist"
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Track product detail opens for "Recently viewed" + engagement signals
  useEffect(() => {
    if (detailProduct) {
      addRecent(detailProduct.node.id);
      logEngagement(detailProduct, "view");
    }
  }, [detailProduct, addRecent]);

  // ---------------- Filtering & sorting ----------------
  const matchesProductOptions = (p: ShopifyProduct, name: string, picks: string[]) => {
    if (picks.length === 0) return true;
    const opt = p.node.options.find((o) => o.name === name);
    if (!opt) return false;
    return opt.values.some((v) => picks.includes(v));
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = products.filter((p) => {
      const node = p.node;
      const price = parseFloat(node.priceRange.minVariantPrice.amount);
      if (filters.category !== "all" && node.productType !== filters.category) return false;
      if (filters.brands.length > 0 && !filters.brands.includes(node.vendor)) return false;
      if (price < filters.priceRange[0] || price > filters.priceRange[1]) return false;
      if (!matchesProductOptions(p, "Size", filters.sizes)) return false;
      if (!matchesProductOptions(p, "Color", filters.colors)) return false;
      if (q) {
        const blob = `${node.title} ${node.vendor} ${node.tags.join(" ")}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      const pa = parseFloat(a.node.priceRange.minVariantPrice.amount);
      const pb = parseFloat(b.node.priceRange.minVariantPrice.amount);
      switch (sort) {
        case "price-asc":
          return pa - pb;
        case "price-desc":
          return pb - pa;
        case "name-asc":
          return a.node.title.localeCompare(b.node.title);
        default:
          return 0;
      }
    });

    return list;
  }, [products, filters, query, sort]);

  // Recently viewed (resolved + filtered to existing)
  const recentlyViewed = useMemo(() => {
    return recentIds
      .map((id) => products.find((p) => p.node.id === id))
      .filter((p): p is ShopifyProduct => !!p);
  }, [recentIds, products]);

  const toPinnable = (p: ShopifyProduct): PinnableItem => ({
    name: p.node.vendor ? `${p.node.vendor} • ${p.node.title}` : p.node.title,
    image: p.node.images.edges[0]?.node?.url || null,
    url: p.node.id,
  });

  const quickAddToCart = async (p: ShopifyProduct) => {
    const variant = p.node.variants.edges[0]?.node;
    if (!variant?.availableForSale) {
      toast.error("This product is sold out");
      return;
    }
    const realOptions = p.node.options.filter(
      (o) => !(o.values.length === 1 && o.values[0] === "Default Title")
    );
    if (realOptions.length > 0 && p.node.variants.edges.length > 1) {
      setDetailProduct(p);
      return;
    }
    await addItem({
      product: p,
      variantId: variant.id,
      variantTitle: variant.title,
      price: variant.price,
      quantity: 1,
      selectedOptions: variant.selectedOptions,
    });
    toast.success(`${p.node.title} added to bag`);
    setCartOpen(true);
  };

  const activeFilterCount =
    (filters.category !== "all" ? 1 : 0) +
    filters.brands.length +
    filters.sizes.length +
    filters.colors.length +
    (filters.priceRange[0] !== priceBounds.min ||
    filters.priceRange[1] !== priceBounds.max
      ? 1
      : 0);

  const filterSidebar = (
    <FilterPanel
      filters={filters}
      onChange={setFilters}
      onReset={() => setFilters(defaultFilters)}
    />
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            The Edit
          </p>
          <h2 className="mt-1 font-serif text-3xl font-bold text-foreground sm:text-4xl">
            Shop the Edit
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Curated drops across fashion, beauty, accessories &amp; home.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search brands or products"
            className="w-full rounded-full border border-border bg-card py-2.5 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Brand pages (category chips that act like quick brand/category nav) */}
      <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1">
        {(["all", ...Object.keys(categoryLabels)] as ShopCategory[]).map((c) => (
          <button
            key={c}
            onClick={() => setFilters((f) => ({ ...f, category: c }))}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-sm font-medium capitalize transition-all",
              filters.category === c
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-card text-muted-foreground hover:border-foreground/40 hover:text-foreground"
            )}
          >
            {c === "all" ? "All" : categoryLabels[c as Exclude<ShopCategory, "all">]}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Desktop filter sidebar */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-24">{filterSidebar}</div>
        </aside>

        {/* Main column */}
        <div className="min-w-0 flex-1 space-y-5">
          {/* Sort + mobile filter trigger */}
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {filtered.length} item{filtered.length !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-2">
              <Sheet open={filtersMobileOpen} onOpenChange={setFiltersMobileOpen}>
                <SheetTrigger asChild>
                  <button className="relative inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 text-xs font-medium text-foreground hover:border-foreground/40 lg:hidden">
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    Filters
                    {activeFilterCount > 0 && (
                      <span className="ml-1 rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] overflow-y-auto p-4 sm:w-[340px]">
                  <SheetHeader>
                    <SheetTitle className="font-serif text-xl">Filters</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4">{filterSidebar}</div>
                </SheetContent>
              </Sheet>

              <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <SelectTrigger className="h-9 rounded-full border-border bg-card px-3 text-xs">
                  <ArrowUpDown className="mr-1.5 h-3.5 w-3.5" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value} className="text-sm">
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Grid */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
              <ShoppingBag className="h-10 w-10 text-muted-foreground" />
              <p className="mt-3 font-serif text-lg text-foreground">
                Nothing matches your filters
              </p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Try clearing some filters or broadening your price range.
              </p>
              <button
                onClick={() => setFilters(defaultFilters)}
                className="mt-4 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:border-foreground/40"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {filtered.map((p) => (
                <ShopifyProductCard
                  key={p.node.id}
                  product={p}
                  wished={wishedSet.has(p.node.id)}
                  onWishlist={() => toggleWishlist.mutate(p)}
                  onAddToCart={() => quickAddToCart(p)}
                  onAddToBoard={() => setBoardTarget(toPinnable(p))}
                  onOpenDetail={() => setDetailProduct(p)}
                  socialBadge={socialProofForProduct(p.node.id, circle.trendingMeta, myTribe)}
                  trending={trendingIds.has(p.node.id)}
                />
              ))}
            </div>
          )}

          {/* Recently viewed rail */}
          {recentlyViewed.length > 0 && (
            <div className="space-y-3 border-t border-border pt-6">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-serif text-lg font-semibold text-foreground">
                  Recently viewed
                </h3>
              </div>
              <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
                {recentlyViewed.map((p) => {
                  const img = p.node.images.edges[0]?.node?.url;
                  return (
                    <button
                      key={p.node.id}
                      onClick={() => setDetailProduct(p)}
                      className="group w-36 shrink-0 overflow-hidden rounded-xl border border-border bg-card text-left transition-all hover:-translate-y-0.5 hover:shadow-elevated"
                    >
                      <div className="aspect-[4/5] overflow-hidden bg-secondary/40">
                        {img && (
                          <img
                            src={img}
                            alt={p.node.title}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        )}
                      </div>
                      <div className="space-y-0.5 p-2.5">
                        <p className="line-clamp-1 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                          {p.node.vendor}
                        </p>
                        <p className="line-clamp-1 font-serif text-xs font-semibold text-foreground">
                          {p.node.title}
                        </p>
                        <p className="font-serif text-xs font-semibold text-foreground">
                          {formatMoney(
                            p.node.priceRange.minVariantPrice.amount,
                            p.node.priceRange.minVariantPrice.currencyCode
                          )}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <AddToBoardDialog
        item={boardTarget}
        open={!!boardTarget}
        onOpenChange={(open) => !open && setBoardTarget(null)}
      />

      <ProductDetailDialog
        product={detailProduct}
        open={!!detailProduct}
        onOpenChange={(open) => !open && setDetailProduct(null)}
        wished={detailProduct ? wishedSet.has(detailProduct.node.id) : false}
        onWishlist={() => detailProduct && toggleWishlist.mutate(detailProduct)}
        onAddToBoard={() => {
          if (detailProduct) {
            setBoardTarget(toPinnable(detailProduct));
            setDetailProduct(null);
          }
        }}
        allProducts={products}
        onSelectRelated={(p) => setDetailProduct(p)}
      />
    </div>
  );
};

// ---------------- Filter Panel ----------------

interface FilterPanelProps {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  onReset: () => void;
}

const FilterPanel = ({ filters, onChange, onReset }: FilterPanelProps) => {
  const toggle = <K extends "brands" | "sizes" | "colors">(
    key: K,
    value: string
  ) => {
    const list = filters[key];
    onChange({
      ...filters,
      [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value],
    });
  };

  return (
    <div className="space-y-6 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-base font-semibold text-foreground">Filters</h3>
        <button
          onClick={onReset}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3" /> Reset
        </button>
      </div>

      {/* Price range */}
      <FilterGroup label="Price">
        <div className="space-y-3 pt-1">
          <Slider
            min={priceBounds.min}
            max={priceBounds.max}
            step={5}
            value={filters.priceRange}
            onValueChange={(val) =>
              onChange({ ...filters, priceRange: val as [number, number] })
            }
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>${filters.priceRange[0]}</span>
            <span>${filters.priceRange[1]}</span>
          </div>
        </div>
      </FilterGroup>

      {/* Brands */}
      <FilterGroup label="Brand">
        <ul className="max-h-44 space-y-2 overflow-y-auto pr-1">
          {allBrands.map((b) => (
            <li key={b}>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                <Checkbox
                  checked={filters.brands.includes(b)}
                  onCheckedChange={() => toggle("brands", b)}
                />
                <span className="line-clamp-1">{b}</span>
              </label>
            </li>
          ))}
        </ul>
      </FilterGroup>

      {/* Sizes */}
      {allSizes.length > 0 && (
        <FilterGroup label="Size">
          <div className="flex flex-wrap gap-1.5">
            {allSizes.map((s) => {
              const active = filters.sizes.includes(s);
              return (
                <button
                  key={s}
                  onClick={() => toggle("sizes", s)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-all",
                    active
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-card text-foreground hover:border-foreground/40"
                  )}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </FilterGroup>
      )}

      {/* Colors */}
      {allColors.length > 0 && (
        <FilterGroup label="Color">
          <div className="flex flex-wrap gap-1.5">
            {allColors.map((c) => {
              const active = filters.colors.includes(c);
              return (
                <button
                  key={c}
                  onClick={() => toggle("colors", c)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-all",
                    active
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-card text-foreground hover:border-foreground/40"
                  )}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </FilterGroup>
      )}
    </div>
  );
};

const FilterGroup = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-2">
    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      {label}
    </p>
    {children}
  </div>
);

export default Shop;
