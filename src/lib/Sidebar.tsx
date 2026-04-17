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
  Layers,
  Crosshair,
  Activity
} from "lucide-react";
import { cn } from "./utils";
import { FloatingDock } from "../components/ui/floating-dock";

interface SidebarProps {
  isExpanded: boolean;
  setIsExpanded: (val: boolean) => void;
  isMobileOpen?: boolean;
  setIsMobileOpen?: (val: boolean) => void;
}

export function Sidebar({ isExpanded, setIsExpanded, isMobileOpen, setIsMobileOpen }: SidebarProps) {
  const location = useLocation();

  const isPathActive = (path: string) => {
    if (path === "/dashboard") return location.pathname === "/dashboard" || location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const navItems = [
    { 
      title: "Tradova",
      icon: (
        <div className="flex h-full w-full items-center justify-center rounded-full bg-blue-600 font-bold text-white text-xs">
          T
        </div>
      ),
      href: "/dashboard" 
    },
    { 
      title: "Dashboard",
      icon: <LayoutGrid className={cn("h-full w-full", isPathActive("/dashboard") ? "text-blue-500" : "text-neutral-500 dark:text-neutral-300")} />,
      href: "/dashboard" 
    },
    { 
      title: "Goals",
      icon: <Crosshair className={cn("h-full w-full", isPathActive("/goals") ? "text-blue-500" : "text-neutral-500 dark:text-neutral-300")} />,
      href: "/goals" 
    },
    { 
      title: "Accounts",
      icon: <Wallet className={cn("h-full w-full", isPathActive("/accounts") ? "text-blue-500" : "text-neutral-500 dark:text-neutral-300")} />,
      href: "/accounts" 
    },
    { 
      title: "Trades",
      icon: <CandlestickChart className={cn("h-full w-full", isPathActive("/trades") ? "text-blue-500" : "text-neutral-500 dark:text-neutral-300")} />,
      href: "/trades" 
    },
    { 
      title: "AI Engine",
      icon: <Sparkles className={cn("h-full w-full", isPathActive("/ai-engine") ? "text-blue-500" : "text-neutral-500 dark:text-neutral-300")} />,
      href: "/ai-engine" 
    },
    { 
      title: "Charting",
      icon: <Activity className={cn("h-full w-full", isPathActive("/charting-ai") ? "text-blue-500" : "text-neutral-500 dark:text-neutral-300")} />,
      href: "/charting-ai" 
    },
    { 
      title: "Journal",
      icon: <Notebook className={cn("h-full w-full", isPathActive("/journal") ? "text-blue-500" : "text-neutral-500 dark:text-neutral-300")} />,
      href: "/journal" 
    },
    { 
      title: "Strategies",
      icon: <Layers className={cn("h-full w-full", isPathActive("/strategies") ? "text-blue-500" : "text-neutral-500 dark:text-neutral-300")} />,
      href: "/strategies" 
    },
    { 
      title: "Market",
      icon: <TrendingUp className={cn("h-full w-full", isPathActive("/market") ? "text-blue-500" : "text-neutral-500 dark:text-neutral-300")} />,
      href: "/market" 
    },
    { 
      title: "Settings",
      icon: <Settings2 className={cn("h-full w-full", isPathActive("/settings") ? "text-blue-500" : "text-neutral-500 dark:text-neutral-300")} />,
      href: "/settings" 
    },
    { 
      title: "Profile",
      icon: <CircleUser className={cn("h-full w-full", isPathActive("/profile") ? "text-blue-500" : "text-neutral-500 dark:text-neutral-300")} />,
      href: "/profile" 
    },
  ];

  return (
    <div className="fixed bottom-6 left-0 right-0 z-[100] flex justify-center pointer-events-none">
      <div className="pointer-events-auto">
        <FloatingDock
          items={navItems}
          desktopClassName="bg-black/40 backdrop-blur-lg border border-white/10 shadow-2xl"
          mobileClassName="translate-y-0 bottom-4 right-4"
        />
      </div>
    </div>
  );
}

