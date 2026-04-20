import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { TopBar } from "../lib/TopBar";
import { TradeModal } from "../components/TradeModal";
import { ImportTradesModal } from "../components/ImportTradesModal";
import { TrendingUp, TrendingDown, Target, Activity, ArrowUpRight, ArrowDownRight, Plus, Upload, Loader2, AlertCircle, Shield, X, Sun } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTrades } from "../hooks/useTrades";
import { useAuth } from "../contexts/AuthContext";
import { useAccountContext } from "../contexts/AccountContext";
import { MonthlyPnLCalendar } from "../components/MonthlyPnLCalendar";
import { getTradeDate, normalizeImportedDateTime } from "../lib/timeUtils";
import { useRuleViolations } from "../hooks/useRuleViolations";
import { useRituals } from "../hooks/useRituals";
import { motion, AnimatePresence } from "motion/react";

// Initial static data
const initialEquityData = [
  { name: '10:15:00', value: 11200 },
  { name: '10:16:00', value: 11450 },
  { name: '10:17:00', value: 11300 },
  { name: '10:18:00', value: 11800 },
  { name: '10:19:00', value: 11650 },
  { name: '10:20:00', value: 12100 },
  { name: '10:21:00', value: 12450 },
];

const initialTrades = [
  { id: 1, date: "Today, 10:21:00", symbol: "EURUSD", action: "BUY", size: "2.00 Lot", result: "+$350.00", isPositive: true, pnl: 350 },
  { id: 2, date: "Today, 10:20:00", symbol: "USDJPY", action: "SELL", size: "1.50 Lot", result: "-$150.00", isPositive: false, pnl: -150 },
  { id: 3, date: "Today, 10:19:00", symbol: "XAUUSD", action: "BUY", size: "0.50 Lot", result: "+$450.00", isPositive: true, pnl: 450 },
  { id: 4, date: "Today, 10:18:00", symbol: "GBPUSD", action: "BUY", size: "1.00 Lot", result: "+$500.00", isPositive: true, pnl: 500 },
  { id: 5, date: "Today, 10:17:00", symbol: "USDCAD", action: "SELL", size: "1.00 Lot", result: "-$150.00", isPositive: false, pnl: -150 },
];

const initialQuantInsights = [
  { label: "Avg. Winning Trade", value: 412.50, isPositive: true },
  { label: "Avg. Losing Trade", value: -210.15, isPositive: false },
  { label: "Best Trade (XAUUSD)", value: 1240.00, isPositive: true },
  { label: "Worst Trade (USDJPY)", value: -450.00, isPositive: false },
];

const initialPerformance = [
  { pair: "EURUSD", winRate: 82, color: "bg-primary" },
  { pair: "XAUUSD", winRate: 65, color: "bg-primary" },
  { pair: "GBPUSD", winRate: 58, color: "bg-primary" },
  { pair: "USDJPY", winRate: 42, color: "bg-[#E5534B]" },
  { pair: "USDCAD", winRate: 50, color: "bg-gray-500" },
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    const value = item.value;
    const tradePnl = item.tradePnl;
    const isPositive = tradePnl !== undefined ? tradePnl >= 0 : true;

    return (
      <div className="glass-card p-4 rounded-xl border border-white/10 flex flex-col gap-2 shadow-2xl bg-[#0d0d16]/95 backdrop-blur-md min-w-[200px]">
        <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-1">
          <p className="type-label text-[10px]">{item.fullDate || item.name}</p>
          {item.action && (
            <span className={`type-micro text-[9px] px-1.5 py-0.5 rounded ${item.action === 'BUY' ? 'bg-[#1ED760]/10 text-[#1ED760]' : 'bg-[#E5534B]/10 text-[#E5534B]'}`}>
              {item.action}
            </span>
          )}
        </div>
        
        <div className="flex justify-between items-center">
          <span className="type-label text-[11px]">Equity</span>
          <p className="font-bold text-white text-sm tnum">${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>

        {item.symbol && (
          <div className="flex justify-between items-center">
            <span className="type-label text-[11px]">Asset</span>
            <p className="text-white text-xs font-bold">{item.symbol}</p>
          </div>
        )}

        {tradePnl !== undefined && item.fullDate !== 'Opening Balance' && (
          <div className="flex justify-between items-center pt-1 border-t border-white/5 mt-1">
            <span className="type-label text-[11px]">Result</span>
            <div className={`flex items-center gap-1 font-bold text-xs tnum ${isPositive ? 'text-[#1ED760]' : 'text-[#E5534B]'}`}>
              {isPositive ? '+' : '-'}${Math.abs(tradePnl).toFixed(2)}
              {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            </div>
          </div>
        )}
      </div>
    );
  }
  return null;
};


export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { trades: allTrades, loading, addTrade } = useTrades();
  const { getTodayRitual } = useRituals();
  const { selectedAccountId, selectedAccount } = useAccountContext();
  const todayRitual = getTodayRitual();
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [equityData, setEquityData] = useState(initialEquityData);
  const [period, setPeriod] = useState('ALL');
  const [dismissedViolations, setDismissedViolations] = useState<Set<string>>(new Set());
  
  // Rule violations & Discipline Score
  const violations = useRuleViolations(selectedAccount, allTrades);
  const activeViolations = violations.filter(v => !dismissedViolations.has(v.ruleId));
  const dismissViolation = (ruleId: string) => {
    setDismissedViolations(prev => new Set(prev).add(ruleId));
  };
  
  const accountRules = useMemo(() => selectedAccount?.rules?.filter(r => r.enabled) || [], [selectedAccount]);
  const disciplineScore = useMemo(() => {
    if (accountRules.length === 0) return null;
    const breachedCount = violations.filter(v => v.severity === 'critical').length;
    const passedCount = accountRules.length - breachedCount;
    return Math.max(0, (passedCount / accountRules.length) * 100);
  }, [accountRules, violations]);

  const weeklyDisciplineScore = useMemo(() => {
    if (accountRules.length === 0) return null;
    
    // Get last 7 days trades
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 6);
    startOfWeek.setHours(0, 0, 0, 0);

    const weekTrades = allTrades.filter(t => t.accountId === selectedAccountId && getTradeDate(t.date) >= startOfWeek);
    
    // Group by day string
    const tradesByDay: Record<string, typeof allTrades> = {};
    weekTrades.forEach(t => {
      const dateStr = getTradeDate(t.date).toDateString();
      if (!tradesByDay[dateStr]) tradesByDay[dateStr] = [];
      tradesByDay[dateStr].push(t);
    });

    const activeDays = Object.keys(tradesByDay);
    if (activeDays.length === 0) return null; // No trading this week
    
    let totalScore = 0;
    
    activeDays.forEach(dayKey => {
      const dayTrades = tradesByDay[dayKey];
      const pnl = dayTrades.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
      const equity = selectedAccount?.currentEquity || selectedAccount?.initialCapital || 100000;
      
      let dayPassedRules = 0;
      
      accountRules.forEach(rule => {
        let isBreached = false;
        switch (rule.type) {
          case 'max_trades_per_day':
            isBreached = dayTrades.length > rule.value;
            break;
          case 'max_loss_per_trade': {
            const worstTrade = dayTrades.reduce((w, t) => Math.min(w, t.pnl || 0), 0);
            isBreached = Math.abs(worstTrade) > rule.value;
            break;
          }
          case 'daily_loss_limit': {
            const loss = Math.abs(Math.min(0, pnl));
            isBreached = rule.unit === '%' ? (equity > 0 && (loss / equity) * 100 > rule.value) : loss > rule.value;
            break;
          }
          case 'custom': {
            if (rule.unit === 'trades') {
              isBreached = dayTrades.length > rule.value;
            } else if (rule.unit === '$') {
              isBreached = Math.abs(Math.min(0, pnl)) > rule.value;
            } else {
              const lossPct = equity > 0 ? (Math.abs(Math.min(0, pnl)) / equity) * 100 : 0;
              isBreached = lossPct > rule.value;
            }
            break;
          }
        }
        if (!isBreached) dayPassedRules++;
      });
      
      totalScore += (dayPassedRules / accountRules.length) * 100;
    });
    
    return totalScore / activeDays.length;
  }, [accountRules, allTrades, selectedAccount, selectedAccountId]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<{ trades: any[] } | null>(null);
  
  // Filter trades by selected account
  const trades = useMemo(() => {
    if (!selectedAccountId) return allTrades;
    return allTrades.filter(t => t.accountId === selectedAccountId);
  }, [allTrades, selectedAccountId]);
  
  // Calculate stats based on real trades
  const stats = useMemo(() => {
    if (!trades.length) return { totalPnl: 0, winRate: 0, profitFactor: 0, activeTrades: 0, roiPercent: null };
    
    const totalPnl = trades.reduce((sum, trade) => sum + trade.pnl, 0);
    const winningTrades = trades.filter(t => t.isPositive);
    const losingTrades = trades.filter(t => !t.isPositive);
    
    const winRate = (winningTrades.length / trades.length) * 100;
    
    const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = grossLoss === 0 ? grossProfit : grossProfit / grossLoss;
    
    const accountBalance = selectedAccount?.initialCapital || selectedAccount?.currentEquity || 0;
    const roiPercent = accountBalance > 0 ? (totalPnl / accountBalance) * 100 : null;

    return {
      totalPnl,
      winRate,
      profitFactor,
      activeTrades: trades.length,
      roiPercent
    };
  }, [trades, selectedAccount]);

  const quantInsights = useMemo(() => {
    if (!trades || trades.length === 0) return [
      { label: "Avg. Winning Trade", value: 0, isPositive: true },
      { label: "Avg. Losing Trade", value: 0, isPositive: false },
      { label: `Best Trade (-)`, value: 0, isPositive: true },
      { label: `Worst Trade (-)`, value: 0, isPositive: false },
    ];
    
    const winningTrades = (trades || []).filter(t => t.isPositive);
    const losingTrades = (trades || []).filter(t => !t.isPositive);
    
    const avgWin = winningTrades.length ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length : 0;
    const avgLoss = losingTrades.length ? losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length : 0;
    
    const bestTrade = trades.reduce((best, current) => (current.pnl || 0) > (best.pnl || 0) ? current : best, trades[0]);
    const worstTrade = trades.reduce((worst, current) => (current.pnl || 0) < (worst.pnl || 0) ? current : worst, trades[0]);
    
    return [
      { label: "Avg. Winning Trade", value: avgWin, isPositive: true },
      { label: "Avg. Losing Trade", value: avgLoss, isPositive: false },
      { label: `Best Trade (${bestTrade?.symbol || 'N/A'})`, value: bestTrade?.pnl || 0, isPositive: true },
      { label: `Worst Trade (${worstTrade?.symbol || 'N/A'})`, value: worstTrade?.pnl || 0, isPositive: false },
    ];
  }, [trades]);

  const performanceByPair = useMemo(() => {
    if (!trades || trades.length === 0) return [];
    
    const pairs = Array.from(new Set((trades || []).map(t => t.symbol)));
    return pairs.map(pair => {
      const pairTrades = trades.filter(t => t.symbol === pair);
      const wins = pairTrades.filter(t => t.isPositive).length;
      const winRate = (wins / pairTrades.length) * 100;
      
      let color = "bg-gray-500";
      if (winRate >= 60) color = "bg-primary";
      else if (winRate < 50) color = "bg-[#E5534B]";
      
      return { pair, winRate, color };
    }).sort((a, b) => b.winRate - a.winRate).slice(0, 5);
  }, [trades]);

  // Update equity curve when trades or period change
  useEffect(() => {
    if (!trades || trades.length === 0) {
      setEquityData([{ name: 'No Data', value: selectedAccount ? (selectedAccount.initialCapital || 10000) : 10000 }]);
      return;
    }

    // Filter trades by period
    const now = new Date();
    let cutoff = new Date(0); // Default to beginning of time for 'ALL'
    
    if (period === '1D') {
      cutoff = new Date();
      cutoff.setHours(0, 0, 0, 0);
    } else if (period === '1W') {
      cutoff = new Date();
      cutoff.setDate(now.getDate() - 7);
    } else if (period === '1M') {
      cutoff = new Date();
      cutoff.setMonth(now.getMonth() - 1);
    }

    const periodFilteredTrades = (trades || []).filter(t => {
      const tradeDate = getTradeDate(t.date);
      return tradeDate >= cutoff;
    });

    if (periodFilteredTrades.length === 0) {
      setEquityData([{ 
        name: 'No Data', 
        value: selectedAccount ? (selectedAccount.currentEquity || selectedAccount.initialCapital) : 10000,
        tradePnl: 0,
        symbol: '',
        action: '',
        fullDate: 'No recent trades'
      }] as any);
      return;
    }

    // Simple equity curve calculation
    // Priority: selectedAccount.initialCapital -> 5000 (common starting point) -> 10000 (default)
    const initialBalance = selectedAccount?.initialCapital ?? 5000;
    
    // To calculate the equity at the start of the period, we need to sum PnL of trades BEFORE the cutoff
    const tradesBeforeCutoff = trades.filter(t => {
      const tradeDate = getTradeDate(t.date);
      return tradeDate < cutoff;
    });
    
    const startingEquity = initialBalance + tradesBeforeCutoff.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);
    let runningEquity = startingEquity;

    // Stable sort: primary by execution date, secondary by createdAt (DB sequence)
    const sortedFilteredTrades = [...periodFilteredTrades].sort((a, b) => {
      const timeA = getTradeDate(a.date).getTime();
      const timeB = getTradeDate(b.date).getTime();
      if (timeA !== timeB) return timeA - timeB;
      
      // Tie-breaker for same-second trades
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    const newEquityData = sortedFilteredTrades.map((trade, index) => {
      const pnlVal = Number(trade.pnl) || 0;
      runningEquity += pnlVal;
      const d = getTradeDate(trade.date);
      return {
        name: period === '1D' 
          ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
          : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: runningEquity,
        tradePnl: pnlVal,
        symbol: trade.symbol,
        action: trade.action,
        fullDate: d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      };
    });
    
    // Add starting point
    newEquityData.unshift({ 
      name: period === 'ALL' ? 'Start' : cutoff.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), 
      value: startingEquity,
      tradePnl: 0,
      symbol: '',
      action: '',
      fullDate: period === 'ALL' ? 'Account Opening' : 'Previous Balance'
    });
    
    setEquityData(newEquityData as any);
  }, [trades, selectedAccount, period]);

  const formatCurrency = (val: number) => {
    const absVal = Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return val >= 0 ? `+$${absVal}` : `-$${absVal}`;
  };

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

      // Try to use the AI-extracted date_time; normalizeImportedDateTime handles
      // MT5 format ("2026.04.03 14:30") and forces year to 2026.
      // Falls back to right now only as a last resort.
      const isoDate = normalizeImportedDateTime(t.date_time);
      const now = new Date();
      now.setFullYear(2026); // even the fallback must be in 2026
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
      // Convert file to base64
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

      // Call Groq API
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
                  text: `You are a professional trading data extraction assistant. You can read screenshots from ANY trading platform — MT5, MT4, cTrader, mobile broker apps (e.g. Exness, IC Markets, XM, FTMO, etc.), TradingView, or any other platform.

Carefully analyze the image and extract EVERY closed/completed trade visible.

Return ONLY a valid JSON object with a "trades" array. Each element must have these fields:
- symbol (string — the instrument/pair name, e.g. "XAUUSD", "EURUSD". Strip any broker suffix like ".C", ".x", ".m", ".pro" etc. Keep only the clean symbol.)
- type ("BUY" or "SELL" — look for BUY/SELL labels, or green/red color indicators. Green tags = BUY, Red/pink tags = SELL.)
- volume (number — lot size, e.g. 0.20, 1.00)
- entry_price (string — the FIRST price shown for the trade, e.g. "4797.95". This is where the trade was opened.)
- exit_price (string — the SECOND price shown, e.g. "4797.81". This is where the trade was closed. Look for an arrow "→" between entry and exit.)
- profit (number — the P&L value, positive or negative. Look for values like "+$2.80" or "-$23.80". Remove the $ sign and return just the number with correct sign.)
- commission (number — default 0 if not visible)
- close_reason (string — "Market", "Stop loss", "Take profit", or "Unknown". Look for close-reason labels like "Market", "Stop loss", "TP" near the profit value.)
- date_time (string — CRITICAL: If an individual timestamp is visible for each trade row, extract it in format "YYYY.MM.DD HH:MM:SS" with year 2026. If NO per-trade timestamp is visible (common on mobile apps showing "Closed Positions"), use TODAY's date: "${new Date().toISOString().slice(0, 10).replace(/-/g, '.')} 12:00:00". Never return null or empty string for this field.)
- confidence ("High", "Medium", or "Low" — how clearly you could read the row data)

CRITICAL RULES:
1. The screenshot may be from a MOBILE app — trades are shown as cards/rows with symbol, lot size, entry → exit prices, and P&L.
2. If you see an arrow symbol (→) between two prices, the LEFT price is entry_price and the RIGHT price is exit_price.
3. Green/positive P&L amounts (e.g. "+$54.60") mean the trade was profitable. Red/negative amounts (e.g. "-$32.60") mean a loss.
4. ALL date_time values MUST have year 2026. If no date is visible at all, use "${new Date().toISOString().slice(0, 10).replace(/-/g, '.')} 12:00:00".
5. Do NOT include markdown, code fences, or any explanations — return raw JSON ONLY.
6. Extract EVERY single trade row visible, do not skip any.`
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${file.type};base64,${base64Data}`
                  }
                }
              ]
            }
          ],
          temperature: 0.1
        })
      });

      if (!response.ok) {
        let errorDetails = "";
        try {
          const errorData = await response.json();
          errorDetails = JSON.stringify(errorData);
        } catch (e) {
          errorDetails = await response.text();
        }
        console.error("Groq API Error Details:", errorDetails);
        throw new Error(`Groq API Error: ${response.status} - ${errorDetails}`);
      }

      const result = await response.json();
      const content = result.choices?.[0]?.message?.content || "{}";
      console.log("[Import Trades] Raw LLM response:", content);
      
      // Robustly extract JSON object using regex to ignore conversational text
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : "{}";
      
      const data = JSON.parse(jsonStr);
      
      if (data.trades && data.trades.length > 0) {
        setExtractedData(data);
        setIsImportModalOpen(true);
      } else {
        setExtractionError("Could not detect trades");
      }
    } catch (error: any) {
      console.error("Extraction error:", error);
      setExtractionError(error.message || "Failed to parse API response");
    } finally {
      setIsExtracting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="flex flex-col min-h-full pb-10">
      <TopBar 
        title="Dashboard" 
        subtitle="Platform by DC Technologies" 
        showSearch={true}
      />
      
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
      
      <div className="px-4 md:px-8 flex flex-col gap-6 md:gap-8">
      
        {/* Daily Rituals Banner */}
        <AnimatePresence>
          {!todayRitual?.morning && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={() => navigate('/rituals')}
              className="glass-card p-4 rounded-xl border border-blue-500/30 bg-gradient-to-r from-blue-500/10 to-indigo-500/5 flex items-center justify-between cursor-pointer group shadow-[0_0_15px_rgba(59,130,246,0.15)] hover:shadow-[0_0_25px_rgba(59,130,246,0.3)] transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                  <Sun className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="type-h2 text-white text-sm">Morning Prep Required</h3>
                  <p className="type-body text-xs">Calibrate your mind before hitting the charts today.</p>
                </div>
              </div>
              <ArrowUpRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Rule Violation Alerts */}
        <AnimatePresence>
          {activeViolations.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex flex-col gap-2"
            >
              {activeViolations.map((violation) => (
                <motion.div
                  key={violation.ruleId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, transition: { duration: 0.2 } }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm ${
                    violation.severity === 'critical'
                      ? 'bg-[#E5534B]/10 border-[#E5534B]/30 text-[#E5534B]'
                      : 'bg-[#F59E0B]/10 border-[#F59E0B]/30 text-[#F59E0B]'
                  }`}
                >
                  <Shield className="w-4 h-4 shrink-0" />
                  <div className="flex-1 flex flex-col">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {violation.severity === 'critical' ? '⚠ RULE BREACHED' : '⚡ WARNING'}: {violation.ruleName}
                    </span>
                    <span className="text-[12px] opacity-80">{violation.detail}</span>
                  </div>
                  <button
                    onClick={() => dismissViolation(violation.ruleId)}
                    className="p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Actions */}
        <div className="flex flex-col gap-4">
          <h3 className="type-h2 text-white">Quick Actions</h3>
          <div className="flex gap-4 flex-wrap">
            <button 
              onClick={() => setIsTradeModalOpen(true)}
              className="glass-card px-6 py-4 rounded-2xl flex items-center gap-4 hover:bg-white/5 transition-all group cursor-pointer border border-white/5 hover:border-primary/50"
            >
              <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                <Plus className="w-5 h-5 text-primary" />
              </div>
              <div className="flex flex-col items-start">
                <span className="type-h2 text-[14px] text-white">Log New Trade</span>
                <span className="type-body text-[12px]">Manually enter trade details</span>
              </div>
            </button>

            <div className="relative">
              <input 
                type="file" 
                accept="image/png, image/jpeg, image/jpg" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              <button 
                onClick={handleImportClick}
                disabled={isExtracting}
                className={`glass-card px-6 py-4 rounded-2xl flex items-center gap-4 transition-all group border border-white/5 ${isExtracting ? 'opacity-80 cursor-not-allowed' : 'hover:bg-white/5 cursor-pointer hover:border-primary/50'}`}
              >
                <div className={`p-3 rounded-xl transition-colors ${isExtracting ? 'bg-white/10' : 'bg-primary/10 group-hover:bg-primary/20'}`}>
                  {isExtracting ? (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5 text-primary" />
                  )}
                </div>
              <div className="flex flex-col items-start">
                  <span className="type-h2 text-[14px] text-white">{isExtracting ? 'Analyzing screenshot...' : 'Import Trades'}</span>
                  <span className="type-body text-[12px]">{isExtracting ? 'Please wait' : 'Extract from any platform screenshot'}</span>
                </div>
              </button>
              {extractionError && (
                <div className="absolute top-full mt-2 left-0 flex items-center gap-1 text-xs text-[#E5534B] bg-[#E5534B]/10 px-3 py-1.5 rounded-lg border border-[#E5534B]/20 whitespace-nowrap">
                  <AlertCircle className="w-3 h-3" />
                  {extractionError}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
          <StatCard 
            title="Total P&L" 
            value={formatCurrency(stats.totalPnl)} 
            trend={stats.roiPercent !== null ? `${stats.roiPercent >= 0 ? '+' : ''}${stats.roiPercent.toFixed(2)}% ROI` : 'No balance set'} 
            isPositive={stats.totalPnl >= 0} 
            icon={<Activity className="text-primary w-5 h-5" />} 
            color="#3b82f6"
          />
          <StatCard 
            title="Win Rate" 
            value={`${stats.winRate.toFixed(1)}%`} 
            trend={`${stats.winRate >= 50 ? '+' : ''}${(stats.winRate - 50).toFixed(1)}% vs 50%`}
            isPositive={stats.winRate >= 50} 
            icon={<Target className="text-secondary w-5 h-5" />} 
            color="#10b981"
          />
          <StatCard 
            title="Profit Factor" 
            value={stats.profitFactor.toFixed(2)} 
            trend={`${stats.profitFactor >= 1 ? '+' : ''}${(stats.profitFactor - 1).toFixed(2)} vs 1.0`}
            isPositive={stats.profitFactor >= 1} 
            icon={<TrendingUp className="text-tertiary w-5 h-5" />} 
            color="#f59e0b"
          />
          <StatCard 
            title="Active Trades" 
            value={stats.activeTrades.toString()} 
            trend={`${stats.activeTrades} total`}
            isPositive={true} 
            icon={<TrendingDown className="text-error w-5 h-5" />} 
            color="#8b5cf6"
          />
          
          {/* Discipline Score Gradient Card */}
          <div className="glass-card flex flex-col justify-between p-6 rounded-2xl relative overflow-hidden group border border-white/5 hover:border-white/10 transition-colors">
            <div className={`absolute -top-10 -right-10 w-40 h-40 rounded-full blur-[60px] opacity-20 pointer-events-none transition-all duration-500 group-hover:opacity-40 group-hover:scale-110
              ${disciplineScore === null ? 'bg-[#6A6A6A]' : (disciplineScore + (weeklyDisciplineScore||100)) / 2 >= 80 ? 'bg-[#1ED760]' : 'bg-[#F59E0B]'}`} />
            
            <div className="flex justify-between items-start z-10 relative mb-2">
              <div className="flex flex-col gap-0.5">
                <span className="type-label text-[#A7A7A7]">Discipline Tracker</span>
                <div className={`text-[12px] font-bold ${disciplineScore === null ? 'text-[#6A6A6A]' : disciplineScore >= 80 ? 'text-[#1ED760]' : disciplineScore >= 50 ? 'text-[#F59E0B]' : 'text-[#E5534B]'}`}>
                   {disciplineScore === null ? 'Setup rules to track' : disciplineScore >= 80 ? 'Excellent Focus' : disciplineScore >= 50 ? 'Warning Zone' : 'Limits Breached'}
                 </div>
              </div>
              <div className="p-2.5 rounded-xl border transition-colors bg-white/5 border-white/10 group-hover:bg-white/10">
                <Shield className="w-5 h-5 text-white/70" />
              </div>
            </div>
            
            <div className="flex flex-col gap-4 z-10 relative mt-2">
              {/* Daily */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-end">
                  <span className="text-[11px] text-[#A7A7A7] uppercase tracking-wider font-bold">Today</span>
                  <span className="type-h2 text-white tnum text-[16px] leading-none tracking-tight">
                    {disciplineScore === null ? 'N/A' : `${Math.round(disciplineScore)}%`}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                  {disciplineScore !== null && (
                    <motion.div 
                       initial={{ width: 0 }}
                       animate={{ width: `${disciplineScore}%` }}
                       transition={{ duration: 1.5, ease: 'easeOut' }}
                       className={`h-full rounded-full transition-colors duration-500 shadow-[0_0_10px_currentColor]
                         ${disciplineScore >= 80 ? 'bg-[#1ED760]' : disciplineScore >= 50 ? 'bg-[#F59E0B]' : 'bg-[#E5534B]'}
                       `}
                    />
                  )}
                </div>
              </div>

              {/* Weekly */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-end">
                  <span className="text-[11px] text-[#A7A7A7] uppercase tracking-wider font-bold">7-Day Avg</span>
                  <span className="type-h2 text-white tnum text-[16px] leading-none tracking-tight">
                    {weeklyDisciplineScore === null ? 'N/A' : `${Math.round(weeklyDisciplineScore)}%`}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                  {weeklyDisciplineScore !== null && (
                    <motion.div 
                       initial={{ width: 0 }}
                       animate={{ width: `${weeklyDisciplineScore}%` }}
                       transition={{ duration: 1.5, ease: 'easeOut', delay: 0.1 }}
                       className={`h-full rounded-full transition-colors duration-500 shadow-[0_0_10px_currentColor]
                         ${weeklyDisciplineScore >= 80 ? 'bg-[#1ED760]' : weeklyDisciplineScore >= 50 ? 'bg-[#F59E0B]' : 'bg-[#E5534B]'}
                       `}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Left Column (Spans 2) */}
          <div className="xl:col-span-2 flex flex-col gap-6">
            {/* Main Chart */}
            <div className="glass-card p-6 rounded-2xl flex flex-col gap-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <h3 className="type-h2 text-white">Equity Curve</h3>
                </div>
                <div className="flex gap-2">
                  {['1D', '1W', '1M', 'ALL'].map(p => (
                    <button 
                      key={p} 
                      onClick={() => setPeriod(p)}
                      className={`px-3 py-1 type-micro rounded-lg transition-colors ${period === p ? 'bg-primary text-background' : 'bg-white/5 hover:bg-white/10 text-[#A7A7A7] hover:text-white'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={equityData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.2)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} domain={['auto', 'auto']} />
                    <Tooltip 
                      content={<CustomTooltip data={equityData} />} 
                      cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '3 3' }}
                      isAnimationActive={false}
                    />
                    <Area type="monotone" dataKey="value" stroke="var(--color-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" isAnimationActive={true} animationDuration={500} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Monthly P&L Calendar */}
            <MonthlyPnLCalendar trades={trades} />

            {/* Recent Execution History */}
            <div className="glass-card p-6 rounded-2xl flex flex-col gap-6">
              <div className="flex justify-between items-center">
                <h3 className="type-h2 text-white">Recent Execution History</h3>
                <button 
                  onClick={() => navigate('/trades')}
                  className="type-body text-primary hover:text-primary/80 transition-colors"
                >
                  View All
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="type-label text-[10px] border-b border-white/5">
                      <th className="pb-3">Date</th>
                      <th className="pb-3">Symbol</th>
                      <th className="pb-3">Action</th>
                      <th className="pb-3">Size</th>
                      <th className="pb-3 text-right">Result</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {trades.length > 0 ? trades.slice(0, 5).map((trade: any, index: number) => (
                      <tr key={trade.id || index} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group animate-in fade-in slide-in-from-top-2 duration-500">
                        <td className="py-4 type-body text-[12px] text-[#6A6A6A]">
                          {trade.date || trade.createdAt 
                            ? getTradeDate(trade.date || trade.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase() 
                            : 'N/A'}
                        </td>
                        <td className="py-4 type-h2 text-[14px] text-white">{trade.symbol || 'N/A'}</td>
                        <td className={`py-4 type-micro ${trade.action === 'BUY' ? 'text-[#1ED760]' : 'text-[#E5534B]'}`}>{trade.action || 'N/A'}</td>
                        <td className="py-4 type-body text-[12px] tnum">{trade.size || 'N/A'}</td>
                        <td className={`py-4 text-right font-bold tnum text-[14px] ${trade.isPositive ? 'text-[#1ED760]' : 'text-[#E5534B]'}`}>{trade.result || '$0.00'}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center type-body text-[12px] text-[#6A6A6A]">
                          No recent executions
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column (Spans 1) */}
          <div className="flex flex-col gap-6">
            {/* Quant Insights */}
            <div className="glass-card p-6 rounded-2xl flex flex-col gap-4">
              <h3 className="type-h2 text-white mb-2">Quant Insights</h3>
              <div className="flex flex-col">
                {quantInsights.map((insight, i) => (
                  <div key={i} className={`flex justify-between items-center py-4 ${i !== quantInsights.length - 1 ? 'border-b border-white/5' : ''}`}>
                    <span className="type-label text-[12px]">{insight.label}</span>
                    <span className={`font-bold tnum text-[15px] transition-colors duration-500 ${insight.isPositive ? 'text-[#1ED760]' : 'text-[#E5534B]'}`}>
                      {formatCurrency(insight.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Performance by Pair */}
            <div className="glass-card p-6 rounded-2xl flex flex-col gap-6">
              <h3 className="type-h2 text-white">Performance by Pair</h3>
              <div className="flex flex-col gap-5">
                {performanceByPair.map((perf, i) => (
                  <div key={i} className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="type-h2 text-[13px] text-white">{perf.pair}</span>
                      <span className="type-label text-[11px] transition-all duration-500">{perf.winRate.toFixed(0)}% WIN</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-1000 ease-out ${perf.color}`} style={{ width: `${perf.winRate}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, trend, isPositive, icon, color = '#3b82f6' }: { title: string, value: string, trend: string, isPositive: boolean, icon: React.ReactNode, color?: string }) {
  return (
    <div className="glass-card p-6 rounded-2xl flex flex-col gap-4 relative overflow-hidden group border border-white/5 hover:border-white/10 transition-colors hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)]">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
      <div 
        className="absolute -right-10 -top-10 w-32 h-32 rounded-full blur-[40px] opacity-10 group-hover:opacity-30 transition-opacity duration-700 pointer-events-none" 
        style={{ backgroundColor: color }}
      />
      
      <div className="flex justify-between items-start z-10">
        <div className="p-2 bg-white/5 rounded-lg border border-white/10">
          {icon}
        </div>
        <div className={`flex items-center gap-1 type-micro px-2 py-1 rounded-[8px] z-10 ${isPositive ? 'bg-[#1ED760]/10 text-[#1ED760]' : 'bg-[#E5534B]/10 text-[#E5534B]'}`}>
          {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {trend}
        </div>
      </div>
      <div className="z-10">
        <p className="type-label mb-1">{title}</p>
        <h2 className="type-metric text-white transition-all duration-500">{value}</h2>
      </div>
    </div>
  );
}
