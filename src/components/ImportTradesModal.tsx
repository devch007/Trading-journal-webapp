import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';

export interface ExtractedTrade {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  volume: number | string;
  entry_price: number | string;
  exit_price: number | string;
  profit: number | string;
  commission?: number | string;
  confidence?: 'High' | 'Medium' | 'Low';
}

interface ImportTradesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (trades: any[]) => void;
  initialData?: { trades: any[] } | null;
}

export function ImportTradesModal({ isOpen, onClose, onSave, initialData }: ImportTradesModalProps) {
  const [trades, setTrades] = useState<ExtractedTrade[]>([]);

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
            commission: t.commission || 0,
            confidence: t.confidence || 'High',
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
        commission: 0,
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
      commission: parseFloat(t.commission as string) || 0,
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
            <h2 className="text-xl font-bold text-white">Review Extracted Trades</h2>
            <p className="text-sm text-gray-400 mt-1">Verify and edit AI-extracted trades before saving to your journal.</p>
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
          <div className="min-w-[800px]">
            <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr_1fr_auto] gap-4 mb-4 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
              <div>Symbol</div>
              <div>Type</div>
              <div>Volume</div>
              <div>Entry Price</div>
              <div>Exit Price</div>
              <div>Profit</div>
              <div>Commission</div>
              <div className="w-10 text-center">Act</div>
            </div>

            <div className="flex flex-col gap-3">
              {trades.map((trade) => {
                const isInvalid = !trade.symbol || trade.volume === '' || trade.profit === '';
                
                return (
                  <div 
                    key={trade.id} 
                    className={`grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr_1fr_auto] gap-4 items-center p-3 rounded-xl border bg-[#12121A] transition-colors ${isInvalid ? 'border-rose-500/50' : 'border-white/5 hover:border-white/20'}`}
                  >
                    {/* Symbol */}
                    <div className="relative">
                      <input 
                        type="text" 
                        value={trade.symbol}
                        onChange={(e) => handleChange(trade.id, 'symbol', e.target.value.toUpperCase())}
                        placeholder="EURUSD"
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                      />
                      {trade.confidence && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-black/50 border border-white/10 pointer-events-none">
                          {trade.confidence === 'High' ? (
                            <><CheckCircle2 className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400">High</span></>
                          ) : trade.confidence === 'Medium' ? (
                            <><div className="w-2 h-2 rounded-full bg-yellow-400" /><span className="text-yellow-400">Med</span></>
                          ) : (
                            <><AlertCircle className="w-3 h-3 text-rose-400" /><span className="text-rose-400">Low</span></>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Type */}
                    <div>
                      <select 
                        value={trade.type}
                        onChange={(e) => handleChange(trade.id, 'type', e.target.value)}
                        className={`w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:border-primary transition-colors appearance-none ${trade.type === 'BUY' ? 'text-primary' : 'text-rose-400'}`}
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
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary transition-colors font-mono"
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
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary transition-colors font-mono"
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
                        className={`w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:border-primary transition-colors font-mono ${parseFloat(trade.profit as string) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                      />
                    </div>

                    {/* Commission */}
                    <div>
                      <input 
                        type="number" 
                        step="0.01"
                        value={trade.commission}
                        onChange={(e) => handleChange(trade.id, 'commission', e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary transition-colors font-mono"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-center">
                      <button 
                        onClick={() => handleRemoveRow(trade.id)}
                        className="p-2 text-gray-500 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button 
              onClick={handleAddRow}
              className="mt-4 flex items-center gap-2 text-sm font-bold text-primary hover:text-primary/80 transition-colors px-4 py-2 rounded-lg hover:bg-primary/10"
            >
              <Plus className="w-4 h-4" />
              Add Trade
            </button>
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
              <p className={`text-xl font-bold ${summary.totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
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
