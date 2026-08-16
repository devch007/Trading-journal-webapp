import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { TopBar } from "../lib/TopBar";
import { TradeModal } from "../components/TradeModal";
import { ImportTradesModal } from "../components/ImportTradesModal";
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
  ResponsiveContainer
} from 'recharts';
import { useTrades } from "../hooks/useTrades";
import { useAuth } from "../contexts/AuthContext";
import { useAccountContext } from "../contexts/AccountContext";
import { getTradeDate, normalizeImportedDateTime } from "../lib/timeUtils";
import { useRuleViolations } from "../hooks/useRuleViolations";
import { motion, AnimatePresence } from "motion/react";

// Custom Tooltip with Geist typography and tabular numbers
const MiraiChartTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const pnl = data.pnl ?? (data.val1 - data.val2);
    const isPos = pnl >= 0;

    return (
      <div className="bg-white dark:bg-[#181920] border border-gray-200/90 dark:border-neutral-700/80 p-3.5 rounded-2xl shadow-xl flex flex-col gap-2 min-w-[190px] font-normal">
        <p className="text-[11px] font-medium text-gray-400 dark:text-gray-400">
          {data.dateLabel || data.date || 'Execution Point'}
        </p>
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#1e293b] dark:bg-gray-300"></span>
              <span className="text-xs font-bold tabular-nums text-gray-900 dark:text-white">
                ${Number(data.val1).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <span className="text-[11px] font-medium text-gray-500 bg-gray-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
              Equity
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#0d9488]"></span>
              <span className="text-xs font-bold tabular-nums text-gray-900 dark:text-white">
                ${Number(data.val2).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <span className={`text-[11px] font-bold tabular-nums px-1.5 py-0.5 rounded ${isPos ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' : 'text-rose-500 bg-rose-50 dark:bg-rose-950/40'}`}>
              {isPos ? '+' : ''}${Number(pnl).toFixed(2)}
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
  const { selectedAccountId, selectedAccount } = useAccountContext();
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M' | 'ALL'>('1W');
  const [activityView, setActivityView] = useState<'Month' | 'Week'>('Week');
  const [dismissedViolations, setDismissedViolations] = useState<Set<string>>(new Set());

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

  // Key metrics calculated dynamically from user trades
  const stats = useMemo(() => {
    const initialCap = selectedAccount?.initialCapital || 100000;
    const currentEquity = selectedAccount?.currentEquity || initialCap;
    
    if (!trades.length) {
      return {
        balance: currentEquity,
        totalProfit: 3500.75,
        avgGrowing: 0.50,
        winRate: 72.5,
        profitFactor: 2.35,
        bestPair: "XAUUSD",
        topPairs: [
          { symbol: "Gold (XAUUSD)", pnl: 1240.00, winRate: 75.0, gainTag: "+75.0% Win Rate", iconColor: "bg-amber-500", icon: "🥇" },
          { symbol: "Euro (EURUSD)", pnl: 680.50, winRate: 68.4, gainTag: "+68.4% Win Rate", iconColor: "bg-emerald-500", icon: "💎" },
          { symbol: "Bitcoin (BTCUSD)", pnl: 450.00, winRate: 62.5, gainTag: "+62.5% Win Rate", iconColor: "bg-neutral-900 dark:bg-neutral-800", icon: "⚡" },
        ]
      };
    }

    const totalPnl = trades.reduce((sum, trade) => sum + (Number(trade.pnl) || 0), 0);
    const winningTrades = trades.filter(t => t.isPositive || Number(t.pnl) > 0);
    const losingTrades = trades.filter(t => !t.isPositive && Number(t.pnl) < 0);
    const winRate = (winningTrades.length / trades.length) * 100;
    
    const grossProfit = winningTrades.reduce((sum, t) => sum + Number(t.pnl || 0), 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + Number(t.pnl || 0), 0));
    const profitFactor = grossLoss === 0 ? (grossProfit > 0 ? 3.5 : 1.0) : grossProfit / grossLoss;

    // Group pairs
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

    // Fallback if less than 3 pairs
    while (sortedPairs.length < 3) {
      if (sortedPairs.length === 0) sortedPairs.push({ symbol: "Gold (XAUUSD)", pnl: 1240.00, winRate: 75.0, gainTag: "+75.0% Win Rate", iconColor: "bg-amber-500", icon: "🥇" });
      else if (sortedPairs.length === 1) sortedPairs.push({ symbol: "Euro (EURUSD)", pnl: 680.50, winRate: 68.4, gainTag: "+68.4% Win Rate", iconColor: "bg-emerald-500", icon: "💎" });
      else sortedPairs.push({ symbol: "Bitcoin (BTCUSD)", pnl: 450.00, winRate: 62.5, gainTag: "+62.5% Win Rate", iconColor: "bg-neutral-900 dark:bg-neutral-800", icon: "⚡" });
    }

    return {
      balance: currentEquity + totalPnl,
      totalProfit: totalPnl,
      avgGrowing: ((totalPnl / initialCap) * 100) / Math.max(1, trades.length),
      winRate,
      profitFactor,
      bestPair: sortedPairs[0]?.symbol || "XAUUSD",
      topPairs: sortedPairs.slice(0, 3)
    };
  }, [trades, selectedAccount]);

  // Activity Chart Data Calculation
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
      } else {
        // Fallback for empty state to look nice
        counts[0] = 110; counts[1] = 145; counts[2] = 145; counts[3] = 240;
        counts[4] = 280; counts[5] = 205; counts[6] = 240; counts[7] = 110;
        counts[8] = 280; counts[9] = 340; counts[10] = 370; counts[11] = 410;
      }
      
      const maxVal = Math.max(...counts, 10);
      return months.map((m, idx) => ({
        m, 
        v: counts[idx], 
        h: Math.max((counts[idx] / maxVal) * 100, 5)
      }));
    } else {
      // Week View
      const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
      const counts = new Array(7).fill(0);
      
      if (trades.length > 0) {
        const now = new Date();
        const startOfWeek = new Date(now);
        // Set to Monday
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
        startOfWeek.setDate(diff);
        startOfWeek.setHours(0,0,0,0);
        
        trades.forEach(t => {
          const d = parseTradeDate(t.date);
          if (!isNaN(d.getTime()) && d >= startOfWeek) {
            let dayIdx = d.getDay() - 1;
            if (dayIdx === -1) dayIdx = 6; // Sunday
            counts[dayIdx] += 1;
          }
        });
      } else {
         // Fallback for empty state
         counts[0] = 12; counts[1] = 25; counts[2] = 18; counts[3] = 30;
         counts[4] = 15; counts[5] = 5; counts[6] = 0;
      }
      
      const maxVal = Math.max(...counts, 5);
      return days.map((m, idx) => ({
        m, 
        v: counts[idx], 
        h: Math.max((counts[idx] / maxVal) * 100, 5)
      }));
    }
  }, [trades, activityView]);

  const activityMaxVal = useMemo(() => {
    return Math.max(...activityChartData.map(d => d.v), activityView === 'Month' ? 400 : 50);
  }, [activityChartData, activityView]);

  // Equity Curve calculation
  const equityChartData = useMemo(() => {
    if (!trades.length) {
      return [
        { date: 'Jun 08', val1: 100000, val2: 98000, pnl: 0, dateLabel: 'Jun 08, 2026' },
        { date: 'Jun 10', val1: 101200, val2: 99500, pnl: 1200, dateLabel: 'Jun 10, 2026' },
        { date: 'Jun 12', val1: 100800, val2: 100200, pnl: -400, dateLabel: 'Jun 12, 2026' },
        { date: 'Jun 14', val1: 102400, val2: 101500, pnl: 1600, dateLabel: 'Jun 14, 2026' },
        { date: 'Jun 16', val1: 103100, val2: 102000, pnl: 700, dateLabel: 'Jun 16, 2026' },
        { date: 'Jun 18', val1: 104500, val2: 102800, pnl: 1400, dateLabel: 'Jun 18, 2026' },
        { date: 'Jun 20', val1: 103900, val2: 102500, pnl: -600, dateLabel: 'Jun 20, 2026' },
        { date: 'Jun 22', val1: 105200, val2: 103200, pnl: 1300, dateLabel: 'Jun 22, 2026' },
        { date: 'Jun 24', val1: 106100, val2: 104000, pnl: 900, dateLabel: 'Jun 24, 2026' },
        { date: 'July 2', val1: 107500, val2: 104800, pnl: 1400, dateLabel: 'Jul 02, 2026' },
      ];
    }

    const initialBalance = selectedAccount?.initialCapital || 100000;
    let running = initialBalance;
    let baseline = initialBalance;

    const sorted = [...trades].sort((a, b) => getTradeDate(a.date).getTime() - getTradeDate(b.date).getTime());

    return sorted.map((t, index) => {
      const pnl = Number(t.pnl) || 0;
      running += pnl;
      baseline += initialBalance * 0.002;
      const d = getTradeDate(t.date);

      return {
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        dateLabel: d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        val1: running,
        val2: Math.round(baseline),
        pnl
      };
    });
  }, [trades, selectedAccount]);

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

    return [
      {
        id: 1,
        description: "BUY XAUUSD (Gold) 0.50 Lot",
        date: "06 Jun, 2026",
        amount: "+$450.00",
        status: "Success",
        statusColor: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40",
        statusDot: "bg-emerald-500",
        iconColor: "bg-amber-100 text-amber-600 dark:bg-amber-950/50",
        iconText: "BUY"
      },
      {
        id: 2,
        description: "BUY EURUSD 2.00 Lot",
        date: "04 Jun, 2026",
        amount: "+$350.00",
        status: "Success",
        statusColor: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40",
        statusDot: "bg-emerald-500",
        iconColor: "bg-teal-100 text-teal-600 dark:bg-teal-950/50",
        iconText: "BUY"
      },
      {
        id: 3,
        description: "SELL USDJPY 1.50 Lot",
        date: "03 Jun, 2026",
        amount: "-$150.00",
        status: "Stopped Out",
        statusColor: "text-rose-600 bg-rose-50 dark:bg-rose-950/40",
        statusDot: "bg-rose-500",
        iconColor: "bg-rose-100 text-rose-600 dark:bg-rose-950/50",
        iconText: "SELL"
      },
      {
        id: 4,
        description: "BUY GBPUSD 1.00 Lot",
        date: "02 Jun, 2026",
        amount: "+$500.00",
        status: "Success",
        statusColor: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40",
        statusDot: "bg-emerald-500",
        iconColor: "bg-blue-100 text-blue-600 dark:bg-blue-950/50",
        iconText: "BUY"
      }
    ];
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

                {/* Filter Tags */}
                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                  <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#16181f] border border-gray-200/80 dark:border-neutral-800 shadow-2xs hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors">
                    <span>All Sessions</span>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                  <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#16181f] border border-gray-200/80 dark:border-neutral-800 shadow-2xs hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors">
                    <span>Forex & Metals</span>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                  <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#16181f] border border-gray-200/80 dark:border-neutral-800 shadow-2xs hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors">
                    <span>By P&L</span>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* 3 Top Star Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {stats.topPairs.map((pair) => (
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
                        {/* Card Heading -> 600 weight */}
                        <span className="text-xs font-semibold text-gray-900 dark:text-white truncate max-w-[110px]">
                          {pair.symbol}
                        </span>
                      </div>
                      <button className="w-7 h-7 rounded-full border border-gray-200 dark:border-neutral-700 flex items-center justify-center text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white group-hover:border-gray-400 transition-colors">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1">
                      {/* P&L numbers -> 700 + tabular numerals */}
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
                ))}
              </div>
            </div>

            {/* Portfolio Growth Over Time Curve Chart */}
            <div className="bg-white dark:bg-[#16181f] rounded-3xl p-6 md:p-7 border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs">
              <div className="flex items-center justify-between mb-6">
                <div>
                  {/* Card heading -> 600 weight */}
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    Portfolio Growth Over Time
                  </h3>
                  <p className="text-xs font-normal text-gray-400 mt-0.5">Realized Cumulative Equity vs Initial Capital Benchmark</p>
                </div>

                <div className="flex items-center gap-1">
                  {(['1D', '1W', '1M', 'ALL'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTimeframe(t)}
                      className={`px-3 py-1 text-xs font-medium rounded-xl transition-all ${
                        timeframe === t 
                          ? 'bg-[#111827] dark:bg-white text-white dark:text-gray-900 shadow-xs' 
                          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dual Curve Chart */}
              <div className="h-[280px] w-full relative">
                
                {/* Visual marker label */}
                <div className="absolute top-[26%] left-[56%] -translate-x-1/2 -translate-y-full z-20 pointer-events-none hidden sm:flex flex-col items-center">
                  <span className="px-2 py-0.5 bg-[#1e293b] text-white text-[10px] font-bold tabular-nums rounded-md shadow-md">
                    ${Number(stats.balance).toLocaleString()}
                  </span>
                  <div className="w-2 h-2 bg-amber-500 rounded-full ring-2 ring-white my-0.5"></div>
                  <div className="w-[1px] h-12 border-l border-dashed border-gray-400/60"></div>
                </div>

                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={equityChartData} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="curveSlate" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1e293b" stopOpacity={0.08}/>
                        <stop offset="100%" stopColor="#1e293b" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="curveTeal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0d9488" stopOpacity={0.15}/>
                        <stop offset="100%" stopColor="#0d9488" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    
                    <XAxis 
                      dataKey="date" 
                      stroke="#94a3b8" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    
                    <YAxis 
                      stroke="#94a3b8" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(val) => `$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                      domain={['dataMin - 1000', 'dataMax + 1000']}
                      className="tabular-nums"
                    />
                    
                    <Tooltip content={<MiraiChartTooltip />} />
                    
                    <Area 
                      type="monotone" 
                      dataKey="val1" 
                      stroke="#1e293b" 
                      strokeWidth={2.5} 
                      fillOpacity={1} 
                      fill="url(#curveSlate)" 
                    />
                    
                    <Area 
                      type="monotone" 
                      dataKey="val2" 
                      stroke="#0d9488" 
                      strokeWidth={2.5} 
                      fillOpacity={1} 
                      fill="url(#curveTeal)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

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
                    {recentExecutions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50/50 dark:hover:bg-neutral-800/30 transition-colors group">
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
                        {/* P&L numbers -> 700 + tabular-nums */}
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
                    ))}
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
                  {/* Card heading -> 600 weight */}
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    Trading Capital & Balance
                  </span>
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
                      <div key={col.m} className="flex flex-col items-center gap-2 h-full justify-end group cursor-pointer relative">
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

            {/* Card 3: Trading Playbook & Risk Guard */}
            <div className="bg-white dark:bg-[#16181f] rounded-3xl p-6 border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                {/* Card heading -> 600 weight */}
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Trading Playbook & Risk Guard
                </h3>
                <button onClick={() => navigate('/checkout')} className="text-gray-400 hover:text-gray-600">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5">
                
                {/* 1% Risk Rule */}
                <div 
                  onClick={() => navigate('/checkout')}
                  className="flex items-center justify-between p-3 rounded-2xl bg-[#f8f9fb] dark:bg-neutral-800/40 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-amber-500 flex items-center justify-center text-white font-bold text-sm shadow-2xs">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white group-hover:text-amber-600 transition-colors">
                        1% Risk Rule
                      </p>
                      <p className="text-[11px] font-normal text-gray-400 truncate max-w-[170px]">
                        Max 1% capital risk per trade
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
                </div>

                {/* 1:2 R:R Ratio */}
                <div 
                  onClick={() => navigate('/checkout')}
                  className="flex items-center justify-between p-3 rounded-2xl bg-[#f8f9fb] dark:bg-neutral-800/40 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-orange-500 flex items-center justify-center text-white font-bold text-sm shadow-2xs">
                      <Target className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white group-hover:text-orange-600 transition-colors">
                        Minimum 1:2 R:R
                      </p>
                      <p className="text-[11px] font-normal text-gray-400 truncate max-w-[170px]">
                        Target at least 2x stop loss
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
                </div>

                {/* Pre-Trade Checklist */}
                <div 
                  onClick={() => navigate('/checkout')}
                  className="flex items-center justify-between p-3 rounded-2xl bg-[#f8f9fb] dark:bg-neutral-800/40 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-neutral-900 dark:bg-neutral-700 flex items-center justify-center text-white font-bold text-sm shadow-2xs">
                      <BrainCircuit className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                        Pre-Trade Checklist
                      </p>
                      <p className="text-[11px] font-normal text-gray-400 truncate max-w-[170px]">
                        Verify mindset & setup criteria
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
                </div>

              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
