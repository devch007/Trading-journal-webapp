import React from "react";
import { Bell, Wallet, ChevronDown, Search, LogOut } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

interface TopBarProps {
  title: string;
  subtitle: string;
  showAccountSelector?: boolean;
  showSearch?: boolean;
  actionButton?: React.ReactNode;
}

export function TopBar({ title, subtitle, showAccountSelector = true, showSearch = false, actionButton }: TopBarProps) {
  const { logout } = useAuth();

  return (
    <header className="flex justify-between items-center w-full px-8 py-10">
      <div>
        <h1 className="font-headline text-3xl tracking-tight text-[#3b82f6]">{title}</h1>
        <p className="text-on-surface-variant font-label text-sm uppercase tracking-widest mt-1">
          {subtitle}
        </p>
      </div>
      <div className="flex items-center gap-6">
        {actionButton}
        {showSearch && (
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search..." 
              className="bg-white/5 border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 w-64 transition-all"
            />
          </div>
        )}
        <div className="relative group">
          <Bell className="text-[#efecf9]/60 hover:text-white transition-colors cursor-pointer w-6 h-6" />
          <span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full border border-background"></span>
        </div>
        
        {showAccountSelector ? (
          <div className="relative group">
            <button className="flex items-center gap-3 bg-surface-container-high hover:bg-white/5 px-4 py-2.5 rounded-xl border border-white/10 transition-all focus-within:ring-2 focus-within:ring-primary/50 group">
              <Wallet className="text-primary w-5 h-5" />
              <div className="flex flex-col items-start leading-tight">
                <span className="text-[10px] text-on-surface-variant uppercase font-label tracking-tighter">
                  FTMO Account
                </span>
                <span className="font-data text-sm font-headline text-on-surface">$42,891.44</span>
              </div>
              <ChevronDown className="text-on-surface-variant w-4 h-4 ml-1 group-hover:text-white transition-colors" />
            </button>
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
    </header>
  );
}
