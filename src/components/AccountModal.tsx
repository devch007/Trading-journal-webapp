import React, { useState, useEffect } from "react";
import { X } from "lucide-react";

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (account: any) => void;
  initialData?: any;
}

export function AccountModal({ isOpen, onClose, onSubmit, initialData }: AccountModalProps) {
  const [name, setName] = useState("");
  const [firm, setFirm] = useState("FTMO");
  const [type, setType] = useState("ACTIVE EVALUATION");
  const [badge, setBadge] = useState("");
  const [initialCapital, setInitialCapital] = useState("100000");
  const [maxDrawdown, setMaxDrawdown] = useState("5.0");
  const [dailyDrawdown, setDailyDrawdown] = useState("1.2");
  const [commissionForex, setCommissionForex] = useState("5.0");
  const [commissionMetals, setCommissionMetals] = useState("5.0");
  const [status, setStatus] = useState("ACTIVE");

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setFirm(initialData.firm);
      setType(initialData.type);
      setBadge(initialData.badge);
      setInitialCapital(initialData.initialCapital.toString());
      setMaxDrawdown(initialData.maxDrawdown.toString());
      setDailyDrawdown(initialData.dailyDrawdown.toString());
      setCommissionForex(initialData.commissionForex !== undefined ? initialData.commissionForex.toString() : "5.0");
      setCommissionMetals(initialData.commissionMetals !== undefined ? initialData.commissionMetals.toString() : "5.0");
      setStatus(initialData.status);
    } else {
      setName("");
      setFirm("FTMO");
      setType("ACTIVE EVALUATION");
      setBadge("");
      setInitialCapital("100000");
      setMaxDrawdown("5.0");
      setDailyDrawdown("1.2");
      setCommissionForex("5.0");
      setCommissionMetals("5.0");
      setStatus("ACTIVE");
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const accountData = {
      name,
      firm,
      type,
      badge,
      initialCapital: parseFloat(initialCapital),
      maxDrawdown: parseFloat(maxDrawdown),
      dailyDrawdown: parseFloat(dailyDrawdown),
      commissionForex: parseFloat(commissionForex) || 0,
      commissionMetals: parseFloat(commissionMetals) || 0,
      status
    };

    onSubmit(accountData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-card w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-white/5">
          <h2 className="type-h1">{initialData ? 'Edit Account' : 'New Account'}</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-on-surface-variant hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs type-label text-on-surface-variant uppercase tracking-wider">Firm</label>
              <input 
                type="text" 
                value={firm}
                onChange={(e) => setFirm(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-primary/50 transition-colors"
                placeholder="e.g. FTMO"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs type-label text-on-surface-variant uppercase tracking-wider">Account Name</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-primary/50 transition-colors"
                placeholder="e.g. Challenge"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs type-label text-on-surface-variant uppercase tracking-wider">Type</label>
              <input 
                type="text" 
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-primary/50 transition-colors"
                placeholder="e.g. ACTIVE EVALUATION"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs type-label text-on-surface-variant uppercase tracking-wider">Badge/ID</label>
              <input 
                type="text" 
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-primary/50 transition-colors"
                placeholder="e.g. STP-2044"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs type-label text-on-surface-variant uppercase tracking-wider">Initial Capital ($)</label>
            <input 
              type="number" 
              value={initialCapital}
              onChange={(e) => setInitialCapital(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white tnum focus:outline-none focus:border-primary/50 transition-colors"
              placeholder="100000"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs type-label text-on-surface-variant uppercase tracking-wider">Daily Drawdown (%)</label>
              <input 
                type="number" 
                step="0.1"
                value={dailyDrawdown}
                onChange={(e) => setDailyDrawdown(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white tnum focus:outline-none focus:border-primary/50 transition-colors"
                placeholder="5.0"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs type-label text-on-surface-variant uppercase tracking-wider">Max Drawdown (%)</label>
              <input 
                type="number" 
                step="0.1"
                value={maxDrawdown}
                onChange={(e) => setMaxDrawdown(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white tnum focus:outline-none focus:border-primary/50 transition-colors"
                placeholder="10.0"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs type-label text-on-surface-variant uppercase tracking-wider">Forex Comm ($/Lot)</label>
              <input 
                type="number" 
                step="0.1"
                min="0"
                value={commissionForex}
                onChange={(e) => setCommissionForex(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white tnum focus:outline-none focus:border-primary/50 transition-colors"
                placeholder="5.0"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs type-label text-on-surface-variant uppercase tracking-wider">Metals Comm ($/Lot)</label>
              <input 
                type="number" 
                step="0.1"
                min="0"
                value={commissionMetals}
                onChange={(e) => setCommissionMetals(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white tnum focus:outline-none focus:border-primary/50 transition-colors"
                placeholder="5.0"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs type-label text-on-surface-variant uppercase tracking-wider">Status</label>
            <select 
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-primary/50 transition-colors appearance-none"
            >
              <option value="ACTIVE" className="bg-[#1a1a24]">ACTIVE</option>
              <option value="SUCCESS" className="bg-[#1a1a24]">SUCCESS</option>
              <option value="FAILED" className="bg-[#1a1a24]">FAILED</option>
            </select>
          </div>

          <button 
            type="submit"
            className="mt-4 w-full py-4 rounded-xl font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] bg-primary hover:bg-primary/90 shadow-[0_0_20px_rgba(59,130,246,0.3)]"
          >
            {initialData ? 'Update Account' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
