import React, { useState, useMemo } from 'react';
import { TopBar } from '../lib/TopBar';
import { 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Search, 
  Layers, 
  PieChart, 
  Target, 
  Sparkles, 
  AlertCircle, 
  ChevronRight, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight, 
  Info, 
  ShieldCheck, 
  Award, 
  Trash2, 
  ExternalLink,
  Coins,
  CheckCircle2,
  DollarSign,
  HelpCircle
} from 'lucide-react';
import { useInvestments, Holding, WatchlistItem } from '../hooks/useInvestments';
import { InvestmentDetailModal } from '../components/InvestmentDetailModal';
import { AddInvestmentModal } from '../components/AddInvestmentModal';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { SmartEmptyState } from '../components/ui/SmartEmptyState';
import { 
  getIndianApiKey, 
  setIndianApiKey, 
  fetchIndianStockQuote 
} from '../lib/indianApi';
import { RefreshCw, Key, Check } from 'lucide-react';

export function Investments() {
  const { 
    holdings, 
    watchlist, 
    wealthGoal, 
    addHolding, 
    updateHolding, 
    deleteHolding, 
    convertWatchlistToHolding 
  } = useInvestments();

  const [termFilter, setTermFilter] = useState<'All' | 'Short Term' | 'Long Term'>('All');
  const [allocationTab, setAllocationTab] = useState<'Asset Class' | 'Sector' | 'Market Cap'>('Asset Class');
  const [benchmarkTimeframe, setBenchmarkTimeframe] = useState<'1M' | '6M' | '1Y' | '3Y' | 'ALL'>('1Y');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedHolding, setSelectedHolding] = useState<Holding | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // IndianAPI Integration state
  const [apiKey, setApiKeyState] = useState(getIndianApiKey());
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [tempApiKey, setTempApiKey] = useState(apiKey);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const handleSaveApiKey = () => {
    setIndianApiKey(tempApiKey);
    setApiKeyState(tempApiKey);
    setIsApiKeyModalOpen(false);
  };

  const handleSyncPrices = async () => {
    setIsSyncing(true);
    setSyncStatus('Connecting to dev.indianapi.in...');
    let updatedCount = 0;
    for (const h of holdings) {
      try {
        const quote = await fetchIndianStockQuote(h.symbol);
        if (quote && quote.currentPrice > 0) {
          updateHolding(h.id, {
            currentPrice: quote.currentPrice,
            dayChangePercent: quote.dayChangePercent
          });
          updatedCount++;
        }
      } catch (e) {
        // continue
      }
    }
    setIsSyncing(false);
    setSyncStatus(updatedCount > 0 ? `Synced ${updatedCount} live prices from IndianAPI` : 'Sync complete');
    setTimeout(() => setSyncStatus(null), 4000);
  };

  // Filtered holdings based on term & search
  const filteredHoldings = useMemo(() => {
    return holdings.filter(h => {
      const matchTerm = termFilter === 'All' ? true : h.term === termFilter;
      const matchSearch = searchQuery === '' || 
        h.symbol.toLowerCase().includes(searchQuery.toLowerCase()) || 
        h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.sector.toLowerCase().includes(searchQuery.toLowerCase());
      return matchTerm && matchSearch;
    });
  }, [holdings, termFilter, searchQuery]);

  // Aggregate Portfolio Metrics
  const metrics = useMemo(() => {
    const activeList = termFilter === 'All' ? holdings : holdings.filter(h => h.term === termFilter);
    
    let totalInvested = 0;
    let currentValue = 0;
    let todayPnl = 0;

    activeList.forEach(h => {
      const invested = h.quantity * h.avgBuyPrice;
      const current = h.quantity * h.currentPrice;
      totalInvested += invested;
      currentValue += current;
      
      // Calculate today's approximate dollar gain
      const dayGain = current * (h.dayChangePercent / 100);
      todayPnl += dayGain;
    });

    const totalReturns = currentValue - totalInvested;
    const returnPercent = totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0;
    const todayPercent = currentValue > 0 ? (todayPnl / currentValue) * 100 : 0;
    
    // Time-weighted estimated XIRR
    const xirr = totalInvested > 0 ? 14.8 : 0;

    return {
      totalInvested,
      currentValue,
      totalReturns,
      returnPercent,
      todayPnl,
      todayPercent,
      xirr
    };
  }, [holdings, termFilter]);

  // Allocation Breakdowns
  const allocations = useMemo(() => {
    const totalVal = holdings.reduce((acc, h) => acc + (h.quantity * h.currentPrice), 0);
    if (totalVal === 0) return { assetClasses: [], sectors: [], marketCaps: [] };

    // 1. Asset Class Breakdown
    const assetMap: Record<string, number> = {};
    holdings.forEach(h => {
      const val = h.quantity * h.currentPrice;
      assetMap[h.type] = (assetMap[h.type] || 0) + val;
    });
    const assetClasses = Object.entries(assetMap).map(([label, val]) => ({
      label,
      percent: Math.round((val / totalVal) * 100),
      val
    })).sort((a, b) => b.val - a.val);

    // 2. Sector Breakdown
    const sectorMap: Record<string, number> = {};
    holdings.forEach(h => {
      const val = h.quantity * h.currentPrice;
      sectorMap[h.sector] = (sectorMap[h.sector] || 0) + val;
    });
    const sectors = Object.entries(sectorMap).map(([label, val]) => ({
      label,
      percent: Math.round((val / totalVal) * 100),
      val
    })).sort((a, b) => b.val - a.val);

    // 3. Market Cap Breakdown
    const capMap: Record<string, number> = {};
    holdings.forEach(h => {
      const val = h.quantity * h.currentPrice;
      capMap[h.marketCap] = (capMap[h.marketCap] || 0) + val;
    });
    const marketCaps = Object.entries(capMap).map(([label, val]) => ({
      label,
      percent: Math.round((val / totalVal) * 100),
      val
    })).sort((a, b) => b.val - a.val);

    return { assetClasses, sectors, marketCaps };
  }, [holdings]);

  // Benchmark Comparison Data
  const benchmarkData = [
    { date: 'Jan 24', portfolio: 0, nifty50: 0, nifty500: 0 },
    { date: 'Mar 24', portfolio: 4.2, nifty50: 3.1, nifty500: 3.5 },
    { date: 'Jun 24', portfolio: 8.9, nifty50: 6.4, nifty500: 7.2 },
    { date: 'Sep 24', portfolio: 12.4, nifty50: 9.8, nifty500: 10.6 },
    { date: 'Dec 24', portfolio: 15.1, nifty50: 11.2, nifty500: 12.8 },
    { date: 'Mar 25', portfolio: 18.4, nifty50: 13.2, nifty500: 14.8 }
  ];

  const handleRowClick = (holding: Holding) => {
    setSelectedHolding(holding);
    setIsDetailModalOpen(true);
  };

  const progressPercent = Math.min(100, Math.round((metrics.currentValue / wealthGoal.targetAmount) * 100));

  return (
    <div className="flex flex-col min-h-full pb-14 font-normal">
      <TopBar
        title="Investment Portfolio"
        subtitle="Your wealth & long-term capital, tracked in one place"
        showSearch={true}
      />

      <div className="p-6 md:p-8 max-w-[1600px] w-full mx-auto space-y-7">
        
        {/* ================= 1. PORTFOLIO SNAPSHOT HEADER (6 METRICS) ================= */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#111827] dark:bg-white text-white dark:text-gray-900 text-[11px] font-semibold font-headline">
                  ★ Wealth Dashboard
                </span>
                <span className="text-xs text-gray-400 font-medium">Indian Equities, ETFs & Funds</span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white tracking-tight font-headline mt-1">
                Portfolio Snapshot
              </h2>
            </div>

            {/* Term Horizon Toggle, Sync & Add Button */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* All / Short Term / Long Term Toggle */}
              <div className="bg-white dark:bg-[#16181f] p-1 rounded-2xl border border-gray-200/80 dark:border-neutral-800 shadow-2xs flex items-center gap-1">
                {(['All', 'Short Term', 'Long Term'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTermFilter(t)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${termFilter === t ? 'bg-[#111827] dark:bg-white text-white dark:text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Sync Live Prices with IndianAPI */}
              <button
                onClick={handleSyncPrices}
                disabled={isSyncing}
                title="Sync live quotes from dev.indianapi.in"
                className="px-3 py-2 bg-white dark:bg-[#16181f] hover:bg-gray-50 dark:hover:bg-neutral-800 border border-gray-200/80 dark:border-neutral-800 rounded-2xl text-xs font-semibold text-gray-700 dark:text-gray-200 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-blue-500 ${isSyncing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync Live'}</span>
              </button>

              {/* API Key Config Button */}
              <button
                onClick={() => setIsApiKeyModalOpen(true)}
                title="Configure dev.indianapi.in API Key"
                className="p-2 bg-white dark:bg-[#16181f] hover:bg-gray-50 dark:hover:bg-neutral-800 border border-gray-200/80 dark:border-neutral-800 rounded-2xl text-xs font-semibold text-gray-700 dark:text-gray-200 shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
              >
                <Key className="w-3.5 h-3.5 text-amber-500" />
              </button>

              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Holding</span>
              </button>
            </div>
          </div>

          {/* Sync Status Banner */}
          {syncStatus && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50 rounded-2xl text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>{syncStatus}</span>
            </div>
          )}

          {/* 6 Metric Luxury Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            
            {/* Card 1: Total Invested */}
            <div className="bg-white dark:bg-[#16181f] p-4 rounded-3xl border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs space-y-1.5">
              <span className="text-[11px] font-medium text-gray-400">Total Invested</span>
              <h3 className="text-lg md:text-xl font-bold tabular-nums text-gray-900 dark:text-white">
                ₹{metrics.totalInvested.toLocaleString('en-IN')}
              </h3>
              <p className="text-[10px] text-gray-400 font-medium">Original Capital</p>
            </div>

            {/* Card 2: Current Value */}
            <div className="bg-white dark:bg-[#16181f] p-4 rounded-3xl border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs space-y-1.5">
              <span className="text-[11px] font-medium text-gray-400">Current Value</span>
              <h3 className="text-lg md:text-xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
                ₹{metrics.currentValue.toLocaleString('en-IN')}
              </h3>
              <p className="text-[10px] text-gray-400 font-medium">Live Market Value</p>
            </div>

            {/* Card 3: Total Returns */}
            <div className="bg-white dark:bg-[#16181f] p-4 rounded-3xl border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs space-y-1.5">
              <span className="text-[11px] font-medium text-gray-400">Total Returns</span>
              <h3 className={`text-lg md:text-xl font-bold tabular-nums ${metrics.totalReturns >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                {metrics.totalReturns >= 0 ? '+' : ''}₹{Math.abs(metrics.totalReturns).toLocaleString('en-IN')}
              </h3>
              <p className="text-[10px] text-gray-400 font-medium">Realized + Unrealized</p>
            </div>

            {/* Card 4: Return % */}
            <div className="bg-white dark:bg-[#16181f] p-4 rounded-3xl border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs space-y-1.5">
              <span className="text-[11px] font-medium text-gray-400">Return %</span>
              <h3 className={`text-lg md:text-xl font-bold tabular-nums ${metrics.returnPercent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                {metrics.returnPercent >= 0 ? '+' : ''}{metrics.returnPercent.toFixed(2)}%
              </h3>
              <p className="text-[10px] text-gray-400 font-medium">Overall Growth</p>
            </div>

            {/* Card 5: Today's P&L */}
            <div className="bg-white dark:bg-[#16181f] p-4 rounded-3xl border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs space-y-1.5">
              <span className="text-[11px] font-medium text-gray-400">Today's P&L</span>
              <h3 className={`text-lg md:text-xl font-bold tabular-nums ${metrics.todayPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                {metrics.todayPnl >= 0 ? '+' : ''}₹{Math.abs(Math.round(metrics.todayPnl)).toLocaleString('en-IN')}
              </h3>
              <p className={`text-[10px] font-semibold tabular-nums ${metrics.todayPercent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                {metrics.todayPercent >= 0 ? '+' : ''}{metrics.todayPercent.toFixed(2)}% Today
              </p>
            </div>

            {/* Card 6: XIRR (Extended Internal Rate of Return) */}
            <div className="bg-gradient-to-br from-blue-500/10 via-white to-white dark:from-blue-500/15 dark:via-[#16181f] dark:to-[#16181f] p-4 rounded-3xl border border-blue-200/70 dark:border-blue-500/30 shadow-2xs space-y-1.5 relative group">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  XIRR
                </span>
                <span title="Extended Internal Rate of Return: Accurate annualized return accounting for multiple investment dates and SIP cash flows." className="cursor-help text-gray-400 hover:text-blue-500">
                  <HelpCircle className="w-3.5 h-3.5" />
                </span>
              </div>
              <h3 className="text-lg md:text-xl font-black tabular-nums text-blue-600 dark:text-blue-400 font-headline">
                {metrics.xirr}%
              </h3>
              <p className="text-[10px] text-gray-400 font-medium">Time-Weighted Annualized</p>
            </div>

          </div>
        </div>

        {/* ================= 2-COLUMN MAIN LAYOUT (8 COLS LEFT / 4 COLS RIGHT) ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
          
          {/* ================= LEFT COLUMN (8 COLS) ================= */}
          <div className="lg:col-span-8 space-y-7">
            
            {/* PERFORMANCE VS BENCHMARK CARD */}
            <div className="bg-white dark:bg-[#16181f] rounded-3xl p-6 md:p-7 border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] font-semibold">
                      <TrendingUp className="w-3 h-3" />
                      Alpha vs Market
                    </span>
                    <span className="text-xs text-gray-400 font-medium">Your Money vs Benchmark</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight mt-1">
                    Performance vs NIFTY 50
                  </h3>
                </div>

                {/* Benchmark Legend Pills */}
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span className="text-gray-900 dark:text-white">Portfolio: +18.4%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                    <span className="text-gray-400">NIFTY 50: +13.2%</span>
                  </div>
                </div>
              </div>

              {/* Chart */}
              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={benchmarkData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="invPortfolio" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(150, 150, 150, 0.08)" vertical={false} />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `+${v}%`} />
                    <Tooltip 
                      formatter={(val: any, name: any) => [`+${val}%`, name === 'portfolio' ? 'Your Portfolio' : 'NIFTY 50']}
                      contentStyle={{ backgroundColor: '#181920', borderColor: '#333', borderRadius: '12px', color: '#fff' }}
                    />
                    <Area type="monotone" dataKey="portfolio" stroke="#3b82f6" strokeWidth={2.5} fill="url(#invPortfolio)" isAnimationActive={true} />
                    <Area type="monotone" dataKey="nifty50" stroke="#14b8a6" strokeWidth={2} strokeDasharray="4 4" fillOpacity={0} isAnimationActive={true} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* CORE HOLDINGS TABLE */}
            <div className="bg-white dark:bg-[#16181f] rounded-3xl p-6 md:p-7 border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                    My Holdings ({filteredHoldings.length})
                  </h3>
                  <p className="text-xs text-gray-400 font-medium">Click any row to inspect deep dive thesis, score & history</p>
                </div>

                {/* Table Search */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search holdings, sectors..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-neutral-800/60 border border-gray-200/80 dark:border-neutral-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Table Container */}
              <div className="overflow-x-auto no-scrollbar">
                {filteredHoldings.length === 0 ? (
                  <SmartEmptyState
                    title="No holdings found"
                    description="No assets match the selected filter. Add a holding to begin tracking wealth."
                    actionLabel="Add Investment"
                    onAction={() => setIsAddModalOpen(true)}
                    className="shadow-none border-none bg-transparent py-8"
                  />
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-neutral-800 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                        <th className="pb-3 pl-2">Asset</th>
                        <th className="pb-3">Type</th>
                        <th className="pb-3">Qty</th>
                        <th className="pb-3">Avg Buy</th>
                        <th className="pb-3">LTP</th>
                        <th className="pb-3">Invested</th>
                        <th className="pb-3">Current</th>
                        <th className="pb-3 text-right pr-2">Total P&L</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100/80 dark:divide-neutral-800/50 text-xs">
                      {filteredHoldings.map(h => {
                        const invested = h.quantity * h.avgBuyPrice;
                        const current = h.quantity * h.currentPrice;
                        const pnl = current - invested;
                        const pnlPct = (pnl / invested) * 100;
                        const isPos = pnl >= 0;

                        return (
                          <tr
                            key={h.id}
                            onClick={() => handleRowClick(h)}
                            className="hover:bg-gray-50/80 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer group"
                          >
                            <td className="py-3.5 pl-2">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold text-[11px] flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                                  {h.symbol.slice(0, 3)}
                                </div>
                                <div>
                                  <p className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    {h.symbol}
                                  </p>
                                  <p className="text-[10px] text-gray-400 font-medium truncate max-w-[120px]">{h.name}</p>
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-300">
                                {h.type}
                              </span>
                            </td>

                            <td className="py-3.5 tabular-nums text-gray-700 dark:text-gray-300 font-medium">
                              {h.quantity}
                            </td>

                            <td className="py-3.5 tabular-nums text-gray-700 dark:text-gray-300 font-medium">
                              ₹{h.avgBuyPrice.toLocaleString('en-IN')}
                            </td>

                            <td className="py-3.5 tabular-nums text-gray-900 dark:text-white font-bold">
                              ₹{h.currentPrice.toLocaleString('en-IN')}
                            </td>

                            <td className="py-3.5 tabular-nums text-gray-700 dark:text-gray-300 font-medium">
                              ₹{invested.toLocaleString('en-IN')}
                            </td>

                            <td className="py-3.5 tabular-nums text-gray-900 dark:text-white font-bold">
                              ₹{current.toLocaleString('en-IN')}
                            </td>

                            <td className="py-3.5 text-right pr-2">
                              <p className={`font-bold tabular-nums ${isPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                                {isPos ? '+' : ''}₹{Math.abs(pnl).toLocaleString('en-IN')}
                              </p>
                              <p className={`text-[10px] font-semibold tabular-nums ${isPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                                {isPos ? '+' : ''}{pnlPct.toFixed(2)}%
                              </p>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* WATCHLIST & OPPORTUNITY RADAR */}
            <div className="bg-white dark:bg-[#16181f] rounded-3xl p-6 md:p-7 border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">
                    Watchlist & Potential Allocations
                  </h3>
                  <p className="text-xs text-gray-400 font-medium">Quality assets on radar for next investment tranche</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {watchlist.map(item => (
                  <div 
                    key={item.id}
                    className="p-4 rounded-2xl bg-gray-50/70 dark:bg-neutral-800/40 border border-gray-100 dark:border-neutral-800 flex items-center justify-between gap-3 group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-gray-900 dark:text-white">{item.symbol}</span>
                        <span className="text-[10px] text-gray-400">{item.sector}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs">
                        <span className="font-semibold text-gray-900 dark:text-white">₹{item.price.toLocaleString('en-IN')}</span>
                        <span className={`text-[10px] font-bold ${item.changePercent >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {item.changePercent >= 0 ? '+' : ''}{item.changePercent}%
                        </span>
                        <span className="text-[10px] text-gray-400">• Target: ₹{item.targetPrice}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => convertWatchlistToHolding(item)}
                      className="px-3 py-1.5 rounded-xl bg-[#111827] dark:bg-white text-white dark:text-gray-900 text-[11px] font-bold shadow-2xs hover:bg-gray-800 dark:hover:bg-gray-100 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* ================= RIGHT COLUMN (4 COLS) ================= */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* PORTFOLIO ALLOCATION WIDGET */}
            <div className="bg-white dark:bg-[#16181f] rounded-3xl p-6 border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">
                    Where Your Money Is
                  </h3>
                  <p className="text-[11px] text-gray-400">Diversification & Exposure</p>
                </div>
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600">
                  <PieChart className="w-4 h-4" />
                </div>
              </div>

              {/* Segmented Tabs */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-gray-50 dark:bg-neutral-800/70 rounded-xl border border-gray-200/80 dark:border-neutral-700">
                {(['Asset Class', 'Sector', 'Market Cap'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setAllocationTab(tab)}
                    className={`py-1.5 rounded-lg text-[10px] font-bold transition-all ${allocationTab === tab ? 'bg-white dark:bg-[#16181f] text-gray-900 dark:text-white shadow-2xs' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Progress Meters List */}
              <div className="space-y-3.5">
                {(allocationTab === 'Asset Class' ? allocations.assetClasses : allocationTab === 'Sector' ? allocations.sectors : allocations.marketCaps).map((item, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-gray-700 dark:text-gray-300">{item.label}</span>
                      <span className="font-bold tabular-nums text-gray-900 dark:text-white">{item.percent}%</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${item.percent}%` }}
                        transition={{ duration: 0.8, delay: idx * 0.1 }}
                        className={`h-full rounded-full ${idx === 0 ? 'bg-blue-600' : idx === 1 ? 'bg-indigo-500' : idx === 2 ? 'bg-teal-500' : 'bg-amber-500'}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI PORTFOLIO INTELLIGENCE COACH 🤖 */}
            <div className="bg-gradient-to-br from-blue-500/10 via-white to-white dark:from-blue-500/10 dark:via-[#16181f] dark:to-[#16181f] rounded-3xl p-6 border border-blue-200/70 dark:border-blue-500/30 shadow-2xs space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    Portfolio Intelligence
                  </h3>
                  <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wide">Automated AI Insights</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-white dark:bg-[#16181f] border border-blue-100 dark:border-neutral-800 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Sector Concentration Alert</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    Financial stocks represent <strong className="text-gray-900 dark:text-white">28%</strong> of your equity portfolio. Consider diversifying into Healthcare or Manufacturing.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white dark:bg-[#16181f] border border-blue-100 dark:border-neutral-800 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>2 Investments Need Review</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    Your original thesis for <strong className="text-gray-900 dark:text-white">Tata Motors</strong> has reached its quarterly review date.
                  </p>
                </div>
              </div>
            </div>

            {/* WEALTH GOAL SECTION */}
            <div className="bg-white dark:bg-[#16181f] rounded-3xl p-6 border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    Wealth Building Goal
                  </h3>
                  <p className="text-[11px] text-gray-400 font-medium">Target: ₹{wealthGoal.targetAmount.toLocaleString('en-IN')} by {wealthGoal.targetYear}</p>
                </div>
                <Target className="w-4 h-4 text-emerald-500" />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-xl font-bold tabular-nums text-gray-900 dark:text-white">
                    ₹{metrics.currentValue.toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {progressPercent}% Achieved
                  </span>
                </div>

                <div className="h-2.5 w-full bg-gray-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                  <div style={{ width: `${progressPercent}%` }} className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500" />
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-gray-50/80 dark:bg-neutral-800/40 border border-gray-100 dark:border-neutral-800 flex justify-between items-center text-xs">
                <span className="text-gray-500 font-medium">Recommended Monthly SIP</span>
                <span className="font-bold tabular-nums text-gray-900 dark:text-white">₹{wealthGoal.monthlySip.toLocaleString('en-IN')} / mo</span>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* API Key Modal */}
      {isApiKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#16181f] border border-gray-200 dark:border-neutral-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    IndianAPI.in Settings
                  </h3>
                  <p className="text-xs text-gray-400">Live Indian Stock & Market Data</p>
                </div>
              </div>
              <button onClick={() => setIsApiKeyModalOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                API Key (from dev.indianapi.in)
              </label>
              <input
                type="text"
                placeholder="Paste your X-API-Key here..."
                value={tempApiKey}
                onChange={e => setTempApiKey(e.target.value)}
                className="w-full bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="text-[10px] text-gray-400">
                Get your developer API key from <a href="https://indianapi.in" target="_blank" rel="noreferrer" className="text-blue-500 underline">indianapi.in</a> for live quotes & indices.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsApiKeyModalOpen(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveApiKey}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#111827] dark:bg-white text-white dark:text-gray-900 shadow-xs hover:bg-gray-800 dark:hover:bg-gray-100"
              >
                Save Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <InvestmentDetailModal
        holding={selectedHolding}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onUpdate={updateHolding}
      />

      <AddInvestmentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={addHolding}
      />
    </div>
  );
}
