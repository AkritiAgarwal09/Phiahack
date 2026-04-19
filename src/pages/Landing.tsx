import { useNavigate } from "react-router-dom";
import LandingHero from "@/components/landing/LandingHero";
import FloatingConcierge from "@/components/concierge/FloatingConcierge";
import { useAuth } from "@/contexts/AuthContext";

const Landing = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const handleStart = () => {
    if (user) navigate("/app");
    else navigate("/auth");
  };

  return (
    <div className="midnight relative min-h-screen overflow-hidden text-white">
      {/* Top nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-12 sm:py-8">
        <div className="w-20" />
        <h1 className="absolute left-1/2 -translate-x-1/2 font-serif text-2xl italic text-white sm:text-3xl">
          phia
        </h1>
        {!loading && !user ? (
          <button
            onClick={() => navigate("/auth")}
            className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-medium tracking-wider text-white/80 backdrop-blur transition-colors hover:bg-white/10 sm:text-sm"
          >
            Sign in
          </button>
        ) : (
          <div className="w-20" />
        )}
      </nav>

      <LandingHero onStart={handleStart} />

      <FloatingConcierge variant="landing" onExpand={() => navigate(user ? "/app?tab=concierge" : "/auth")} />
    </div>
  );
};

export default Landing;
