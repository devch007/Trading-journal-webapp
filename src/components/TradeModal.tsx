import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useAccounts } from "../hooks/useAccounts";

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (trade: any) => void;
}

export function TradeModal({ isOpen, onClose, onSubmit }: TradeModalProps) {
  const { accounts } = useAccounts();
  const [accountId, setAccountId] = useState("");
  const [symbol, setSymbol] = useState("EURUSD");
  const [action, setAction] = useState("BUY");
  const [size, setSize] = useState("1.00");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");

  useEffect(() => {
    if (accounts.length > 0 && !accountId) {
      setAccountId(accounts[0].id);
    }
  }, [accounts, accountId]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    // Simulate a random PnL for the new trade just for visual feedback in the dashboard
    const isWin = Math.random() > 0.5;
    const pnlAmount = Math.random() * 500;
    const pnl = isWin ? pnlAmount : -pnlAmount;

    const newTrade = {
      id: Date.now(),
      accountId: accountId || undefined,
      date: `Today, ${timeString}`,
      symbol,
      action,
      size: `${parseFloat(size).toFixed(2)} Lot`,
      result: `${isWin ? '+' : '-'}$${Math.abs(pnl).toFixed(2)}`,
      isPositive: isWin,
      pnl: pnl
    };

    onSubmit(newTrade);
    onClose();
    
    // Reset form
    setSymbol("EURUSD");
    setAction("BUY");
    setSize("1.00");
    setStopLoss("");
    setTakeProfit("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-card w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-white/5">
          <h2 className="font-headline text-xl text-white">New Trade</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-on-surface-variant hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          {/* Account Selection */}
          {accounts.length > 0 && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-label text-on-surface-variant uppercase tracking-wider">Account</label>
              <select 
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-primary/50 transition-colors appearance-none"
                required
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id} className="bg-[#1a1a24]">
                    {acc.firm} - {acc.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Symbol & Action */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-label text-on-surface-variant uppercase tracking-wider">Symbol</label>
              <select 
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-primary/50 transition-colors appearance-none"
              >
                <option value="EURUSD" className="bg-[#1a1a24]">EURUSD</option>
                <option value="XAUUSD" className="bg-[#1a1a24]">XAUUSD</option>
                <option value="GBPUSD" className="bg-[#1a1a24]">GBPUSD</option>
                <option value="USDJPY" className="bg-[#1a1a24]">USDJPY</option>
                <option value="USDCAD" className="bg-[#1a1a24]">USDCAD</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-label text-on-surface-variant uppercase tracking-wider">Action</label>
              <div className="flex bg-white/5 border border-white/10 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setAction("BUY")}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${action === "BUY" ? "bg-emerald-500/20 text-emerald-400" : "text-on-surface-variant hover:text-white"}`}
                >
                  BUY
                </button>
                <button
                  type="button"
                  onClick={() => setAction("SELL")}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${action === "SELL" ? "bg-rose-500/20 text-rose-400" : "text-on-surface-variant hover:text-white"}`}
                >
                  SELL
                </button>
              </div>
            </div>
          </div>

          {/* Size */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-label text-on-surface-variant uppercase tracking-wider">Size (Lots)</label>
            <input 
              type="number" 
              step="0.01"
              min="0.01"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-data focus:outline-none focus:border-primary/50 transition-colors"
              placeholder="1.00"
              required
            />
          </div>

          {/* SL & TP */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-label text-on-surface-variant uppercase tracking-wider">Stop Loss</label>
              <input 
                type="number" 
                step="0.00001"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-data focus:outline-none focus:border-primary/50 transition-colors"
                placeholder="Optional"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-label text-on-surface-variant uppercase tracking-wider">Take Profit</label>
              <input 
                type="number" 
                step="0.00001"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-data focus:outline-none focus:border-primary/50 transition-colors"
                placeholder="Optional"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button 
            type="submit"
            className={`mt-4 w-full py-4 rounded-xl font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] ${action === 'BUY' ? 'bg-emerald-500 hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'bg-rose-500 hover:bg-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.3)]'}`}
          >
            Execute {action} {symbol}
          </button>
        </form>
      </div>
    </div>
  );
}
