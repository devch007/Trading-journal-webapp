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
  BookMarked,
  BarChart3,
  Bot,
  Globe,
  Trophy,
  LineChart,
  Clock,
  Star
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
    badge: "Home",
    badgeColor: "bg-blue-500/20 text-blue-300",
  },
  {
    id: "goals",
    title: "Goals",
    subtitle: "Daily, weekly & monthly performance targets",
    icon: Crosshair,
    path: "/goals",
    category: "PAGES",
    badge: "New",
    badgeColor: "bg-green-500/20 text-green-400",
  },
  {
    id: "accounts",
    title: "Accounts",
    subtitle: "Manage your trading accounts & capital",
    icon: Wallet,
    path: "/accounts",
    category: "PAGES",
  },
  {
    id: "trades",
    title: "Trades",
    subtitle: "All trade history, filters, P&L breakdown",
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
    badge: "AI",
    badgeColor: "bg-purple-500/20 text-purple-300",
  },
  {
    id: "journal",
    title: "Journal",
    subtitle: "Write notes, tag emotions & rate your trades",
    icon: Notebook,
    path: "/journal",
    category: "PAGES",
  },
  {
    id: "strategies",
    title: "Strategies",
    subtitle: "Build, tag & track your trading strategies",
    icon: Layers,
    path: "/strategies",
    category: "PAGES",
  },
  {
    id: "market",
    title: "Market",
    subtitle: "Live market data, session heatmaps, news",
    icon: Globe,
    path: "/market",
    category: "PAGES",
  },
  {
    id: "settings",
    title: "Settings",
    subtitle: "App preferences, notifications, display",
    icon: Settings2,
    path: "/settings",
    category: "PAGES",
  },
  {
    id: "profile",
    title: "Profile",
    subtitle: "Account details, security & API keys",
    icon: CircleUser,
    path: "/profile",
    category: "PAGES",
  },
];

const QUICK_ACTIONS: SearchResult[] = [
  {
    id: "new-trade",
    title: "Log New Trade",
    subtitle: "Manually enter a new trade record",
    icon: Plus,
    path: "/dashboard",
    category: "QUICK ACTIONS",
    badgeColor: "bg-blue-500/20 text-blue-300",
  },
  {
    id: "import",
    title: "Import Trades",
    subtitle: "Upload a screenshot from any platform & extract via AI",
    icon: Upload,
    path: "/dashboard",
    category: "QUICK ACTIONS",
    badge: "AI",
    badgeColor: "bg-purple-500/20 text-purple-300",
  },
  {
    id: "set-goals",
    title: "Set Daily Goals",
    subtitle: "Update today's P&L and trade count targets",
    icon: Crosshair,
    path: "/goals",
    category: "QUICK ACTIONS",
  },
  {
    id: "view-equity",
    title: "View Equity Curve",
    subtitle: "Check your running account equity over time",
    icon: LineChart,
    path: "/dashboard",
    category: "QUICK ACTIONS",
  },
  {
    id: "best-strategy",
    title: "Best Strategy",
    subtitle: "Jump to your top-performing strategy",
    icon: Trophy,
    path: "/strategies",
    category: "QUICK ACTIONS",
  },
  {
    id: "ai-analysis",
    title: "Run AI Analysis",
    subtitle: "Let the AI Engine score your recent trades",
    icon: Bot,
    path: "/ai-engine",
    category: "QUICK ACTIONS",
    badge: "AI",
    badgeColor: "bg-purple-500/20 text-purple-300",
  },
];

const ANALYTICS_ITEMS: SearchResult[] = [
  {
    id: "win-rate",
    title: "Win Rate Breakdown",
    subtitle: "Per-symbol, per-session win/loss ratios",
    icon: BarChart3,
    path: "/trades",
    category: "ANALYTICS",
  },
  {
    id: "pnl-calendar",
    title: "Monthly P&L Calendar",
    subtitle: "Day-by-day profit and loss heatmap",
    icon: Activity,
    path: "/dashboard",
    category: "ANALYTICS",
  },
  {
    id: "profit-factor",
    title: "Profit Factor",
    subtitle: "Gross profit vs gross loss ratio",
    icon: TrendingUp,
    path: "/dashboard",
    category: "ANALYTICS",
  },
  {
    id: "best-sessions",
    title: "Best Trading Sessions",
    subtitle: "Asia, London, NY — where you perform best",
    icon: Clock,
    path: "/trades",
    category: "ANALYTICS",
  },
  {
    id: "quality-meter",
    title: "Trade Quality Score",
    subtitle: "AI confidence & checklist rating on each trade",
    icon: Star,
    path: "/journal",
    category: "ANALYTICS",
  },
  {
    id: "streak",
    title: "Journaling Streak",
    subtitle: "Consecutive days with journalled trades",
    icon: Zap,
    path: "/goals",
    category: "ANALYTICS",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { trades } = useTrades();

  // ── Filtered result set ────────────────────────────────────────────────
  const filteredResults = React.useMemo(() => {
    const q = query.toLowerCase().trim();
    const results: SearchResult[] = [];

    if (!q) {
      // Default: show all pages + quick actions
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
          subtitle: `${new Date(t.date).toLocaleDateString()} · ${t.pnl >= 0 ? "+" : ""}$${Math.abs(t.pnl).toFixed(2)} ${t.strategy ? `· ${t.strategy}` : ""}`,
          icon: History,
          path: "/trades",
          category: "RECENT TRADES" as Category,
          badge: t.isPositive ? "WIN" : "LOSS",
          badgeColor: t.isPositive
            ? "bg-[#1ED760]/15 text-[#1ED760]"
            : "bg-[#f87171]/15 text-[#f87171]",
        }));
      results.push(...matchedTrades);
    }

    return results;
  }, [query, trades]);

  // ── Category order for display ─────────────────────────────────────────
  const categoryOrder: Category[] = [
    "PAGES",
    "QUICK ACTIONS",
    "ANALYTICS",
    "SYMBOLS",
    "RECENT TRADES",
  ];

  const categoryLabels: Record<Category, string> = {
    "PAGES": "📍 Pages",
    "QUICK ACTIONS": "⚡ Quick Actions",
    "ANALYTICS": "📊 Analytics",
    "SYMBOLS": "🔍 Symbols",
    "RECENT TRADES": "🕒 Recent Trades",
  };

  // ── Reset on open ──────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  // ── Keyboard nav ───────────────────────────────────────────────────────
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

  // keep selected item scrolled into view
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
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-md"
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -16 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-2xl bg-white/5 backdrop-blur-2xl border border-white/[0.12] shadow-[0_24px_64px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] rounded-2xl overflow-hidden flex flex-col"
          >
            {/* ── Search input row ─────────────────────────── */}
            <div className="flex items-center px-5 py-4 border-b border-white/[0.08] gap-3 bg-white/[0.02]">
              <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search pages, actions, trades, symbols…"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
                className="flex-1 bg-transparent border-none outline-none text-white text-[16px] font-medium placeholder:text-[#4B5563]"
              />
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10 text-[10px] font-bold text-[#A7A7A7] tracking-wider">
                  ESC
                </span>
              </div>
            </div>

            {/* ── Results ──────────────────────────────────── */}
            <div ref={listRef} className="flex-1 max-h-[58vh] overflow-y-auto p-2 no-scrollbar">
              {filteredResults.length > 0 ? (
                <div className="space-y-4 py-2">
                  {categoryOrder.map((cat) => {
                    const catItems = filteredResults.filter((r) => r.category === cat);
                    if (!catItems.length) return null;

                    return (
                      <div key={cat} className="space-y-0.5">
                        <div className="px-3 py-1 text-[9px] font-bold tracking-[0.12em] uppercase text-[#4B5563]">
                          {categoryLabels[cat]}
                        </div>
                        {catItems.map((item) => {
                          const globalIndex = filteredResults.indexOf(item);
                          const isSelected = selectedIndex === globalIndex;

                          return (
                            <button
                              key={item.id}
                              data-idx={globalIndex}
                              onClick={() => handleSelect(item)}
                              onMouseEnter={() => setSelectedIndex(globalIndex)}
                              className={cn(
                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-100 text-left group",
                                isSelected
                                  ? "bg-white/[0.10] border border-white/[0.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                                  : "border border-transparent hover:bg-white/[0.05]"
                              )}
                            >
                              {/* Icon */}
                              <div
                                className={cn(
                                  "p-2 rounded-lg transition-colors border flex-shrink-0",
                                  isSelected
                                    ? "bg-primary/20 text-primary border-primary/30"
                                    : "bg-white/[0.06] text-gray-400 border-white/[0.08] group-hover:text-white"
                                )}
                              >
                                <item.icon className="w-4 h-4" />
                              </div>

                              {/* Text */}
                              <div className="flex-1 min-w-0">
                                <div className="text-[13px] font-semibold text-white leading-tight truncate">
                                  {item.title}
                                </div>
                                <div className="text-[11px] text-[#4B5563] mt-0.5 truncate">
                                  {item.subtitle}
                                </div>
                              </div>

                              {/* Badge */}
                              {item.badge && (
                                <span
                                  className={cn(
                                    "px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase flex-shrink-0",
                                    item.badgeColor || "bg-white/10 text-white/50"
                                  )}
                                >
                                  {item.badge}
                                </span>
                              )}

                              {/* Chevron */}
                              {isSelected && (
                                <ArrowRight className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-14 text-center">
                  <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                    <Search className="w-5 h-5 text-[#4B5563]" />
                  </div>
                  <p className="text-[13px] text-[#4B5563] font-medium">
                    No results for <span className="text-white">"{query}"</span>
                  </p>
                  <p className="text-[11px] text-[#374151] mt-1">
                    Try a page name, symbol, or trade tag
                  </p>
                </div>
              )}
            </div>

            {/* ── Footer ───────────────────────────────────── */}
            <div className="px-5 py-3 border-t border-white/[0.08] bg-white/[0.02] flex items-center justify-between">
              <div className="flex items-center gap-4 text-[10px] text-[#4B5563] font-semibold tracking-wide">
                <div className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10">↑</kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10">↓</kbd>
                  <span>Navigate</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10">↵</kbd>
                  <span>Select</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-[#4B5563] font-semibold">
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10">ESC</kbd>
                <span>Close</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
