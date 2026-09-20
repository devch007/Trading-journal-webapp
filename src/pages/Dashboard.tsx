import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { TopBar } from "../lib/TopBar";
import { TradeModal } from "../components/TradeModal";
import { ImportTradesModal } from "../components/ImportTradesModal";
import { TradingCalendarHeatmap } from "../components/TradingCalendarHeatmap";
import { GoalHeatmap, DailyHeatmapData, DailyGoalStatus } from "../components/GoalHeatmap";
import { DashboardSkeleton } from "../components/ui/Skeleton";
import { SmartEmptyState } from "../components/ui/SmartEmptyState";
import { startOfDay, startOfMonth } from "date-fns";
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight, 
  Plus, 
  Upload, 
  Loader2, 
  AlertCircle, 
  Shield, 
  X, 
  Wallet,
  Briefcase,
  MoreHorizontal,
  ChevronDown,
  ArrowRight,
  BookOpen,
  Coins,
  Gem,
  CircleDot,
  Building2,
  DollarSign,
  Layers,
  Sparkles,
  Target,
  Scale,
  BrainCircuit,
  SlidersHorizontal,
  CheckCircle2,
  Copy,
  Check,
  Zap,
  Activity,
  Award,
  Flame,
  TriangleAlert
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useTrades } from "../hooks/useTrades";
import { useAuth } from "../contexts/AuthContext";
import { useAccountContext } from "../contexts/AccountContext";
import { getTradeDate, normalizeImportedDateTime } from "../lib/timeUtils";
import { useRuleViolations } from "../hooks/useRuleViolations";
import { motion, AnimatePresence } from "motion/react";
import { 
  analyzeTradeScreenshot, 
  getAiApiKey, 
  setAiApiKey, 
  getGeminiApiKey, 
  setGeminiApiKey 
} from "../lib/aiVision";
import { Key } from "lucide-react";

// Custom Tooltip with Geist typography and tabular numbers
const TradeXChartTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const pnl = data.pnl ?? (data.val1 - data.val2);
    const isPos = pnl >= 0;

    return (
      <div className="bg-white dark:bg-[#181920] border border-gray-200/90 dark:border-neutral-700/80 p-3.5 rounded-2xl shadow-xl flex flex-col gap-2 min-w-[200px] font-normal z-50">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-neutral-800 pb-1.5">
          <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
            {data.dateLabel || data.date || 'Execution Point'}
          </p>
          {data.pnl !== undefined && (
            <span className={`text-[11px] font-bold tabular-nums px-1.5 py-0.5 rounded ${isPos ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' : 'text-rose-500 bg-rose-50 dark:bg-rose-950/40'}`}>
              {isPos ? '+' : ''}${Number(data.pnl).toFixed(2)}
            </span>
          )}
        </div>
        <div className="space-y-1.5 pt-0.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#1e293b] dark:bg-[#38bdf8]"></span>
              <span className="text-xs font-bold tabular-nums text-gray-900 dark:text-white">
                ${Number(data.val1).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <span className="text-[10px] font-medium text-gray-500 dark:text-gray-300 bg-gray-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
              Account Equity
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#0d9488] dark:bg-[#2dd4bf]"></span>
              <span className="text-xs font-bold tabular-nums text-gray-900 dark:text-white">
                ${Number(data.val2).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <span className="text-[10px] font-medium text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-1.5 py-0.5 rounded">
              Benchmark
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { trades: allTrades, loading, addTrade } = useTrades();
  const { selectedAccountId, selectedAccount, accounts, setSelectedAccountId } = useAccountContext();
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M' | 'ALL'>('1W');
  const [activityView, setActivityView] = useState<'Month' | 'Week'>('Week');
  const [dismissedViolations, setDismissedViolations] = useState<Set<string>>(new Set());

  // Listen to global 'N' key shortcut to open Log Trade modal
  useEffect(() => {
    const handleOpenModal = () => setIsTradeModalOpen(true);
    window.addEventListener('openNewTradeModal', handleOpenModal);
    return () => window.removeEventListener('openNewTradeModal', handleOpenModal);
  }, []);

  // Reactive theme tracking for Chart canvas colors
  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  useEffect(() => {
    const checkDark = () => setIsDark(document.documentElement.classList.contains('dark'));
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    window.addEventListener('storage', checkDark);
    return () => {
      observer.disconnect();
      window.removeEventListener('storage', checkDark);
    };
  }, []);

  // Rule violations
  const violations = useRuleViolations(selectedAccount, allTrades);
  const activeViolations = violations.filter(v => !dismissedViolations.has(v.ruleId));
  const dismissViolation = (ruleId: string) => {
    setDismissedViolations(prev => new Set(prev).add(ruleId));
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<{ trades: any[] } | null>(null);
  const [isAiConfigOpen, setIsAiConfigOpen] = useState(false);
  const [tempAiKey, setTempAiKey] = useState(getAiApiKey());
  const [tempGeminiKey, setTempGeminiKey] = useState(getGeminiApiKey());
  const [copiedSnapshot, setCopiedSnapshot] = useState(false);
  const [hoveredSession, setHoveredSession] = useState<string | null>(null);

  // Filter trades by selected account
  const trades = useMemo(() => {
    if (!selectedAccountId) return allTrades;
    return allTrades.filter(t => t.accountId === selectedAccountId);
  }, [allTrades, selectedAccountId]);

  // Key metrics calculated dynamically from user trades for the selected account
  const stats = useMemo(() => {
    const initialCap = selectedAccount?.initialCapital || 1000;
    
    // Calculate current month's start
    const now = new Date();
    const monthStart = startOfMonth(now);
    
    // Monthly trades vs all trades
    const monthlyTrades = trades.filter(t => {
      const d = getTradeDate(t.date || t.createdAt);
      return d >= monthStart;
    });

    // Use monthly trades if available, otherwise fall back to all trades for realistic display
    const activePeriodTrades = monthlyTrades.length > 0 ? monthlyTrades : trades;
    const isShowingCurrentMonth = monthlyTrades.length > 0;

    const totalPnl = trades.reduce((sum, trade) => sum + (Number(trade.pnl) || 0), 0);
    const winningTrades = trades.filter(t => t.isPositive || Number(t.pnl) > 0);
    const losingTrades = trades.filter(t => !t.isPositive && Number(t.pnl) < 0);
    const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;
    
    const grossProfit = winningTrades.reduce((sum, t) => sum + Number(t.pnl || 0), 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + Number(t.pnl || 0), 0));
    const profitFactor = grossLoss === 0 ? (grossProfit > 0 ? 3.5 : 0.0) : grossProfit / grossLoss;

    // Real trades metrics for the active account
    const periodPnl = totalPnl;
    const periodWins = winningTrades;
    const periodLosses = losingTrades;
    const periodWinRate = winRate;
    const periodProfitFactor = profitFactor;
    const periodTradeCount = trades.length;

    // Real Avg R computation
    const avgWinAmount = periodWins.length > 0 ? (grossProfit / periodWins.length) : 0;
    const avgLossAmount = periodLosses.length > 0 ? (grossLoss / periodLosses.length) : 0;
    const avgR = trades.length > 0 && avgLossAmount > 0
      ? (totalPnl / (avgLossAmount * trades.length))
      : (trades.length > 0 && avgWinAmount > 0 ? 1.0 : 0);

    // Automated Pattern Discovery / Behavioral Insight from actual recorded trades
    let biggestPattern = {
      headline: trades.length === 0 ? "No trade executions recorded yet." : "No active behavioral leaks detected.",
      detail: trades.length === 0 ? "Log trades manually or upload a broker statement/screenshot to detect edge patterns." : "Your execution parameters and trading rules are disciplined. Keep following your system.",
      costText: null as string | null,
      type: "neutral" as "neutral" | "warning" | "positive"
    };

    if (trades.length > 0) {
      // 1. Check for negative session leak
      const sessionPnls: Record<string, { pnl: number; count: number }> = {};
      trades.forEach(t => {
        const sess = t.session || 'Else';
        if (!sessionPnls[sess]) sessionPnls[sess] = { pnl: 0, count: 0 };
        sessionPnls[sess].pnl += Number(t.pnl) || 0;
        sessionPnls[sess].count += 1;
      });

      const worstSessionEntry = Object.entries(sessionPnls).find(([, d]) => d.pnl < -10 && d.count >= 2);

      // 2. Check for emotional trade leak
      const emotionalTrades = trades.filter(t => 
        t.emotions && t.emotions.some(e => ['FOMO', 'Revenge', 'Greedy', 'Anxious', 'Impulsive'].includes(e))
      );
      const emotionalLoss = emotionalTrades.reduce((s, t) => s + (Number(t.pnl) < 0 ? Number(t.pnl) : 0), 0);

      // 3. Check for worst instrument leak
      const losingSymbols = Object.entries(
        trades.reduce((acc, t) => {
          acc[t.symbol] = (acc[t.symbol] || 0) + (Number(t.pnl) || 0);
          return acc;
        }, {} as Record<string, number>)
      ).filter(([, pnl]) => pnl < -15).sort((a, b) => a[1] - b[1]);

      if (emotionalTrades.length >= 2 && Math.abs(emotionalLoss) > 20) {
        const pct = Math.round((emotionalTrades.length / trades.length) * 100);
        biggestPattern = {
          headline: `You took ${pct}% of trades under emotional pressure (FOMO / Revenge).`,
          detail: `Unplanned emotional executions are reducing your portfolio edge.`,
          costText: `This has cost you approximately -$${Math.abs(Math.round(emotionalLoss))} in total losses.`,
          type: "warning"
        };
      } else if (worstSessionEntry) {
        const [sessName, sData] = worstSessionEntry;
        const pct = Math.round((sData.count / trades.length) * 100);
        biggestPattern = {
          headline: `You took ${pct}% of your trades during ${sessName} session.`,
          detail: `Performance in this session shows negative expectancy compared to your core trading hours.`,
          costText: `This has cost you approximately -$${Math.abs(Math.round(sData.pnl))} in total losses.`,
          type: "warning"
        };
      } else if (losingSymbols.length > 0) {
        const [sym, symPnl] = losingSymbols[0];
        biggestPattern = {
          headline: `Underperforming asset: ${sym} is generating recurring drag.`,
          detail: `Losses on ${sym} are offsetting consistent gains from your high-probability setups.`,
          costText: `This has cost you approximately -$${Math.abs(Math.round(symPnl))} in total losses.`,
          type: "warning"
        };
      } else if (winRate >= 55) {
        biggestPattern = {
          headline: `High win rate consistency across top traded setups.`,
          detail: `Your execution is aligned with your strategy. Consider scaling size gradually on A+ setups.`,
          costText: `Generated +$${Math.round(totalPnl)} in net edge.`,
          type: "positive"
        };
      }
    }

    // Group pairs for selected account
    const pairStats: Record<string, { pnl: number, wins: number, total: number }> = {};
    trades.forEach(t => {
      const sym = t.symbol || 'OTHER';
      if (!pairStats[sym]) pairStats[sym] = { pnl: 0, wins: 0, total: 0 };
      pairStats[sym].pnl += Number(t.pnl) || 0;
      pairStats[sym].total += 1;
      if (t.isPositive || Number(t.pnl) > 0) pairStats[sym].wins += 1;
    });

    const sortedPairs = Object.entries(pairStats)
      .map(([symbol, data]) => ({
        symbol,
        pnl: data.pnl,
        winRate: (data.wins / data.total) * 100,
        gainTag: `${(data.wins / data.total * 100).toFixed(1)}% Win Rate`,
        iconColor: symbol.includes('XAU') || symbol.includes('GOLD') ? "bg-amber-500" : (symbol.includes('EUR') || symbol.includes('GBP') ? "bg-emerald-500" : "bg-neutral-900 dark:bg-neutral-800"),
        icon: symbol.includes('XAU') || symbol.includes('GOLD') ? "🥇" : (symbol.includes('EUR') || symbol.includes('GBP') ? "💎" : "⚡")
      }))
      .sort((a, b) => b.pnl - a.pnl);

    return {
      balance: initialCap + totalPnl,
      totalProfit: totalPnl,
      avgGrowing: ((totalPnl / initialCap) * 100) / Math.max(1, trades.length),
      winRate,
      profitFactor,
      bestPair: sortedPairs[0]?.symbol || "N/A",
      topPairs: sortedPairs.slice(0, 3),
      // Period / Snapshot details
      periodPnl,
      periodWinRate,
      periodProfitFactor,
      periodTradeCount: activePeriodTrades.length,
      periodWinsCount: periodWins.length,
      periodLossesCount: periodLosses.length,
      avgR,
      isShowingCurrentMonth,
      biggestPattern
    };
  }, [trades, selectedAccount]);

  // Buy vs Sell Order Bias Differentiation
  const orderBiasStats = useMemo(() => {
    const buyTrades = trades.filter(t => t.action?.toUpperCase() === 'BUY');
    const sellTrades = trades.filter(t => t.action?.toUpperCase() === 'SELL');
    
    const buyCount = buyTrades.length;
    const sellCount = sellTrades.length;
    const totalCount = buyCount + sellCount;

    const buyPnl = buyTrades.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);
    const sellPnl = sellTrades.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);

    const buyWins = buyTrades.filter(t => t.isPositive || Number(t.pnl) > 0).length;
    const sellWins = sellTrades.filter(t => t.isPositive || Number(t.pnl) > 0).length;

    const buyWinRate = buyCount > 0 ? (buyWins / buyCount) * 100 : 0;
    const sellWinRate = sellCount > 0 ? (sellWins / sellCount) * 100 : 0;

    const buyPercent = totalCount > 0 ? ((buyCount / totalCount) * 100) : 50;
    const sellPercent = totalCount > 0 ? ((sellCount / totalCount) * 100) : 50;

    const chartData = totalCount > 0 ? [
      { name: 'BUY', value: buyCount, color: '#10b981' },
      { name: 'SELL', value: sellCount, color: '#f43f5e' }
    ] : [
      { name: 'None', value: 1, color: isDark ? '#262626' : '#e5e7eb' }
    ];

    let biasLabel = 'Neutral';
    let biasColor = 'bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300';
    if (buyCount > sellCount) {
      biasLabel = `${buyPercent.toFixed(0)}% Long Bias`;
      biasColor = 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40';
    } else if (sellCount > buyCount) {
      biasLabel = `${sellPercent.toFixed(0)}% Short Bias`;
      biasColor = 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40';
    }

    return {
      buyCount,
      sellCount,
      totalCount,
      buyPercent: totalCount > 0 ? buyPercent.toFixed(1) : '0',
      sellPercent: totalCount > 0 ? sellPercent.toFixed(1) : '0',
      buyPnl,
      sellPnl,
      buyWinRate: buyWinRate.toFixed(0),
      sellWinRate: sellWinRate.toFixed(0),
      chartData,
      biasLabel,
      biasColor
    };
  }, [trades, isDark]);

  // Session Breakdown & Performance Stats
  const sessionStats = useMemo(() => {
    // Determine session from trade.session or by trade timestamp UTC hour
    const getTradeSession = (t: Trade): 'Asian' | 'London' | 'New York' | 'Out of Session' => {
      const rawSession = (t.session || '').toLowerCase().trim();
      if (rawSession.includes('asia') || rawSession.includes('tokyo') || rawSession.includes('sydney')) return 'Asian';
      if (rawSession.includes('london') || rawSession.includes('frankfurt') || rawSession.includes('europe')) return 'London';
      if (rawSession.includes('ny') || rawSession.includes('new york') || rawSession.includes('us')) return 'New York';
      
      // Fallback to trade time if available
      const date = getTradeDate(t.date || t.createdAt);
      if (!isNaN(date.getTime())) {
        const utcHour = date.getUTCHours();
        if (utcHour >= 0 && utcHour < 7) return 'Asian';       // 00:00 - 07:00 UTC
        if (utcHour >= 7 && utcHour < 13) return 'London';     // 07:00 - 13:00 UTC
        if (utcHour >= 13 && utcHour < 21) return 'New York';  // 13:00 - 21:00 UTC
      }
      return 'Out of Session';
    };

    const buckets: Record<'Asian' | 'London' | 'New York' | 'Out of Session', {
      trades: Trade[];
      wins: number;
      losses: number;
      pnl: number;
      color: string;
      dotColor: string;
    }> = {
      'Asian': { trades: [], wins: 0, losses: 0, pnl: 0, color: '#f59e0b', dotColor: 'bg-amber-500' },
      'London': { trades: [], wins: 0, losses: 0, pnl: 0, color: '#3b82f6', dotColor: 'bg-blue-500' },
      'New York': { trades: [], wins: 0, losses: 0, pnl: 0, color: '#10b981', dotColor: 'bg-emerald-500' },
      'Out of Session': { trades: [], wins: 0, losses: 0, pnl: 0, color: '#a855f7', dotColor: 'bg-purple-500' }
    };

    trades.forEach(t => {
      const s = getTradeSession(t);
      buckets[s].trades.push(t);
      const isWin = t.isPositive || Number(t.pnl) > 0;
      if (isWin) {
        buckets[s].wins += 1;
      } else {
        buckets[s].losses += 1;
      }
      buckets[s].pnl += (Number(t.pnl) || 0);
    });

    const totalTrades = trades.length;

    const list = (['Asian', 'London', 'New York', 'Out of Session'] as const).map(name => {
      const b = buckets[name];
      const count = b.trades.length;
      const winRate = count > 0 ? (b.wins / count) * 100 : 0;
      const lossRate = count > 0 ? (b.losses / count) * 100 : 0;
      const pctOfTotal = totalTrades > 0 ? (count / totalTrades) * 100 : 0;

      return {
        name,
        count,
        wins: b.wins,
        losses: b.losses,
        pnl: b.pnl,
        winRate: winRate.toFixed(0),
        lossRate: lossRate.toFixed(0),
        pctOfTotal: pctOfTotal.toFixed(1),
        color: b.color,
        dotColor: b.dotColor
      };
    });

    // Best performing session
    const activeSessions = list.filter(s => s.count > 0);
    const bestSession = activeSessions.length > 0 
      ? [...activeSessions].sort((a, b) => b.pnl - a.pnl)[0] 
      : null;

    const chartData = activeSessions.length > 0 ? activeSessions.map(s => ({
      name: s.name,
      value: s.count,
      color: s.color
    })) : [
      { name: 'None', value: 1, color: isDark ? '#262626' : '#e5e7eb' }
    ];

    return {
      list,
      totalTrades,
      bestSession,
      chartData
    };
  }, [trades, isDark]);

  // Activity Chart Data Calculation (Strictly for selected account trades)
  const activityChartData = useMemo(() => {
    const parseTradeDate = (dStr: string) => {
      if (!dStr) return new Date();
      if (dStr.startsWith('Today')) return new Date();
      if (dStr.startsWith('Yesterday')) {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return d;
      }
      return new Date(dStr);
    };

    if (activityView === 'Month') {
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const counts = new Array(12).fill(0);
      
      if (trades.length > 0) {
        trades.forEach(t => {
          const d = parseTradeDate(t.date);
          if (!isNaN(d.getTime())) {
            counts[d.getMonth()] += 1;
          }
        });
      }
      
      const maxVal = Math.max(...counts, 10);
      return months.map((m, idx) => ({
        m, 
        v: counts[idx], 
        h: Math.max((counts[idx] / maxVal) * 100, counts[idx] > 0 ? 5 : 0)
      }));
    } else {
      // Week View
      const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
      const counts = new Array(7).fill(0);
      
      if (trades.length > 0) {
        const now = new Date();
        const startOfWeek = new Date(now);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
        startOfWeek.setDate(diff);
        startOfWeek.setHours(0,0,0,0);
        
        trades.forEach(t => {
          const d = parseTradeDate(t.date);
          if (!isNaN(d.getTime()) && d >= startOfWeek) {
            let dayIdx = d.getDay() - 1;
            if (dayIdx === -1) dayIdx = 6;
            counts[dayIdx] += 1;
          }
        });
      }
      
      const maxVal = Math.max(...counts, 5);
      return days.map((m, idx) => ({
        m, 
        v: counts[idx], 
        h: Math.max((counts[idx] / maxVal) * 100, counts[idx] > 0 ? 5 : 0)
      }));
    }
  }, [trades, activityView]);

  const activityMaxVal = useMemo(() => {
    return Math.max(...activityChartData.map(d => d.v), activityView === 'Month' ? 20 : 10);
  }, [activityChartData, activityView]);

  // Equity Curve calculation (Strictly for selected account + timeframe filter)
  const equityChartData = useMemo(() => {
    const initialBalance = selectedAccount?.initialCapital || 100000;

    if (!trades.length) {
      return [
        { id: 'fallback-start', index: 0, date: 'Start', time: '', val1: initialBalance, val2: initialBalance, pnl: 0, dateLabel: 'Account Opening' },
        { id: 'fallback-now', index: 1, date: 'Now', time: '', val1: initialBalance, val2: initialBalance, pnl: 0, dateLabel: 'No Trades Yet' },
      ];
    }

    // Sort all trades chronologically
    const allSorted = [...trades].sort((a, b) => getTradeDate(a.date).getTime() - getTradeDate(b.date).getTime());

    // Filter by timeframe if applicable
    let activeTrades = allSorted;
    if (timeframe !== 'ALL') {
      const validTimes = allSorted.map(t => getTradeDate(t.date).getTime()).filter(t => !isNaN(t));
      if (validTimes.length > 0) {
        const latestTime = Math.max(...validTimes);
        const days = timeframe === '1D' ? 1 : timeframe === '1W' ? 7 : 30;
        const cutoff = latestTime - days * 24 * 60 * 60 * 1000;
        const inWindow = allSorted.filter(t => getTradeDate(t.date).getTime() >= cutoff);
        if (inWindow.length > 0) {
          activeTrades = inWindow;
        }
      }
    }

    let running = initialBalance;
    let baseline = initialBalance;

    // Calculate baseline up to active range (0.12% steady realistic target growth per trade)
    const TARGET_RATE = 0.0012; // 0.12% per trade
    const startIndex = allSorted.indexOf(activeTrades[0]);
    for (let i = 0; i < startIndex; i++) {
      running += Number(allSorted[i].pnl) || 0;
      baseline += initialBalance * TARGET_RATE;
    }

    const startEquity = running;

    const points = activeTrades.map((t, index) => {
      const pnl = Number(t.pnl) || 0;
      running += pnl;
      baseline += initialBalance * TARGET_RATE;
      const d = getTradeDate(t.date);

      const dayStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

      return {
        id: t.id || index,
        index: index + 1,
        date: dayStr,
        time: timeStr,
        dateLabel: `${dayStr} ${timeStr !== '00:00' ? timeStr : ''}`,
        val1: Number(running.toFixed(2)),
        val2: Number(baseline.toFixed(2)),
        pnl
      };
    });

    if (points.length === 1) {
      return [
        {
          id: 'start',
          index: 0,
          date: 'Start',
          time: '',
          dateLabel: 'Opening',
          val1: Number(startEquity.toFixed(2)),
          val2: Number(initialBalance.toFixed(2)),
          pnl: 0
        },
        points[0]
      ];
    }

    return points;
  }, [trades, selectedAccount, timeframe]);

  const handleNewTrade = async (newTrade: any) => {
    await addTrade({
      accountId: newTrade.accountId,
      date: newTrade.date,
      symbol: newTrade.symbol,
      action: newTrade.action,
      size: newTrade.size,
      result: newTrade.result,
      isPositive: newTrade.isPositive,
      pnl: newTrade.pnl
    });
  };

  const handleSaveImportedTrades = async (extractedTrades: any[]) => {
    for (const t of extractedTrades) {
      const grossPnl = parseFloat(t.profit) || 0;
      let comm = parseFloat(t.commission) || 0;
      
      if (comm === 0) {
        const isMetal = t.symbol.toUpperCase().includes('XAU') || t.symbol.toUpperCase().includes('XAG') || t.symbol.toUpperCase().includes('GOLD') || t.symbol.toUpperCase().includes('SILVER');
        const rate = isMetal ? (selectedAccount?.commissionMetals ?? 5) : (selectedAccount?.commissionForex ?? 5);
        comm = (parseFloat(t.volume) || 0) * rate;
      }
      
      const pnl = grossPnl - Math.abs(comm);
      const isoDate = normalizeImportedDateTime(t.date_time);
      const now = new Date();
      now.setFullYear(2026);
      const dateStr = isoDate || now.toISOString();

      await addTrade({
        accountId: selectedAccountId || '',
        date: dateStr,
        symbol: t.symbol,
        action: t.type,
        size: `${t.volume} Lot`,
        entry: t.entry_price?.toString() || "",
        exit: t.exit_price?.toString() || "",
        result: pnl >= 0 ? `+$${pnl.toFixed(2)}` : `-$${Math.abs(pnl).toFixed(2)}`,
        isPositive: pnl >= 0,
        pnl: pnl,
        session: "Else",
        confidence: t.confidence || "Medium",
        duration: "",
        tag: t.close_reason && t.close_reason !== 'Unknown' ? t.close_reason : "",
        tags: t.close_reason && t.close_reason !== 'Unknown' ? [t.close_reason] : [],
        strategy: t.strategy || "",
      });
    }
  };

  const handleImportClick = () => {
    setExtractionError(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!selectedAccountId) {
      setExtractionError("Please select a trading account first");
      return;
    }

    setIsExtracting(true);
    setExtractionError(null);

    try {
      const result = await analyzeTradeScreenshot(file);

      if (result.error === "MISSING_API_KEY") {
        setIsAiConfigOpen(true);
        setExtractionError("Groq or Gemini API key required for OCR. Click here to configure.");
        return;
      }

      if (result.trades && result.trades.length > 0) {
        setExtractedData({ trades: result.trades });
        setIsImportModalOpen(true);
        setExtractionError(null);
      } else {
        setExtractionError(result.error || "Could not detect trades in image. Click to verify your AI key or try another screenshot.");
      }
    } catch (error: any) {
      setExtractionError(error.message || "Failed to parse screenshot");
    } finally {
      setIsExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveAiKeys = () => {
    setAiApiKey(tempAiKey);
    setGeminiApiKey(tempGeminiKey);
    setIsAiConfigOpen(false);
    setExtractionError(null);
  };

  // Recent executions list
  const recentExecutions = useMemo(() => {
    if (trades.length > 0) {
      return trades.slice(0, 5).map((t, idx) => {
        const isPos = t.isPositive || Number(t.pnl) >= 0;
        const d = t.date || t.createdAt ? getTradeDate(t.date || t.createdAt) : new Date();
        const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        const pnlNum = Number(t.pnl) || 0;

        return {
          id: t.id || idx,
          symbol: t.symbol || 'EURUSD',
          action: t.action || 'BUY',
          size: t.size || '1.0 Lot',
          strategy: t.strategy || (Array.isArray(t.tags) ? t.tags[0] : t.tag) || '',
          date: dateStr,
          rawDate: d,
          pnl: pnlNum,
          amount: isPos ? `+$${Math.abs(pnlNum).toFixed(2)}` : `-$${Math.abs(pnlNum).toFixed(2)}`,
          status: isPos ? 'Success' : (pnlNum === 0 ? 'Break Even' : 'Stopped Out'),
          statusColor: isPos 
            ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/40' 
            : 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200/60 dark:border-rose-800/40',
          statusDot: isPos ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]' : 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]',
          isPos
        };
      });
    }
    return [];
  }, [trades]);

  // Macro Discipline Heatmap Data (Current 1 Month)
  const macroHeatmapData = useMemo<DailyHeatmapData[]>(() => {
    const days: Date[] = [];
    const now = new Date();
    const start = startOfMonth(now);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0); // End of current month
    
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const daysInPeriod = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    for (let i = 0; i < daysInPeriod; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      days.push(d);
    }

    const accountRules = selectedAccount?.rules?.filter(r => r.enabled) || [];
    const equity = selectedAccount?.currentEquity || selectedAccount?.initialCapital || 100000;

    return days.map(day => {
      const dayStart = startOfDay(day);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);
      
      const dayT = trades.filter(t => {
        const d = getTradeDate(t.date);
        return d >= dayStart && d <= dayEnd;
      });

      const pnl = dayT.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
      const tCount = dayT.length;
      const active = tCount > 0;
      
      const goalStatuses: DailyGoalStatus[] = [];

      // Default targets & limits
      if (active) {
        goalStatuses.push({
          id: 'pnl',
          label: 'Daily Profit Target (+$300)',
          status: pnl >= 300 ? 'achieved' : pnl > 0 ? 'in-progress' : 'not-started'
        });
        goalStatuses.push({
          id: 'loss',
          label: 'Max Daily Loss Limit (-$200)',
          status: pnl >= -200 ? 'achieved' : 'breached'
        });
      }

      // Add account custom rules
      for (const rule of accountRules) {
        let ruleStatus: DailyGoalStatus['status'] = 'not-started';
        if (active) {
          switch (rule.type) {
            case 'max_trades_per_day':
              ruleStatus = tCount > rule.value ? 'breached' : tCount === rule.value ? 'in-progress' : 'achieved';
              break;
            case 'max_loss_per_trade': {
              const worstTrade = dayT.reduce((w, t) => Math.min(w, t.pnl || 0), 0);
              ruleStatus = Math.abs(worstTrade) > rule.value ? 'breached' : 'achieved';
              break;
            }
            case 'daily_loss_limit': {
              const loss = Math.abs(Math.min(0, pnl));
              if (rule.unit === '%') {
                const lossPct = equity > 0 ? (loss / equity) * 100 : 0;
                ruleStatus = lossPct > rule.value ? 'breached' : lossPct >= rule.value * 0.8 ? 'in-progress' : 'achieved';
              } else {
                ruleStatus = loss > rule.value ? 'breached' : 'achieved';
              }
              break;
            }
            case 'custom': {
              if (rule.unit === 'trades') {
                ruleStatus = tCount > rule.value ? 'breached' : 'achieved';
              } else if (rule.unit === '$') {
                const totalLoss = Math.abs(Math.min(0, pnl));
                ruleStatus = totalLoss > rule.value ? 'breached' : 'achieved';
              } else {
                const lossPct = equity > 0 ? (Math.abs(Math.min(0, pnl)) / equity) * 100 : 0;
                ruleStatus = lossPct > rule.value ? 'breached' : 'achieved';
              }
              break;
            }
          }
        }
        goalStatuses.push({ id: `rule-${rule.id}`, label: `⛡ ${rule.name}`, status: ruleStatus });
      }

      const passedGoals = goalStatuses.filter(g => g.status === 'achieved').length;
      const breachedAny = goalStatuses.some(g => g.status === 'breached');
      const score = active && goalStatuses.length > 0 ? passedGoals / goalStatuses.length : (active ? (pnl >= 0 ? 1 : 0) : 0);
      
      return {
        date: day,
        active,
        breachedLimits: active && breachedAny,
        score,
        goals: goalStatuses
      };
    });
  }, [trades, selectedAccount]);

  return (
    <div className="flex flex-col min-h-full font-normal overflow-x-hidden w-full max-w-full min-w-0">
      <TopBar />

      <TradeModal 
        isOpen={isTradeModalOpen} 
        onClose={() => setIsTradeModalOpen(false)} 
        onSubmit={handleNewTrade} 
      />

      <ImportTradesModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSave={handleSaveImportedTrades}
        initialData={extractedData}
      />

      {/* Hidden screenshot file input */}
      <input 
        type="file" 
        accept="image/png, image/jpeg, image/jpg" 
        className="hidden" 
        ref={fileInputRef}
        onChange={handleFileChange}
      />

      <div className="p-3.5 sm:p-6 md:p-8 space-y-5 sm:space-y-7 max-w-[1600px] w-full mx-auto min-w-0 overflow-x-hidden">
        
        {/* Rule Violation Notifications */}
        <AnimatePresence>
          {activeViolations.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-2"
            >
              {activeViolations.map((violation) => (
                <div
                  key={violation.ruleId}
                  className="flex items-center justify-between px-4 py-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300 text-xs font-medium"
                >
                  <div className="flex items-center gap-2.5">
                    <Shield className="w-4 h-4 text-amber-500" />
                    <span><strong className="font-semibold">Risk Warning:</strong> {violation.ruleName} — {violation.detail}</span>
                  </div>
                  <button onClick={() => dismissViolation(violation.ruleId)} className="p-1 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 2-Column Responsive Grid Layout (~68% Left / ~32% Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
          
          {/* ================= LEFT / CENTER AREA (8 COLS) ================= */}
          <div className="lg:col-span-8 flex flex-col gap-7">
            
            {/* Trader Performance Snapshot (Actionable Overview with Circular Gauges & Rich Visuals) */}
            <div className="bg-white dark:bg-[#16181f] rounded-3xl p-6 md:p-7 border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs space-y-6 relative overflow-hidden group">
              {/* Subtle background ambient glow for high-end aesthetic */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-emerald-500/5 via-blue-500/5 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

              {/* Header with Title Pill & Heading and Copy/Share Button */}
              <div className="flex items-center justify-between relative z-10">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 dark:bg-neutral-800 text-gray-800 dark:text-gray-200 text-xs font-semibold tracking-tight font-headline border border-gray-200/60 dark:border-neutral-700/60 shadow-2xs">
                      <Activity className="w-3.5 h-3.5 text-emerald-500 stroke-[2.5]" />
                      <span>YOUR TRADING {stats.isShowingCurrentMonth ? 'THIS MONTH' : 'OVERVIEW'}</span>
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    const text = `📊 Trading Snapshot (${stats.isShowingCurrentMonth ? 'This Month' : 'Overview'}):\n` +
                      `• Net P&L: ${stats.periodPnl >= 0 ? '+' : ''}$${stats.periodPnl.toFixed(2)}\n` +
                      `• Win Rate: ${stats.periodWinRate.toFixed(1)}%\n` +
                      `• Profit Factor: ${stats.periodProfitFactor.toFixed(2)}\n` +
                      `• Total Trades: ${stats.periodTradeCount} (${stats.periodWinsCount}W / ${stats.periodLossesCount}L)\n` +
                      `• Avg R: ${stats.avgR >= 0 ? '+' : ''}${stats.avgR.toFixed(2)}R\n` +
                      (stats.biggestPattern?.headline ? `\n⚠️ Key Pattern: ${stats.biggestPattern.headline}` : '');
                    navigator.clipboard.writeText(text);
                    setCopiedSnapshot(true);
                    setTimeout(() => setCopiedSnapshot(false), 2000);
                  }}
                  className="w-8 h-8 rounded-xl border border-gray-200 dark:border-neutral-800 flex items-center justify-center text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-neutral-800/60 transition-all duration-200 shadow-2xs"
                  title="Copy Snapshot summary"
                >
                  {copiedSnapshot ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {/* Main Content Layout: Left Circular Gauge + Right Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center relative z-10">
                {/* Simple 2-Segment Donut Chart (Wins in Green / Losses in Red) */}
                <div className="md:col-span-4 flex items-center justify-center py-2">
                  <div className="relative w-40 h-40 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">
                      {/* Base fallback circle when no trades */}
                      {stats.periodTradeCount === 0 ? (
                        <circle
                          cx="70"
                          cy="70"
                          r="52"
                          className="stroke-gray-200 dark:stroke-neutral-800"
                          strokeWidth="14"
                          fill="transparent"
                        />
                      ) : (
                        (() => {
                          const r = 52;
                          const circumference = 2 * Math.PI * r;
                          const gap = stats.periodWinsCount > 0 && stats.periodLossesCount > 0 ? 5 : 0;
                          const total = stats.periodTradeCount;
                          
                          const winPct = stats.periodWinsCount / total;
                          const lossPct = stats.periodLossesCount / total;

                          const winLength = Math.max(0, winPct * circumference - gap);
                          const lossLength = Math.max(0, lossPct * circumference - gap);
                          
                          // Wins starts at top (0 deg)
                          const winOffset = 0;
                          // Losses starts after win segment + gap
                          const lossOffset = -(winPct * circumference);

                          return (
                            <>
                              {/* Green Segment (Wins) */}
                              {stats.periodWinsCount > 0 && (
                                <circle
                                  cx="70"
                                  cy="70"
                                  r={r}
                                  stroke="#10b981"
                                  strokeWidth="14"
                                  strokeDasharray={`${winLength} ${circumference - winLength}`}
                                  strokeDashoffset={winOffset}
                                  fill="transparent"
                                  className="transition-all duration-700 ease-out"
                                />
                              )}
                              {/* Red Segment (Losses) */}
                              {stats.periodLossesCount > 0 && (
                                <circle
                                  cx="70"
                                  cy="70"
                                  r={r}
                                  stroke="#f43f5e"
                                  strokeWidth="14"
                                  strokeDasharray={`${lossLength} ${circumference - lossLength}`}
                                  strokeDashoffset={lossOffset}
                                  fill="transparent"
                                  className="transition-all duration-700 ease-out"
                                />
                              )}
                            </>
                          );
                        })()
                      )}
                    </svg>

                    {/* Center Text with Total Trades / Orders Count */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
                      <span className="text-3xl font-extrabold font-mono tracking-tight text-gray-900 dark:text-white">
                        {stats.periodTradeCount}
                      </span>
                      <span className="text-[11px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider font-sans mt-0.5">
                        ORDERS
                      </span>
                    </div>
                  </div>
                </div>

                {/* 5 Key Metric Cards (8 cols) */}
                <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono">
                  {/* Net P&L */}
                  <div className="bg-gray-50/80 dark:bg-neutral-900/50 rounded-2xl p-3.5 border border-gray-100 dark:border-neutral-800/60 flex flex-col justify-between">
                    <span className="text-[11px] text-gray-400 dark:text-gray-400 font-sans font-medium uppercase tracking-wider">
                      Net P&amp;L
                    </span>
                    <div className={`text-lg sm:text-xl font-bold tracking-tight mt-1 ${
                      stats.periodPnl > 0 
                        ? 'text-emerald-600 dark:text-emerald-400' 
                        : stats.periodPnl < 0 
                          ? 'text-rose-600 dark:text-rose-400' 
                          : 'text-gray-900 dark:text-white'
                    }`}>
                      {stats.periodPnl >= 0 ? `+$${stats.periodPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `-$${Math.abs(stats.periodPnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </div>
                  </div>

                  {/* Profit Factor */}
                  <div className="bg-gray-50/80 dark:bg-neutral-900/50 rounded-2xl p-3.5 border border-gray-100 dark:border-neutral-800/60 flex flex-col justify-between">
                    <span className="text-[11px] text-gray-400 dark:text-gray-400 font-sans font-medium uppercase tracking-wider">
                      Profit Factor
                    </span>
                    <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight mt-1">
                      {stats.periodProfitFactor.toFixed(2)}
                    </div>
                  </div>

                  {/* Avg R */}
                  <div className="bg-gray-50/80 dark:bg-neutral-900/50 rounded-2xl p-3.5 border border-gray-100 dark:border-neutral-800/60 flex flex-col justify-between">
                    <span className="text-[11px] text-gray-400 dark:text-gray-400 font-sans font-medium uppercase tracking-wider">
                      Avg R
                    </span>
                    <div className={`text-lg sm:text-xl font-bold tracking-tight mt-1 ${
                      stats.avgR > 0 
                        ? 'text-emerald-600 dark:text-emerald-400' 
                        : stats.avgR < 0 
                          ? 'text-rose-600 dark:text-rose-400' 
                          : 'text-gray-900 dark:text-white'
                    }`}>
                      {stats.avgR >= 0 ? `+${stats.avgR.toFixed(1)}R` : `${stats.avgR.toFixed(1)}R`}
                    </div>
                  </div>

                  {/* Total Trades */}
                  <div className="bg-gray-50/80 dark:bg-neutral-900/50 rounded-2xl p-3.5 border border-gray-100 dark:border-neutral-800/60 flex flex-col justify-between">
                    <span className="text-[11px] text-gray-400 dark:text-gray-400 font-sans font-medium uppercase tracking-wider">
                      Trades
                    </span>
                    <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight mt-1">
                      {stats.periodTradeCount}
                    </div>
                  </div>

                  {/* Win / Loss Split */}
                  <div className="bg-gray-50/80 dark:bg-neutral-900/50 rounded-2xl p-3.5 border border-gray-100 dark:border-neutral-800/60 flex flex-col justify-between">
                    <span className="text-[11px] text-gray-400 dark:text-gray-400 font-sans font-medium uppercase tracking-wider">
                      W / L Ratio
                    </span>
                    <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight mt-1">
                      <span className="text-emerald-600 dark:text-emerald-400">{stats.periodWinsCount}</span>
                      <span className="text-gray-400 font-normal mx-1">/</span>
                      <span className="text-rose-600 dark:text-rose-400">{stats.periodLossesCount}</span>
                    </div>
                  </div>

                  {/* Best Symbol / Edge */}
                  <div className="bg-gray-50/80 dark:bg-neutral-900/50 rounded-2xl p-3.5 border border-gray-100 dark:border-neutral-800/60 flex flex-col justify-between">
                    <span className="text-[11px] text-gray-400 dark:text-gray-400 font-sans font-medium uppercase tracking-wider">
                      Top Asset
                    </span>
                    <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight mt-1 truncate">
                      {stats.bestPair || '—'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Dividing separator */}
              <div className="border-t border-gray-100 dark:border-neutral-800/80 pt-5 relative z-10">
                {/* Biggest Pattern Actionable Section */}
                <div className="bg-gray-50/60 dark:bg-neutral-900/40 rounded-2xl p-4 border border-gray-200/50 dark:border-neutral-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-900 dark:text-gray-200">
                      <div className="w-5 h-5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-[10px]">
                        ▲
                      </div>
                      <span className="font-headline tracking-tight font-semibold">Biggest Pattern</span>
                    </div>

                    <p className="text-gray-900 dark:text-gray-100 font-medium text-sm leading-relaxed">
                      {stats.biggestPattern?.headline || "Log your trades to discover behavioral edge leaks & patterns."}
                    </p>
                    
                    {stats.biggestPattern?.costText && (
                      <p className="text-rose-600 dark:text-rose-400 font-medium text-xs">
                        {stats.biggestPattern.costText}
                      </p>
                    )}
                  </div>

                  <button 
                    onClick={() => navigate('/ai-engine')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-neutral-800 text-xs font-medium text-gray-700 hover:text-gray-900 dark:text-gray-200 dark:hover:text-white border border-gray-200 dark:border-neutral-700 shadow-2xs hover:shadow-xs transition-all group shrink-0"
                  >
                    <span>View Analysis</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white" />
                  </button>
                </div>
              </div>
            </div>
                    {/* Portfolio Growth Over Time Curve Chart */}
            <div className="bg-white dark:bg-[#16181f] rounded-3xl p-6 md:p-7 border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                      Portfolio Growth Over Time
                    </h3>
                    <div className="flex items-center gap-3 ml-2 text-[11px] font-medium text-gray-400">
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-1 rounded-full bg-blue-500"></span>
                        Equity
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-0.5 border-b border-dashed border-teal-500"></span>
                        Target
                      </span>
                    </div>
                  </div>
                  <p className="text-xs font-normal text-gray-400 mt-0.5">Realized Cumulative Equity vs Initial Capital Benchmark</p>
                </div>

                <div className="segment-pill-container self-start sm:self-auto">
                  {(['1D', '1W', '1M', 'ALL'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTimeframe(t)}
                      className={`segment-pill-btn ${
                        timeframe === t ? 'segment-pill-btn-active' : ''
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clean Curve Chart */}
              <div className="h-[280px] w-full relative pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart key={timeframe} data={equityChartData} margin={{ top: 15, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="curveEquity" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={isDark ? "#38bdf8" : "#3b82f6"} stopOpacity={isDark ? 0.28 : 0.15}/>
                        <stop offset="100%" stopColor={isDark ? "#38bdf8" : "#3b82f6"} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.05)" : "#f1f5f9"} vertical={false} />
                    
                    <XAxis 
                      dataKey="index" 
                      stroke={isDark ? "#64748b" : "#94a3b8"} 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false} 
                      minTickGap={35}
                      tickFormatter={(idx) => {
                        const ptIdx = equityChartData.findIndex(p => p.index === idx);
                        if (ptIdx === -1) return '';
                        const pt = equityChartData[ptIdx];
                        const prevPt = ptIdx > 0 ? equityChartData[ptIdx - 1] : null;
                        if (!prevPt || prevPt.date !== pt.date) {
                          return pt.date;
                        }
                        return '';
                      }}
                    />
                    
                    <YAxis 
                      stroke={isDark ? "#64748b" : "#94a3b8"} 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(val) => `$${val >= 10000 ? `${(val / 1000).toFixed(1)}k` : val.toLocaleString()}`}
                      domain={['auto', 'auto']}
                      className="tabular-nums"
                    />
                    
                    <Tooltip content={<TradeXChartTooltip />} />
                    
                    {/* Main Realized Equity Curve with Subtle Transition */}
                    <Area 
                      type="monotone" 
                      dataKey="val1" 
                      stroke={isDark ? "#38bdf8" : "#2563eb"} 
                      strokeWidth={2.5} 
                      fillOpacity={1} 
                      fill="url(#curveEquity)" 
                      isAnimationActive={true}
                      animationDuration={750}
                      animationEasing="ease-out"
                    />
                    
                    {/* Benchmark Dotted Target Line */}
                    <Area 
                      type="monotone" 
                      dataKey="val2" 
                      stroke={isDark ? "#2dd4bf" : "#0d9488"} 
                      strokeWidth={1.75} 
                      strokeDasharray="4 4"
                      fillOpacity={0} 
                      fill="none" 
                      isAnimationActive={true}
                      animationDuration={750}
                      animationEasing="ease-out"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Trading Calendar Heatmap */}
            <TradingCalendarHeatmap trades={trades} selectedAccountId={selectedAccountId} />

            {/* Macro Discipline Heatmap (3-Month Target & Rule Adherence) */}
            <GoalHeatmap data={macroHeatmapData} mode="month" />

            {/* Recent Executions History List */}
            <div className="bg-white dark:bg-[#16181f] rounded-3xl p-4 sm:p-6 md:p-7 border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] font-semibold">
                      ★ Order Stream
                    </span>
                  </div>
                  <h3 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight mt-1">
                    Recent Executions
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">Latest journal entries & platform syncs</p>
                </div>
                <button 
                  onClick={() => navigate('/trades')}
                  className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/40 px-3 py-1.5 rounded-xl transition-all shadow-2xs group cursor-pointer"
                >
                  <span>See All ({trades.length})</span>
                  <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </button>
              </div>

              {recentExecutions.length > 0 ? (
                <div className="divide-y divide-gray-100 dark:divide-neutral-800/60">
                  {recentExecutions.map((tx) => (
                    <div
                      key={tx.id}
                      onClick={() => navigate('/trades')}
                      className="py-3 sm:py-3.5 px-2 sm:px-3 -mx-2 sm:-mx-3 rounded-2xl hover:bg-gray-50/80 dark:hover:bg-neutral-800/40 transition-all flex items-center justify-between gap-3 group cursor-pointer"
                    >
                      {/* Left: Action Icon + Symbol & Details */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105 ${
                          tx.action === 'BUY'
                            ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-200/60 dark:border-blue-800/40 text-blue-600 dark:text-blue-400'
                            : 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-800/40 text-amber-600 dark:text-amber-400'
                        }`}>
                          {tx.action === 'BUY' ? (
                            <ArrowUpRight className="w-5 h-5" />
                          ) : (
                            <ArrowDownRight className="w-5 h-5" />
                          )}
                        </div>

                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {tx.symbol}
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md uppercase tracking-wider ${
                              tx.action === 'BUY' 
                                ? 'bg-blue-100/80 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300' 
                                : 'bg-amber-100/80 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300'
                            }`}>
                              {tx.action}
                            </span>
                            <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-neutral-800 px-1.5 py-0.2 rounded">
                              {tx.size}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                            <span>{tx.date}</span>
                            {tx.strategy && (
                              <>
                                <span>•</span>
                                <span className="text-gray-500 dark:text-gray-400 font-medium truncate max-w-[120px]">
                                  {tx.strategy}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: P&L Result & Status Pill */}
                      <div className="flex flex-col items-end shrink-0 gap-1">
                        <span className={`text-xs sm:text-sm font-black tabular-nums tracking-tight ${
                          tx.isPos 
                            ? 'text-emerald-600 dark:text-emerald-400' 
                            : 'text-rose-500 dark:text-rose-400'
                        }`}>
                          {tx.amount}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${tx.statusColor}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${tx.statusDot}`}></span>
                          <span>{tx.status}</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-gray-400 border border-dashed border-gray-200 dark:border-neutral-800 rounded-2xl">
                  No trade executions logged for this account yet.
                </div>
              )}
            </div>

          </div>

          {/* ================= RIGHT PANEL AREA (4 COLS) ================= */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Card 1: My balance / Trading Capital */}
            <div className="bg-white dark:bg-[#16181f] rounded-3xl p-6 border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-gray-50 dark:bg-neutral-800 text-gray-900 dark:text-white">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      Trading Capital & Balance
                    </span>
                    <div className="relative mt-0.5">
                      <select 
                        value={selectedAccountId || ''}
                        onChange={(e) => setSelectedAccountId(e.target.value)}
                        className="appearance-none bg-transparent text-xs font-medium text-blue-600 dark:text-blue-400 pr-4 cursor-pointer outline-none focus:ring-0"
                      >
                        {accounts.filter(acc => acc.status === 'ACTIVE').map(acc => (
                          <option key={acc.id} value={acc.id} className="text-gray-900 dark:text-gray-900">
                            {acc.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 text-blue-600 dark:text-blue-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => navigate('/accounts')}
                  className="w-7 h-7 rounded-full border border-gray-200 dark:border-neutral-700 flex items-center justify-center text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Big Balance Amount -> 700 + tabular-nums */}
              <div className="space-y-1">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-3xl font-bold tabular-nums text-gray-900 dark:text-white tracking-tight font-headline">
                    ${Number(stats.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h2>
                  <span className="text-xs font-medium text-gray-400 flex items-center gap-0.5">
                    USD <ChevronDown className="w-3 h-3" />
                  </span>
                </div>

                {/* Sub metrics row */}
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100 dark:border-neutral-800/80 text-left">
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium">Net Profit</p>
                    <p className={`text-xs font-bold tabular-nums ${stats.totalProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {stats.totalProfit >= 0 ? `+$${stats.totalProfit.toLocaleString()}` : `-$${Math.abs(stats.totalProfit).toLocaleString()}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium">Win Rate</p>
                    <p className="text-xs font-bold tabular-nums text-gray-900 dark:text-white">
                      {stats.winRate.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium">Profit Factor</p>
                    <p className="text-xs font-bold tabular-nums text-gray-900 dark:text-white truncate">
                      {stats.profitFactor.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Log Trade & Import Trades */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  onClick={() => setIsTradeModalOpen(true)}
                  className="btn-primary py-2.5 px-4 text-xs font-semibold group w-full"
                >
                  <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>Log Trade</span>
                </button>

                <button
                  onClick={handleImportClick}
                  disabled={isExtracting}
                  className="btn-secondary py-2.5 px-4 text-xs font-semibold group w-full"
                >
                  {isExtracting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                  ) : (
                    <Upload className="w-4 h-4 text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white transition-colors" />
                  )}
                  <span>{isExtracting ? 'Scanning...' : 'Import'}</span>
                </button>
              </div>

              {extractionError && (
                <div 
                  onClick={() => setIsAiConfigOpen(true)}
                  className="flex items-center justify-between gap-1.5 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-3 rounded-2xl border border-rose-200 dark:border-rose-900/50 font-normal cursor-pointer hover:bg-rose-100/60 dark:hover:bg-rose-900/30 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>{extractionError}</span>
                  </div>
                  <span className="text-[11px] font-semibold underline shrink-0">Configure</span>
                </div>
              )}
            </div>

            {/* Card 2: Activity Bar Chart Card */}
            <div className="bg-white dark:bg-[#16181f] rounded-3xl p-6 border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Activity
                </h3>
                <div className="relative">
                  <button 
                    onClick={() => setActivityView(prev => prev === 'Month' ? 'Week' : 'Month')}
                    className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-gray-50 dark:bg-neutral-800 px-3 py-1.5 rounded-xl border border-gray-200/80 dark:border-neutral-700 transition-colors cursor-pointer"
                  >
                    <span>{activityView}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Subdued top divider */}
              <div className="w-full h-px bg-gray-100 dark:bg-neutral-800" />

              {/* Activity Capsule Bar Chart */}
              <div className="pt-2">
                <div className="flex items-end gap-2.5 h-48 w-full">
                  {/* Y-Axis Labels */}
                  <div className="flex flex-col justify-between h-40 text-[10px] font-medium text-gray-400 dark:text-gray-500 pb-5 select-none shrink-0 pr-1">
                    <span>{activityMaxVal}</span>
                    <span>{Math.round(activityMaxVal * 0.75)}</span>
                    <span>{Math.round(activityMaxVal * 0.5)}</span>
                    <span>{Math.round(activityMaxVal * 0.25)}</span>
                    <span>0</span>
                  </div>

                  {/* Dynamic Capsule Pillars */}
                  <div className={`grid ${activityView === 'Month' ? 'grid-cols-12' : 'grid-cols-7'} gap-1.5 sm:gap-2 flex-1 h-full items-end pb-1`}>
                    {activityChartData.map((col) => (
                      <div key={col.m} onClick={() => navigate('/trades')} className="flex flex-col items-center gap-2 h-full justify-end group cursor-pointer relative">
                        {/* Tooltip */}
                        <div className="absolute -top-8 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[10px] font-bold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
                          {col.m}: {col.v} trades logged
                        </div>
                        {/* Capsule Track */}
                        <div className="w-full max-w-[24px] bg-blue-50/70 dark:bg-blue-950/20 rounded-full h-40 flex flex-col justify-end p-0 overflow-hidden relative group-hover:bg-blue-100/70 dark:group-hover:bg-blue-950/40 transition-colors">
                          {/* Filled Blue Capsule */}
                          <div 
                            style={{ height: `${col.h}%` }}
                            className="w-full bg-[#3b82f6] rounded-full transition-all duration-500 shadow-xs group-hover:bg-blue-600"
                          />
                        </div>
                        {/* Label */}
                        <span className="text-[9px] sm:text-[10px] font-semibold text-gray-400 dark:text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                          {col.m}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Buy vs Sell Order Bias Circle Card */}
            <div className="bg-white dark:bg-[#16181f] rounded-3xl p-6 border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Order Direction & Bias
                  </h3>
                  <p className="text-[11px] text-gray-400">Buy vs Sell Execution Ratio</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${orderBiasStats.biasColor}`}>
                  {orderBiasStats.biasLabel}
                </span>
              </div>

              {/* Donut Circle Chart */}
              <div className="relative flex items-center justify-center py-1">
                <div className="w-[140px] h-[140px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={orderBiasStats.chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={46}
                        outerRadius={64}
                        paddingAngle={orderBiasStats.totalCount > 1 ? 4 : 0}
                        dataKey="value"
                        stroke={isDark ? "#16181f" : "#ffffff"}
                        strokeWidth={3}
                      >
                        {orderBiasStats.chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Center Badge inside Circle */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-xl font-black tabular-nums text-gray-900 dark:text-white tracking-tight">
                    {orderBiasStats.totalCount}
                  </span>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                    Orders
                  </span>
                </div>
              </div>

              {/* Buy vs Sell Metrics Cards */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                {/* BUY Card */}
                <div 
                  onClick={() => navigate('/trades')}
                  className="p-3 rounded-2xl bg-[#f8f9fb] dark:bg-neutral-800/40 border border-gray-100 dark:border-neutral-800/80 hover:border-emerald-300 dark:hover:border-emerald-800/60 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span className="text-xs font-bold text-gray-900 dark:text-white">BUY</span>
                    </div>
                    <span className="text-[11px] font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {orderBiasStats.buyPercent}%
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <p className={`text-xs font-bold tabular-nums ${orderBiasStats.buyPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                      {orderBiasStats.buyPnl >= 0 ? `+$${orderBiasStats.buyPnl.toFixed(2)}` : `-$${Math.abs(orderBiasStats.buyPnl).toFixed(2)}`}
                    </p>
                    <p className="text-[10px] text-gray-400 font-medium">
                      {orderBiasStats.buyCount} trades • {orderBiasStats.buyWinRate}% win
                    </p>
                  </div>
                </div>

                {/* SELL Card */}
                <div 
                  onClick={() => navigate('/trades')}
                  className="p-3 rounded-2xl bg-[#f8f9fb] dark:bg-neutral-800/40 border border-gray-100 dark:border-neutral-800/80 hover:border-rose-300 dark:hover:border-rose-800/60 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      <span className="text-xs font-bold text-gray-900 dark:text-white">SELL</span>
                    </div>
                    <span className="text-[11px] font-bold tabular-nums text-rose-600 dark:text-rose-400">
                      {orderBiasStats.sellPercent}%
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <p className={`text-xs font-bold tabular-nums ${orderBiasStats.sellPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                      {orderBiasStats.sellPnl >= 0 ? `+$${orderBiasStats.sellPnl.toFixed(2)}` : `-$${Math.abs(orderBiasStats.sellPnl).toFixed(2)}`}
                    </p>
                    <p className="text-[10px] text-gray-400 font-medium">
                      {orderBiasStats.sellCount} trades • {orderBiasStats.sellWinRate}% win
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4: Session Performance Breakdown Card (Asian, London, NY, Out of Session) */}
            <div className="bg-white dark:bg-[#16181f] rounded-3xl p-6 border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Trading Session Analysis
                  </h3>
                  <p className="text-[11px] text-gray-400">Asian • London • NY • Out of Session</p>
                </div>
                {sessionStats.bestSession ? (
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                    ★ Best: {sessionStats.bestSession.name}
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-100 dark:bg-neutral-800 text-gray-400">
                    All Sessions
                  </span>
                )}
              </div>

              {/* Donut Circle Chart for Sessions */}
              <div className="relative flex items-center justify-center py-1">
                <div className="w-[140px] h-[140px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sessionStats.chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={46}
                        outerRadius={64}
                        paddingAngle={sessionStats.totalTrades > 1 ? 3 : 0}
                        dataKey="value"
                        stroke={isDark ? "#16181f" : "#ffffff"}
                        strokeWidth={3}
                        onMouseEnter={(_, index) => {
                          const entry = sessionStats.chartData[index];
                          if (entry && entry.name !== 'None') setHoveredSession(entry.name);
                        }}
                        onMouseLeave={() => setHoveredSession(null)}
                      >
                        {sessionStats.chartData.map((entry, index) => {
                          const isHovered = hoveredSession === entry.name;
                          return (
                            <Cell 
                              key={`session-cell-${index}`} 
                              fill={entry.color} 
                              style={{
                                transform: isHovered ? 'scale(1.08)' : 'scale(1)',
                                transformOrigin: 'center center',
                                transition: 'transform 0.25s ease-out, filter 0.25s ease-out',
                                filter: isHovered ? 'drop-shadow(0px 0px 8px rgba(59,130,246,0.5))' : 'none',
                                cursor: 'pointer'
                              }}
                            />
                          );
                        })}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Center Badge inside Circle */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center transition-all duration-300">
                  {hoveredSession && sessionStats.list.find(s => s.name === hoveredSession) ? (
                    (() => {
                      const activeSess = sessionStats.list.find(s => s.name === hoveredSession)!;
                      return (
                        <>
                          <span className="text-sm font-extrabold tabular-nums tracking-tight text-gray-900 dark:text-white truncate max-w-[80px]">
                            {activeSess.name === 'New York' ? 'NY' : activeSess.name === 'Out of Session' ? 'Out' : activeSess.name}
                          </span>
                          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                            {activeSess.count} trades
                          </span>
                        </>
                      );
                    })()
                  ) : (
                    <>
                      <span className="text-xl font-black tabular-nums text-gray-900 dark:text-white tracking-tight">
                        {sessionStats.totalTrades}
                      </span>
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                        Sessions
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Session Grid Cards (2x2 Neat Layout with smooth zoom hover) */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                {sessionStats.list.map((sess) => {
                  const isHovered = hoveredSession === sess.name;
                  return (
                    <div 
                      key={sess.name}
                      onClick={() => navigate('/trades')}
                      onMouseEnter={() => setHoveredSession(sess.name)}
                      onMouseLeave={() => setHoveredSession(null)}
                      className={`p-3 rounded-2xl bg-[#f8f9fb] dark:bg-neutral-800/40 border transition-all duration-300 cursor-pointer group transform ${
                        isHovered 
                          ? 'scale-[1.04] shadow-md border-blue-400 dark:border-blue-500 bg-white dark:bg-neutral-800 ring-2 ring-blue-500/20' 
                          : 'border-gray-100 dark:border-neutral-800/80 hover:border-blue-300 dark:hover:border-blue-800/60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`w-2 h-2 rounded-full ${sess.dotColor} shrink-0 transition-transform duration-300 ${isHovered ? 'scale-125' : ''}`}></span>
                          <span className={`text-xs font-bold truncate transition-colors duration-200 ${isHovered ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                            {sess.name === 'New York' ? 'NY' : sess.name === 'Out of Session' ? 'Out of Sess' : sess.name}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold tabular-nums text-gray-500 dark:text-gray-400 shrink-0">
                          {sess.pctOfTotal}%
                        </span>
                      </div>
                      
                      <div className="space-y-0.5">
                        <p className={`text-xs font-bold tabular-nums ${sess.pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                          {sess.pnl >= 0 ? `+$${sess.pnl.toFixed(2)}` : `-$${Math.abs(sess.pnl).toFixed(2)}`}
                        </p>
                        <p className="text-[10px] text-gray-400 font-medium">
                          {sess.count} trades • <span className="font-bold text-emerald-600 dark:text-emerald-400">{sess.winRate}% W</span> / <span className="font-bold text-rose-500">{sess.lossRate}% L</span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* AI OCR API Key Configuration Modal */}
      {isAiConfigOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm cursor-pointer"
          onClick={() => setIsAiConfigOpen(false)}
        >
          <div 
            className="bg-white dark:bg-[#16181f] border border-gray-200 dark:border-neutral-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 cursor-default"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    AI Screenshot OCR Setup
                  </h3>
                  <p className="text-xs text-gray-400">Extract trades from MetaTrader / Brokers</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsAiConfigOpen(false)} 
                className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                  Groq API Key (Recommended & Fast)
                </label>
                <input
                  type="text"
                  placeholder="gsk_..."
                  value={tempAiKey}
                  onChange={e => setTempAiKey(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl px-3.5 py-2 text-xs text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Get a free key from <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-blue-500 underline">console.groq.com/keys</a>
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                  Google Gemini API Key (Alternative)
                </label>
                <input
                  type="text"
                  placeholder="AIza..."
                  value={tempGeminiKey}
                  onChange={e => setTempGeminiKey(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl px-3.5 py-2 text-xs text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Get a free key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-500 underline">aistudio.google.com</a>
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAiConfigOpen(false)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAiKeys}
                className="btn-primary text-xs"
              >
                Save & Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
