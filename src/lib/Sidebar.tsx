import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutGrid, 
  TrendingUp, 
  Wallet, 
  FileText, 
  Layers, 
  Search, 
  LogOut,
  Sparkles,
  Target,
  PanelLeftClose,
  PanelLeft,
  ChevronRight,
  PieChart
} from "lucide-react";
import { cn } from "./utils";
import { useAuth } from "../contexts/AuthContext";
import { motion } from "motion/react";

interface SidebarProps {
  isExpanded?: boolean;
  setIsExpanded?: (val: boolean) => void;
  isMobileOpen?: boolean;
  setIsMobileOpen?: (val: boolean) => void;
}

export function Sidebar({ isMobileOpen, setIsMobileOpen }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userProfile, logout } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  
  // Collapsed state persisted in localStorage
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidebar_collapsed") === "true";
    }
    return false;
  });

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem("sidebar_collapsed", String(next));
      return next;
    });
  };

  useEffect(() => {
    const handleToggle = () => toggleCollapse();
    window.addEventListener("toggleSidebarCollapse", handleToggle);
    return () => window.removeEventListener("toggleSidebarCollapse", handleToggle);
  }, []);

  const isPathActive = (path: string) => {
    if (path === "/dashboard") return location.pathname === "/dashboard" || location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const displayName = userProfile?.email 
    ? userProfile.email.split('@')[0] 
    : user?.email 
      ? user.email.split('@')[0] 
      : "Max Verstappen";
      
  const displayEmail = userProfile?.email || user?.email || "maxverstappen@gmail.com";

  const navSections = [
    {
      title: "Main Menu",
      items: [
        { title: "Overview", icon: LayoutGrid, href: "/dashboard", shortcut: "1" },
        { title: "Trades Log", icon: TrendingUp, href: "/trades", shortcut: "2" },
        { title: "AI Engine", icon: Sparkles, href: "/ai-engine", shortcut: "3" },
        { title: "Linked Account", icon: Wallet, href: "/accounts", shortcut: "4" },
      ]
    },
    {
      title: "Trading",
      items: [
        { title: "Stratzy", icon: Layers, href: "/strategies", shortcut: "6" },
        { title: "Goals", icon: Target, href: "/goals", shortcut: "7" },
        { title: "Trade Analysis", icon: FileText, href: "/journal", shortcut: "5" },
      ]
    },
    {
      title: "Wealth & Portfolio",
      items: [
        { title: "Investments", icon: PieChart, href: "/investments", shortcut: "8" },
      ]
    }
  ];

  return (
    <>
      <aside 
        className={cn(
          "bg-[#fbfbfc] dark:bg-[#0f1015] border-r border-[#eaecf0] dark:border-neutral-800/80 flex flex-col h-full shrink-0 transition-all duration-300 z-50 select-none relative",
          "fixed inset-y-0 left-0 md:static md:translate-x-0",
          isCollapsed ? "w-20" : "w-64",
          isMobileOpen ? "translate-x-0 !w-64" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Brand Logo Header & Collapse Toggle */}
        <div className={cn(
          "pt-6 pb-4 flex items-center justify-between",
          isCollapsed ? "px-4 justify-center" : "px-5"
        )}>
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-[#111827] dark:bg-white flex items-center justify-center text-white dark:text-gray-900 font-black text-sm shadow-xs group-hover:scale-105 transition-transform">
              <span className="font-headline tracking-tight">X</span>
            </div>
            {!isCollapsed && (
              <span className="font-bold text-xl tracking-tight text-[#111827] dark:text-white font-headline">
                TradeX
              </span>
            )}
          </Link>

          {/* Desktop Collapse / Expand Button */}
          {!isCollapsed && (
            <button
              onClick={toggleCollapse}
              title="Collapse Sidebar (⌘B or [)"
              className="hidden md:flex p-1.5 rounded-xl text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Collapsed Expand Toggle when minimized */}
        {isCollapsed && (
          <div className="hidden md:flex justify-center mb-2 px-2">
            <button
              onClick={toggleCollapse}
              title="Expand Sidebar (⌘B or [)"
              className="p-1.5 rounded-xl text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Search Bar in Sidebar with Liquid Glass */}
        {!isCollapsed && (
          <div className="px-4 mb-3">
            <div className="relative flex items-center group">
              <Search className="w-3.5 h-3.5 text-gray-400 group-focus-within:text-blue-500 absolute left-3 pointer-events-none transition-colors" />
              <input 
                type="text" 
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs 
                  bg-white/80 dark:bg-white/[0.04] 
                  backdrop-blur-xl
                  border border-gray-200/80 dark:border-white/10 
                  rounded-xl text-gray-800 dark:text-gray-200 
                  placeholder-gray-400 font-normal 
                  focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40
                  transition-all shadow-[0_1px_4px_rgba(0,0,0,0.02)] 
                  dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
              />
            </div>
          </div>
        )}

        {/* Scrollable Navigation Items */}
        <div className={cn(
          "flex-1 overflow-y-auto space-y-4 no-scrollbar py-1",
          isCollapsed ? "px-2.5" : "px-3.5"
        )}>
          {navSections.map((section, idx) => {
            const filteredItems = section.items.filter(item => 
              item.title.toLowerCase().includes(searchTerm.toLowerCase())
            );

            if (filteredItems.length === 0) return null;

            return (
              <div key={idx} className="space-y-1">
                {!isCollapsed && (
                  <p className="px-3 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1 font-headline">
                    {section.title}
                  </p>
                )}
                <div className="space-y-1">
                  {filteredItems.map((item) => {
                    const active = isPathActive(item.href);
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.title}
                        to={item.href}
                        onClick={() => setIsMobileOpen?.(false)}
                        title={isCollapsed ? `${item.title} (${item.shortcut})` : undefined}
                        className={cn(
                          "flex items-center rounded-xl text-[13px] font-medium transition-all duration-200 group relative",
                          isCollapsed 
                            ? "justify-center p-2.5" 
                            : "gap-3 px-3 py-2.5",
                          active
                            ? "bg-blue-50/80 dark:bg-blue-500/[0.12] text-gray-900 dark:text-white font-semibold border border-blue-200/60 dark:border-blue-500/20 shadow-2xs"
                            : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/70 dark:hover:bg-white/[0.04]"
                        )}
                      >
                        {/* Tiny Blue Indicator Capsule on Active */}
                        {active && (
                          <motion.span
                            layoutId="activeIndicator"
                            className={cn(
                              "absolute bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]",
                              isCollapsed ? "left-0 top-1/2 -translate-y-1/2 w-1 h-5" : "left-1 top-1/2 -translate-y-1/2 w-1 h-4"
                            )}
                            transition={{ type: "spring", stiffness: 350, damping: 30 }}
                          />
                        )}

                        {/* Icon with 1-2px move on hover */}
                        <Icon 
                          className={cn(
                            "w-4 h-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5",
                            active 
                              ? "text-blue-600 dark:text-blue-400" 
                              : "text-gray-400 dark:text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-200"
                          )} 
                        />
                        
                        {!isCollapsed && (
                          <>
                            <span className="truncate flex-1 transition-colors duration-200">
                              {item.title}
                            </span>
                            {item.shortcut && (
                              <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity px-1.5 py-0.2 rounded bg-gray-100 dark:bg-neutral-800">
                                {item.shortcut}
                              </span>
                            )}
                          </>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* User Profile Card at Bottom */}
        <div className={cn(
          "border-t border-[#eaecf0] dark:border-neutral-800/80 bg-[#fbfbfc] dark:bg-[#0f1015]",
          isCollapsed ? "p-2 flex justify-center" : "p-3"
        )}>
          {isCollapsed ? (
            <Link to="/profile" title={`${displayName} (${displayEmail})`} className="p-1 rounded-xl hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white text-xs font-bold shadow-xs">
                {displayName.charAt(0).toUpperCase()}
              </div>
            </Link>
          ) : (
            <div className="flex items-center justify-between p-2 rounded-2xl bg-white dark:bg-[#16181f] border border-[#e5e7eb] dark:border-neutral-800/80 shadow-2xs hover:border-gray-300 dark:hover:border-neutral-700 transition-colors">
              <Link to="/profile" className="flex items-center gap-2.5 overflow-hidden flex-1 group">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {displayName}
                  </span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                    {displayEmail}
                  </span>
                </div>
              </Link>
              <button 
                onClick={logout}
                title="Logout"
                className="p-1.5 text-gray-400 hover:text-rose-500 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors shrink-0 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
