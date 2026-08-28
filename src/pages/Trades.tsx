import React, { useState, useMemo } from "react";
import { TopBar } from "../lib/TopBar";
import { useTrades } from "../hooks/useTrades";
import { useAccountContext } from "../contexts/AccountContext";
import { TradeModal } from "../components/TradeModal";
import { Plus, ChevronDown, Calendar, Trash2, Tag, X, CheckSquare, Square, Layers } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getTradeDate, parseDurationToMinutes, formatMinutesToDuration } from "../lib/timeUtils";
import { Skeleton } from "../components/ui/Skeleton";
import { SmartEmptyState } from "../components/ui/SmartEmptyState";

export function Trades() {
  const { trades: allTrades, loading, addTrade, deleteTrades, updateTrades } = useTrades();
  const { selectedAccountId, accounts } = useAccountContext();
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<any>(null);
  const [selectedTradeIds, setSelectedTradeIds] = useState<string[]>([]);
  const [isTagging, setIsTagging] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [isCommissioning, setIsCommissioning] = useState(false);
  const [bulkCommission, setBulkCommission] = useState("");
  
  const [filterSymbol, setFilterSymbol] = useState("ALL");
  const [filterAction, setFilterAction] = useState("ALL");
  const [filterTradeType, setFilterTradeType] = useState("ALL");
  const [filterStrategy, setFilterStrategy] = useState("ALL");
  const [filterRange, setFilterRange] = useState("ALL");

  // Listen to global 'N' key shortcut
  React.useEffect(() => {
    const handleOpenModal = () => {
      setEditingTrade(null);
      setIsTradeModalOpen(true);
    };
    window.addEventListener('openNewTradeModal', handleOpenModal);
    return () => window.removeEventListener('openNewTradeModal', handleOpenModal);
  }, []);

  const uniqueSymbols = useMemo(() => {
    const symbols = new Set<string>();
    allTrades.forEach(t => symbols.add(t.symbol));
    return Array.from(symbols).sort();
  }, [allTrades]);

  const uniqueTags = useMemo(() => {
    const tags = new Set<string>();
    allTrades.forEach(t => {
      if (t.tags && Array.isArray(t.tags)) {
        t.tags.forEach(tag => tags.add(tag));
      } else if (t.tag) {
        tags.add(t.tag);
      }
    });
    return Array.from(tags).sort();
  }, [allTrades]);

  const uniqueStrategies = useMemo(() => {
    const strategies = new Set<string>();
    allTrades.forEach(t => {
      if (t.strategy) strategies.add(t.strategy);
    });
    return Array.from(strategies).sort();
  }, [allTrades]);


  const trades = useMemo(() => {
    let filtered = allTrades;
    if (selectedAccountId) {
      filtered = filtered.filter(t => t.accountId === selectedAccountId);
    }
    if (filterSymbol !== "ALL") {
      filtered = filtered.filter(t => t.symbol === filterSymbol);
    }
    if (filterAction !== "ALL") {
      filtered = filtered.filter(t => t.action === filterAction);
    }
    if (filterTradeType !== "ALL") {
      filtered = filtered.filter(t => {
        if (t.tags && Array.isArray(t.tags)) {
          return t.tags.includes(filterTradeType);
        }
        return (t.tag || "BREAKOUT") === filterTradeType;
      });
    }
    if (filterStrategy !== "ALL") {
      filtered = filtered.filter(t => t.strategy === filterStrategy);
    }
    
    // Apply Date Range Filter
    if (filterRange !== "ALL") {
      const now = new Date();
      const rangeDays = filterRange === "7D" ? 7 : filterRange === "30D" ? 30 : 90;
      const cutoffDate = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000);
      
      filtered = filtered.filter(t => {
        const tradeDate = getTradeDate(t.date);
        return tradeDate >= cutoffDate;
      });
    }

    // Sort by actual trade date (newest first)
    return [...filtered].sort((a, b) => getTradeDate(b.date).getTime() - getTradeDate(a.date).getTime());
  }, [allTrades, selectedAccountId, filterSymbol, filterAction, filterTradeType, filterStrategy, filterRange]);

  const stats = useMemo(() => {
    const total = trades.length;
    const wins = trades.filter(t => t.isPositive).length;
    const losses = total - wins;
    const winRate = total > 0 ? (wins / total) * 100 : 0;
    const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
    
    // Calculate REAL average duration
    const tradesWithDuration = trades.filter(t => t.duration && t.duration !== "—");
    let avgDuration = "—";
    
    if (tradesWithDuration.length > 0) {
      const totalMinutes = tradesWithDuration.reduce((sum, t) => sum + parseDurationToMinutes(t.duration || ""), 0);
      avgDuration = formatMinutesToDuration(totalMinutes / tradesWithDuration.length);
    }
    
    return { total, wins, losses, winRate, totalPnl, avgDuration, totalTrades: total };
  }, [trades]);

  const formatCurrency = (val: number) => { 
    const absVal = Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return val >= 0 ? `+$${absVal}` : `-$${absVal}`;
  };

  const handleTradeSubmit = async (tradeData: any) => {
    if (editingTrade) {
      // Update existing trade — only send safe, updatable fields
      const { id } = tradeData;
      const cleanUpdates: Record<string, any> = {};
      const allowedFields = ['accountId','symbol','action','size','entry','exit','pnl','result','isPositive','session','confidence','duration','tags','tag','strategy'];
      for (const key of allowedFields) {
        if (tradeData[key] !== undefined) {
          cleanUpdates[key] = tradeData[key];
        }
      }
      await updateTrades([id], cleanUpdates);
      setEditingTrade(null);
    } else {
      // Add new trade
      await addTrade({
        accountId: tradeData.accountId,
        date: tradeData.date,
        symbol: tradeData.symbol,
        action: tradeData.action,
        size: tradeData.size,
        result: tradeData.result,
        isPositive: tradeData.isPositive,
        pnl: tradeData.pnl,
        entry: tradeData.entry || "",
        exit: tradeData.exit || "",
        duration: tradeData.duration || "",
        tag: tradeData.tag || "",
        tags: tradeData.tags || [],
        session: tradeData.session || "Else",
        confidence: tradeData.confidence || "High"
      });
    }
  };

  const handleOpenNewTrade = () => {
    setEditingTrade(null);
    setIsTradeModalOpen(true);
  };

  const handleOpenEditTrade = (trade: any) => {
    setEditingTrade(trade);
    setIsTradeModalOpen(true);
  };

  const toggleSelectAll = () => {
    if (selectedTradeIds.length === (trades || []).length && (trades || []).length > 0) {
      setSelectedTradeIds([]);
    } else {
      setSelectedTradeIds((trades || []).map(t => t.id));
    }
  };

  const toggleSelectTrade = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (selectedTradeIds.includes(id)) {
      setSelectedTradeIds(selectedTradeIds.filter(i => i !== id));
    } else {
      setSelectedTradeIds([...selectedTradeIds, id]);
    }
  };

  const handleBulkDelete = async () => {
    // Using a simpler confirmation or just performing the action for now to avoid iframe issues
    await deleteTrades(selectedTradeIds);
    setSelectedTradeIds([]);
  };

  const handleBulkClub = async () => {
    if (selectedTradeIds.length < 2) return;

    const selectedTrades = allTrades.filter(t => selectedTradeIds.includes(t.id));
    if (selectedTrades.length === 0) return;

    // Sort to find the oldest trade to use as base (preserve ID, date)
    const sortedTrades = [...selectedTrades].sort((a, b) => getTradeDate(a.date).getTime() - getTradeDate(b.date).getTime());
    const baseTrade = sortedTrades[0];
    const tradeIdsToDelete = sortedTrades.slice(1).map(t => t.id);

    let totalPnl = 0;
    let totalSize = 0;
    let weightedEntrySum = 0;
    let weightedExitSum = 0;

    selectedTrades.forEach(t => {
      totalPnl += t.pnl || 0;
      
      const sizeVal = parseFloat((t.size || "0").replace(/[^\d.]/g, '')) || 0;
      totalSize += sizeVal;
      
      weightedEntrySum += (parseFloat(t.entry || "0") || 0) * sizeVal;
      weightedExitSum += (parseFloat(t.exit || "0") || 0) * sizeVal;
    });

    const avgEntry = totalSize > 0 ? (weightedEntrySum / totalSize).toFixed(5) : "";
    const avgExit = totalSize > 0 ? (weightedExitSum / totalSize).toFixed(5) : "";

    const cleanUpdates: Record<string, any> = {
      pnl: parseFloat(totalPnl.toFixed(2)),
      size: `${totalSize.toFixed(2)} Lot`,
      entry: avgEntry,
      exit: avgExit,
      isPositive: totalPnl >= 0,
      result: totalPnl >= 0 ? 'WIN' : 'LOSS'
    };

    // Update the base trade and delete the rest
    await updateTrades([baseTrade.id], cleanUpdates);
    
    if (tradeIdsToDelete.length > 0) {
      await deleteTrades(tradeIdsToDelete);
    }
    
    setSelectedTradeIds([]);
  };

  const handleBulkTag = async () => {
    if (newTag.trim()) {
      const tagToAdd = newTag.trim().toUpperCase();
      
      // For each selected trade, add the tag to its tags array
      for (const id of selectedTradeIds) {
        const trade = allTrades.find(t => t.id === id);
        if (trade) {
          const currentTags = trade.tags || (trade.tag ? [trade.tag] : []);
          if (!currentTags.includes(tagToAdd)) {
            const updatedTags = [...currentTags, tagToAdd];
            await updateTrades([id], { 
              tags: updatedTags,
              tag: updatedTags[0] // Keep legacy tag field updated
            });
          }
        }
      }
      
      setSelectedTradeIds([]);
      setIsTagging(false);
      setNewTag("");
    }
  };

  const handleBulkCommission = async () => {
    if (bulkCommission.trim()) {
      const commValue = parseFloat(bulkCommission) || 0;
      
      for (const id of selectedTradeIds) {
        const trade = allTrades.find(t => t.id === id);
        if (trade) {
          const currentPnl = Number(trade.pnl) || 0;
          // Commission is an expense, so we subtract its absolute value from the P&L
          const newPnl = currentPnl - Math.abs(commValue);
          const isPositive = newPnl >= 0;
          
          await updateTrades([id], { 
            pnl: parseFloat(newPnl.toFixed(2)),
            result: `${isPositive ? '+' : '-'}$${Math.abs(newPnl).toFixed(2)}`,
            isPositive: isPositive
          });
        }
      }
      
      setSelectedTradeIds([]);
      setIsCommissioning(false);
      setBulkCommission("");
    }
  };

  return (
    <div className="flex flex-col min-h-full pb-10">
      <TopBar 
        title="Trades" 
        subtitle="Market Execution History" 
        showSearch={true}
        actionButton={
          <button 
            onClick={handleOpenNewTrade}
            className="flex items-center gap-1.5 sm:gap-2 bg-[#111827] dark:bg-white text-white dark:text-gray-900 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-2xl font-semibold text-xs transition-all shadow-xs hover:bg-black dark:hover:bg-gray-100 group"
          >
            <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">Log Trade</span>
          </button>
        }
      />
      
      <TradeModal 
        isOpen={isTradeModalOpen} 
        onClose={() => {
          setIsTradeModalOpen(false);
          setEditingTrade(null);
        }} 
        onSubmit={handleTradeSubmit}
        trade={editingTrade}
      />

      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {selectedTradeIds.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[110] flex items-center gap-4 bg-white/95 dark:bg-[#16181f]/95 border border-gray-200/90 dark:border-neutral-700 px-6 py-3.5 rounded-2xl shadow-xl backdrop-blur-xl"
          >
            <div className="flex items-center gap-3 pr-4 border-r border-gray-200 dark:border-neutral-700">
              <span className="text-blue-600 font-bold text-sm tabular-nums">{selectedTradeIds.length}</span>
              <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Selected</span>
            </div>

            <div className="flex items-center gap-2">
              {isTagging ? (
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="NEW TAG..."
                    className="bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl px-3 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-32"
                    autoFocus
                  />
                  <button 
                    onClick={handleBulkTag}
                    className="p-2 bg-[#111827] dark:bg-white text-white dark:text-gray-900 rounded-xl hover:bg-black transition-colors"
                  >
                    <Tag className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setIsTagging(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-xl text-gray-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsTagging(true)}
                  className="flex items-center gap-2 p-2 sm:px-3.5 sm:py-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-xl text-gray-700 dark:text-gray-300 transition-colors text-xs font-semibold"
                >
                  <Tag className="w-4 h-4 text-blue-500" />
                  <span className="hidden sm:inline">Tag</span>
                </button>
              )}

              {isCommissioning ? (
                <div className="flex items-center gap-2 ml-2 border-l border-gray-200 dark:border-neutral-700 pl-2">
                  <input 
                    type="number" 
                    step="0.01"
                    value={bulkCommission}
                    onChange={(e) => setBulkCommission(e.target.value)}
                    placeholder="COMM (-$)..."
                    className="bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl px-3 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-28 tabular-nums"
                    autoFocus
                  />
                  <button 
                    onClick={handleBulkCommission}
                    className="p-2 bg-[#111827] dark:bg-white text-white dark:text-gray-900 rounded-xl hover:bg-black transition-colors text-[10px] font-bold"
                  >
                    Set
                  </button>
                  <button 
                    onClick={() => setIsCommissioning(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-xl text-gray-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsCommissioning(true)}
                  className="flex items-center gap-2 p-2 sm:px-3.5 sm:py-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-xl text-gray-700 dark:text-gray-300 transition-colors text-xs font-semibold"
                >
                  <span className="text-blue-500 font-bold">$</span>
                  <span className="hidden sm:inline">Commission</span>
                </button>
              )}

              {selectedTradeIds.length > 1 && (
                <button 
                  onClick={handleBulkClub}
                  className="flex items-center gap-2 p-2 sm:px-3.5 sm:py-2 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-xl text-amber-600 dark:text-amber-400 transition-colors text-xs font-semibold"
                >
                  <Layers className="w-4 h-4" />
                  <span className="hidden sm:inline">Club</span>
                </button>
              )}

              <button 
                onClick={handleBulkDelete}
                className="flex items-center gap-2 p-2 sm:px-3.5 sm:py-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl text-rose-600 dark:text-rose-400 transition-colors text-xs font-semibold"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Delete</span>
              </button>

              <button 
                onClick={() => setSelectedTradeIds([])}
                className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-xl text-gray-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="p-3.5 sm:p-6 md:p-8 space-y-5 sm:space-y-7 max-w-[1600px] w-full mx-auto">
        
        {/* Main Trades Table Card */}
        <div className="bg-white dark:bg-[#16181f] rounded-3xl p-4 sm:p-6 md:p-7 border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs flex flex-col gap-5 sm:gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Executed Trades Log
              </h2>
              <p className="text-xs font-normal text-gray-400 mt-0.5">
                Filter and inspect closed & open trades
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Symbol Filter */}
              <div className="relative">
                <select
                  value={filterSymbol}
                  onChange={(e) => setFilterSymbol(e.target.value)}
                  className="appearance-none btn-secondary pl-3 pr-8 py-2 text-xs cursor-pointer focus:outline-none"
                >
                  <option value="ALL">All Pairs</option>
                  {uniqueSymbols.map(sym => (
                    <option key={sym} value={sym}>{sym}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>

              {/* Action Filter */}
              <div className="relative">
                <select
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
                  className="appearance-none btn-secondary pl-3 pr-8 py-2 text-xs cursor-pointer focus:outline-none"
                >
                  <option value="ALL">Any Action</option>
                  <option value="BUY">Buy</option>
                  <option value="SELL">Sell</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>

              {/* Strategy Filter */}
              <div className="relative">
                <select
                  value={filterStrategy}
                  onChange={(e) => setFilterStrategy(e.target.value)}
                  className="appearance-none btn-secondary pl-3 pr-8 py-2 text-xs cursor-pointer focus:outline-none"
                >
                  <option value="ALL">All Strategies</option>
                  {uniqueStrategies.map(strategy => (
                    <option key={strategy} value={strategy}>{strategy}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>

              {/* Date Range Filter */}
              <div className="relative">
                <select
                  value={filterRange}
                  onChange={(e) => setFilterRange(e.target.value)}
                  className="appearance-none btn-secondary pl-3 pr-8 py-2 text-xs cursor-pointer focus:outline-none"
                >
                  <option value="7D">Last 7 Days</option>
                  <option value="30D">Last 30 Days</option>
                  <option value="90D">Last 90 Days</option>
                  <option value="ALL">All Time</option>
                </select>
                <Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>

              {/* Log Trade Button */}
              <button
                onClick={() => {
                  setEditingTrade(null);
                  setIsTradeModalOpen(true);
                }}
                className="btn-primary"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Log Trade</span>
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-neutral-800">
                  <th className="pb-3 pl-2 w-10">
                    <button 
                      onClick={toggleSelectAll}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                    >
                      {selectedTradeIds.length === (trades || []).length && (trades || []).length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </th>
                  <th className="pb-3 font-semibold">#</th>
                  <th className="pb-3 font-semibold">Date & Time</th>
                  <th className="pb-3 font-semibold">Symbol</th>
                  <th className="pb-3 font-semibold">Side</th>
                  <th className="pb-3 font-semibold">Entry</th>
                  <th className="pb-3 font-semibold">Exit</th>
                  <th className="pb-3 font-semibold">Volume</th>
                  <th className="pb-3 font-semibold">Session</th>
                  <th className="pb-3 font-semibold">Conf.</th>
                  <th className="pb-3 font-semibold">Result P&L</th>
                  <th className="pb-3 font-semibold pr-2">Strategy / Tags</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-neutral-800/40 text-xs">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="py-4 pl-2"><Skeleton className="w-4 h-4 rounded" /></td>
                      <td className="py-4"><Skeleton className="w-6 h-4 rounded" /></td>
                      <td className="py-4"><Skeleton className="w-20 h-4 rounded" /></td>
                      <td className="py-4"><Skeleton className="w-16 h-4 rounded" /></td>
                      <td className="py-4"><Skeleton className="w-12 h-5 rounded-full" /></td>
                      <td className="py-4"><Skeleton className="w-12 h-4 rounded" /></td>
                      <td className="py-4"><Skeleton className="w-16 h-4 rounded" /></td>
                      <td className="py-4"><Skeleton className="w-16 h-4 rounded" /></td>
                      <td className="py-4"><Skeleton className="w-14 h-4 rounded" /></td>
                      <td className="py-4"><Skeleton className="w-16 h-4 rounded" /></td>
                      <td className="py-4"><Skeleton className="w-16 h-4 rounded" /></td>
                      <td className="py-4"><Skeleton className="w-20 h-4 rounded" /></td>
                    </tr>
                  ))
                ) : (trades || []).length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-8 text-center">
                      <SmartEmptyState 
                        title="No trades found matching current filter"
                        description="Try resetting your filters or log a new execution for this account."
                        actionLabel="Log New Trade (N)"
                        onAction={() => { setEditingTrade(null); setIsTradeModalOpen(true); }}
                        className="border-none shadow-none bg-transparent"
                      />
                    </td>
                  </tr>
                ) : (
                  (trades || []).map((trade, index) => {
                    const isSelected = selectedTradeIds.includes(trade.id);
                    const isPos = trade.isPositive || Number(trade.pnl) >= 0;
                    return (
                      <tr 
                        key={trade.id} 
                        className={`hover:bg-gray-50/70 dark:hover:bg-neutral-800/40 transition-colors group cursor-pointer ${isSelected ? 'bg-blue-50/60 dark:bg-blue-950/20' : ''}`}
                        onClick={() => handleOpenEditTrade(trade)}
                      >
                        <td className="py-3.5 pl-2" onClick={(e) => toggleSelectTrade(trade.id, e)}>
                          <button className="p-1 hover:bg-gray-200 dark:hover:bg-neutral-700 rounded-lg transition-colors">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            ) : (
                              <Square className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                            )}
                          </button>
                        </td>
                        <td className="py-3.5 text-gray-400 tabular-nums">{trades.length - index}</td>
                        <td className="py-3.5 text-gray-500 dark:text-gray-400 font-normal tabular-nums">
                          {getTradeDate(trade.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="py-3.5 font-semibold text-gray-900 dark:text-white">{trade.symbol}</td>
                        <td className="py-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${trade.action === 'BUY' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'}`}>
                            {trade.action}
                          </span>
                        </td>
                        <td className="py-3.5 text-gray-600 dark:text-gray-300 tabular-nums">{trade.entry || "—"}</td>
                        <td className="py-3.5 text-gray-600 dark:text-gray-300 tabular-nums">{trade.exit || "—"}</td>
                        <td className="py-3.5 text-gray-600 dark:text-gray-300 tabular-nums">{trade.size}</td>
                        <td className="py-3.5 text-gray-400 font-medium text-[11px]">{trade.session || "Else"}</td>
                        <td className="py-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            trade.confidence === 'High' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40' : 
                            trade.confidence === 'Medium' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40' : 
                            'bg-rose-50 text-rose-600 dark:bg-rose-950/40'
                          }`}>
                            {trade.confidence || "High"}
                          </span>
                        </td>
                        <td className={`py-3.5 font-bold tabular-nums ${isPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                          {formatCurrency(trade.pnl)}
                        </td>
                        <td className="py-3.5 pr-2">
                          <div className="flex flex-wrap gap-1">
                            {trade.strategy && (
                              <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[10px] font-semibold">
                                {trade.strategy}
                              </span>
                            )}
                            {trade.tags && Array.isArray(trade.tags) && trade.tags.map((tag: string) => (
                              <span key={tag} className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-400 text-[10px] font-normal">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-[#16181f] p-5 rounded-3xl border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs flex flex-col justify-between gap-2">
            <p className="text-xs font-medium text-gray-400">Total Net P&L</p>
            <h2 className={`text-2xl font-bold tabular-nums ${stats.totalPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
              {formatCurrency(stats.totalPnl)}
            </h2>
          </div>
          
          <div className="bg-white dark:bg-[#16181f] p-5 rounded-3xl border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs flex flex-col justify-between gap-2">
            <p className="text-xs font-medium text-gray-400">Win Rate</p>
            <h2 className="text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
              {stats.winRate.toFixed(1)}%
            </h2>
          </div>

          <div className="bg-white dark:bg-[#16181f] p-5 rounded-3xl border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs flex flex-col justify-between gap-2">
            <p className="text-xs font-medium text-gray-400">Avg. Trade Duration</p>
            <h2 className="text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
              {stats.avgDuration}
            </h2>
          </div>

          <div className="bg-white dark:bg-[#16181f] p-5 rounded-3xl border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs flex flex-col justify-between gap-2">
            <p className="text-xs font-medium text-gray-400">Total Executed Trades</p>
            <h2 className="text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
              {stats.totalTrades}
            </h2>
          </div>
        </div>

      </div>
    </div>
  );
}
