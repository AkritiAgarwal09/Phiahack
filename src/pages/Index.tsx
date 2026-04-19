import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import AppSidebar from "@/components/layout/Sidebar";
import LandingHero from "@/components/landing/LandingHero";
import HomeDiscoverRail from "@/components/dashboard/HomeDiscoverRail";
import HomeNudgeChip from "@/components/dashboard/HomeNudgeChip";
import StyleTribeCard from "@/components/dashboard/StyleTribeCard";
import WeeklyDigestCard from "@/components/dashboard/WeeklyDigestCard";
import FlashSales from "@/pages/FlashSales";
import MoodBoards from "@/pages/MoodBoards";
import Wishlist from "@/pages/Wishlist";
import Rewards from "@/pages/Rewards";
import AIConcierge from "@/pages/AIConcierge";
import Referrals from "@/pages/Referrals";
import Shop from "@/pages/Shop";
import Discover from "@/pages/Discover";
import SharedCartsHub from "@/pages/SharedCartsHub";
import OrderHistory from "@/pages/OrderHistory";
import SwipeStudio from "@/pages/SwipeStudio";
import StyleProfilePage from "@/pages/StyleProfilePage";
import Onboarding from "@/pages/Onboarding";
import NotificationBell from "@/components/NotificationBell";
import CartDrawer from "@/components/shop/CartDrawer";
import FloatingConcierge from "@/components/concierge/FloatingConcierge";
import ProfileMenu from "@/components/ProfileMenu";
import { useCartStore } from "@/stores/cartStore";
import { useCartSync } from "@/hooks/useCartSync";
import { useAuth } from "@/contexts/AuthContext";
import { loadMyStyleProfile } from "@/services/swipeService";
import { seedWelcomeNotificationsIfNeeded } from "@/services/seedNotifications";
import { Menu, ShoppingBag, Share2, Heart } from "lucide-react";

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialTab = searchParams.get("tab") || "dashboard";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth();
  const setCartOpen = useCartStore((s) => s.setOpen);
  const cartCount = useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0));
  useCartSync();

  // Onboarding gate — first-run users with no completed style profile see the onboarding deck
  const { data: styleProfile, isLoading: profileLoading, refetch: refetchStyleProfile } = useQuery({
    queryKey: ["onboarding_gate", user?.id],
    queryFn: loadMyStyleProfile,
    enabled: !!user,
  });
  const [skippedOnboarding, setSkippedOnboarding] = useState(false);
  const needsOnboarding =
    !!user && !profileLoading && !skippedOnboarding && !styleProfile?.onboarding_completed_at;

  useEffect(() => {
    const current = searchParams.get("tab");
    if (activeTab === "dashboard" && current) setSearchParams({}, { replace: true });
    else if (activeTab !== "dashboard" && current !== activeTab)
      setSearchParams({ tab: activeTab }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Seed a welcome / update notifications burst the first time a user lands
  useEffect(() => {
    if (user?.id) {
      seedWelcomeNotificationsIfNeeded(user.id);
    }
  }, [user?.id]);

  const renderContent = () => {
    switch (activeTab) {
      case "shop": return <Shop />;
      case "discover": return <Discover />;
      case "flash-sales": return <FlashSales />;
      case "boards": return <MoodBoards />;
      case "wishlist": return <Wishlist />;
      case "shared-carts":
      case "shared-with-me":
      case "my-shared-carts":
        return <SharedCartsHub />;
      case "orders": return <OrderHistory />;
      case "rewards": return <Rewards />;
      case "concierge": return <AIConcierge />;
      case "referrals": return <Referrals />;
      case "studio":
        return <SwipeStudio onOpenProfile={() => setActiveTab("style-profile")} />;
      case "style-profile":
        return (
          <StyleProfilePage
            onOpenStudio={() => setActiveTab("studio")}
            onOpenConcierge={() => setActiveTab("concierge")}
          />
        );
      default:
        return (
          <div className="midnight">
            <LandingHero
              onStart={() => setActiveTab("shop")}
              onSecondary={() => setActiveTab("concierge")}
              secondaryLabel="Talk to Concierge"
            />
            <WeeklyDigestCard
              onOpenDiscover={() => setActiveTab("discover")}
              onOpenConcierge={() => setActiveTab("concierge")}
            />
            <StyleTribeCard onOpenDiscover={() => setActiveTab("discover")} />
            <HomeDiscoverRail onOpenDiscover={() => setActiveTab("discover")} />
          </div>
        );
    }
  };

  const isFullHeight = activeTab === "concierge";
  const isEdgeToEdge = activeTab === "concierge" || activeTab === "dashboard";

  if (needsOnboarding) {
    return (
      <div className="min-h-screen bg-background">
        <Onboarding
          onComplete={() => {
            refetchStyleProfile();
            setActiveTab("studio");
          }}
          onSkip={() => setSkippedOnboarding(true)}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      <main className={`flex-1 md:ml-[72px] ${isFullHeight ? "flex flex-col" : "overflow-y-auto"}`}>
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-xl sm:px-6 sm:py-4 md:px-8">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border text-foreground hover:bg-secondary md:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate font-serif text-lg font-bold text-foreground sm:text-2xl">Phia Circle</h1>
              <p className="hidden text-sm text-muted-foreground sm:block">Welcome back, fashionista ✨</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <NotificationBell />
            <button
              onClick={() => setActiveTab("shared-carts")}
              className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-secondary"
              aria-label="Shared carts"
              title="Shared carts"
            >
              <Share2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setActiveTab("wishlist")}
              className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-secondary"
              aria-label="Wishlist"
              title="Wishlist"
            >
              <Heart className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCartOpen(true)}
              className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-secondary"
              aria-label="Open cart"
            >
              <ShoppingBag className="h-4 w-4" />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {cartCount}
                </span>
              )}
            </button>
            <ProfileMenu onTabChange={setActiveTab} />
          </div>
        </header>

        <div className={`${isFullHeight ? "flex-1 overflow-hidden" : isEdgeToEdge ? "" : "p-4 sm:p-6 md:p-8"}`}>
          {renderContent()}
        </div>
      </main>

      <CartDrawer />

      {activeTab !== "concierge" && (
        <FloatingConcierge variant="app" onExpand={() => setActiveTab("concierge")} />
      )}

      {activeTab === "dashboard" && (
        <HomeNudgeChip onOpenConcierge={() => setActiveTab("concierge")} />
      )}
    </div>
  );
};

export default Index;
