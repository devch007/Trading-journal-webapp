import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, AlertCircle, CheckCircle2, Square, CheckSquare, Layers } from 'lucide-react';
import { useStrategies } from '../contexts/StrategyContext';

export interface ExtractedTrade {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  volume: number | string;
  entry_price: number | string;
  exit_price: number | string;
  profit: number | string;
  session: 'Asian' | 'London' | 'NY' | 'Else';
  commission?: number | string;
  confidence?: 'High' | 'Medium' | 'Low';
  strategy?: string;
  date_time?: string; // e.g. "2026.04.03 14:30" extracted from screenshot
  close_reason?: string; // e.g. "Market", "Stop loss", "Take profit"
}

interface ImportTradesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (trades: any[]) => void;
  initialData?: { trades: any[] } | null;
}

export function ImportTradesModal({ isOpen, onClose, onSave, initialData }: ImportTradesModalProps) {
  const [trades, setTrades] = useState<ExtractedTrade[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { strategies } = useStrategies();

  useEffect(() => {
    if (isOpen) {
      if (initialData && initialData.trades) {
        setTrades(
          initialData.trades.map((t, i) => ({
            id: Math.random().toString(36).substring(7),
            symbol: t.symbol || '',
            type: t.type === 'SELL' ? 'SELL' : 'BUY',
            volume: t.volume || '',
            entry_price: t.entry_price || '',
            exit_price: t.exit_price || '',
            profit: t.profit || '',
            session: t.session || 'Else',
            commission: t.commission || 0,
            confidence: t.confidence || 'High',
            strategy: t.strategy || '',
            date_time: t.date_time || '',
            close_reason: t.close_reason || 'Unknown',
          }))
        );
      } else {
        setTrades([]);
      }
    }
  }, [isOpen, initialData]);

  const handleAddRow = () => {
    setTrades([
      ...trades,
      {
        id: Math.random().toString(36).substring(7),
        symbol: '',
        type: 'BUY',
        volume: '',
        entry_price: '',
        exit_price: '',
        profit: '',
        session: 'Else',
        commission: 0,
        strategy: '',
        date_time: '',
        close_reason: 'Unknown',
      }
    ]);
  };

  const handleRemoveRow = (id: string) => {
    setTrades(trades.filter(t => t.id !== id));
  };

  const handleChange = (id: string, field: keyof ExtractedTrade, value: any) => {
    setTrades(trades.map(t => {
      if (t.id === id) {
        return { ...t, [field]: value };
      }
      return t;
    }));
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleClubSelected = () => {
    if (selectedIds.length < 2) return;

    const selectedTrades = trades.filter(t => selectedIds.includes(t.id));
    const unselectedTrades = trades.filter(t => !selectedIds.includes(t.id));

    let totalVolume = 0;
    let totalProfit = 0;
    let totalCommission = 0;
    let weightedEntrySum = 0;
    let weightedExitSum = 0;

    selectedTrades.forEach(t => {
      const vol = parseFloat(t.volume as string) || 0;
      totalVolume += vol;
      totalProfit += parseFloat(t.profit as string) || 0;
      totalCommission += parseFloat(t.commission as string) || 0;
      
      weightedEntrySum += (parseFloat(t.entry_price as string) || 0) * vol;
      weightedExitSum += (parseFloat(t.exit_price as string) || 0) * vol;
    });

    const avgEntry = totalVolume > 0 ? (weightedEntrySum / totalVolume) : 0;
    const avgExit = totalVolume > 0 ? (weightedExitSum / totalVolume) : 0;

    // Base trade for symbol, session, strategy, date
    const baseTrade = selectedTrades[0]; 

    const mergedTrade: ExtractedTrade = {
      ...baseTrade,
      volume: totalVolume.toFixed(2),
      profit: totalProfit.toFixed(2),
      commission: totalCommission.toFixed(2),
      entry_price: avgEntry > 0 ? avgEntry.toFixed(5) : '',
      exit_price: avgExit > 0 ? avgExit.toFixed(5) : '',
    };

    setTrades([...unselectedTrades, mergedTrade]);
    setSelectedIds([]);
  };

  const summary = useMemo(() => {
    const totalTrades = trades.length;
    const totalProfit = trades.reduce((sum, t) => {
      const p = parseFloat(t.profit as string);
      return sum + (isNaN(p) ? 0 : p);
    }, 0);
    return { totalTrades, totalProfit };
  }, [trades]);

  const handleSave = () => {
    // Clean data before saving
    const cleanedTrades = trades.map(t => ({
      symbol: t.symbol,
      type: t.type,
      volume: parseFloat(t.volume as string) || 0,
      entry_price: parseFloat(t.entry_price as string) || 0,
      exit_price: parseFloat(t.exit_price as string) || 0,
      profit: parseFloat(t.profit as string) || 0,
      session: t.session,
      commission: parseFloat(t.commission as string) || 0,
      strategy: t.strategy || '',
      date_time: t.date_time || '',
      close_reason: t.close_reason || 'Unknown',
    }));
    onSave(cleanedTrades);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-white/5">
          <div>
            <h2 className="type-h1 text-white">Review Extracted Trades</h2>
            <p className="type-body mt-1">Verify and edit AI-extracted trades before saving to your journal.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="min-w-[1100px]">
            <div className="grid grid-cols-[auto_1.2fr_1.5fr_0.8fr_0.8fr_1fr_1fr_0.8fr_0.8fr_0.8fr_1fr_0.8fr_auto] gap-3 mb-4 px-4 type-label text-[10px]">
              <div className="w-5 text-center">
                <button 
                  onClick={() => {
                    if (selectedIds.length === trades.length && trades.length > 0) {
                      setSelectedIds([]);
                    } else {
                      setSelectedIds(trades.map(t => t.id));
                    }
                  }}
                  className="hover:text-primary transition-colors mt-0.5"
                >
                  {selectedIds.length === trades.length && trades.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-primary" />
                  ) : (
                    <Square className="w-4 h-4 text-gray-500" />
                  )}
                </button>
              </div>
              <div>Date / Time</div>
              <div>Symbol</div>
              <div>Type</div>
              <div>Volume</div>
              <div>Entry Price</div>
              <div>Exit Price</div>
              <div>Profit</div>
              <div>Session</div>
              <div>Close</div>
              <div>Strategy</div>
              <div>Comm.</div>
              <div className="w-10 text-center">Act</div>
            </div>

            <div className="flex flex-col gap-3">
              {trades.map((trade) => {
                const isInvalid = !trade.symbol || trade.volume === '' || trade.profit === '';
                
                return (
                  <div 
                    key={trade.id} 
                    className={`grid grid-cols-[auto_1.2fr_1.5fr_0.8fr_0.8fr_1fr_1fr_0.8fr_0.8fr_0.8fr_1fr_0.8fr_auto] gap-3 items-center p-3 rounded-xl border bg-[#12121A] transition-colors ${isInvalid ? 'border-[#E5534B]/50' : 'border-white/5 hover:border-white/20'}`}
                  >
                    {/* Checkbox */}
                    <div className="flex justify-center">
                      <button 
                        onClick={() => toggleSelection(trade.id)}
                        className="p-1 hover:bg-white/5 rounded transition-colors"
                      >
                        {selectedIds.includes(trade.id) ? (
                          <CheckSquare className="w-4 h-4 text-primary" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-600" />
                        )}
                      </button>
                    </div>

                    {/* Date / Time */}
                    <div>
                      <input
                        type="text"
                        value={trade.date_time || ''}
                        onChange={(e) => handleChange(trade.id, 'date_time', e.target.value)}
                        placeholder="2026.04.03 14:30"
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-[12px] text-[#A7A7A7] tnum focus:outline-none focus:border-primary transition-colors placeholder:text-[#6A6A6A]"
                      />
                    </div>

                    {/* Symbol */}
                    <div className="relative">
                      <input 
                        type="text" 
                        value={trade.symbol}
                        onChange={(e) => handleChange(trade.id, 'symbol', e.target.value.toUpperCase())}
                        placeholder="EURUSD"
                        className={`w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary transition-colors ${trade.confidence ? 'pr-16' : ''}`}
                      />
                      {trade.confidence && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10">
                          <select 
                            value={trade.confidence}
                            onChange={(e) => handleChange(trade.id, 'confidence', e.target.value)}
                            className={`bg-black/50 border border-white/10 rounded px-1.5 py-0.5 type-micro text-[10px] cursor-pointer focus:outline-none hover:bg-white/10 transition-colors appearance-none text-center min-w-[45px] ${
                              trade.confidence === 'High' ? 'text-[#1ED760]' : 
                              trade.confidence === 'Medium' ? 'text-yellow-400' : 'text-[#E5534B]'
                            }`}
                          >
                            <option value="High" className="bg-[#1a1a24] text-[#1ED760]">High</option>
                            <option value="Medium" className="bg-[#1a1a24] text-yellow-400">Med</option>
                            <option value="Low" className="bg-[#1a1a24] text-[#E5534B]">Low</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Type */}
                    <div>
                      <select 
                        value={trade.type}
                        onChange={(e) => handleChange(trade.id, 'type', e.target.value)}
                        className={`w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:border-primary transition-colors appearance-none ${trade.type === 'BUY' ? 'text-primary' : 'text-[#E5534B]'}`}
                      >
                        <option value="BUY">BUY</option>
                        <option value="SELL">SELL</option>
                      </select>
                    </div>

                    {/* Volume */}
                    <div>
                      <input 
                        type="number" 
                        step="0.01"
                        value={trade.volume}
                        onChange={(e) => handleChange(trade.id, 'volume', e.target.value)}
                        placeholder="1.00"
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>

                    {/* Entry Price */}
                    <div>
                      <input 
                        type="number" 
                        step="0.00001"
                        value={trade.entry_price}
                        onChange={(e) => handleChange(trade.id, 'entry_price', e.target.value)}
                        placeholder="0.0000"
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary transition-colors tnum"
                      />
                    </div>

                    {/* Exit Price */}
                    <div>
                      <input 
                        type="number" 
                        step="0.00001"
                        value={trade.exit_price}
                        onChange={(e) => handleChange(trade.id, 'exit_price', e.target.value)}
                        placeholder="0.0000"
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary transition-colors tnum"
                      />
                    </div>

                    {/* Profit */}
                    <div>
                      <input 
                        type="number" 
                        step="0.01"
                        value={trade.profit}
                        onChange={(e) => handleChange(trade.id, 'profit', e.target.value)}
                        placeholder="0.00"
                        className={`w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:border-primary transition-colors tnum ${parseFloat(trade.profit as string) >= 0 ? 'text-[#1ED760]' : 'text-[#E5534B]'}`}
                      />
                    </div>

                    {/* Session */}
                    <div>
                      <select 
                        value={trade.session}
                        onChange={(e) => handleChange(trade.id, 'session', e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary transition-colors appearance-none"
                      >
                        <option value="Asian">Asian</option>
                        <option value="London">London</option>
                        <option value="NY">NY</option>
                        <option value="Else">Else</option>
                      </select>
                    </div>

                    {/* Close Reason */}
                    <div>
                      <select 
                        value={trade.close_reason || 'Unknown'}
                        onChange={(e) => handleChange(trade.id, 'close_reason', e.target.value)}
                        className={`w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors appearance-none ${
                          trade.close_reason === 'Stop loss' ? 'text-[#E5534B]' : 
                          trade.close_reason === 'Take profit' ? 'text-[#1ED760]' : 
                          trade.close_reason === 'Market' ? 'text-blue-400' : 'text-white'
                        }`}
                      >
                        <option value="Market">Market</option>
                        <option value="Stop loss">Stop loss</option>
                        <option value="Take profit">Take profit</option>
                        <option value="Unknown">Unknown</option>
                      </select>
                    </div>

                    {/* Strategy */}
                    <div>
                      <select 
                        value={trade.strategy || ''}
                        onChange={(e) => handleChange(trade.id, 'strategy', e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary transition-colors appearance-none"
                      >
                        <option value="">— None —</option>
                        {strategies.map(s => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Commission */}
                    <div>
                      <input 
                        type="number" 
                        step="0.01"
                        value={trade.commission}
                        onChange={(e) => handleChange(trade.id, 'commission', e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary transition-colors tnum"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-center">
                      <button 
                        onClick={() => handleRemoveRow(trade.id)}
                        className="p-2 text-gray-500 hover:text-[#E5534B] hover:bg-[#E5534B]/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button 
                onClick={handleAddRow}
                className="mt-4 flex items-center gap-2 text-sm font-bold text-primary hover:text-primary/80 transition-colors px-4 py-2 rounded-lg hover:bg-primary/10"
              >
                <Plus className="w-4 h-4" />
                Add Trade
              </button>
              {selectedIds.length > 1 && (
                <button 
                  onClick={handleClubSelected}
                  className="mt-4 flex items-center gap-2 text-sm font-bold text-[#E2A233] hover:text-[#E2A233]/80 transition-colors px-4 py-2 rounded-lg hover:bg-[#E2A233]/10"
                >
                  <Layers className="w-4 h-4" />
                  Club Selected ({selectedIds.length})
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer & Summary */}
        <div className="p-6 border-t border-white/5 bg-[#12121A] flex justify-between items-center">
          <div className="flex gap-8">
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Total Trades</p>
              <p className="text-xl font-bold text-white">{summary.totalTrades}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Total P&L</p>
              <p className={`text-xl font-bold ${summary.totalProfit >= 0 ? 'text-[#1ED760]' : 'text-[#E5534B]'}`}>
                {summary.totalProfit >= 0 ? '+' : '-'}${Math.abs(summary.totalProfit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-2.5 rounded-full font-bold text-sm text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              className="px-6 py-2.5 rounded-full font-bold text-sm bg-primary hover:bg-primary/90 text-background transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]"
            >
              Save Trades
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
