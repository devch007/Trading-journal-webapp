import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutGrid, 
  TrendingUp, 
  CheckSquare, 
  BarChart3, 
  Wallet, 
  Users, 
  Radio, 
  FileText, 
  ShieldCheck, 
  CreditCard, 
  Layers, 
  Headphones, 
  HelpCircle, 
  Settings, 
  Search, 
  LogOut,
  ChevronRight,
  Sparkles,
  Target
} from "lucide-react";
import { cn } from "./utils";
import { useAuth } from "../contexts/AuthContext";

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
        { title: "Overview", icon: LayoutGrid, href: "/dashboard" },
        { title: "Trades Log", icon: TrendingUp, href: "/trades" },
        { title: "AI Engine", icon: Sparkles, href: "/ai-engine" },
        { title: "Linked Account", icon: Wallet, href: "/accounts" },
      ]
    },
    {
      title: "Trading",
      items: [
        { title: "Stratzy", icon: Layers, href: "/strategies" },
        { title: "Goals", icon: Target, href: "/goals" },
        { title: "Trade Analysis", icon: FileText, href: "/journal" },
      ]
    }
  ];

  return (
    <>
      <aside 
        className={cn(
          "w-64 bg-[#fbfbfc] dark:bg-[#0f1015] border-r border-[#eaecf0] dark:border-neutral-800/80 flex flex-col h-full shrink-0 transition-transform duration-300 z-50",
          "fixed inset-y-0 left-0 md:static md:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand Logo Header */}
        <div className="px-6 pt-7 pb-5 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <span className="font-semibold text-2xl tracking-tight text-[#111827] dark:text-white font-headline">
              TradeX
            </span>
          </Link>
        </div>

        {/* Search Bar in Sidebar with Liquid Glass */}
        <div className="px-5 mb-3">
          <div className="relative flex items-center group">
            <Search className="w-4 h-4 text-gray-400 group-focus-within:text-blue-500 absolute left-3 pointer-events-none transition-colors" />
            <input 
              type="text" 
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs 
                bg-white/70 dark:bg-white/[0.04] 
                backdrop-blur-xl
                border border-white/90 dark:border-white/10 
                rounded-xl text-gray-800 dark:text-gray-200 
                placeholder-gray-400 font-normal 
                focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40
                transition-all shadow-[0_2px_8px_rgba(0,0,0,0.03),inset_0_1px_1px_rgba(255,255,255,0.9)] 
                dark:shadow-[0_2px_8px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.08)]"
            />
          </div>
        </div>

        {/* Scrollable Navigation Items */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-6 no-scrollbar">
          {navSections.map((section, idx) => {
            // Filter items by search if user is typing
            const filteredItems = section.items.filter(item => 
              item.title.toLowerCase().includes(searchTerm.toLowerCase())
            );

            if (filteredItems.length === 0) return null;

            return (
              <div key={idx} className="space-y-1">
                <p className="px-3 text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">
                  {section.title}
                </p>
                <div className="space-y-1">
                  {filteredItems.map((item) => {
                    const active = isPathActive(item.href);
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.title}
                        to={item.href}
                        onClick={() => setIsMobileOpen?.(false)}
                        className={cn(
                          "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 group relative",
                          active
                            ? "bg-white dark:bg-[#1c1e26] text-gray-900 dark:text-white font-medium shadow-xs border border-gray-200/70 dark:border-neutral-700/60"
                            : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
                        )}
                      >
                        <Icon 
                          className={cn(
                            "w-4 h-4 shrink-0 transition-colors",
                            active 
                              ? "text-gray-900 dark:text-white" 
                              : "text-gray-400 dark:text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300"
                          )} 
                        />
                        <span className="truncate">{item.title}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* User Profile Card at Bottom */}
        <div className="p-3.5 border-t border-[#eaecf0] dark:border-neutral-800/80 bg-[#fbfbfc] dark:bg-[#0f1015]">
          <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-[#16181f] border border-[#e5e7eb] dark:border-neutral-800 shadow-2xs">
            <Link to="/profile" className="flex items-center gap-2.5 overflow-hidden flex-1">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-xs">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-gray-900 dark:text-white truncate">
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
              className="p-1.5 text-gray-400 hover:text-rose-500 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
