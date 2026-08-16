import React, { useState, useRef, useEffect } from "react";
import { 
  Bell, 
  Wallet, 
  ChevronDown, 
  Search, 
  LogOut, 
  Command, 
  Menu, 
  Headphones, 
  Radio,
  CheckCircle2,
  SlidersHorizontal,
  Sun,
  Moon
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useAccountContext } from "../contexts/AccountContext";
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
  const { user, userProfile, logout } = useAuth();
  const { accounts, selectedAccount, setSelectedAccountId } = useAccountContext();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const displayName = userProfile?.email 
    ? userProfile.email.split('@')[0] 
    : user?.email 
      ? user.email.split('@')[0] 
      : "Max Verstappen";

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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="flex justify-between items-center w-full px-6 py-4 md:px-8 md:py-5 border-b border-[#eaecf0]/80 dark:border-neutral-800/80 bg-white/60 dark:bg-[#0f1015]/60 backdrop-blur-md sticky top-0 z-40">
      {/* Left: Title + Market Online Badge */}
      <div className="flex items-center gap-3.5">
        <button 
          className="md:hidden p-2 -ml-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
          onClick={() => document.dispatchEvent(new CustomEvent('toggleMobileSidebar'))}
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white tracking-tight font-headline">
            {title}
          </h1>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
            <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-500" />
            <span>Market online</span>
          </div>
        </div>
      </div>

      {/* Center: Search Bar matching reference image */}
      <div className="hidden lg:flex items-center max-w-md w-full mx-8">
        <button
          onClick={() => setIsCommandPaletteOpen(true)}
          className="w-full flex items-center gap-2.5 px-4 py-2 bg-[#f4f5f8] dark:bg-[#16181f] border border-[#e5e7eb] dark:border-neutral-800 rounded-full text-left text-xs text-gray-400 hover:border-gray-300 dark:hover:border-neutral-700 transition-all shadow-2xs group"
        >
          <Search className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
          <span className="flex-1 font-normal text-gray-500 dark:text-gray-400">Search...</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-medium text-gray-400 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-md">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Action Buttons & User Profile Chip */}
      <div className="flex items-center gap-3 md:gap-4">
        {actionButton}

        {/* Support Headphones Icon */}
        <button 
          className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
          title="Customer Support"
        >
          <Headphones className="w-4 h-4" />
        </button>

        {/* Notifications Bell with dot */}
        <div className="relative">
          <button 
            className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full ring-2 ring-white dark:ring-neutral-900"></span>
          </button>
        </div>

        {/* Theme Toggle */}
        <div className="hidden sm:block">
          <ThemeToggle />
        </div>

        {/* User Account / Profile Chip Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-full bg-[#f4f5f8] dark:bg-[#16181f] border border-[#e5e7eb] dark:border-neutral-800 hover:bg-gray-100 dark:hover:bg-neutral-800/80 transition-all text-left shadow-2xs"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 hidden sm:inline truncate max-w-[120px]">
              {displayName}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isDropdownOpen && (
            <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-[#16181f] border border-gray-200 dark:border-neutral-800 rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 p-1.5">
              <div className="px-3 py-2 border-b border-gray-100 dark:border-neutral-800 mb-1">
                <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{displayName}</p>
                <p className="text-[11px] text-gray-400 truncate">{user?.email || 'maxverstappen@gmail.com'}</p>
              </div>

              {accounts && accounts.length > 0 && (
                <div className="py-1">
                  <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Switch Trading Account
                  </p>
                  {accounts.filter(a => a.status === 'ACTIVE').map(account => (
                    <button
                      key={account.id}
                      onClick={() => {
                        setSelectedAccountId(account.id);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-colors ${
                        selectedAccount?.id === account.id 
                          ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold' 
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span>{account.name}</span>
                        <span className="text-[10px] text-gray-400">{account.firm}</span>
                      </div>
                      <span className="font-semibold">
                        ${(account.currentEquity ?? account.initialCapital).toLocaleString()}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <div className="pt-1 border-t border-gray-100 dark:border-neutral-800">
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <CommandPalette 
        isOpen={isCommandPaletteOpen} 
        onClose={() => setIsCommandPaletteOpen(false)} 
      />
    </header>
  );
}
