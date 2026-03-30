import React, { useState, useEffect, useRef } from "react";
import { 
  Search, 
  LayoutDashboard, 
  Wallet, 
  BarChart2, 
  Cpu, 
  BookOpen, 
  Activity, 
  Settings, 
  UserCircle,
  X,
  Command,
  ArrowRight,
  TrendingUp,
  History
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { useTrades } from "../hooks/useTrades";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  icon: any;
  path?: string;
  category: "MAIN" | "ANALYTICS" | "TRADES" | "SYMBOLS";
  action?: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const { trades } = useTrades();

  const mainItems: SearchResult[] = [
    { id: "dash", title: "Dashboard", subtitle: "View your trading overview and stats", icon: LayoutDashboard, path: "/", category: "MAIN" },
    { id: "trades", title: "Trades", subtitle: "View and manage all your trades", icon: BarChart2, path: "/trades", category: "MAIN" },
    { id: "journal", title: "Journal", subtitle: "Write and review your trade journal entries", icon: BookOpen, path: "/journal", category: "MAIN" },
    { id: "pov", title: "Trader POV", subtitle: "View trader POV dashboards or manage access codes", icon: UserCircle, path: "/profile", category: "MAIN" },
  ];

  const analyticsItems: SearchResult[] = [
    { id: "perf", title: "Performance Analysis", subtitle: "Analyze your trading performance metrics", icon: TrendingUp, path: "/trades", category: "ANALYTICS" },
    { id: "ai", title: "Trade Analysis", subtitle: "Deep dive into individual trade analytics", icon: Cpu, path: "/ai-engine", category: "ANALYTICS" },
  ];

  const filteredResults = React.useMemo(() => {
    const q = query.toLowerCase();
    
    const results: SearchResult[] = [];
    
    // Filter static items
    const allStatic = [...mainItems, ...analyticsItems];
    const filteredStatic = allStatic.filter(item => 
      item.title.toLowerCase().includes(q) || 
      item.subtitle.toLowerCase().includes(q)
    );
    results.push(...filteredStatic);

    // Filter trades if query is long enough
    if (q.length > 1) {
      const uniqueSymbols: string[] = Array.from(new Set((trades || []).map(t => String(t.symbol))));
      const filteredSymbols = uniqueSymbols
        .filter(s => s.toLowerCase().includes(q))
        .slice(0, 3)
        .map(s => ({
          id: `sym-${s}`,
          title: s,
          subtitle: `View all trades for ${s}`,
          icon: Activity,
          path: `/trades?symbol=${s}`,
          category: "SYMBOLS" as const
        }));
      results.push(...filteredSymbols);

      const filteredTrades = (trades || [])
        .filter(t => 
          String(t.symbol).toLowerCase().includes(q) || 
          (t.tag && String(t.tag).toLowerCase().includes(q))
        )
        .slice(0, 5)
        .map(t => ({
          id: t.id,
          title: `${t.action} ${t.symbol}`,
          subtitle: `${t.date} • ${t.pnl >= 0 ? '+' : ''}$${Math.abs(t.pnl).toFixed(2)}`,
          icon: History,
          path: "/trades",
          category: "TRADES" as const
        }));
      results.push(...filteredTrades);
    }

    return results;
  }, [query, trades]);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredResults.length);
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredResults.length) % filteredResults.length);
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const selected = filteredResults[selectedIndex];
        if (selected) handleSelect(selected);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredResults, selectedIndex]);

  const handleSelect = (result: SearchResult) => {
    if (result.path) navigate(result.path);
    if (result.action) result.action();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="relative w-full max-w-2xl bg-[#1a1a24] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Search Input */}
            <div className="flex items-center px-5 py-4 border-b border-white/5 gap-4">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search pages, trades, or symbols..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-white text-lg placeholder:text-gray-600"
              />
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] font-bold text-gray-500">
                <span className="text-xs">ESC</span>
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 max-h-[60vh] overflow-y-auto p-2 no-scrollbar">
              {filteredResults.length > 0 ? (
                <div className="space-y-4 py-2">
                  {["MAIN", "ANALYTICS", "SYMBOLS", "TRADES"].map((cat) => {
                    const catItems = filteredResults.filter(r => r.category === cat);
                    if (catItems.length === 0) return null;
                    
                    return (
                      <div key={cat} className="space-y-1">
                        <div className="px-3 py-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                          {cat}
                        </div>
                        {catItems.map((item) => {
                          const globalIndex = filteredResults.indexOf(item);
                          const isSelected = selectedIndex === globalIndex;
                          
                          return (
                            <button
                              key={item.id}
                              onClick={() => handleSelect(item)}
                              onMouseEnter={() => setSelectedIndex(globalIndex)}
                              className={cn(
                                "w-full flex items-center gap-4 px-3 py-3 rounded-xl transition-all text-left group",
                                isSelected ? "bg-primary/10 border border-primary/20" : "border border-transparent hover:bg-white/5"
                              )}
                            >
                              <div className={cn(
                                "p-2 rounded-lg transition-colors",
                                isSelected ? "bg-primary/20 text-primary" : "bg-white/5 text-gray-400 group-hover:text-white"
                              )}>
                                <item.icon className="w-5 h-5" />
                              </div>
                              <div className="flex-1">
                                <div className="text-sm font-bold text-white">{item.title}</div>
                                <div className="text-xs text-gray-500">{item.subtitle}</div>
                              </div>
                              {isSelected && (
                                <ArrowRight className="w-4 h-4 text-primary animate-in slide-in-from-left-2" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                    <Search className="w-6 h-6 text-gray-600" />
                  </div>
                  <p className="text-gray-500 text-sm">No results found for "{query}"</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-white/5 bg-black/20 flex items-center justify-between text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">↑</span>
                  <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">↓</span>
                  <span>Navigate</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">ENTER</span>
                  <span>Select</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">ESC</span>
                <span>Close</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
