import { useState } from "react";
import { X, DollarSign, Palette, Sparkles, Plus } from "lucide-react";
import { useConciergeMemory } from "@/stores/conciergeMemory";

const BUDGET_OPTIONS = ["<$100", "<$200", "<$500", "$500+"];
const STYLE_OPTIONS = ["Minimal / Neutral", "Streetwear", "Romantic", "Editorial", "Boho"];

const MemoryChips = () => {
  const memory = useConciergeMemory();
  const [editing, setEditing] = useState<null | "budget" | "style" | "brand">(null);
  const [brandInput, setBrandInput] = useState("");

  const hasAnything =
    memory.budget || memory.style || memory.brands.length > 0 || memory.colors.length > 0;

  return (
    <div className="border-b border-border bg-secondary/20 px-4 py-3 sm:px-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Memory</span>

        {/* Budget */}
        {memory.budget ? (
          <Chip
            icon={<DollarSign className="h-3 w-3" />}
            label={`Budget: ${memory.budget}`}
            onClear={() => memory.setField("budget", undefined)}
          />
        ) : (
          <button
            onClick={() => setEditing(editing === "budget" ? null : "budget")}
            className="flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-foreground"
          >
            <Plus className="h-3 w-3" /> Budget
          </button>
        )}

        {/* Style */}
        {memory.style ? (
          <Chip
            icon={<Sparkles className="h-3 w-3" />}
            label={`Style: ${memory.style}`}
            onClear={() => memory.setField("style", undefined)}
          />
        ) : (
          <button
            onClick={() => setEditing(editing === "style" ? null : "style")}
            className="flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-foreground"
          >
            <Plus className="h-3 w-3" /> Style
          </button>
        )}

        {/* Brands */}
        {memory.brands.map((b) => (
          <Chip
            key={b}
            icon={<Palette className="h-3 w-3" />}
            label={b}
            onClear={() => memory.removeBrand(b)}
          />
        ))}
        <button
          onClick={() => setEditing(editing === "brand" ? null : "brand")}
          className="flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-foreground"
        >
          <Plus className="h-3 w-3" /> Brand
        </button>

        {hasAnything && (
          <button
            onClick={() => memory.reset()}
            className="ml-auto text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      {/* Editors */}
      {editing === "budget" && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {BUDGET_OPTIONS.map((b) => (
            <button
              key={b}
              onClick={() => {
                memory.setField("budget", b);
                setEditing(null);
              }}
              className="rounded-full bg-secondary px-2.5 py-1 text-[11px] text-foreground hover:bg-primary hover:text-primary-foreground"
            >
              {b}
            </button>
          ))}
        </div>
      )}
      {editing === "style" && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {STYLE_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => {
                memory.setField("style", s);
                setEditing(null);
              }}
              className="rounded-full bg-secondary px-2.5 py-1 text-[11px] text-foreground hover:bg-primary hover:text-primary-foreground"
            >
              {s}
            </button>
          ))}
        </div>
      )}
      {editing === "brand" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const v = brandInput.trim();
            if (v) {
              memory.addBrand(v);
              setBrandInput("");
              setEditing(null);
            }
          }}
          className="mt-2 flex gap-2"
        >
          <input
            autoFocus
            value={brandInput}
            onChange={(e) => setBrandInput(e.target.value)}
            placeholder="e.g. Aritzia"
            className="flex-1 rounded-full border border-border bg-background px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button className="rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background">
            Add
          </button>
        </form>
      )}
    </div>
  );
};

const Chip = ({
  icon,
  label,
  onClear,
}: {
  icon: React.ReactNode;
  label: string;
  onClear: () => void;
}) => (
  <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-foreground">
    {icon}
    {label}
    <button onClick={onClear} aria-label="Clear" className="ml-0.5 text-muted-foreground hover:text-foreground">
      <X className="h-3 w-3" />
    </button>
  </span>
);

export default MemoryChips;
