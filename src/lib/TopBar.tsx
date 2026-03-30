import React, { useState, useRef, useEffect } from "react";
import { Bell, Wallet, ChevronDown, Search, LogOut, Command } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useAccountContext } from "../contexts/AccountContext";
import { CommandPalette } from "../components/CommandPalette";
import { ThemeToggle } from "../components/ThemeToggle";

interface TopBarProps {
  title: string;
  subtitle: string;
  showAccountSelector?: boolean;
  showSearch?: boolean;
  actionButton?: React.ReactNode;
}

export function TopBar({ title, subtitle, showAccountSelector = true, showSearch = false, actionButton }: TopBarProps) {
  const { logout } = useAuth();
  const { accounts, selectedAccount, setSelectedAccountId } = useAccountContext();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    <header className="flex justify-between items-center w-full px-8 py-10">
      <div>
        <h1 className="font-headline text-3xl tracking-tight text-primary">{title}</h1>
        <p className="text-on-surface-variant font-label text-sm uppercase tracking-widest mt-1">
          {subtitle}
        </p>
      </div>
      <div className="flex items-center gap-6">
        {actionButton}
        {showSearch && (
          <button 
            onClick={() => setIsCommandPaletteOpen(true)}
            className="relative group flex items-center gap-3 bg-white/5 border border-white/10 rounded-full pl-4 pr-3 py-2 text-sm text-on-surface-variant hover:bg-white/10 hover:border-white/20 transition-all w-64 text-left"
          >
            <Search className="w-4 h-4" />
            <span className="flex-1">Search...</span>
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-bold text-gray-500">
              <Command className="w-2.5 h-2.5" />
              <span>K</span>
            </div>
          </button>
        )}
        <ThemeToggle />
        <div className="relative group">
          <Bell className="text-[#efecf9]/60 hover:text-white transition-colors cursor-pointer w-6 h-6" />
          <span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full border border-background"></span>
        </div>
        
        {showAccountSelector ? (
          <div className="relative group" ref={dropdownRef}>
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-3 bg-surface-container-high hover:bg-white/5 px-4 py-2.5 rounded-xl border border-white/10 transition-all focus-within:ring-2 focus-within:ring-primary/50 group"
            >
              <Wallet className="text-primary w-5 h-5" />
              <div className="flex flex-col items-start leading-tight">
                <span className="text-[10px] text-on-surface-variant uppercase font-label tracking-tighter">
                  {selectedAccount ? selectedAccount.name : 'No Account'}
                </span>
                <span className="font-data text-sm font-headline text-on-surface">
                  ${selectedAccount ? (selectedAccount.currentEquity ?? selectedAccount.initialCapital).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                </span>
              </div>
              <ChevronDown className={`text-on-surface-variant w-4 h-4 ml-1 group-hover:text-white transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isDropdownOpen && accounts && accounts.length > 0 && (
              <div className="absolute top-full right-0 mt-2 w-64 bg-surface-container-high border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="max-h-64 overflow-y-auto">
                  {(accounts || []).map(account => (
                    <button
                      key={account.id}
                      onClick={() => {
                        setSelectedAccountId(account.id);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors text-left ${selectedAccount?.id === account.id ? 'bg-primary/10' : ''}`}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-white">{account.name}</span>
                        <span className="text-xs text-on-surface-variant">{account.firm}</span>
                      </div>
                      <span className="font-data text-sm text-primary">
                        ${(account.currentEquity ?? account.initialCapital).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <button className="text-[#efecf9]/60 hover:text-white transition-colors">
            <Wallet className="w-6 h-6" />
          </button>
        )}
        
        <button 
          onClick={logout}
          className="p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-on-surface-variant hover:text-rose-400 transition-colors"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      <CommandPalette 
        isOpen={isCommandPaletteOpen} 
        onClose={() => setIsCommandPaletteOpen(false)} 
      />
    </header>
  );
}
