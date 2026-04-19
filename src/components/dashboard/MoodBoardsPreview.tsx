import { Plus, ArrowRight } from "lucide-react";

const boards = [
  { name: "Summer Essentials", items: 12, color: "from-amber-500/20 to-orange-500/20" },
  { name: "Minimalist Wardrobe", items: 8, color: "from-slate-500/20 to-zinc-500/20" },
  { name: "Date Night", items: 5, color: "from-rose-500/20 to-pink-500/20" },
];

const MoodBoardsPreview = () => {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg font-semibold text-foreground">Mood Boards</h3>
        <button className="flex items-center gap-1 text-sm text-primary hover:text-gold-light transition-colors">
          View all <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {boards.map((board) => (
          <div
            key={board.name}
            className={`flex aspect-square flex-col items-center justify-center rounded-xl border border-border bg-gradient-to-br ${board.color} p-3 transition-all hover:scale-[1.02] hover:border-primary/20 cursor-pointer`}
          >
            <span className="text-center text-sm font-medium text-foreground">{board.name}</span>
            <span className="mt-1 text-xs text-muted-foreground">{board.items} items</span>
          </div>
        ))}
        <button className="flex aspect-square flex-col items-center justify-center rounded-xl border border-dashed border-border transition-colors hover:border-primary/30 hover:bg-primary/5">
          <Plus className="h-5 w-5 text-muted-foreground" />
          <span className="mt-1 text-xs text-muted-foreground">New Board</span>
        </button>
      </div>
    </div>
  );
};

export default MoodBoardsPreview;
