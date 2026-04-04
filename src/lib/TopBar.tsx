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
        <h1 className="type-h1 text-primary">{title}</h1>
        <p className="type-label mt-1">
          {subtitle}
        </p>
      </div>
      <div className="flex items-center gap-6">
        {actionButton}
        {showSearch && (
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="relative group flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all duration-300 text-left overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.04)',
              borderColor: 'rgba(255,255,255,0.08)',
              backdropFilter: 'blur(12px)',
              width: 220,
              boxShadow: '0 0 0 0 rgba(59,130,246,0)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(59,130,246,0.35)';
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(59,130,246,0.07)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 18px rgba(59,130,246,0.12)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)';
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 0 0 rgba(59,130,246,0)';
            }}
          >
            {/* Animated gradient shimmer on hover */}
            <span
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
              style={{
                background: 'linear-gradient(105deg, transparent 40%, rgba(59,130,246,0.06) 50%, transparent 60%)',
              }}
            />

            {/* Icon with subtle pulse dot */}
            <span className="relative flex-shrink-0">
              <Search className="w-3.5 h-3.5 text-[#4B5563] group-hover:text-[#60a5fa] transition-colors duration-200" />
            </span>

            {/* Placeholder text */}
            <span
              className="flex-1 transition-colors duration-200 group-hover:text-[#9ca3af]"
              style={{ fontSize: 12, fontWeight: 500, color: '#374151', letterSpacing: '0.01em' }}
            >
              Search anything…
            </span>

            {/* ⌘K badge */}
            <span className="flex items-center gap-0.5 flex-shrink-0">
              <kbd
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border transition-colors duration-200"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  borderColor: 'rgba(255,255,255,0.10)',
                  fontSize: 10,
                  fontWeight: 600,
                  color: '#4B5563',
                  letterSpacing: '0.03em',
                  lineHeight: 1,
                }}
              >
                <Command className="w-2.5 h-2.5" />
                K
              </kbd>
            </span>
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
                <span className="type-micro text-[#6A6A6A]">
                  {selectedAccount ? selectedAccount.name : 'No Account'}
                </span>
                <span className="tnum text-[15px] font-bold text-on-surface">
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
                        <span className="type-h2 text-[14px] text-white">{account.name}</span>
                        <span className="type-body text-[12px]">{account.firm}</span>
                      </div>
                      <span className="tnum text-[14px] font-bold text-primary">
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
          className="p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-on-surface-variant hover:text-[#E5534B] transition-colors"
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
