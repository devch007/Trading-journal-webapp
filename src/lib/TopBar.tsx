import React, { useState, useEffect } from "react";
import { 
  Search, 
  Menu, 
  Headphones
} from "lucide-react";
import { CommandPalette } from "../components/CommandPalette";
import { ThemeToggle } from "../components/ThemeToggle";

interface TopBarProps {
  title?: string;
  subtitle?: string;
  showAccountSelector?: boolean;
  showSearch?: boolean;
  actionButton?: React.ReactNode;
}

export function TopBar({ 
  title = "Dashboard", 
  subtitle, 
  showAccountSelector = true, 
  showSearch = true, 
  actionButton 
}: TopBarProps) {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <header className="flex justify-between items-center w-full px-6 py-4 md:px-8 md:py-5 border-b border-[#eaecf0]/80 dark:border-neutral-800/80 bg-white/60 dark:bg-[#0f1015]/60 backdrop-blur-md sticky top-0 z-40">
      {/* Left: Title */}
      <div className="flex items-center gap-3.5">
        <button 
          className="md:hidden p-2 -ml-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
          onClick={() => document.dispatchEvent(new CustomEvent('toggleMobileSidebar'))}
        >
          <Menu className="w-5 h-5" />
        </button>

        <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white tracking-tight font-headline">
          {title}
        </h1>
      </div>

      {/* Center: Liquid Glass Search Bar */}
      <div className="hidden lg:flex items-center max-w-md w-full mx-8">
        <button
          onClick={() => setIsCommandPaletteOpen(true)}
          className="w-full flex items-center gap-2.5 px-4 py-2.5 
            bg-white/60 dark:bg-white/[0.04] 
            backdrop-blur-xl backdrop-saturate-150
            border border-white/80 dark:border-white/10 
            rounded-full text-left text-xs 
            shadow-[0_2px_12px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.9)] 
            dark:shadow-[0_2px_14px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]
            hover:bg-white/85 dark:hover:bg-white/[0.08] 
            hover:border-white dark:hover:border-white/20
            hover:shadow-[0_4px_20px_rgba(0,0,0,0.08),inset_0_1px_1px_rgba(255,255,255,1)]
            transition-all group"
        >
          <Search className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
          <span className="flex-1 font-normal text-gray-500 dark:text-gray-400">Search pages, trades, symbols...</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-mono font-medium text-gray-500 dark:text-gray-400 bg-white/80 dark:bg-white/10 border border-white/80 dark:border-white/10 rounded-md shadow-2xs">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Action Buttons & Theme Toggle */}
      <div className="flex items-center gap-3 md:gap-4">
        {actionButton}

        {/* Support Headphones Icon */}
        <button 
          onClick={() => {}}
          className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          title="Customer Support"
        >
          <Headphones className="w-4 h-4" />
        </button>

        {/* Theme Toggle */}
        <div className="block">
          <ThemeToggle />
        </div>
      </div>

      <CommandPalette 
        isOpen={isCommandPaletteOpen} 
        onClose={() => setIsCommandPaletteOpen(false)} 
      />
    </header>
  );
}
