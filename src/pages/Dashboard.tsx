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
  Layers
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Line
} from 'recharts';
import { useTrades } from "../hooks/useTrades";
import { useAuth } from "../contexts/AuthContext";
import { useAccountContext } from "../contexts/AccountContext";
import { getTradeDate, normalizeImportedDateTime } from "../lib/timeUtils";
import { useRuleViolations } from "../hooks/useRuleViolations";
import { motion, AnimatePresence } from "motion/react";

// Reference chart curve data matching image aesthetic
const referenceChartData = [
  { date: 'Jun 08', val1: 22000, val2: 12000, rawVal1: 1240, rawVal2: 1850 },
  { date: 'Jun 10', val1: 34000, val2: 18000, rawVal1: 1320, rawVal2: 1950 },
  { date: 'Jun 12', val1: 28000, val2: 24000, rawVal1: 1400, rawVal2: 2100 },
  { date: 'Jun 14', val1: 58000, val2: 45000, rawVal1: 1480, rawVal2: 2250 },
  { date: 'Jun 16', val1: 64000, val2: 52000, rawVal1: 1520, rawVal2: 2380 },
  { date: 'Jun 18', val1: 150030, val2: 95000, rawVal1: 1546.70, rawVal2: 2496.70, isPeak: true },
  { date: 'Jun 20', val1: 98000, val2: 68000, rawVal1: 1510, rawVal2: 2420 },
  { date: 'Jun 22', val1: 62000, val2: 48000, rawVal1: 1470, rawVal2: 2360 },
  { date: 'Jun 24', val1: 78000, val2: 82000, rawVal1: 1530, rawVal2: 2440 },
  { date: 'Jun 26', val1: 72000, val2: 65000, rawVal1: 1490, rawVal2: 2410 },
  { date: 'Jun 28', val1: 110000, val2: 90000, rawVal1: 1560, rawVal2: 2480 },
  { date: 'July 2', val1: 92000, val2: 125000, rawVal1: 1580, rawVal2: 2520 },
];

// Custom Tooltip faithfully reproducing the floating popover from the screenshot
const MiraiChartTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-[#181920] border border-gray-200/80 dark:border-neutral-700/80 p-3.5 rounded-2xl shadow-xl flex flex-col gap-2 min-w-[170px]">
        <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-400">
          March 3, 2026
        </p>
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#1e293b] dark:bg-gray-300"></span>
              <span className="text-xs font-bold text-gray-900 dark:text-white">
                €{data.rawVal1 ? Number(data.rawVal1).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '1,546.70'}
              </span>
            </div>
            <span className="text-[11px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded">
              -1.50%
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#0d9488]"></span>
              <span className="text-xs font-bold text-gray-900 dark:text-white">
                €{data.rawVal2 ? Number(data.rawVal2).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '2,496.70'}
              </span>
            </div>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
              +1.50%
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
  const [timeframe, setTimeframe] = useState('Weekly');
  const [dismissedViolations, setDismissedViolations] = useState<Set<string>>(new Set());

  // Rule violations & Discipline Score
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

  // Dynamic calculations based on user trades (with fallback to reference values)
  const stats = useMemo(() => {
    const currentEquity = selectedAccount?.currentEquity ?? selectedAccount?.initialCapital ?? 2496.70;
    if (!trades.length) {
      return {
        balance: currentEquity,
        totalProfit: 3500.75,
        avgGrowing: 0.50,
        bestToken: "Ethereum",
        winRate: 72.5,
        activeTrades: 3
      };
    }

    const totalPnl = trades.reduce((sum, trade) => sum + (Number(trade.pnl) || 0), 0);
    const winningTrades = trades.filter(t => t.isPositive || Number(t.pnl) > 0);
    const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;
    
    // Find best asset / token
    const pairMap: Record<string, number> = {};
    trades.forEach(t => {
      pairMap[t.symbol] = (pairMap[t.symbol] || 0) + (Number(t.pnl) || 0);
    });
    let bestPair = "Ethereum";
    let maxPnl = -Infinity;
    Object.entries(pairMap).forEach(([sym, pnl]) => {
      if (pnl > maxPnl) {
        maxPnl = pnl;
        bestPair = sym;
      }
    });

    return {
      balance: currentEquity,
      totalProfit: totalPnl !== 0 ? totalPnl : 3500.75,
      avgGrowing: 0.50,
      bestToken: bestPair || "Ethereum",
      winRate,
      activeTrades: trades.length
    };
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
                  text: `You are a professional trading data extraction assistant. Extract EVERY closed trade visible in JSON with format: {"trades": [{"symbol":"EURUSD","type":"BUY","volume":1.0,"entry_price":"1.0850","exit_price":"1.0890","profit":400,"commission":0,"close_reason":"Take profit","date_time":"2026.04.03 14:30:00","confidence":"High"}]}`
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

      if (!response.ok) throw new Error("Screenshot scan failed");
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

  // Demo fallback transactions matching the image if no trades logged yet
  const displayTransactions = useMemo(() => {
    if (trades.length > 0) {
      return trades.slice(0, 4).map((t, idx) => {
        const isPos = t.isPositive || Number(t.pnl) >= 0;
        const d = t.date || t.createdAt ? getTradeDate(t.date || t.createdAt) : new Date();
        const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        
        let icon = <Coins className="w-4 h-4 text-amber-500" />;
        let iconBg = "bg-amber-50 dark:bg-amber-950/40 text-amber-500";
        if (t.symbol.toUpperCase().includes('ETH') || idx === 0) {
          icon = <Gem className="w-4 h-4 text-emerald-600" />;
          iconBg = "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600";
        } else if (t.symbol.toUpperCase().includes('XAU') || idx === 1) {
          icon = <Layers className="w-4 h-4 text-rose-500" />;
          iconBg = "bg-rose-50 dark:bg-rose-950/40 text-rose-500";
        } else if (idx === 2) {
          icon = <Building2 className="w-4 h-4 text-blue-500" />;
          iconBg = "bg-blue-50 dark:bg-blue-950/40 text-blue-500";
        }

        return {
          id: t.id || idx,
          description: `${t.action === 'BUY' ? 'Bought' : 'Sold'} ${t.symbol}`,
          date: dateStr,
          amount: isPos ? `+$${Math.abs(Number(t.pnl) || 0).toLocaleString()}` : `-$${Math.abs(Number(t.pnl) || 0).toLocaleString()}`,
          status: isPos ? 'Success' : (idx === 0 ? 'Pending' : 'Cancelled'),
          icon,
          iconBg,
          statusColor: isPos ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' : (idx === 0 ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/40' : 'text-rose-600 bg-rose-50 dark:bg-rose-950/40'),
          statusDot: isPos ? 'bg-emerald-500' : (idx === 0 ? 'bg-amber-500' : 'bg-rose-500')
        };
      });
    }

    return [
      {
        id: 1,
        description: "Bought ETH",
        date: "06 Jun, 2025",
        amount: "-$5,000",
        status: "Pending",
        icon: <Gem className="w-4 h-4 text-gray-900 dark:text-white" />,
        iconBg: "bg-gray-100 dark:bg-neutral-800 text-gray-900 dark:text-white",
        statusColor: "text-amber-600 bg-amber-50 dark:bg-amber-950/40",
        statusDot: "bg-amber-500"
      },
      {
        id: 2,
        description: "ETF Purchase",
        date: "04 Jun, 2025",
        amount: "+$65",
        status: "Success",
        icon: <Layers className="w-4 h-4 text-rose-600" />,
        iconBg: "bg-rose-100 dark:bg-rose-950/40 text-rose-600",
        statusColor: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40",
        statusDot: "bg-emerald-500"
      },
      {
        id: 3,
        description: "Real Estate Income",
        date: "03 Jun, 2025",
        amount: "-$200",
        status: "Cancelled",
        icon: <Building2 className="w-4 h-4 text-blue-600" />,
        iconBg: "bg-blue-100 dark:bg-blue-950/40 text-blue-600",
        statusColor: "text-rose-600 bg-rose-50 dark:bg-rose-950/40",
        statusDot: "bg-rose-500"
      },
      {
        id: 4,
        description: "Stock Sale",
        date: "02 Jun, 2025",
        amount: "+$800",
        status: "Success",
        icon: <Coins className="w-4 h-4 text-rose-600" />,
        iconBg: "bg-rose-100 dark:bg-rose-950/40 text-rose-600",
        statusColor: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40",
        statusDot: "bg-emerald-500"
      }
    ];
  }, [trades]);

  return (
    <div className="flex flex-col min-h-full">
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

      {/* Hidden file input for screenshot import */}
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
                    <span><strong>Rule Warning:</strong> {violation.ruleName} — {violation.detail}</span>
                  </div>
                  <button onClick={() => dismissViolation(violation.ruleId)} className="p-1 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main 2-Column Responsive Layout Grid (approx 68% / 32%) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
          
          {/* ================= LEFT / CENTER AREA (8 COLS) ================= */}
          <div className="lg:col-span-8 flex flex-col gap-7">
            
            {/* Top Stars Header & Cards Container */}
            <div className="space-y-4">
              
              {/* Header Label Pill & Title */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#111827] dark:bg-white text-white dark:text-gray-900 text-[11px] font-bold">
                      ★ 3 Assets
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-400 font-medium">
                      Recommended coins for 24 hours
                    </span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight font-headline">
                    The Top 3 stars of the market
                  </h2>
                </div>

                {/* Dropdown Filters matching image */}
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                  <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#16181f] border border-gray-200/80 dark:border-neutral-800 shadow-2xs hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors">
                    <span>24h</span>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                  <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#16181f] border border-gray-200/80 dark:border-neutral-800 shadow-2xs hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors">
                    <span>Proof of stakes</span>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                  <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#16181f] border border-gray-200/80 dark:border-neutral-800 shadow-2xs hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors">
                    <span>Disc</span>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* 3 Top Star Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                {/* 1. Bitcoin (BTC) */}
                <div className="bg-white dark:bg-[#16181f] rounded-3xl p-5 border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col justify-between gap-4 group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-sm shadow-xs">
                        ₿
                      </div>
                      <span className="text-xs font-bold text-gray-900 dark:text-white">
                        Bitcoin (BTC)
                      </span>
                    </div>
                    <button className="w-7 h-7 rounded-full border border-gray-200 dark:border-neutral-700 flex items-center justify-center text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white group-hover:border-gray-400 transition-colors">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                      €2,496.70
                    </h3>
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <span className="bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-md font-bold">
                        +1.50%
                      </span>
                      <span className="text-gray-400 dark:text-gray-500 font-normal">
                        Gain from BTC
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Ethereum (ETH) */}
                <div className="bg-white dark:bg-[#16181f] rounded-3xl p-5 border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col justify-between gap-4 group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-600 to-emerald-500 flex items-center justify-center text-white font-bold text-xs shadow-xs">
                        ♦
                      </div>
                      <span className="text-xs font-bold text-gray-900 dark:text-white">
                        Ethereum(ETH)
                      </span>
                    </div>
                    <button className="w-7 h-7 rounded-full border border-gray-200 dark:border-neutral-700 flex items-center justify-center text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white group-hover:border-gray-400 transition-colors">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                      €1,650.85
                    </h3>
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <span className="bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-md font-bold">
                        +2.50%
                      </span>
                      <span className="text-gray-400 dark:text-gray-500 font-normal">
                        Gain from ETH
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Solana (SOL) */}
                <div className="bg-white dark:bg-[#16181f] rounded-3xl p-5 border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col justify-between gap-4 group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#111827] dark:bg-neutral-800 flex items-center justify-center text-white font-bold text-xs shadow-xs">
                        ≡
                      </div>
                      <span className="text-xs font-bold text-gray-900 dark:text-white">
                        Solana (SOL)
                      </span>
                    </div>
                    <button className="w-7 h-7 rounded-full border border-gray-200 dark:border-neutral-700 flex items-center justify-center text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white group-hover:border-gray-400 transition-colors">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                      €0.9500
                    </h3>
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-rose-500">
                      <span className="bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded-md font-bold">
                        -0.05%
                      </span>
                      <span className="text-gray-400 dark:text-gray-500 font-normal">
                        Gain from SOL
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Portfolio Growth Over Time Curve Chart */}
            <div className="bg-white dark:bg-[#16181f] rounded-3xl p-6 md:p-7 border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Portfolio Growth Over Time
                </h3>
                <div className="flex items-center gap-1">
                  {['Weekly', 'Monthly', 'All'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setTimeframe(t)}
                      className={`px-3 py-1 text-xs font-semibold rounded-xl transition-all ${
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

              {/* Chart Visual Container */}
              <div className="h-[280px] w-full relative">
                
                {/* Visual marker badge mimicking the reference image peak label */}
                <div className="absolute top-[28%] left-[54%] -translate-x-1/2 -translate-y-full z-20 pointer-events-none hidden sm:flex flex-col items-center">
                  <span className="px-2 py-0.5 bg-[#1e293b] text-white text-[10px] font-bold rounded-md shadow-md">
                    $150,030
                  </span>
                  <div className="w-2 h-2 bg-amber-500 rounded-full ring-2 ring-white my-0.5"></div>
                  <div className="w-[1px] h-12 border-l border-dashed border-gray-400/60"></div>
                </div>

                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={referenceChartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradientSlate" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1e293b" stopOpacity={0.08}/>
                        <stop offset="100%" stopColor="#1e293b" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="gradientTeal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0d9488" stopOpacity={0.12}/>
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
                      tickFormatter={(val) => `$${val >= 1000 ? `${val / 1000}k` : val}`}
                    />
                    
                    <Tooltip content={<MiraiChartTooltip />} />
                    
                    <Area 
                      type="monotone" 
                      dataKey="val1" 
                      stroke="#1e293b" 
                      strokeWidth={2.5} 
                      fillOpacity={1} 
                      fill="url(#gradientSlate)" 
                    />
                    
                    <Area 
                      type="monotone" 
                      dataKey="val2" 
                      stroke="#0d9488" 
                      strokeWidth={2.5} 
                      fillOpacity={1} 
                      fill="url(#gradientTeal)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Transactions Table */}
            <div className="bg-white dark:bg-[#16181f] rounded-3xl p-6 md:p-7 border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Recent Transactions
                </h3>
                <button 
                  onClick={() => navigate('/trades')}
                  className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <span>See All</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[11px] font-bold text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-neutral-800/80">
                      <th className="pb-3 font-semibold">Description ⇅</th>
                      <th className="pb-3 font-semibold">Date ⇅</th>
                      <th className="pb-3 font-semibold">Amount ⇅</th>
                      <th className="pb-3 font-semibold text-right">Status ⇅</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-neutral-800/40 text-xs">
                    {displayTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50/50 dark:hover:bg-neutral-800/30 transition-colors group">
                        <td className="py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.iconBg}`}>
                              {tx.icon}
                            </div>
                            <span className="font-bold text-gray-900 dark:text-white">
                              {tx.description}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 text-gray-400 dark:text-gray-500 font-medium">
                          {tx.date}
                        </td>
                        <td className={`py-3.5 font-bold ${tx.amount.startsWith('+') ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>
                          {tx.amount}
                        </td>
                        <td className="py-3.5 text-right">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${tx.statusColor}`}>
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
            
            {/* Card 1: My balance */}
            <div className="bg-white dark:bg-[#16181f] rounded-3xl p-6 border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-gray-50 dark:bg-neutral-800 text-gray-900 dark:text-white">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    My balance
                  </span>
                </div>
                <button className="w-7 h-7 rounded-full border border-gray-200 dark:border-neutral-700 flex items-center justify-center text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Big Balance Amount & Currency */}
              <div className="space-y-1">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight font-headline">
                    €{Number(stats.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h2>
                  <span className="text-xs font-semibold text-gray-400 flex items-center gap-0.5">
                    Disc <ChevronDown className="w-3 h-3" />
                  </span>
                </div>

                {/* Sub metrics row */}
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100 dark:border-neutral-800/80 text-left">
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium">Total Profit</p>
                    <p className="text-xs font-bold text-gray-900 dark:text-white">
                      €{Number(stats.totalProfit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium">Avg Growing</p>
                    <p className="text-xs font-bold text-gray-900 dark:text-white">
                      %{stats.avgGrowing.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium">Best Token</p>
                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                      {stats.bestToken}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Top up & Withdraw */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  onClick={() => setIsTradeModalOpen(true)}
                  className="w-full py-3 px-4 rounded-2xl bg-[#111827] dark:bg-white text-white dark:text-gray-900 text-xs font-bold flex items-center justify-center gap-2 hover:bg-black dark:hover:bg-gray-100 transition-all shadow-xs group"
                >
                  <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>Top up</span>
                </button>

                <button
                  onClick={handleImportClick}
                  disabled={isExtracting}
                  className="w-full py-3 px-4 rounded-2xl bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 text-gray-800 dark:text-gray-200 text-xs font-bold flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-neutral-750 transition-all shadow-2xs group"
                >
                  {isExtracting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                  ) : (
                    <Upload className="w-4 h-4 text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white transition-colors" />
                  )}
                  <span>{isExtracting ? 'Scanning...' : 'Withdraw'}</span>
                </button>
              </div>

              {extractionError && (
                <div className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/40">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{extractionError}</span>
                </div>
              )}
            </div>

            {/* Card 2: My portfolio */}
            <div className="bg-white dark:bg-[#16181f] rounded-3xl p-6 border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-gray-50 dark:bg-neutral-800 text-gray-900 dark:text-white">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    My portfolio
                  </span>
                </div>
                <button className="w-7 h-7 rounded-full border border-gray-200 dark:border-neutral-700 flex items-center justify-center text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Sub-header: 3 Total Assists & gain pill */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-900 dark:text-white">
                  3 Total Assists
                </span>
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                  +4.50% Gain from BTC
                </span>
              </div>

              {/* Tri-color segmented progress bar */}
              <div className="flex items-center gap-1.5 w-full h-3">
                <div className="h-full bg-indigo-500 rounded-full w-[38%] shadow-xs"></div>
                <div className="h-full bg-emerald-400 rounded-full w-[32%] shadow-xs"></div>
                <div className="h-full bg-neutral-800 dark:bg-neutral-600 rounded-full w-[30%] shadow-xs"></div>
              </div>

              {/* Token Breakdown List */}
              <div className="space-y-3.5 pt-1">
                
                {/* Ethereum */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-600 to-emerald-500 flex items-center justify-center text-white font-bold text-[10px]">
                      ♦
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900 dark:text-white">Ethereum (ETH)</p>
                      <p className="text-[11px] text-gray-400">€1,650.75</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                      +2.50%
                    </span>
                    <button className="text-gray-400 hover:text-gray-600">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Bitcoin */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-xs">
                      ₿
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900 dark:text-white">Bitcoin (BTC)</p>
                      <p className="text-[11px] text-gray-400">€2,496.70</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                      +1.50%
                    </span>
                    <button className="text-gray-400 hover:text-gray-600">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Solana */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-[#111827] dark:bg-neutral-800 flex items-center justify-center text-white font-bold text-[10px]">
                      ≡
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900 dark:text-white">Solana (SOL)</p>
                      <p className="text-[11px] text-gray-400">€3,500.75</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded">
                      -0.05%
                    </span>
                    <button className="text-gray-400 hover:text-gray-600">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* Card 3: Learn Finance Terms */}
            <div className="bg-white dark:bg-[#16181f] rounded-3xl p-6 border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  Learn Finance Terms
                </h3>
                <button className="text-gray-400 hover:text-gray-600">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5">
                
                {/* DCA */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-[#f8f9fb] dark:bg-neutral-800/40 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-all cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-amber-500 flex items-center justify-center text-white font-bold text-sm shadow-2xs">
                      ₿
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-amber-600 transition-colors">
                        Dollar-Cost Averaging
                      </p>
                      <p className="text-[11px] text-gray-400 truncate max-w-[170px]">
                        Instead of exchanging all...
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
                </div>

                {/* Dividend Yield */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-[#f8f9fb] dark:bg-neutral-800/40 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-all cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-orange-500 flex items-center justify-center text-white font-bold text-sm shadow-2xs">
                      🪙
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-orange-600 transition-colors">
                        Dividend Yield
                      </p>
                      <p className="text-[11px] text-gray-400 truncate max-w-[170px]">
                        financial ratio that shows.
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
                </div>

                {/* ETF */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-[#f8f9fb] dark:bg-neutral-800/40 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-all cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-neutral-900 dark:bg-neutral-700 flex items-center justify-center text-white font-bold text-sm shadow-2xs">
                      🔄
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                        ETF (Exchange-Trad...
                      </p>
                      <p className="text-[11px] text-gray-400 truncate max-w-[170px]">
                        investment fund that hold..
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
