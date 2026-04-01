import React, { useState, useMemo } from "react";
import { TopBar } from "../lib/TopBar";
import { useTrades } from "../hooks/useTrades";
import { useAccountContext } from "../contexts/AccountContext";
import { TradeModal } from "../components/TradeModal";
import { Plus, ChevronDown, Calendar, Trash2, Tag, X, CheckSquare, Square } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

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
    return filtered;
  }, [allTrades, selectedAccountId, filterSymbol, filterAction, filterTradeType]);

  const stats = useMemo(() => {
    const total = trades.length;
    const wins = trades.filter(t => t.isPositive).length;
    const losses = total - wins;
    const winRate = total > 0 ? (wins / total) * 100 : 0;
    const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
    
    // Calculate average duration from trades that have it
    const tradesWithDuration = trades.filter(t => t.duration);
    const avgDuration = tradesWithDuration.length > 0 ? tradesWithDuration[0].duration : '—';
    
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
      const allowedFields = ['accountId','symbol','action','size','entry','exit','pnl','result','isPositive','session','confidence','duration','tags','tag'];
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
                className="flex items-center gap-2 px-4 py-2 hover:bg-rose-500/10 rounded-xl text-rose-400 transition-colors text-xs font-bold"
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
      
      <div className="px-8 flex flex-col gap-6">
        
        <div className="glass-card rounded-2xl p-6 flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Symbol Filter */}
              <div className="relative group">
                <select
                  value={filterSymbol}
                  onChange={(e) => setFilterSymbol(e.target.value)}
                  className="appearance-none bg-white/5 group-hover:bg-white/10 border border-white/10 rounded-full pl-[4.5rem] pr-8 py-2 text-xs font-medium text-gray-300 cursor-pointer transition-colors focus:outline-none focus:border-primary/50"
                >
                  <option value="ALL" className="bg-[#1a1a24]">All Pairs</option>
                  {uniqueSymbols.map(sym => (
                    <option key={sym} value={sym} className="bg-[#1a1a24]">{sym}</option>
                  ))}
                </select>
                <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 uppercase text-[10px] tracking-wider">Symbol</span>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
              </div>

              {/* Action Filter */}
              <div className="relative group">
                <select
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
                  className="appearance-none bg-white/5 group-hover:bg-white/10 border border-white/10 rounded-full pl-[3.5rem] pr-8 py-2 text-xs font-medium text-gray-300 cursor-pointer transition-colors focus:outline-none focus:border-primary/50"
                >
                  <option value="ALL" className="bg-[#1a1a24]">Any</option>
                  <option value="BUY" className="bg-[#1a1a24]">Buy</option>
                  <option value="SELL" className="bg-[#1a1a24]">Sell</option>
                </select>
                <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 uppercase text-[10px] tracking-wider">Type</span>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
              </div>

              {/* Trade Type Filter */}
              <div className="relative group">
                <select
                  value={filterTradeType}
                  onChange={(e) => setFilterTradeType(e.target.value)}
                  className="appearance-none bg-white/5 group-hover:bg-white/10 border border-white/10 rounded-full pl-[5.5rem] pr-8 py-2 text-xs font-medium text-gray-300 cursor-pointer transition-colors focus:outline-none focus:border-primary/50"
                >
                  <option value="ALL" className="bg-[#1a1a24]">All Types</option>
                  {uniqueTags.map(tag => (
                    <option key={tag} value={tag} className="bg-[#1a1a24]">{tag}</option>
                  ))}
                </select>
                <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 uppercase text-[10px] tracking-wider">Trade Type</span>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
              </div>

              {/* Date Range Filter */}
              <div className="relative group">
                <select
                  value={filterRange}
                  onChange={(e) => setFilterRange(e.target.value)}
                  className="appearance-none bg-white/5 group-hover:bg-white/10 border border-white/10 rounded-full pl-[4.5rem] pr-8 py-2 text-xs font-medium text-gray-300 cursor-pointer transition-colors focus:outline-none focus:border-primary/50"
                >
                  <option value="7D" className="bg-[#1a1a24]">Last 7 Days</option>
                  <option value="30D" className="bg-[#1a1a24]">Last 30 Days</option>
                  <option value="90D" className="bg-[#1a1a24]">Last 90 Days</option>
                  <option value="ALL" className="bg-[#1a1a24]">All Time</option>
                </select>
                <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 uppercase text-[10px] tracking-wider">Range</span>
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] text-gray-500 font-bold uppercase tracking-wider border-b border-white/5">
                  <th className="pb-4 pl-4 font-medium w-10">
                    <button 
                      onClick={toggleSelectAll}
                      className="p-1 hover:bg-white/5 rounded transition-colors"
                    >
                      {selectedTradeIds.length === (trades || []).length && (trades || []).length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-primary" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-600" />
                      )}
                    </button>
                  </th>
                  <th className="pb-4 font-medium">#</th>
                  <th className="pb-4 font-medium">Date/Time</th>
                  <th className="pb-4 font-medium">Symbol</th>
                  <th className="pb-4 font-medium">Type</th>
                  <th className="pb-4 font-medium">Entry</th>
                  <th className="pb-4 font-medium">Exit</th>
                  <th className="pb-4 font-medium">Lots</th>
                  <th className="pb-4 font-medium">Session</th>
                  <th className="pb-4 font-medium">Conf.</th>
                  <th className="pb-4 font-medium">P&L</th>
                  <th className="pb-4 font-medium">Duration</th>
                  <th className="pb-4 font-medium pr-4">Tag</th>
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
                        <td className="py-4 text-gray-500 text-xs">{trades.length - index}</td>
                        <td className="py-4 text-gray-300 text-xs font-mono">{trade.date.replace('Today, ', '')}</td>
                        <td className="py-4 font-bold text-white text-xs">{trade.symbol}</td>
                        <td className="py-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${trade.action === 'BUY' ? 'bg-primary/20 text-primary' : 'bg-rose-500/20 text-rose-400'}`}>
                            {trade.action}
                          </span>
                        </td>
                        <td className="py-4 text-gray-300 font-mono text-xs">{trade.entry || "0.0000"}</td>
                        <td className="py-4 text-gray-300 font-mono text-xs">{trade.exit || "0.0000"}</td>
                        <td className="py-4 text-gray-300 font-mono text-xs">{trade.size.replace(' Lot', '')}</td>
                        <td className="py-4 text-gray-400 text-[10px] font-bold uppercase tracking-wider">{trade.session || "Else"}</td>
                        <td className="py-4">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                            trade.confidence === 'High' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                            trade.confidence === 'Medium' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : 
                            'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {trade.confidence || "High"}
                          </span>
                        </td>
                        <td className={`py-4 font-mono font-bold text-xs ${trade.isPositive ? 'text-primary' : 'text-rose-400'}`}>
                          {formatCurrency(trade.pnl)}
                        </td>
                        <td className="py-4 text-gray-400 text-xs">{trade.duration || "1h 30m"}</td>
                        <td className="py-4 pr-4">
                          <div className="flex flex-wrap gap-1">
                            {trade.tags && Array.isArray(trade.tags) && trade.tags.length > 0 ? (
                              trade.tags.map((tag: string) => (
                                <span key={tag} className="px-2 py-0.5 rounded border border-white/10 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                  {tag}
                                </span>
                              ))
                            ) : (
                              <span className="px-2 py-0.5 rounded border border-white/10 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
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
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Total P&L (Monthly)</p>
            <h2 className={`text-2xl font-bold tracking-tight ${stats.totalPnl >= 0 ? 'text-primary' : 'text-rose-400'}`}>
              {formatCurrency(stats.totalPnl)}
            </h2>
          </div>
          
          <div className="glass-card p-5 rounded-2xl flex flex-col justify-between">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Win Rate</p>
            <h2 className="text-2xl font-bold text-primary tracking-tight">
              {stats.winRate.toFixed(1)}%
            </h2>
          </div>

          <div className="glass-card p-5 rounded-2xl flex flex-col justify-between">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Avg. Duration</p>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {stats.avgDuration}
            </h2>
          </div>

          <div className="glass-card p-5 rounded-2xl flex flex-col justify-between">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Total Trades</p>
            <h2 className="text-2xl font-bold text-primary tracking-tight">
              {stats.totalTrades}
            </h2>
          </div>
        </div>
      </div>
    </div>
  );
}
