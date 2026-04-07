import React, { useState, useMemo } from "react";
import { TopBar } from "../lib/TopBar";
import { useTrades } from "../hooks/useTrades";
import { useAccountContext } from "../contexts/AccountContext";
import { TradeModal } from "../components/TradeModal";
import { Plus, ChevronDown, Calendar, Trash2, Tag, X, CheckSquare, Square } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getTradeDate, parseDurationToMinutes, formatMinutesToDuration } from "../lib/timeUtils";

export function Trades() {
  const { trades: allTrades, loading, addTrade, deleteTrades, updateTrades } = useTrades();
  const { selectedAccountId, accounts } = useAccountContext();
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<any>(null);
  const [selectedTradeIds, setSelectedTradeIds] = useState<string[]>([]);
  const [isTagging, setIsTagging] = useState(false);
  const [newTag, setNewTag] = useState("");
  
  const [filterSymbol, setFilterSymbol] = useState("ALL");
  const [filterAction, setFilterAction] = useState("ALL");
  const [filterTradeType, setFilterTradeType] = useState("ALL");
  const [filterStrategy, setFilterStrategy] = useState("ALL");
  const [filterRange, setFilterRange] = useState("30D");

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

  return (
    <div className="flex flex-col min-h-full pb-10 relative">
      <TopBar 
        title="Trades" 
        subtitle="Market Execution History" 
        showSearch={true}
        actionButton={
          <button 
            onClick={handleOpenNewTrade}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-background px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)]"
          >
            <Plus className="w-4 h-4" />
            ADD TRADE
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
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-[#1a1a24] border border-primary/30 px-6 py-4 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl"
          >
            <div className="flex items-center gap-3 pr-4 border-r border-white/10">
              <span className="text-primary font-bold text-sm">{selectedTradeIds.length}</span>
              <span className="text-gray-400 text-xs uppercase tracking-wider font-bold">Selected</span>
            </div>

            <div className="flex items-center gap-2">
              {isTagging ? (
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="NEW TAG..."
                    className="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary/50 w-32"
                    autoFocus
                  />
                  <button 
                    onClick={handleBulkTag}
                    className="p-2 bg-primary text-background rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    <Tag className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setIsTagging(false)}
                    className="p-2 hover:bg-white/5 rounded-lg text-gray-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsTagging(true)}
                  className="flex items-center gap-2 px-4 py-2 hover:bg-white/5 rounded-xl text-gray-300 transition-colors text-xs font-bold"
                >
                  <Tag className="w-4 h-4 text-primary" />
                  TAG
                </button>
              )}

              <button 
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-4 py-2 hover:bg-[#E5534B]/10 rounded-xl text-[#E5534B] transition-colors text-xs font-bold"
              >
                <Trash2 className="w-4 h-4" />
                DELETE
              </button>

              <button 
                onClick={() => setSelectedTradeIds([])}
                className="p-2 hover:bg-white/5 rounded-xl text-gray-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="px-4 md:px-8 flex flex-col gap-6">
        
        <div className="glass-card rounded-2xl p-6 flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Symbol Filter */}
              <div className="relative group">
                <select
                  value={filterSymbol}
                  onChange={(e) => setFilterSymbol(e.target.value)}
                  className="appearance-none bg-white/5 group-hover:bg-white/10 border border-white/10 rounded-full pl-[4.5rem] pr-8 py-2 type-micro text-[#A7A7A7] cursor-pointer transition-colors focus:outline-none focus:border-primary/50"
                >
                  <option value="ALL" className="bg-[#1a1a24]">All Pairs</option>
                  {uniqueSymbols.map(sym => (
                    <option key={sym} value={sym} className="bg-[#1a1a24]">{sym}</option>
                  ))}
                </select>
                <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none type-label text-[10px]">Symbol</span>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
              </div>

              {/* Action Filter */}
              <div className="relative group">
                <select
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
                  className="appearance-none bg-white/5 group-hover:bg-white/10 border border-white/10 rounded-full pl-[3.5rem] pr-8 py-2 type-micro text-[#A7A7A7] cursor-pointer transition-colors focus:outline-none focus:border-primary/50"
                >
                  <option value="ALL" className="bg-[#1a1a24]">Any</option>
                  <option value="BUY" className="bg-[#1a1a24]">Buy</option>
                  <option value="SELL" className="bg-[#1a1a24]">Sell</option>
                </select>
                <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none type-label text-[10px]">Type</span>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
              </div>

              {/* Trade Type Filter */}
              <div className="relative group">
                <select
                  value={filterTradeType}
                  onChange={(e) => setFilterTradeType(e.target.value)}
                  className="appearance-none bg-white/5 group-hover:bg-white/10 border border-white/10 rounded-full pl-[5.5rem] pr-8 py-2 type-micro text-[#A7A7A7] cursor-pointer transition-colors focus:outline-none focus:border-primary/50"
                >
                  <option value="ALL" className="bg-[#1a1a24]">All Types</option>
                  {uniqueTags.map(tag => (
                    <option key={tag} value={tag} className="bg-[#1a1a24]">{tag}</option>
                  ))}
                </select>
                <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none type-label text-[10px]">Trade Type</span>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
              </div>

              {/* Strategy Filter */}
              <div className="relative group">
                <select
                  value={filterStrategy}
                  onChange={(e) => setFilterStrategy(e.target.value)}
                  className="appearance-none bg-white/5 group-hover:bg-white/10 border border-white/10 rounded-full pl-[5rem] pr-8 py-2 type-micro text-[#A7A7A7] cursor-pointer transition-colors focus:outline-none focus:border-primary/50"
                >
                  <option value="ALL" className="bg-[#1a1a24]">All Strategies</option>
                  {uniqueStrategies.map(strategy => (
                    <option key={strategy} value={strategy} className="bg-[#1a1a24]">{strategy}</option>
                  ))}
                </select>
                <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none type-label text-[10px]">Strategy</span>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
              </div>

              {/* Date Range Filter */}
              <div className="relative group">
                <select
                  value={filterRange}
                  onChange={(e) => setFilterRange(e.target.value)}
                  className="appearance-none bg-white/5 group-hover:bg-white/10 border border-white/10 rounded-full pl-[4.5rem] pr-8 py-2 type-micro text-[#A7A7A7] cursor-pointer transition-colors focus:outline-none focus:border-primary/50"
                >
                  <option value="7D" className="bg-[#1a1a24]">Last 7 Days</option>
                  <option value="30D" className="bg-[#1a1a24]">Last 30 Days</option>
                  <option value="90D" className="bg-[#1a1a24]">Last 90 Days</option>
                  <option value="ALL" className="bg-[#1a1a24]">All Time</option>
                </select>
                <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none type-label text-[10px]">Range</span>
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="type-label text-[10px] border-b border-white/5">
                  <th className="pb-4 pl-4 w-10">
                    <button 
                      onClick={toggleSelectAll}
                      className="p-1 hover:bg-white/5 rounded transition-colors"
                    >
                      {selectedTradeIds.length === (trades || []).length && (trades || []).length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-primary" />
                      ) : (
                        <Square className="w-4 h-4 text-[#6A6A6A]" />
                      )}
                    </button>
                  </th>
                  <th className="pb-4">#</th>
                  <th className="pb-4">Date/Time</th>
                  <th className="pb-4">Symbol</th>
                  <th className="pb-4">Type</th>
                  <th className="pb-4">Entry</th>
                  <th className="pb-4">Exit</th>
                  <th className="pb-4">Lots</th>
                  <th className="pb-4">Session</th>
                  <th className="pb-4">Conf.</th>
                  <th className="pb-4">P&L</th>
                  <th className="pb-4">Duration</th>
                  <th className="pb-4 pr-4">Tag</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-gray-500">Loading trades...</td>
                  </tr>
                ) : (trades || []).length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-gray-500">No trades found for this account.</td>
                  </tr>
                ) : (
                  (trades || []).map((trade, index) => {
                    const isSelected = selectedTradeIds.includes(trade.id);
                    return (
                      <tr 
                        key={trade.id} 
                        className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors group cursor-pointer ${isSelected ? 'bg-primary/5' : ''}`}
                        onClick={() => handleOpenEditTrade(trade)}
                      >
                        <td className="py-4 pl-4" onClick={(e) => toggleSelectTrade(trade.id, e)}>
                          <button 
                            className="p-1 hover:bg-white/5 rounded transition-colors"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-primary" />
                            ) : (
                              <Square className="w-4 h-4 text-gray-600" />
                            )}
                          </button>
                        </td>
                        <td className="py-4 text-[#6A6A6A] text-[12px] tnum">{trades.length - index}</td>
                        <td className="py-4 text-[#A7A7A7] text-[12px] tnum">
                          {getTradeDate(trade.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                          <span className="opacity-40 ml-1">
                            {getTradeDate(trade.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                        <td className="py-4 type-h2 text-[13px] text-white">{trade.symbol}</td>
                        <td className="py-4">
                          <span className={`px-2 py-0.5 rounded type-micro text-[10px] ${trade.action === 'BUY' ? 'bg-[#1ED760]/20 text-[#1ED760]' : 'bg-[#E5534B]/20 text-[#E5534B]'}`}>
                            {trade.action}
                          </span>
                        </td>
                        <td className="py-4 text-[#A7A7A7] tnum text-[12px]">{trade.entry || "0.0000"}</td>
                        <td className="py-4 text-[#A7A7A7] tnum text-[12px]">{trade.exit || "0.0000"}</td>
                        <td className="py-4 text-[#A7A7A7] tnum text-[12px]">{trade.size.replace(' Lot', '')}</td>
                        <td className="py-4 type-micro text-[10px] text-[#6A6A6A]">{trade.session || "Else"}</td>
                        <td className="py-4">
                          <span className={`px-1.5 py-0.5 rounded type-micro text-[9px] ${
                            trade.confidence === 'High' ? 'bg-[#1ED760]/10 text-[#1ED760] border border-[#1ED760]/20' : 
                            trade.confidence === 'Medium' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : 
                            'bg-[#E5534B]/10 text-[#E5534B] border border-[#E5534B]/20'
                          }`}>
                            {trade.confidence || "High"}
                          </span>
                        </td>
                        <td className={`py-4 tnum font-bold text-[13px] ${trade.isPositive ? 'text-[#1ED760]' : 'text-[#E5534B]'}`}>
                          {formatCurrency(trade.pnl)}
                        </td>
                        <td className="py-4 text-[#6A6A6A] text-[12px]">{trade.duration || "1h 30m"}</td>
                        <td className="py-4 pr-4">
                          <div className="flex flex-wrap gap-1">
                            {trade.tags && Array.isArray(trade.tags) && trade.tags.length > 0 ? (
                              trade.tags.map((tag: string) => (
                                <span key={tag} className="px-2 py-0.5 rounded border border-white/10 type-micro text-[10px] text-[#6A6A6A]">
                                  {tag}
                                </span>
                              ))
                            ) : (
                              <span className="px-2 py-0.5 rounded border border-white/10 type-micro text-[10px] text-[#6A6A6A]">
                                {trade.tag || "BREAKOUT"}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Dots */}
          <div className="flex justify-center gap-2 mt-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-white/20"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-white/20"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-white/20"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-white/20"></div>
          </div>
        </div>

        {/* Summary Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card p-5 rounded-2xl flex flex-col justify-between">
            <p className="type-label mb-2">Total P&L (Monthly)</p>
            <h2 className={`type-metric ${stats.totalPnl >= 0 ? 'text-[#1ED760]' : 'text-[#E5534B]'}`}>
              {formatCurrency(stats.totalPnl)}
            </h2>
          </div>
          
          <div className="glass-card p-5 rounded-2xl flex flex-col justify-between">
            <p className="type-label mb-2">Win Rate</p>
            <h2 className="type-metric text-[#1ED760]">
              {stats.winRate.toFixed(1)}%
            </h2>
          </div>

          <div className="glass-card p-5 rounded-2xl flex flex-col justify-between">
            <p className="type-label mb-2">Avg. Duration</p>
            <h2 className="type-metric text-white">
              {stats.avgDuration}
            </h2>
          </div>

          <div className="glass-card p-5 rounded-2xl flex flex-col justify-between">
            <p className="type-label mb-2">Total Trades</p>
            <h2 className="type-metric text-[#1ED760]">
              {stats.totalTrades}
            </h2>
          </div>
        </div>
      </div>
    </div>
  );
}
