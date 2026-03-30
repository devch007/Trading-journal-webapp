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
  ChevronLeft
} from "lucide-react";
import { cn } from "./utils";

interface SidebarProps {
  isExpanded: boolean;
  setIsExpanded: (val: boolean) => void;
}

export function Sidebar({ isExpanded, setIsExpanded }: SidebarProps) {
  const location = useLocation();

  const navItems = [
    { icon: LayoutGrid, path: "/", title: "Dashboard" },
    { icon: Wallet, path: "/accounts", title: "Accounts" },
    { icon: CandlestickChart, path: "/trades", title: "Trades" },
    { icon: Sparkles, path: "/ai-engine", title: "AI Engine" },
    { icon: Notebook, path: "/journal", title: "Journal" },
    { icon: TrendingUp, path: "/market", title: "Market" },
    { icon: Settings2, path: "/settings", title: "Settings" },
  ];

  return (
    <aside className={cn(
      "fixed left-0 top-0 h-screen border-r border-blue-500/40 bg-gradient-to-b from-blue-900/50 via-blue-950/30 to-[#0d0d16] flex flex-col py-8 z-50 transition-all duration-300 backdrop-blur-xl",
      isExpanded ? "w-64 px-6" : "w-16 items-center"
    )}>
      <div className={cn("mb-12", isExpanded ? "flex items-center gap-3" : "flex justify-center")}>
        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.3)]">
          <span className="text-primary font-bold text-xl font-headline">
            T
          </span>
        </div>
        {isExpanded && (
          <span className="text-white font-bold text-lg tracking-tight font-headline">
            TRADEX
          </span>
        )}
      </div>

      <nav className="flex flex-col gap-4 flex-1 w-full">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "group relative flex items-center transition-all duration-300 active:scale-95 px-4 py-2.5 rounded-xl border-x-2 border-y border-transparent mx-2",
                isExpanded ? "gap-4 hover:bg-blue-500/10 hover:border-blue-500/20" : "justify-center",
                isActive ? "text-primary bg-primary/20 border-x-primary border-y-primary/10" : "text-gray-500 hover:text-blue-300"
              )}
            >
              {isActive && !isExpanded && (
                <div className="absolute left-[-16px] w-[3px] h-6 bg-primary rounded-r-full shadow-[4px_0_12px_rgba(59,130,246,0.5)]" />
              )}
              {isActive && isExpanded && (
                <div className="absolute left-0 w-[3px] h-6 bg-primary rounded-r-full shadow-[4px_0_12px_rgba(59,130,246,0.5)]" />
              )}
              <item.icon className={cn("w-6 h-6 shrink-0 transition-transform duration-300", !isExpanded && "group-hover:scale-110")} />
              {isExpanded && (
                <span className="text-sm font-bold tracking-wide whitespace-nowrap">
                  {item.title}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-6 w-full">
        <Link
          to="/profile"
          className={cn(
            "group relative flex items-center transition-all duration-300 active:scale-95 px-4 py-2.5 rounded-xl border-x-2 border-y border-transparent mx-2",
            isExpanded ? "gap-4 hover:bg-blue-500/10 hover:border-blue-500/20" : "justify-center",
            location.pathname === "/profile" ? "text-primary bg-primary/20 border-x-primary border-y-primary/10" : "text-gray-500 hover:text-indigo-300"
          )}
        >
          <CircleUser className="w-6 h-6 shrink-0" />
          {isExpanded && (
            <span className="text-sm font-bold tracking-wide">
              Profile
            </span>
          )}
        </Link>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "flex items-center transition-all duration-300 hover:text-primary active:scale-90 px-4 py-2.5 rounded-xl hover:bg-blue-500/10 border border-transparent hover:border-blue-500/20 mx-2",
            isExpanded ? "gap-4 text-gray-400" : "justify-center text-gray-500"
          )}
        >
          {isExpanded ? (
            <>
              <ChevronLeft className="w-6 h-6 shrink-0" />
              <span className="text-sm font-bold tracking-wide">Collapse</span>
            </>
          ) : (
            <ChevronRight className="w-6 h-6 shrink-0" />
          )}
        </button>
      </div>
    </aside>
  );
}
