import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { TopBar } from "../lib/TopBar";
import { TradeModal } from "../components/TradeModal";
import { ImportTradesModal } from "../components/ImportTradesModal";
import { TradingCalendarHeatmap } from "../components/TradingCalendarHeatmap";
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
  PieChart,
  Layers,
  Sparkles,
  Target,
  Scale,
  BrainCircuit,
  SlidersHorizontal,
  CheckCircle2
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
  const { trades: allTrades, addTrade } = useTrades();
  const { selectedAccountId, selectedAccount, accounts, setSelectedAccountId } = useAccountContext();
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M' | 'ALL'>('1W');
  const [activityView, setActivityView] = useState<'Month' | 'Week'>('Week');
  const [dismissedViolations, setDismissedViolations] = useState<Set<string>>(new Set());

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

  // Filter trades by selected account
  const trades = useMemo(() => {
    if (!selectedAccountId) return allTrades;
    return allTrades.filter(t => t.accountId === selectedAccountId);
  }, [allTrades, selectedAccountId]);

  // Key metrics calculated dynamically from user trades for the selected account
  const stats = useMemo(() => {
    const initialCap = selectedAccount?.initialCapital || 100000;
    const currentEquity = selectedAccount?.currentEquity || initialCap;
    
    if (!trades.length) {
      return {
        balance: currentEquity,
        totalProfit: 0,
        avgGrowing: 0,
        winRate: 0,
        profitFactor: 0,
        bestPair: "N/A",
        topPairs: []
      };
    }

    const totalPnl = trades.reduce((sum, trade) => sum + (Number(trade.pnl) || 0), 0);
    const winningTrades = trades.filter(t => t.isPositive || Number(t.pnl) > 0);
    const losingTrades = trades.filter(t => !t.isPositive && Number(t.pnl) < 0);
    const winRate = (winningTrades.length / trades.length) * 100;
    
    const grossProfit = winningTrades.reduce((sum, t) => sum + Number(t.pnl || 0), 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + Number(t.pnl || 0), 0));
    const profitFactor = grossLoss === 0 ? (grossProfit > 0 ? 3.5 : 0.0) : grossProfit / grossLoss;

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
      balance: currentEquity + totalPnl,
      totalProfit: totalPnl,
      avgGrowing: ((totalPnl / initialCap) * 100) / Math.max(1, trades.length),
      winRate,
      profitFactor,
      bestPair: sortedPairs[0]?.symbol || "N/A",
      topPairs: sortedPairs.slice(0, 3)
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
        { date: 'Start', val1: initialBalance, val2: initialBalance, pnl: 0, dateLabel: 'Account Opening' },
        { date: 'Now', val1: initialBalance, val2: initialBalance, pnl: 0, dateLabel: 'No Trades Yet' },
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

    // Calculate baseline up to active range
    const startIndex = allSorted.indexOf(activeTrades[0]);
    for (let i = 0; i < startIndex; i++) {
      running += Number(allSorted[i].pnl) || 0;
      baseline += initialBalance * 0.0005;
    }

    const startEquity = running;

    const points = activeTrades.map((t, index) => {
      const pnl = Number(t.pnl) || 0;
      running += pnl;
      baseline += initialBalance * 0.0005;
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
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const base64String = (reader.result as string).split(',')[1];
          resolve(base64String);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Extract closed trades from screenshot in JSON format: {"trades": [{"symbol":"EURUSD","type":"BUY","volume":1.0,"entry_price":"1.0850","exit_price":"1.0890","profit":400,"commission":0,"close_reason":"Take profit","date_time":"2026.04.03 14:30:00","confidence":"High"}]}`
                },
                {
                  type: "image_url",
                  image_url: { url: `data:${file.type};base64,${base64Data}` }
                }
              ]
            }
          ],
          temperature: 0.1
        })
      });

      if (!response.ok) throw new Error("Screenshot analysis failed");
      const result = await response.json();
      const content = result.choices?.[0]?.message?.content || "{}";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const data = JSON.parse(jsonMatch ? jsonMatch[0] : "{}");
      
      if (data.trades && data.trades.length > 0) {
        setExtractedData(data);
        setIsImportModalOpen(true);
      } else {
        setExtractionError("Could not detect trades");
      }
    } catch (error: any) {
      setExtractionError(error.message || "Failed to parse API response");
    } finally {
      setIsExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Recent executions list
  const recentExecutions = useMemo(() => {
    if (trades.length > 0) {
      return trades.slice(0, 4).map((t, idx) => {
        const isPos = t.isPositive || Number(t.pnl) >= 0;
        const d = t.date || t.createdAt ? getTradeDate(t.date || t.createdAt) : new Date();
        const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

        return {
          id: t.id || idx,
          description: `${t.action || 'BUY'} ${t.symbol || 'EURUSD'} ${t.size || '1.0 Lot'}`,
          date: dateStr,
          amount: isPos ? `+$${Math.abs(Number(t.pnl) || 0).toFixed(2)}` : `-$${Math.abs(Number(t.pnl) || 0).toFixed(2)}`,
          status: isPos ? 'Success' : (idx === 0 ? 'Pending' : 'Stopped Out'),
          statusColor: isPos ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' : (idx === 0 ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/40' : 'text-rose-600 bg-rose-50 dark:bg-rose-950/40'),
          statusDot: isPos ? 'bg-emerald-500' : (idx === 0 ? 'bg-amber-500' : 'bg-rose-500'),
          iconColor: t.symbol?.includes('XAU') ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/50' : (t.symbol?.includes('EUR') ? 'bg-teal-100 text-teal-600 dark:bg-teal-950/50' : 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200'),
          iconText: t.action === 'SELL' ? 'SELL' : 'BUY'
        };
      });
    }
    return [];
  }, [trades]);

  return (
    <div className="flex flex-col min-h-full font-normal">
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

      <div className="p-6 md:p-8 space-y-7 max-w-[1600px] w-full mx-auto">
        
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
            
            {/* Top Traded Asset Stars Container */}
            <div className="space-y-4">
              
              {/* Header Label Pill & Title */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#111827] dark:bg-white text-white dark:text-gray-900 text-[11px] font-medium">
                      ★ 3 Top Assets
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-400 font-medium">
                      Performance & Win-Rate Leaders
                    </span>
                  </div>
                  {/* Dashboard heading -> 600 weight */}
                  <h2 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white tracking-tight font-headline">
                    The Top 3 stars of your trading
                  </h2>
                </div>


              </div>

              {/* 3 Top Star Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {stats.topPairs.length > 0 ? (
                  stats.topPairs.map((pair) => (
                    <div 
                      key={pair.symbol}
                      className="bg-white dark:bg-[#16181f] rounded-3xl p-5 border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col justify-between gap-4 group cursor-pointer"
                      onClick={() => navigate('/trades')}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full ${pair.iconColor} flex items-center justify-center text-white font-bold text-xs shadow-xs`}>
                            {pair.icon}
                          </div>
                          <span className="text-xs font-semibold text-gray-900 dark:text-white truncate max-w-[110px]">
                            {pair.symbol}
                          </span>
                        </div>
                        <button className="w-7 h-7 rounded-full border border-gray-200 dark:border-neutral-700 flex items-center justify-center text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white group-hover:border-gray-400 transition-colors">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="space-y-1">
                        <h3 className="text-xl font-bold tabular-nums text-gray-900 dark:text-white tracking-tight">
                          {pair.pnl >= 0 ? `+$${pair.pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : `-$${Math.abs(pair.pnl).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                        </h3>
                        <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                          <span className="bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-md font-medium tabular-nums">
                            {pair.gainTag}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-3 bg-white dark:bg-[#16181f] rounded-3xl p-6 border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs text-center py-8">
                    <p className="text-xs font-semibold text-gray-900 dark:text-white">No traded assets for this account yet</p>
                    <p className="text-[11px] text-gray-400 mt-1">Log or import trades to isolate asset breakdown for this account.</p>
                  </div>
                )}
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

                <div className="flex items-center gap-1 self-start sm:self-auto bg-gray-50 dark:bg-neutral-800/60 p-1 rounded-2xl border border-gray-200/60 dark:border-neutral-700/60">
                  {(['1D', '1W', '1M', 'ALL'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTimeframe(t)}
                      className={`px-3 py-1 text-xs font-semibold rounded-xl transition-all ${
                        timeframe === t 
                          ? 'bg-[#111827] dark:bg-white text-white dark:text-gray-900 shadow-xs' 
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-neutral-700/40'
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
                  <AreaChart data={equityChartData} margin={{ top: 15, right: 10, left: 0, bottom: 0 }}>
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
                        const pt = equityChartData.find(p => p.index === idx);
                        if (!pt) return '';
                        const ptIdx = equityChartData.indexOf(pt);
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
                    
                    {/* Main Realized Equity Curve */}
                    <Area 
                      type="monotone" 
                      dataKey="val1" 
                      stroke={isDark ? "#38bdf8" : "#2563eb"} 
                      strokeWidth={2.5} 
                      fillOpacity={1} 
                      fill="url(#curveEquity)" 
                    />
                    
                    {/* Benchmark Dotted Target Line (No Area Fill to keep graph crisp) */}
                    <Area 
                      type="monotone" 
                      dataKey="val2" 
                      stroke={isDark ? "#2dd4bf" : "#0d9488"} 
                      strokeWidth={1.75} 
                      strokeDasharray="4 4"
                      fillOpacity={0} 
                      fill="none" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Trading Calendar Heatmap */}
            <TradingCalendarHeatmap trades={trades} selectedAccountId={selectedAccountId} />

            {/* Recent Executions History Table */}
            <div className="bg-white dark:bg-[#16181f] rounded-3xl p-6 md:p-7 border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs">
              <div className="flex items-center justify-between mb-5">
                <div>
                  {/* Card heading -> 600 weight */}
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    Recent Executions
                  </h3>
                  <p className="text-xs font-normal text-gray-400 mt-0.5">Latest journal entries and platform syncs</p>
                </div>
                <button 
                  onClick={() => navigate('/trades')}
                  className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <span>See All</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[11px] font-medium text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-neutral-800/80">
                      <th className="pb-3 font-medium">Description ⇅</th>
                      <th className="pb-3 font-medium">Date ⇅</th>
                      <th className="pb-3 font-medium">Result P&L ⇅</th>
                      <th className="pb-3 font-medium text-right">Status ⇅</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-neutral-800/40 text-xs">
                    {recentExecutions.length > 0 ? (
                      recentExecutions.map((tx) => (
                        <tr key={tx.id} onClick={() => navigate('/trades')} className="hover:bg-gray-50/50 dark:hover:bg-neutral-800/30 transition-colors group cursor-pointer">
                          <td className="py-3.5">
                            <div className="flex items-center gap-3">
                              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ${tx.iconColor}`}>
                                {tx.iconText}
                              </span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {tx.description}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 text-gray-400 dark:text-gray-500 font-normal">
                            {tx.date}
                          </td>
                          <td className={`py-3.5 font-bold tabular-nums ${tx.amount.startsWith('+') ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                            {tx.amount}
                          </td>
                          <td className="py-3.5 text-right">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${tx.statusColor}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${tx.statusDot}`}></span>
                              <span>{tx.status}</span>
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-400 font-normal">
                          No trade executions logged for this account yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
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
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  onClick={() => setIsTradeModalOpen(true)}
                  className="w-full py-3 px-4 rounded-2xl bg-[#111827] dark:bg-white text-white dark:text-gray-900 text-xs font-semibold flex items-center justify-center gap-2 hover:bg-black dark:hover:bg-gray-100 transition-all shadow-xs group"
                >
                  <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>Log Trade</span>
                </button>

                <button
                  onClick={handleImportClick}
                  disabled={isExtracting}
                  className="w-full py-3 px-4 rounded-2xl bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 text-gray-800 dark:text-gray-200 text-xs font-semibold flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-neutral-750 transition-all shadow-2xs group"
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
                <div className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/40 font-normal">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{extractionError}</span>
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

          </div>

        </div>

      </div>
    </div>
  );
}
