import { Home, Flame, LayoutGrid, Bot, Settings, X, ShoppingBag, Compass, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const navItems = [
  { id: "dashboard", icon: Home, label: "Home" },
  { id: "studio", icon: Sparkles, label: "Swipe Studio" },
  { id: "shop", icon: ShoppingBag, label: "Shop" },
  { id: "discover", icon: Compass, label: "Discover" },
  { id: "flash-sales", icon: Flame, label: "Flash Sales" },
  { id: "boards", icon: LayoutGrid, label: "Mood Boards" },
  { id: "concierge", icon: Bot, label: "AI Concierge" },
];

const AppSidebar = ({ activeTab, onTabChange, mobileOpen = false, onMobileClose }: SidebarProps) => {
  const navigate = useNavigate();

  const handleSelect = (id: string) => {
    onTabChange(id);
    onMobileClose?.();
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen flex-col items-center border-r border-border bg-sidebar py-6 gap-2 transition-transform duration-300",
          // Desktop: always visible, narrow rail
          "md:w-[72px] md:translate-x-0",
          // Mobile: slide in/out, wider with labels
          "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex w-full items-center justify-between px-4 md:justify-center md:px-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-gold">
            <span className="text-sm font-bold text-primary-foreground">P</span>
          </div>
          <button
            onClick={onMobileClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary md:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-4 flex w-full flex-1 flex-col items-stretch gap-1 px-3 md:items-center md:px-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={cn(
                  "group relative flex h-11 items-center gap-3 rounded-lg px-3 transition-all duration-200 md:w-11 md:justify-center md:px-0",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
                title={item.label}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="text-sm font-medium md:hidden">{item.label}</span>
                {isActive && (
                  <span className="absolute left-0 top-1/2 hidden h-5 w-0.5 -translate-y-1/2 rounded-r bg-primary md:block" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="w-full px-3 md:px-0">
          <button
            onClick={() => {
              navigate("/settings");
              onMobileClose?.();
            }}
            className="flex h-11 w-full items-center gap-3 rounded-lg px-3 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:w-11 md:justify-center md:px-0"
            title="Settings"
          >
            <Settings className="h-5 w-5 shrink-0" />
            <span className="text-sm font-medium md:hidden">Settings</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default AppSidebar;
