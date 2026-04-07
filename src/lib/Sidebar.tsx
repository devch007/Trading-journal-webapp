import { Link, useLocation } from "react-router-dom";
import { 
  LayoutGrid, 
  CandlestickChart, 
  Notebook, 
  TrendingUp, 
  Settings2, 
  CircleUser,
  Wallet,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Layers,
  Crosshair,
  X
} from "lucide-react";
import { cn } from "./utils";

interface SidebarProps {
  isExpanded: boolean;
  setIsExpanded: (val: boolean) => void;
  isMobileOpen?: boolean;
  setIsMobileOpen?: (val: boolean) => void;
}

export function Sidebar({ isExpanded, setIsExpanded, isMobileOpen, setIsMobileOpen }: SidebarProps) {
  const location = useLocation();

  const navItems = [
    { icon: LayoutGrid,      path: "/dashboard",  title: "Dashboard" },
    { icon: Crosshair,       path: "/goals",       title: "Goals" },
    { icon: Wallet,          path: "/accounts",    title: "Accounts" },
    { icon: CandlestickChart,path: "/trades",      title: "Trades" },
    { icon: Sparkles,        path: "/ai-engine",   title: "AI Engine" },
    { icon: Notebook,        path: "/journal",     title: "Journal" },
    { icon: Layers,          path: "/strategies",  title: "Strategies" },
    { icon: TrendingUp,      path: "/market",      title: "Market" },
    { icon: Settings2,       path: "/settings",    title: "Settings" },
  ];

  const isPathActive = (path: string) => {
    if (path === "/dashboard") return location.pathname === "/dashboard" || location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Ambient glow source behind sidebar (hidden on mobile to save performance/clean look) */}
      <div
        className="sidebar-ambient-glow hidden md:block"
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          width: isExpanded ? "280px" : "96px",
          height: "100vh",
          background: "radial-gradient(ellipse 60% 80% at 0% 30%, rgba(30,80,200,0.18) 0%, transparent 80%)",
          pointerEvents: "none",
          zIndex: 49,
          transition: "width 0.35s cubic-bezier(0.4,0,0.2,1)",
        }}
      />

      <aside
        className={cn(
          "sidebar-glass fixed left-0 top-0 h-screen flex flex-col py-7 z-50 transition-all duration-350",
          !isMobileOpen ? "-translate-x-full md:translate-x-0" : "translate-x-0",
          (isExpanded || isMobileOpen) ? "w-[280px] md:w-[220px] px-5" : "w-[68px] items-center px-3"
        )}
      >
        {/* Top: Logo */}
        <div className={cn("mb-10 flex items-center gap-3 w-full", (!(isExpanded || isMobileOpen)) && "justify-center relative")}>
          <div className="sidebar-logo-gem shrink-0">
            <span className="sidebar-logo-letter">T</span>
          </div>
          {(isExpanded || isMobileOpen) && (
            <span className="sidebar-wordmark">TRADOVA</span>
          )}
          {/* Mobile close button */}
          {isMobileOpen && (
            <button 
              className="md:hidden ml-auto p-2 text-white/60 hover:text-white transition-colors"
              onClick={() => setIsMobileOpen && setIsMobileOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Main nav */}
        <nav className="flex flex-col gap-1 flex-1 w-full">
          {navItems.map((item) => {
            const active = isPathActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "sidebar-nav-item group",
                  active ? "sidebar-nav-active" : "sidebar-nav-idle",
                  !isExpanded && "justify-center"
                )}
              >
                {/* Shimmer sweep on hover */}
                <span className="sidebar-shimmer" aria-hidden />

                {/* Active glow backdrop */}
                {active && <span className="sidebar-active-glow" aria-hidden />}

                <item.icon
                  className={cn(
                    "sidebar-nav-icon shrink-0",
                    active ? "sidebar-icon-active" : "sidebar-icon-idle"
                  )}
                />

                {(isExpanded || isMobileOpen) && (
                  <span className={cn("sidebar-nav-label", active && "sidebar-label-active")}>
                    {item.title}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="mt-auto flex flex-col gap-1 w-full">
          {/* Divider */}
          <div className="sidebar-divider mb-2" />

          {/* Profile */}
          <Link
            to="/profile"
            className={cn(
              "sidebar-nav-item group",
              isPathActive("/profile") ? "sidebar-nav-active" : "sidebar-nav-idle",
              !isExpanded && "justify-center"
            )}
          >
            <span className="sidebar-shimmer" aria-hidden />
            {isPathActive("/profile") && <span className="sidebar-active-glow" aria-hidden />}
            <CircleUser
              className={cn(
                "sidebar-nav-icon shrink-0",
                isPathActive("/profile") ? "sidebar-icon-active" : "sidebar-icon-idle"
              )}
            />
            {(isExpanded || isMobileOpen) && (
              <span className={cn("sidebar-nav-label", isPathActive("/profile") && "sidebar-label-active")}>
                Profile
              </span>
            )}
          </Link>

          {/* Collapse toggle (hidden on mobile) */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              "sidebar-collapse-btn group hidden md:flex",
              !isExpanded && "justify-center"
            )}
            aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
          >
            <span className="sidebar-shimmer" aria-hidden />
            {isExpanded ? (
              <>
                <ChevronLeft className="sidebar-nav-icon sidebar-icon-idle shrink-0" />
                {(isExpanded || isMobileOpen) && (
                  <span className="sidebar-nav-label">{isExpanded ? "Collapse" : "Expand"}</span>
                )}
              </>
            ) : (
              <ChevronRight className="sidebar-nav-icon sidebar-icon-idle shrink-0" />
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
