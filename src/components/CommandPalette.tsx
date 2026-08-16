import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  LayoutGrid,
  Wallet,
  CandlestickChart,
  Sparkles,
  Notebook,
  Layers,
  TrendingUp,
  Settings2,
  CircleUser,
  Activity,
  History,
  Crosshair,
  Plus,
  Upload,
  ArrowRight,
  Zap,
  BarChart3,
  Bot,
  Trophy,
  LineChart,
  Clock,
  Star,
  CheckCircle2,
  X
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { useTrades } from "../hooks/useTrades";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

type Category = "PAGES" | "QUICK ACTIONS" | "ANALYTICS" | "RECENT TRADES" | "SYMBOLS";

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  icon: any;
  path?: string;
  category: Category;
  badge?: string;
  badgeColor?: string;
  action?: () => void;
}

// ─── Static page registry ────────────────────────────────────────────────────

const PAGE_ITEMS: SearchResult[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    subtitle: "Equity curve, recent trades, P&L overview",
    icon: LayoutGrid,
    path: "/dashboard",
    category: "PAGES",
    badge: "Overview",
    badgeColor: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300 border border-blue-500/20",
  },
  {
    id: "goals",
    title: "Goals & Targets",
    subtitle: "Daily, weekly & monthly performance targets",
    icon: Crosshair,
    path: "/goals",
    category: "PAGES",
    badge: "Targets",
    badgeColor: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-500/20",
  },
  {
    id: "accounts",
    title: "Trading Accounts",
    subtitle: "Manage your capital, broker accounts & rules",
    icon: Wallet,
    path: "/accounts",
    category: "PAGES",
  },
  {
    id: "trades",
    title: "Trade History",
    subtitle: "All executed trades, filters & P&L breakdown",
    icon: CandlestickChart,
    path: "/trades",
    category: "PAGES",
  },
  {
    id: "ai-engine",
    title: "AI Engine",
    subtitle: "AI-powered trade analysis & pattern recognition",
    icon: Sparkles,
    path: "/ai-engine",
    category: "PAGES",
    badge: "AI Coach",
    badgeColor: "bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-300 border border-purple-500/20",
  },
  {
    id: "checkout",
    title: "Pre-Trade Checklist",
    subtitle: "Check discipline rules and mindset before entry",
    icon: Activity,
    path: "/checkout",
    category: "PAGES",
    badge: "Discipline",
    badgeColor: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-500/20",
  },
  {
    id: "journal",
    title: "Daily Journal",
    subtitle: "Write notes, tag psychology & review trading days",
    icon: Notebook,
    path: "/journal",
    category: "PAGES",
  },
  {
    id: "strategies",
    title: "Strategies & Edge",
    subtitle: "Build, tag & measure your trading playbooks",
    icon: Layers,
    path: "/strategies",
    category: "PAGES",
  },
  {
    id: "settings",
    title: "Settings",
    subtitle: "App preferences, dark/light theme, display",
    icon: Settings2,
    path: "/settings",
    category: "PAGES",
  },
  {
    id: "profile",
    title: "User Profile",
    subtitle: "Account details, security & settings",
    icon: CircleUser,
    path: "/profile",
    category: "PAGES",
  },
];

const QUICK_ACTIONS: SearchResult[] = [
  {
    id: "new-trade",
    title: "Log New Trade",
    subtitle: "Manually record a trade entry or execution",
    icon: Plus,
    path: "/dashboard",
    category: "QUICK ACTIONS",
    badge: "Action",
    badgeColor: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300 border border-blue-500/20",
  },
  {
    id: "import",
    title: "Import Trade Screenshot",
    subtitle: "Scan screenshot from MT5/TradingView via AI OCR",
    icon: Upload,
    path: "/dashboard",
    category: "QUICK ACTIONS",
    badge: "OCR AI",
    badgeColor: "bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-300 border border-purple-500/20",
  },
  {
    id: "set-goals",
    title: "Update Goals",
    subtitle: "Configure daily max loss & profit targets",
    icon: Crosshair,
    path: "/goals",
    category: "QUICK ACTIONS",
  },
  {
    id: "view-equity",
    title: "View Equity Curve",
    subtitle: "Analyze cumulative growth vs benchmark",
    icon: LineChart,
    path: "/dashboard",
    category: "QUICK ACTIONS",
  },
  {
    id: "best-strategy",
    title: "View Top Strategy",
    subtitle: "Jump to your highest win-rate setup",
    icon: Trophy,
    path: "/strategies",
    category: "QUICK ACTIONS",
  },
  {
    id: "ai-analysis",
    title: "Run AI Analysis",
    subtitle: "Ask AI coach to inspect your recent trade logs",
    icon: Bot,
    path: "/ai-engine",
    category: "QUICK ACTIONS",
    badge: "AI",
    badgeColor: "bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-300 border border-purple-500/20",
  },
];

const ANALYTICS_ITEMS: SearchResult[] = [
  {
    id: "win-rate",
    title: "Win Rate Analysis",
    subtitle: "Per-symbol, per-session win/loss ratios",
    icon: BarChart3,
    path: "/trades",
    category: "ANALYTICS",
  },
  {
    id: "profit-factor",
    title: "Profit Factor Score",
    subtitle: "Gross profit vs gross loss expectancy",
    icon: TrendingUp,
    path: "/dashboard",
    category: "ANALYTICS",
  },
  {
    id: "best-sessions",
    title: "Trading Session Stats",
    subtitle: "London, New York, Asia session performance",
    icon: Clock,
    path: "/trades",
    category: "ANALYTICS",
  },
  {
    id: "streak",
    title: "Consistency Streak",
    subtitle: "Consecutive disciplined trading days",
    icon: Zap,
    path: "/goals",
    category: "ANALYTICS",
  },
];

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { trades } = useTrades();

  // Filter results
  const filteredResults = React.useMemo(() => {
    const q = query.toLowerCase().trim();
    const results: SearchResult[] = [];

    if (!q) {
      results.push(...PAGE_ITEMS, ...QUICK_ACTIONS);
      return results;
    }

    const matches = (item: SearchResult) =>
      item.title.toLowerCase().includes(q) ||
      item.subtitle.toLowerCase().includes(q) ||
      (item.badge || "").toLowerCase().includes(q);

    results.push(
      ...[...PAGE_ITEMS, ...QUICK_ACTIONS, ...ANALYTICS_ITEMS].filter(matches)
    );

    // Live trade search
    if (q.length > 1) {
      const uniqueSymbols: string[] = Array.from(
        new Set((trades || []).map((t) => String(t.symbol)))
      );
      const matchedSymbols = uniqueSymbols
        .filter((s) => s.toLowerCase().includes(q))
        .slice(0, 3)
        .map((s) => ({
          id: `sym-${s}`,
          title: s,
          subtitle: `Filter all trades for ${s}`,
          icon: Activity,
          path: `/trades?symbol=${s}`,
          category: "SYMBOLS" as Category,
        }));
      results.push(...matchedSymbols);

      const matchedTrades = (trades || [])
        .filter(
          (t) =>
            String(t.symbol).toLowerCase().includes(q) ||
            (t.tag && String(t.tag).toLowerCase().includes(q)) ||
            (t.strategy && String(t.strategy).toLowerCase().includes(q))
        )
        .slice(0, 4)
        .map((t) => ({
          id: t.id,
          title: `${t.action} ${t.symbol}`,
          subtitle: `${new Date(t.date).toLocaleDateString()} · ${Number(t.pnl) >= 0 ? "+" : ""}$${Math.abs(Number(t.pnl) || 0).toFixed(2)} ${t.strategy ? `· ${t.strategy}` : ""}`,
          icon: History,
          path: "/trades",
          category: "RECENT TRADES" as Category,
          badge: t.isPositive || Number(t.pnl) >= 0 ? "WIN" : "LOSS",
          badgeColor: t.isPositive || Number(t.pnl) >= 0
            ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-500/20"
            : "bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300 border border-rose-500/20",
        }));
      results.push(...matchedTrades);
    }

    return results;
  }, [query, trades]);

  const categoryOrder: Category[] = [
    "PAGES",
    "QUICK ACTIONS",
    "ANALYTICS",
    "SYMBOLS",
    "RECENT TRADES",
  ];

  const categoryLabels: Record<Category, string> = {
    "PAGES": "Navigation & Pages",
    "QUICK ACTIONS": "Quick Actions",
    "ANALYTICS": "Performance & Insights",
    "SYMBOLS": "Traded Instruments",
    "RECENT TRADES": "Recent Executions",
  };

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((p) => Math.min(p + 1, filteredResults.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((p) => Math.max(p - 1, 0));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const sel = filteredResults[selectedIndex];
        if (sel) handleSelect(sel);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredResults, selectedIndex]);

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selectedIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const handleSelect = (result: SearchResult) => {
    if (result.path) navigate(result.path);
    if (result.action) result.action();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4">
          
          {/* Deep Frosted Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/50 dark:bg-black/80 backdrop-blur-md"
          />

          {/* Liquid Glass Shell with Pure Diffusion */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -16 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-2xl rounded-3xl overflow-hidden flex flex-col z-10
              bg-white/98 dark:bg-[#12141c]/98 
              backdrop-blur-3xl
              border border-gray-200/90 dark:border-white/[0.12] 
              shadow-[0_30px_90px_rgba(0,0,0,0.22),0_10px_30px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,1)]
              dark:shadow-[0_35px_100px_rgba(0,0,0,0.85),0_12px_36px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.15)]"
          >
            {/* Ambient Liquid Glass Specular Edge */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white dark:via-white/30 to-transparent pointer-events-none" />

            {/* ── Search Input Row ─────────────────────────── */}
            <div className="flex items-center px-6 py-4.5 border-b border-gray-100 dark:border-white/[0.08] gap-3.5 bg-gray-50/50 dark:bg-white/[0.02]">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-2xs">
                <Search className="w-4 h-4" />
              </div>
              <input
                ref={inputRef}
                type="text"
                placeholder="Search pages, actions, trades, symbols…"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
                className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white text-base font-medium placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
              <div className="flex items-center gap-2 shrink-0">
                <kbd className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-white/10 border border-gray-200/80 dark:border-white/10 text-[10px] font-semibold text-gray-500 dark:text-gray-400 tracking-wider shadow-2xs">
                  ESC
                </kbd>
                <button 
                  onClick={onClose}
                  className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ── Scrollable Results List ──────────────────── */}
            <div ref={listRef} className="flex-1 max-h-[55vh] overflow-y-auto p-3 no-scrollbar space-y-4">
              {filteredResults.length > 0 ? (
                <div>
                  {categoryOrder.map((cat) => {
                    const catItems = filteredResults.filter((r) => r.category === cat);
                    if (!catItems.length) return null;

                    return (
                      <div key={cat} className="space-y-1 mb-3 last:mb-0">
                        <div className="px-3.5 py-1 text-[10px] font-semibold tracking-wider uppercase text-gray-400 dark:text-gray-500">
                          {categoryLabels[cat]}
                        </div>
                        <div className="space-y-0.5">
                          {catItems.map((item) => {
                            const globalIndex = filteredResults.indexOf(item);
                            const isSelected = selectedIndex === globalIndex;
                            const Icon = item.icon;

                            return (
                              <button
                                key={item.id}
                                data-idx={globalIndex}
                                onClick={() => handleSelect(item)}
                                onMouseEnter={() => setSelectedIndex(globalIndex)}
                                className={cn(
                                  "w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl transition-all duration-150 text-left group",
                                  isSelected
                                    ? "bg-blue-50/80 dark:bg-white/[0.12] text-gray-900 dark:text-white shadow-xs border border-blue-200/70 dark:border-white/20"
                                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.04] border border-transparent"
                                )}
                              >
                                {/* Icon container */}
                                <div
                                  className={cn(
                                    "p-2 rounded-xl transition-all flex-shrink-0 flex items-center justify-center",
                                    isSelected
                                      ? "bg-blue-600 text-white shadow-xs"
                                      : "bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
                                  )}
                                >
                                  <Icon className="w-4 h-4" />
                                </div>

                                {/* Title & Subtitle */}
                                <div className="flex-1 min-w-0">
                                  <div className="text-[13px] font-semibold text-gray-900 dark:text-white leading-tight truncate">
                                    {item.title}
                                  </div>
                                  <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 truncate font-normal">
                                    {item.subtitle}
                                  </div>
                                </div>

                                {/* Badge */}
                                {item.badge && (
                                  <span
                                    className={cn(
                                      "px-2.5 py-0.5 rounded-full text-[10px] font-medium tracking-wide uppercase flex-shrink-0",
                                      item.badgeColor || "bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300"
                                    )}
                                  >
                                    {item.badge}
                                  </span>
                                )}

                                {/* Arrow Indicator on Hover/Selection */}
                                {isSelected && (
                                  <ArrowRight className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 animate-in fade-in slide-in-from-left-1 duration-150" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-white/[0.05] border border-gray-200 dark:border-white/10 flex items-center justify-center mx-auto mb-3 text-gray-400">
                    <Search className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    No results for "{query}"
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Try searching for a symbol, trade, strategy or page name
                  </p>
                </div>
              )}
            </div>

            {/* ── Liquid Glass Footer ──────────────────────── */}
            <div className="px-6 py-3 border-t border-gray-100 dark:border-white/[0.08] bg-gray-50/50 dark:bg-white/[0.02] flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 font-medium">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-[10px] text-gray-600 dark:text-gray-300 shadow-2xs">↑</kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-[10px] text-gray-600 dark:text-gray-300 shadow-2xs">↓</kbd>
                  <span>Navigate</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-[10px] text-gray-600 dark:text-gray-300 shadow-2xs">↵</kbd>
                  <span>Select</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-[10px] text-gray-600 dark:text-gray-300 shadow-2xs">ESC</kbd>
                <span>Close</span>
              </div>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
