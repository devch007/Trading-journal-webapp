import React, { useState, useRef, useMemo, useEffect } from "react";
import { 
  UploadCloud, 
  X, 
  Star, 
  CheckSquare, 
  Square, 
  Smile,
  Search,
  Calendar as CalendarIcon,
  Target,
  MessageSquare,
  Image as ImageIcon,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Loader2,
  DollarSign,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  BarChart3,
  CalendarRange,
  Flame,
  Award,
  ChevronLeft,
  Maximize2,
  Eye,
  Filter,
  CheckCircle2,
  Percent,
  Clock,
  ArrowRight,
  LayoutGrid,
  List
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from "recharts";
import { TopBar } from "../lib/TopBar";
import { cn } from "../lib/utils";
import { TradeQualityMeter } from "../components/TradeQualityMeter";
import { useTrades, Trade } from "../hooks/useTrades";
import { useAccountContext } from "../contexts/AccountContext";
import { getTradeDate } from "../lib/timeUtils";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, isWithinInterval, subWeeks, subMonths, addWeeks, addMonths } from "date-fns";

export function Journal() {
  const { trades: allTrades, loading, updateTrades, fetchTradeProof } = useTrades();
  
  // Top-level Navigation: "Gallery & Proofs" | "Weekly Analysis" | "Monthly Analysis" | "Trade Deep Dive"
  const [activeView, setActiveView] = useState<"gallery" | "weekly" | "monthly" | "journal">("gallery");
  
  // Gallery / Journal state
  const [activeTab, setActiveTab] = useState<"All" | "WithScreenshots" | "Journaled">("All");
  const [galleryDisplayMode, setGalleryDisplayMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [proofCache, setProofCache] = useState<Record<string, string>>({});
  const [isProofLoading, setIsProofLoading] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Time navigation state for Weekly & Monthly
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const quickUploadInputRef = useRef<HTMLInputElement>(null);
  const { selectedAccountId } = useAccountContext();

  // Filtered trades by active account
  const accountTrades = useMemo(() => {
    let list = allTrades;
    if (selectedAccountId) {
      list = list.filter(t => t.accountId === selectedAccountId);
    }
    return list.sort((a, b) => {
      const dateA = getTradeDate(a.date || a.createdAt || new Date().toISOString());
      const dateB = getTradeDate(b.date || b.createdAt || new Date().toISOString());
      return dateB.getTime() - dateA.getTime();
    });
  }, [allTrades, selectedAccountId]);

  // List of trades filtered for the Journal / List view
  const entries = useMemo(() => {
    let filtered = accountTrades;
    
    if (activeTab === "WithScreenshots") {
      filtered = filtered.filter(t => Boolean(t.proof || proofCache[t.id]));
    } else if (activeTab === "Journaled") {
      filtered = filtered.filter(t => (t.notes && t.notes.trim().length > 0) || t.rating || (t.emotions && t.emotions.length > 0));
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        (t.symbol || '').toLowerCase().includes(q) || 
        (t.strategy && t.strategy.toLowerCase().includes(q)) ||
        (t.tag && t.tag.toLowerCase().includes(q)) ||
        (t.tags && Array.isArray(t.tags) && t.tags.some(tag => tag.toLowerCase().includes(q)))
      );
    }

    return filtered;
  }, [accountTrades, activeTab, searchQuery, proofCache]);

  // Select initial trade
  useEffect(() => {
    if (entries.length > 0) {
      const exists = entries.some(e => e.id === selectedId);
      if (!selectedId || !exists) {
        setSelectedId(entries[0].id);
      }
    } else {
      setSelectedId(null);
    }
  }, [entries, selectedId]);

  const selectedEntry = entries.find(e => e.id === selectedId) || (entries.length > 0 ? entries[0] : null);

  // Lazy-load proof screenshot for selected trade
  useEffect(() => {
    if (selectedId && !proofCache[selectedId]) {
      const loadProof = async () => {
        setIsProofLoading(true);
        const proof = await fetchTradeProof(selectedId);
        if (proof) {
          setProofCache(prev => ({ ...prev, [selectedId]: proof }));
        }
        setIsProofLoading(false);
      };
      loadProof();
    }
  }, [selectedId, fetchTradeProof]);

  const updateEntry = (updates: Partial<Trade>, tradeId = selectedId) => {
    if (!tradeId) return;
    
    if (updates.proof !== undefined) {
      if (updates.proof) {
        setProofCache(prev => ({ ...prev, [tradeId]: updates.proof as string }));
      } else {
        setProofCache(prev => {
          const next = { ...prev };
          delete next[tradeId];
          return next;
        });
      }
    }

    updateTrades([tradeId], updates);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && selectedId) {
      uploadFileToTrade(file, selectedId);
    }
  };

  const uploadFileToTrade = (file: File, tradeId: string) => {
    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      updateEntry({ proof: reader.result as string }, tradeId);
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const formatDate = (entry: any) => {
    const d = getTradeDate(entry.date || entry.createdAt);
    return format(d, 'MMM d, yyyy');
  };

  // --- WEEKLY BREAKDOWN DATA ---
  const currentWeekStart = useMemo(() => startOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate]);
  const currentWeekEnd = useMemo(() => endOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate]);

  const weeklyData = useMemo(() => {
    const weekTrades = accountTrades.filter(t => {
      const d = getTradeDate(t.date || t.createdAt);
      return isWithinInterval(d, { start: currentWeekStart, end: currentWeekEnd });
    });

    const totalPnL = weekTrades.reduce((acc, t) => acc + (Number(t.pnl) || 0), 0);
    const winTrades = weekTrades.filter(t => (Number(t.pnl) || 0) > 0);
    const lossTrades = weekTrades.filter(t => (Number(t.pnl) || 0) < 0);
    const winRate = weekTrades.length > 0 ? (winTrades.length / weekTrades.length) * 100 : 0;
    const grossProfit = winTrades.reduce((acc, t) => acc + (Number(t.pnl) || 0), 0);
    const grossLoss = Math.abs(lossTrades.reduce((acc, t) => acc + (Number(t.pnl) || 0), 0));
    const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : grossProfit > 0 ? '∞' : '0.00';

    // Daily breakdown for Monday - Sunday
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dailyStats = days.map((dayName, idx) => {
      const dayDate = new Date(currentWeekStart);
      dayDate.setDate(dayDate.getDate() + idx);
      const dayTrades = weekTrades.filter(t => {
        const d = getTradeDate(t.date || t.createdAt);
        return d.getDate() === dayDate.getDate() && d.getMonth() === dayDate.getMonth();
      });
      const pnl = dayTrades.reduce((acc, t) => acc + (Number(t.pnl) || 0), 0);
      return {
        day: dayName,
        date: format(dayDate, 'MMM d'),
        pnl,
        tradesCount: dayTrades.length,
        winCount: dayTrades.filter(t => (Number(t.pnl) || 0) > 0).length,
      };
    });

    return {
      trades: weekTrades,
      totalPnL,
      winRate,
      tradesCount: weekTrades.length,
      winTradesCount: winTrades.length,
      lossTradesCount: lossTrades.length,
      profitFactor,
      grossProfit,
      grossLoss,
      dailyStats
    };
  }, [accountTrades, currentWeekStart, currentWeekEnd]);

  // --- MONTHLY BREAKDOWN DATA ---
  const currentMonthStart = useMemo(() => startOfMonth(selectedDate), [selectedDate]);
  const currentMonthEnd = useMemo(() => endOfMonth(selectedDate), [selectedDate]);

  const monthlyData = useMemo(() => {
    const monthTrades = accountTrades.filter(t => {
      const d = getTradeDate(t.date || t.createdAt);
      return isWithinInterval(d, { start: currentMonthStart, end: currentMonthEnd });
    });

    const totalPnL = monthTrades.reduce((acc, t) => acc + (Number(t.pnl) || 0), 0);
    const winTrades = monthTrades.filter(t => (Number(t.pnl) || 0) > 0);
    const lossTrades = monthTrades.filter(t => (Number(t.pnl) || 0) < 0);
    const winRate = monthTrades.length > 0 ? (winTrades.length / monthTrades.length) * 100 : 0;
    const grossProfit = winTrades.reduce((acc, t) => acc + (Number(t.pnl) || 0), 0);
    const grossLoss = Math.abs(lossTrades.reduce((acc, t) => acc + (Number(t.pnl) || 0), 0));
    const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : grossProfit > 0 ? '∞' : '0.00';

    // Group by weeks of the month (Week 1, 2, 3, 4, 5)
    const weekBuckets: Record<string, { pnl: number; count: number; wins: number }> = {};
    monthTrades.forEach(t => {
      const d = getTradeDate(t.date || t.createdAt);
      const weekNum = Math.ceil(d.getDate() / 7);
      const key = `Wk ${weekNum}`;
      if (!weekBuckets[key]) weekBuckets[key] = { pnl: 0, count: 0, wins: 0 };
      const pnl = Number(t.pnl) || 0;
      weekBuckets[key].pnl += pnl;
      weekBuckets[key].count += 1;
      if (pnl > 0) weekBuckets[key].wins += 1;
    });

    const weeklyBars = Object.keys(weekBuckets).map(week => ({
      week,
      pnl: weekBuckets[week].pnl,
      count: weekBuckets[week].count,
      winRate: Math.round((weekBuckets[week].wins / weekBuckets[week].count) * 100)
    }));

    return {
      trades: monthTrades,
      totalPnL,
      winRate,
      tradesCount: monthTrades.length,
      winTradesCount: winTrades.length,
      lossTradesCount: lossTrades.length,
      profitFactor,
      grossProfit,
      grossLoss,
      weeklyBars
    };
  }, [accountTrades, currentMonthStart, currentMonthEnd]);

  const normalizedEntry = selectedEntry ? {
    id: selectedEntry.id,
    symbol: selectedEntry.symbol || "EURUSD",
    pnl: Number(selectedEntry.pnl) || 0,
    type: (selectedEntry.action || "BUY").toUpperCase(),
    date: formatDate(selectedEntry),
    entryPrice: selectedEntry.entry || "—",
    exitPrice: selectedEntry.exit || "—",
    duration: selectedEntry.duration || "—",
    size: selectedEntry.size || "1.0 Lot",
    tradeType: selectedEntry.tag || "Scalp",
    strategy: selectedEntry.strategy || "Standard",
    tags: selectedEntry.tags || (selectedEntry.tag ? [selectedEntry.tag] : []),
    rating: selectedEntry.rating || 7,
    emotions: selectedEntry.emotions || ['😎'],
    notes: selectedEntry.notes || "",
    proof: proofCache[selectedEntry.id] || selectedEntry.proof || "",
    sentiment: selectedEntry.sentiment || "",
    checklist: selectedEntry.checklist || [
      { label: "Followed Trading Plan & Strategy", checked: true },
      { label: "Risk strictly within Limits (≤1%)", checked: true },
      { label: "Clear Defined Take Profit & Stop Loss", checked: true },
      { label: "High Patience & Zero FOMO Entry", checked: false },
      { label: "Disciplined Psychological State", checked: true },
    ]
  } : null;

  return (
    <div className="flex flex-col min-h-full pb-14 font-normal">
      <TopBar 
        title="Screenshots & Trade Analysis" 
        subtitle="Visual Trade Proofs, Weekly & Monthly Performance Breakdown" 
        showSearch={true}
      />

      {/* Main Container */}
      <div className="p-4 sm:p-6 md:p-8 max-w-[1600px] w-full mx-auto space-y-6">
        
        {/* Top Control Bar: View Switcher & Action */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/70 dark:bg-[#13141b]/70 backdrop-blur-xl border border-gray-200/80 dark:border-neutral-800/80 p-3 sm:p-4 rounded-3xl shadow-xs">
          
          {/* View Mode Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-gray-100/80 dark:bg-neutral-900/80 rounded-2xl border border-gray-200/50 dark:border-neutral-800/50 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveView("gallery")}
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap",
                activeView === "gallery" 
                  ? "bg-white dark:bg-[#1f222e] text-blue-600 dark:text-blue-400 shadow-xs scale-[1.01]" 
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Screenshots Gallery</span>
            </button>

            <button
              onClick={() => setActiveView("weekly")}
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap",
                activeView === "weekly" 
                  ? "bg-white dark:bg-[#1f222e] text-blue-600 dark:text-blue-400 shadow-xs scale-[1.01]" 
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Weekly Analysis</span>
            </button>

            <button
              onClick={() => setActiveView("monthly")}
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap",
                activeView === "monthly" 
                  ? "bg-white dark:bg-[#1f222e] text-blue-600 dark:text-blue-400 shadow-xs scale-[1.01]" 
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              <span>Monthly Breakdown</span>
            </button>

            <button
              onClick={() => setActiveView("journal")}
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap",
                activeView === "journal" 
                  ? "bg-white dark:bg-[#1f222e] text-blue-600 dark:text-blue-400 shadow-xs scale-[1.01]" 
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Trade Deep Dive</span>
            </button>
          </div>

          {/* Quick Upload or Date Navigation */}
          <div className="flex items-center gap-2.5">
            {activeView === "gallery" && (
              <>
                <button
                  onClick={() => quickUploadInputRef.current?.click()}
                  className="btn-primary px-4 py-2 text-xs font-semibold rounded-2xl flex items-center gap-2 shadow-xs"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Attach Screenshot</span>
                </button>
                <input
                  type="file"
                  ref={quickUploadInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && selectedId) {
                      uploadFileToTrade(file, selectedId);
                    }
                  }}
                />
              </>
            )}

            {(activeView === "weekly" || activeView === "monthly") && (
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-neutral-800/80 px-3 py-1.5 rounded-2xl border border-gray-200/80 dark:border-neutral-700">
                <button 
                  onClick={() => setSelectedDate(prev => activeView === "weekly" ? subWeeks(prev, 1) : subMonths(prev, 1))}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-neutral-700 rounded-lg text-gray-500 dark:text-gray-300 transition-colors cursor-pointer"
                  title="Previous Period"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200 px-2 select-none">
                  {activeView === "weekly" 
                    ? `${format(currentWeekStart, 'MMM d')} – ${format(currentWeekEnd, 'MMM d, yyyy')}`
                    : format(selectedDate, 'MMMM yyyy')}
                </span>
                <button 
                  onClick={() => setSelectedDate(prev => activeView === "weekly" ? addWeeks(prev, 1) : addMonths(prev, 1))}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-neutral-700 rounded-lg text-gray-500 dark:text-gray-300 transition-colors cursor-pointer"
                  title="Next Period"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ===================== VIEW 1: SCREENSHOTS GALLERY ===================== */}
        {activeView === "gallery" && (
          <div className="space-y-6">
            
            {/* Filter Sub-bar & Grid/List View Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {(["All", "WithScreenshots", "Journaled"] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                      activeTab === tab
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "bg-white dark:bg-[#16181f] text-gray-500 hover:text-gray-900 dark:hover:text-white border border-gray-200/80 dark:border-neutral-800"
                    )}
                  >
                    {tab === "WithScreenshots" ? "With Chart Proofs" : tab}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2.5">
                {/* Search */}
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search symbol, notes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white dark:bg-[#16181f] border border-gray-200/80 dark:border-neutral-800 rounded-2xl pl-9 pr-3 py-1.5 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Display Mode Toggle (Grid vs List) */}
                <div className="flex items-center p-1 bg-gray-100/80 dark:bg-neutral-900/80 rounded-xl border border-gray-200/60 dark:border-neutral-800 shrink-0">
                  <button
                    onClick={() => setGalleryDisplayMode("grid")}
                    className={cn(
                      "p-1.5 rounded-lg transition-all cursor-pointer",
                      galleryDisplayMode === "grid"
                        ? "bg-white dark:bg-[#1f222e] text-blue-600 dark:text-blue-400 shadow-2xs"
                        : "text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    )}
                    title="Grid view"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setGalleryDisplayMode("list")}
                    className={cn(
                      "p-1.5 rounded-lg transition-all cursor-pointer",
                      galleryDisplayMode === "list"
                        ? "bg-white dark:bg-[#1f222e] text-blue-600 dark:text-blue-400 shadow-2xs"
                        : "text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    )}
                    title="List view"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Gallery Content (Grid or List Mode) */}
            {entries.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center justify-center p-8 bg-white dark:bg-[#16181f] rounded-3xl border border-dashed border-gray-200 dark:border-neutral-800">
                <ImageIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
                <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">No trades match this filter</h4>
                <p className="text-xs text-gray-400 max-w-sm">Attach chart screenshots to your trades to build a visual playbook of your setups and execution.</p>
              </div>
            ) : galleryDisplayMode === "list" ? (
              /* Sleek, Premium List Mode with Chart Thumbnail, P&L badge, tags, and quick review */
              <div className="bg-white dark:bg-[#16181f] rounded-3xl border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs overflow-hidden divide-y divide-gray-100/80 dark:divide-neutral-800/60">
                {entries.map((trade) => {
                  const proofImg = proofCache[trade.id] || trade.proof;
                  const pnlNum = Number(trade.pnl) || 0;
                  const isPos = pnlNum >= 0;
                  const isBuy = (trade.action || 'BUY').toUpperCase() === 'BUY';

                  return (
                    <div
                      key={trade.id}
                      className="p-3.5 sm:p-4 hover:bg-gray-50/70 dark:hover:bg-neutral-800/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 group cursor-pointer"
                      onClick={() => {
                        setSelectedId(trade.id);
                        if (proofImg) setExpandedImage(proofImg);
                        else setActiveView("journal");
                      }}
                    >
                      {/* Left: Thumbnail + Symbol + Direction + Strategy */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Thumbnail / Upload placeholder */}
                        <div 
                          className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gray-100 dark:bg-neutral-900/80 border border-gray-200/60 dark:border-neutral-800 overflow-hidden shrink-0 relative flex items-center justify-center group/thumb"
                          onClick={(e) => {
                            if (proofImg) {
                              e.stopPropagation();
                              setExpandedImage(proofImg);
                            }
                          }}
                        >
                          {proofImg ? (
                            <>
                              <img 
                                src={proofImg} 
                                alt={`${trade.symbol} chart thumbnail`} 
                                className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform duration-200"
                              />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-white">
                                <Maximize2 className="w-3.5 h-3.5" />
                              </div>
                            </>
                          ) : (
                            <UploadCloud className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                          )}
                        </div>

                        {/* Trade Metadata */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {trade.symbol}
                            </span>
                            <span className={cn(
                              "px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider",
                              isBuy ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                            )}>
                              {trade.action || "BUY"}
                            </span>
                            {trade.strategy && (
                              <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[10px] font-semibold border border-blue-200/40 dark:border-blue-800/30 truncate max-w-[140px]">
                                {trade.strategy}
                              </span>
                            )}
                            {trade.rating ? (
                              <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md">
                                <Star className="w-2.5 h-2.5 fill-amber-500" />
                                <span>{trade.rating}/10</span>
                              </span>
                            ) : null}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            <span className="tabular-nums font-medium">{formatDate(trade)}</span>
                            {trade.size && <span className="font-mono text-[11px] text-gray-500 dark:text-gray-400">{trade.size}</span>}
                            {trade.session && <span>• {trade.session}</span>}
                            {trade.notes && (
                              <span className="hidden md:inline-block text-gray-500 dark:text-gray-400 truncate max-w-sm font-medium">
                                • {trade.notes}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: P&L Badge + Review CTA */}
                      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pl-16 sm:pl-0">
                        <div className="text-left sm:text-right">
                          <span className={cn(
                            "text-sm sm:text-base font-extrabold tabular-nums tracking-tight font-headline block",
                            isPos ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"
                          )}>
                            {pnlNum > 0 ? `+$${pnlNum.toFixed(2)}` : pnlNum < 0 ? `-$${Math.abs(pnlNum).toFixed(2)}` : '$0.00'}
                          </span>
                          <span className="text-[10px] text-gray-400 font-medium">Net Realized</span>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(trade.id);
                            setActiveView("journal");
                          }}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-blue-600 hover:text-white dark:bg-neutral-800 dark:hover:bg-blue-600 text-gray-700 dark:text-gray-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <span>Deep Dive</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Grid Mode */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {entries.map((trade) => {
                  const proofImg = proofCache[trade.id] || trade.proof;
                  const pnlNum = Number(trade.pnl) || 0;
                  const isPos = pnlNum >= 0;
                  const isBuy = (trade.action || 'BUY').toUpperCase() === 'BUY';

                  return (
                    <motion.div
                      key={trade.id}
                      whileHover={{ y: -3 }}
                      transition={{ duration: 0.2 }}
                      className={cn(
                        "bg-white dark:bg-[#16181f] rounded-3xl border overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col group",
                        selectedId === trade.id 
                          ? "border-blue-500 ring-1 ring-blue-500/20" 
                          : "border-gray-200/80 dark:border-neutral-800/80"
                      )}
                    >
                      {/* Image Preview / Drop Zone */}
                      <div 
                        onClick={() => {
                          setSelectedId(trade.id);
                          if (proofImg) setExpandedImage(proofImg);
                        }}
                        className="relative h-44 bg-gray-100 dark:bg-neutral-900/60 flex items-center justify-center cursor-pointer overflow-hidden border-b border-gray-100 dark:border-neutral-800/60"
                      >
                        {proofImg ? (
                          <>
                            <img 
                              src={proofImg} 
                              alt={`${trade.symbol} chart screenshot`} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <span className="p-2 bg-black/60 rounded-xl text-white backdrop-blur-xs">
                                <Maximize2 className="w-4 h-4" />
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center gap-1.5 p-4 text-center">
                            <UploadCloud className="w-6 h-6 text-gray-400 group-hover:text-blue-500 transition-colors" />
                            <span className="text-[11px] font-medium text-gray-400 group-hover:text-blue-500 transition-colors">
                              Click to attach chart
                            </span>
                          </div>
                        )}

                        {/* Top Badges */}
                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                          <span className={cn(
                            "px-2 py-0.5 rounded-lg text-[10px] font-black uppercase text-white shadow-xs",
                            isBuy ? "bg-emerald-500" : "bg-rose-500"
                          )}>
                            {isBuy ? "BUY" : "SELL"}
                          </span>
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-black/60 backdrop-blur-xs text-white">
                            {trade.symbol}
                          </span>
                        </div>

                        <div className="absolute top-2.5 right-2.5">
                          <span className={cn(
                            "px-2 py-0.5 rounded-lg text-[10px] font-black tabular-nums shadow-xs",
                            isPos 
                              ? "bg-emerald-500 text-white" 
                              : "bg-rose-500 text-white"
                          )}>
                            {pnlNum > 0 ? `+$${pnlNum.toFixed(2)}` : pnlNum < 0 ? `-$${Math.abs(pnlNum).toFixed(2)}` : '$0.00'}
                          </span>
                        </div>
                      </div>

                      {/* Card Content Footer - Minimal & Clean */}
                      <div className="p-3.5 flex flex-col justify-between flex-1 gap-2">
                        <div className="flex items-center justify-between text-[11px] text-gray-400">
                          <span>{formatDate(trade)}</span>
                          {trade.strategy && (
                            <span className="font-semibold text-gray-500 dark:text-gray-400">{trade.strategy}</span>
                          )}
                        </div>
                        {trade.notes ? (
                          <p className="text-xs text-gray-700 dark:text-gray-300 font-medium line-clamp-2">
                            {trade.notes}
                          </p>
                        ) : null}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===================== VIEW 2: WEEKLY ANALYSIS ===================== */}
        {activeView === "weekly" && (
          <div className="space-y-6">
            {/* Weekly KPI Highlights */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-[#16181f] p-5 rounded-3xl border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs space-y-1">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Weekly Net P&L</span>
                <h3 className={cn(
                  "text-2xl sm:text-3xl font-black tabular-nums tracking-tight font-headline",
                  weeklyData.totalPnL > 0 ? "text-emerald-500" : weeklyData.totalPnL < 0 ? "text-rose-500" : "text-gray-900 dark:text-white"
                )}>
                  {weeklyData.totalPnL > 0 ? `+$${weeklyData.totalPnL.toFixed(2)}` : weeklyData.totalPnL < 0 ? `-$${Math.abs(weeklyData.totalPnL).toFixed(2)}` : '$0.00'}
                </h3>
                <p className="text-[10px] text-gray-400 font-medium">Selected week performance</p>
              </div>

              <div className="bg-white dark:bg-[#16181f] p-5 rounded-3xl border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs space-y-1">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Win Rate</span>
                <h3 className="text-2xl sm:text-3xl font-black tabular-nums tracking-tight text-gray-900 dark:text-white font-headline">
                  {weeklyData.winRate.toFixed(1)}%
                </h3>
                <p className="text-[10px] text-gray-400 font-medium">{weeklyData.winTradesCount} Won · {weeklyData.lossTradesCount} Lost</p>
              </div>

              <div className="bg-white dark:bg-[#16181f] p-5 rounded-3xl border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs space-y-1">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Profit Factor</span>
                <h3 className="text-2xl sm:text-3xl font-black tabular-nums tracking-tight text-gray-900 dark:text-white font-headline">
                  {weeklyData.profitFactor}
                </h3>
                <p className="text-[10px] text-gray-400 font-medium">Gross: +${weeklyData.grossProfit.toFixed(0)} / -${weeklyData.grossLoss.toFixed(0)}</p>
              </div>

              <div className="bg-white dark:bg-[#16181f] p-5 rounded-3xl border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs space-y-1">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Volume & Execution</span>
                <h3 className="text-2xl sm:text-3xl font-black tabular-nums tracking-tight text-gray-900 dark:text-white font-headline">
                  {weeklyData.tradesCount} <span className="text-sm font-semibold text-gray-400">Trades</span>
                </h3>
                <p className="text-[10px] text-gray-400 font-medium">Recorded this calendar week</p>
              </div>
            </div>

            {/* Daily Distribution Chart */}
            <div className="bg-white dark:bg-[#16181f] p-6 rounded-3xl border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">Day-by-Day Net Profit (Mon – Sun)</h3>
                  <p className="text-xs text-gray-400">P&L distribution per trading session this week</p>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData.dailyStats}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="day" stroke="#888888" fontSize={12} tickLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} tickFormatter={(val) => `$${val}`} />
                    <Tooltip 
                      formatter={(val: any) => [`$${Number(val).toFixed(2)}`, 'Realized P&L']}
                      labelFormatter={(label, payload) => payload?.[0]?.payload?.date || label}
                      contentStyle={{ backgroundColor: '#1f222e', borderRadius: '12px', border: 'none', color: '#fff' }}
                    />
                    <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
                      {weeklyData.dailyStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#f43f5e'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Week's Executed Trades List */}
            <div className="bg-white dark:bg-[#16181f] rounded-3xl border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">Week's Closed Positions</h3>
                  <p className="text-xs text-gray-400">All executions finalized during this 7-day period</p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-300">
                  {weeklyData.trades.length} {weeklyData.trades.length === 1 ? 'Trade' : 'Trades'}
                </span>
              </div>

              {weeklyData.trades.length === 0 ? (
                <div className="py-12 text-center flex flex-col items-center justify-center p-6 bg-gray-50/50 dark:bg-neutral-900/30 rounded-2xl border border-dashed border-gray-200 dark:border-neutral-800">
                  <Clock className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
                  <p className="text-xs text-gray-400">No trades logged for this specific week.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {weeklyData.trades.map(t => {
                    const pnlNum = Number(t.pnl) || 0;
                    const isPos = pnlNum >= 0;
                    const isBuy = (t.action || 'BUY').toUpperCase() === 'BUY';
                    const hasProof = Boolean(t.proof || proofCache[t.id]);

                    return (
                      <div 
                        key={t.id} 
                        className="p-3.5 sm:p-4 rounded-2xl bg-gray-50/60 dark:bg-neutral-900/40 hover:bg-white dark:hover:bg-[#1c1e28] border border-gray-200/60 dark:border-neutral-800/60 hover:border-gray-300 dark:hover:border-neutral-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group cursor-pointer shadow-2xs"
                        onClick={() => {
                          setSelectedId(t.id);
                          setActiveView("journal");
                        }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black uppercase tracking-wider shrink-0",
                            isBuy 
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" 
                              : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                          )}>
                            {t.action || 'BUY'}
                          </span>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-sm">
                                {t.symbol}
                              </span>
                              <span className="text-[11px] text-gray-400 tabular-nums font-medium">
                                {formatDate(t)}
                              </span>
                              {t.strategy && (
                                <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[10px] font-semibold">
                                  {t.strategy}
                                </span>
                              )}
                              {hasProof && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded font-medium">
                                  <ImageIcon className="w-2.5 h-2.5" /> Proof
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-gray-400 mt-0.5">
                              {t.size && <span className="font-mono">{t.size}</span>}
                              {t.entry && <span>Entry: {t.entry}</span>}
                              {t.exit && <span>Exit: {t.exit}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pl-11 sm:pl-0">
                          <span className={cn(
                            "text-sm font-extrabold tabular-nums tracking-tight font-headline",
                            isPos ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"
                          )}>
                            {pnlNum > 0 ? `+$${pnlNum.toFixed(2)}` : pnlNum < 0 ? `-$${Math.abs(pnlNum).toFixed(2)}` : '$0.00'}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedId(t.id);
                              setActiveView("journal");
                            }}
                            className="px-2.5 py-1 rounded-xl text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors flex items-center gap-1"
                          >
                            <span>Inspect</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ===================== VIEW 3: MONTHLY BREAKDOWN ===================== */}
        {activeView === "monthly" && (
          <div className="space-y-6">
            
            {/* Monthly KPI Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-[#16181f] p-5 rounded-3xl border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs space-y-1">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Monthly Net P&L</span>
                <h3 className={cn(
                  "text-2xl sm:text-3xl font-black tabular-nums tracking-tight font-headline",
                  monthlyData.totalPnL > 0 ? "text-emerald-500" : monthlyData.totalPnL < 0 ? "text-rose-500" : "text-gray-900 dark:text-white"
                )}>
                  {monthlyData.totalPnL > 0 ? `+$${monthlyData.totalPnL.toFixed(2)}` : monthlyData.totalPnL < 0 ? `-$${Math.abs(monthlyData.totalPnL).toFixed(2)}` : '$0.00'}
                </h3>
                <p className="text-[10px] text-gray-400 font-medium">{format(selectedDate, 'MMMM yyyy')} total</p>
              </div>

              <div className="bg-white dark:bg-[#16181f] p-5 rounded-3xl border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs space-y-1">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Monthly Win Rate</span>
                <h3 className="text-2xl sm:text-3xl font-black tabular-nums tracking-tight text-gray-900 dark:text-white font-headline">
                  {monthlyData.winRate.toFixed(1)}%
                </h3>
                <p className="text-[10px] text-gray-400 font-medium">{monthlyData.winTradesCount} Won · {monthlyData.lossTradesCount} Lost</p>
              </div>

              <div className="bg-white dark:bg-[#16181f] p-5 rounded-3xl border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs space-y-1">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Monthly Profit Factor</span>
                <h3 className="text-2xl sm:text-3xl font-black tabular-nums tracking-tight text-gray-900 dark:text-white font-headline">
                  {monthlyData.profitFactor}
                </h3>
                <p className="text-[10px] text-gray-400 font-medium">Gain: +${monthlyData.grossProfit.toFixed(0)} / Loss: -${monthlyData.grossLoss.toFixed(0)}</p>
              </div>

              <div className="bg-white dark:bg-[#16181f] p-5 rounded-3xl border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs space-y-1">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Month Trades</span>
                <h3 className="text-2xl sm:text-3xl font-black tabular-nums tracking-tight text-gray-900 dark:text-white font-headline">
                  {monthlyData.tradesCount}
                </h3>
                <p className="text-[10px] text-gray-400 font-medium">Logged executions</p>
              </div>
            </div>

            {/* Weekly Progression of the Month */}
            <div className="bg-white dark:bg-[#16181f] p-6 rounded-3xl border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs space-y-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Week-over-Week Performance ({format(selectedDate, 'MMMM yyyy')})</h3>
                <p className="text-xs text-gray-400">P&L consistency across each week of this month</p>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData.weeklyBars}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="week" stroke="#888888" fontSize={12} tickLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} tickFormatter={(val) => `$${val}`} />
                    <Tooltip 
                      formatter={(val: any) => [`$${Number(val).toFixed(2)}`, 'Weekly P&L']}
                      contentStyle={{ backgroundColor: '#1f222e', borderRadius: '12px', border: 'none', color: '#fff' }}
                    />
                    <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
                      {monthlyData.weeklyBars.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#f43f5e'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        )}

        {/* ===================== VIEW 4: TRADE DEEP DIVE (ORIGINAL JOURNAL DETAILED) ===================== */}
        {activeView === "journal" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
            
            {/* Left Column: Trade Logs List (4 COLS) */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] font-semibold">
                    <CalendarIcon className="w-3 h-3" />
                    Journal Entries
                  </span>
                  <span className="text-xs text-gray-400 font-medium">
                    {entries.length} {entries.length === 1 ? 'trade' : 'trades'}
                  </span>
                </div>
              </div>

              {/* Segmented Filter Pills */}
              <div className="segment-pill-container w-full">
                {(["All", "WithScreenshots", "Journaled"] as const).map(tab => (
                  <button 
                    key={tab} 
                    onClick={() => setActiveTab(tab)}
                    className={`segment-pill-btn flex-1 ${
                      activeTab === tab ? 'segment-pill-btn-active' : ''
                    }`}
                  >
                    {tab === "WithScreenshots" ? "With Proof" : tab}
                  </button>
                ))}
              </div>

              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input 
                  type="text"
                  placeholder="Filter by symbol, strategy, tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white dark:bg-[#16181f] border border-gray-200/80 dark:border-neutral-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 font-normal focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs transition-all"
                />
              </div>

              {/* Scrollable List */}
              <div className="overflow-y-auto space-y-2.5 no-scrollbar max-h-[calc(100vh-320px)] pr-0.5">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="p-4 rounded-3xl bg-white dark:bg-[#16181f] border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs space-y-3 animate-pulse">
                      <div className="flex justify-between items-center">
                        <div className="w-16 h-4 rounded bg-gray-200 dark:bg-neutral-700" />
                        <div className="w-16 h-5 rounded-lg bg-gray-200 dark:bg-neutral-700" />
                      </div>
                    </div>
                  ))
                ) : entries.length === 0 ? (
                  <div className="py-12 text-center flex flex-col items-center justify-center p-6 bg-white dark:bg-[#16181f] rounded-3xl border border-dashed border-gray-200 dark:border-neutral-800">
                    <Sparkles className="w-8 h-8 text-blue-500 mb-2" />
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">No trades found</h4>
                    <p className="text-xs text-gray-400">Log a trade or adjust your search filter.</p>
                  </div>
                ) : (
                  entries.map(entry => {
                    const pnlNum = Number(entry.pnl) || 0;
                    const isPos = pnlNum >= 0;
                    const isSelected = selectedId === entry.id;
                    const isBuy = (entry.action || 'BUY').toUpperCase() === 'BUY';

                    return (
                      <motion.div 
                        key={entry.id} 
                        onClick={() => setSelectedId(entry.id)}
                        whileHover={{ x: 2 }}
                        transition={{ duration: 0.15 }}
                        className={cn(
                          "p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 cursor-pointer shadow-2xs group relative",
                          isSelected 
                            ? "bg-blue-50/70 dark:bg-blue-950/30 border-blue-500 shadow-sm ring-1 ring-blue-500/20" 
                            : "bg-white dark:bg-[#16181f] border-gray-200/80 dark:border-neutral-800/80 hover:border-gray-300 dark:hover:border-neutral-700"
                        )}
                      >
                        <div className="flex justify-between items-start mb-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className={cn(
                              "w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black uppercase tracking-wider shrink-0",
                              isBuy 
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" 
                                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                            )}>
                              {isBuy ? "BUY" : "SELL"}
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {entry.symbol}
                              </h4>
                              <p className="text-[10px] text-gray-400 font-medium tabular-nums">{formatDate(entry)}</p>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className={cn(
                              "text-xs font-black tabular-nums tracking-tight font-headline block",
                              isPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                            )}>
                              {pnlNum > 0 ? `+$${pnlNum.toFixed(2)}` : pnlNum < 0 ? `-$${Math.abs(pnlNum).toFixed(2)}` : '$0.00'}
                            </span>
                            {entry.rating ? (
                              <div className="flex items-center justify-end gap-0.5 text-[10px] font-bold text-amber-500 mt-0.5">
                                <Star className="w-2.5 h-2.5 fill-amber-500" />
                                <span>{entry.rating}/10</span>
                              </div>
                            ) : null}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-neutral-800/60 text-[10px]">
                          <span className="text-gray-400 font-medium truncate max-w-[120px]">
                            {entry.strategy || entry.tag || "Manual Execution"}
                          </span>
                          {(entry.proof || proofCache[entry.id]) && (
                            <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded font-semibold ml-auto flex items-center gap-1">
                              <ImageIcon className="w-3 h-3" /> Proof
                            </span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Detail View (8 COLS) */}
            <div className="lg:col-span-8 bg-white dark:bg-[#16181f] rounded-3xl border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs overflow-hidden flex flex-col">
              {!normalizedEntry ? (
                <div className="flex-1 flex flex-col items-center justify-center p-16 text-center">
                  <Target className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
                  <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">Select a trade to inspect</h3>
                  <p className="text-xs text-gray-400 max-w-xs">Choose any trade to review execution score, psychology, discipline, and screenshot proof.</p>
                </div>
              ) : (
                <div className="p-6 md:p-8 space-y-7 overflow-y-auto no-scrollbar max-h-[calc(100vh-220px)]">
                  
                  {/* Header Hero Details */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100 dark:border-neutral-800">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-xs",
                        normalizedEntry.type === 'BUY' ? "bg-emerald-500" : "bg-rose-500"
                      )}>
                        {normalizedEntry.type}
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{normalizedEntry.symbol}</h2>
                          <span className={cn(
                            "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                            normalizedEntry.pnl >= 0 ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40" : "bg-rose-50 text-rose-600 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40"
                          )}>
                            {normalizedEntry.pnl >= 0 ? "Winner" : "Loser"}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 font-medium mt-0.5">
                          {normalizedEntry.type === 'BUY' ? 'Long' : 'Short'} Position · {normalizedEntry.date} · {normalizedEntry.size}
                        </p>
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="text-[11px] font-medium text-gray-400">Total Realized P&L</p>
                      <h3 className={cn(
                        "text-2xl md:text-3xl font-black tabular-nums tracking-tight font-headline",
                        normalizedEntry.pnl > 0 ? "text-emerald-600 dark:text-emerald-400" : normalizedEntry.pnl < 0 ? "text-rose-500" : "text-gray-900 dark:text-white"
                      )}>
                        {normalizedEntry.pnl > 0 ? `+$${normalizedEntry.pnl.toFixed(2)}` : normalizedEntry.pnl < 0 ? `-$${Math.abs(normalizedEntry.pnl).toFixed(2)}` : '$0.00'}
                      </h3>
                    </div>
                  </div>

                  {/* Trade Quality Breakdown Meter */}
                  <TradeQualityMeter 
                    pnl={normalizedEntry.pnl}
                    rating={normalizedEntry.rating}
                    checklist={normalizedEntry.checklist}
                    notes={normalizedEntry.notes}
                    emotions={normalizedEntry.emotions}
                    proof={normalizedEntry.proof}
                  />

                  {/* Quick Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Entry Price", value: normalizedEntry.entryPrice },
                      { label: "Exit Price", value: normalizedEntry.exitPrice },
                      { label: "Volume / Size", value: normalizedEntry.size },
                      { label: "Strategy", value: normalizedEntry.strategy }
                    ].map((item, idx) => (
                      <div key={idx} className="bg-gray-50/70 dark:bg-neutral-800/40 p-3.5 rounded-2xl border border-gray-100 dark:border-neutral-800">
                        <p className="text-[10px] font-medium text-gray-400 mb-0.5">{item.label}</p>
                        <p className="text-xs font-bold tabular-nums text-gray-900 dark:text-white truncate">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Trade Proof Chart Screenshot */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-blue-500" />
                        <span>Chart Screenshot & Visual Setup Proof</span>
                      </label>
                      {normalizedEntry.proof && (
                        <button
                          onClick={() => setExpandedImage(normalizedEntry.proof)}
                          className="text-xs font-semibold text-blue-500 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Maximize2 className="w-3.5 h-3.5" /> Full View
                        </button>
                      )}
                    </div>

                    <div 
                      onDragOver={e => e.preventDefault()}
                      onDrop={handleFileDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-200 dark:border-neutral-700/80 rounded-3xl min-h-[220px] max-h-[360px] flex flex-col items-center justify-center gap-2.5 bg-gray-50/50 dark:bg-neutral-800/20 hover:border-blue-500/60 hover:bg-blue-50/10 transition-all cursor-pointer overflow-hidden group relative"
                    >
                      {normalizedEntry.proof ? (
                        <div className="relative w-full h-full min-h-[260px]">
                          <img src={normalizedEntry.proof} alt="Proof" className="w-full h-full object-contain max-h-[360px] bg-black/5 dark:bg-black/20" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <p className="text-white font-semibold text-xs bg-black/60 px-3 py-1.5 rounded-xl backdrop-blur-xs">
                              Click to replace screenshot
                            </p>
                          </div>
                          <button 
                            onClick={(e) => { e.stopPropagation(); updateEntry({ proof: null }); }} 
                            className="absolute top-3 right-3 bg-rose-500 p-1.5 rounded-xl shadow-md text-white hover:bg-rose-600 transition-colors z-20 cursor-pointer"
                            title="Remove Screenshot"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : isProofLoading ? (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                          <p className="text-xs font-medium text-gray-400">Loading proof...</p>
                        </div>
                      ) : (
                        <>
                          <div className="p-3.5 bg-white dark:bg-neutral-800 rounded-2xl shadow-2xs">
                            <UploadCloud className="w-6 h-6 text-gray-400 group-hover:text-blue-500 transition-colors" />
                          </div>
                          <div className="text-center">
                            <p className="font-semibold text-xs text-gray-800 dark:text-gray-200">Drag & drop trade chart screenshot</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">PNG, JPG, WebP supported</p>
                          </div>
                        </>
                      )}
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file && selectedId) {
                            uploadFileToTrade(file, selectedId);
                          }
                        }} 
                      />
                    </div>
                  </div>

                  {/* Trade Notes */}
                  <div className="space-y-2.5">
                    <label className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-blue-500" />
                      <span>Trade Notes, Analysis & Lessons Learned</span>
                    </label>
                    <textarea 
                      key={`${normalizedEntry.id}-notes`}
                      defaultValue={normalizedEntry.notes}
                      onBlur={e => updateEntry({ notes: e.target.value })}
                      className="w-full h-32 bg-gray-50/80 dark:bg-neutral-800/50 border border-gray-200/80 dark:border-neutral-700 rounded-2xl p-4 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all resize-none leading-relaxed" 
                      placeholder="Record your setup reasoning, market conditions, execution quality, and key takeaways..." 
                    />
                  </div>

                  {/* Execution Rating (1-10) */}
                  <div className="bg-gray-50/70 dark:bg-neutral-800/40 p-5 rounded-3xl border border-gray-100 dark:border-neutral-800 space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                        <span>Trader Self Execution Score</span>
                      </label>
                      <span className="text-xs font-bold text-amber-500 tabular-nums">
                        {normalizedEntry.rating} / 10
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-10 gap-1.5 h-8">
                      {[...Array(10)].map((_, i) => {
                        const val = i + 1;
                        const isActive = val <= normalizedEntry.rating;
                        return (
                          <button
                            key={val}
                            onClick={() => updateEntry({ rating: val })}
                            className={cn(
                              "rounded-xl transition-all text-xs font-bold flex items-center justify-center cursor-pointer",
                              isActive 
                                ? "bg-[#111827] dark:bg-white text-white dark:text-gray-900 shadow-2xs hover:scale-105" 
                                : "bg-gray-200/80 dark:bg-neutral-700/80 text-gray-500 hover:bg-gray-300 dark:hover:bg-neutral-600"
                            )}
                          >
                            {val}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}
            </div>

          </div>
        )}

      </div>

      {/* Fullscreen Screenshot Modal */}
      <AnimatePresence>
        {expandedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setExpandedImage(null)}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
          >
            <div className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center">
              <button
                onClick={() => setExpandedImage(null)}
                className="absolute -top-12 right-0 text-white/80 hover:text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
              <img
                src={expandedImage}
                alt="Enlarged Trade Chart Screenshot"
                className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
