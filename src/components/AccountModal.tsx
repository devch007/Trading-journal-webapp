import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, ChevronDown, ChevronUp, Shield } from "lucide-react";
import { TradingRule } from "../hooks/useAccounts";

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (account: any) => void;
  initialData?: any;
}

const PRESET_RULES: { name: string; type: TradingRule['type']; unit: string; defaultValue: number }[] = [
  { name: "Max Trades / Day", type: "max_trades_per_day", unit: "trades", defaultValue: 3 },
  { name: "Max Loss / Trade", type: "max_loss_per_trade", unit: "$", defaultValue: 200 },
  { name: "Daily Loss Limit", type: "daily_loss_limit", unit: "%", defaultValue: 1 },
];

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
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
  const [rules, setRules] = useState<TradingRule[]>([]);
  const [showRules, setShowRules] = useState(false);

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
      setRules(initialData.rules || []);
      setShowRules((initialData.rules || []).length > 0);
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
      setRules([]);
      setShowRules(false);
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
      status,
      rules: rules.length > 0 ? rules : [],
    };

    onSubmit(accountData);
    onClose();
  };

  const addPresetRule = (preset: typeof PRESET_RULES[0]) => {
    const alreadyExists = rules.some(r => r.type === preset.type);
    if (alreadyExists) return;
    setRules(prev => [...prev, {
      id: generateId(),
      name: preset.name,
      type: preset.type,
      value: preset.defaultValue,
      unit: preset.unit,
      enabled: true,
    }]);
  };

  const addCustomRule = () => {
    setRules(prev => [...prev, {
      id: generateId(),
      name: "",
      type: "custom",
      value: 0,
      unit: "trades",
      enabled: true,
    }]);
  };

  const updateRule = (id: string, field: keyof TradingRule, value: any) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const removeRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
  };

  const inputClass = "bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-primary/50 transition-colors";
  const labelClass = "text-xs type-label text-on-surface-variant uppercase tracking-wider";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-card w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-white/5 shrink-0">
          <h2 className="type-h1">{initialData ? 'Edit Account' : 'New Account'}</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-on-surface-variant hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5 overflow-y-auto no-scrollbar flex-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Firm</label>
              <input 
                type="text" 
                value={firm}
                onChange={(e) => setFirm(e.target.value)}
                className={inputClass}
                placeholder="e.g. FTMO"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Account Name</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                placeholder="e.g. Challenge"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Type</label>
              <input 
                type="text" 
                value={type}
                onChange={(e) => setType(e.target.value)}
                className={inputClass}
                placeholder="e.g. ACTIVE EVALUATION"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Badge/ID</label>
              <input 
                type="text" 
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                className={inputClass}
                placeholder="e.g. STP-2044"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className={labelClass}>Initial Capital ($)</label>
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
              <label className={labelClass}>Daily Drawdown (%)</label>
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
              <label className={labelClass}>Max Drawdown (%)</label>
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
              <label className={labelClass}>Forex Comm ($/Lot)</label>
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
              <label className={labelClass}>Metals Comm ($/Lot)</label>
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
            <label className={labelClass}>Status</label>
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

          {/* ── Trading Rules Section ─── */}
          <div className="border-t border-white/5 pt-4">
            <button
              type="button"
              onClick={() => setShowRules(!showRules)}
              className="flex items-center justify-between w-full group"
            >
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                <span className="type-h2 text-white text-[14px]">Trading Rules</span>
                {rules.length > 0 && (
                  <span className="type-micro text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {rules.filter(r => r.enabled).length} active
                  </span>
                )}
              </div>
              {showRules 
                ? <ChevronUp className="w-4 h-4 text-on-surface-variant group-hover:text-white transition-colors" />
                : <ChevronDown className="w-4 h-4 text-on-surface-variant group-hover:text-white transition-colors" />
              }
            </button>

            {showRules && (
              <div className="mt-4 flex flex-col gap-3 animate-in slide-in-from-top-2 duration-300">
                {/* Preset quick-add buttons */}
                <div className="flex flex-wrap gap-2 mb-1">
                  {PRESET_RULES.map(preset => {
                    const exists = rules.some(r => r.type === preset.type);
                    return (
                      <button
                        key={preset.type}
                        type="button"
                        onClick={() => addPresetRule(preset)}
                        disabled={exists}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                          exists 
                            ? 'border-white/5 text-[#6A6A6A] cursor-not-allowed opacity-50' 
                            : 'border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50'
                        }`}
                      >
                        + {preset.name}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={addCustomRule}
                    className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-[#A7A7A7] hover:bg-white/5 hover:text-white hover:border-white/20 transition-all"
                  >
                    + Custom Rule
                  </button>
                </div>

                {/* Rules list */}
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      rule.enabled
                        ? 'bg-white/[0.03] border-white/10'
                        : 'bg-white/[0.01] border-white/5 opacity-50'
                    }`}
                  >
                    {/* Toggle */}
                    <button
                      type="button"
                      onClick={() => updateRule(rule.id, 'enabled', !rule.enabled)}
                      className={`w-8 h-5 rounded-full relative transition-all shrink-0 ${
                        rule.enabled ? 'bg-primary' : 'bg-white/10'
                      }`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                        rule.enabled ? 'left-[14px]' : 'left-0.5'
                      }`} />
                    </button>

                    {/* Rule content */}
                    <div className="flex-1 flex flex-col gap-1.5">
                      {rule.type === 'custom' ? (
                        <input
                          type="text"
                          value={rule.name}
                          onChange={(e) => updateRule(rule.id, 'name', e.target.value)}
                          placeholder="Rule name..."
                          className="bg-transparent text-white text-[13px] font-bold focus:outline-none border-b border-transparent focus:border-primary/30 transition-colors w-full"
                        />
                      ) : (
                        <span className="text-white text-[13px] font-bold">{rule.name}</span>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-[#6A6A6A]">Limit:</span>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={rule.value || ''}
                          onChange={(e) => updateRule(rule.id, 'value', parseFloat(e.target.value) || 0)}
                          className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white tnum text-[12px] w-20 focus:outline-none focus:border-primary/30 transition-colors"
                        />
                        {rule.type === 'custom' ? (
                          <select
                            value={rule.unit}
                            onChange={(e) => updateRule(rule.id, 'unit', e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white text-[12px] focus:outline-none focus:border-primary/30 transition-colors appearance-none"
                          >
                            <option value="trades" className="bg-[#1a1a24]">trades</option>
                            <option value="$" className="bg-[#1a1a24]">$</option>
                            <option value="%" className="bg-[#1a1a24]">%</option>
                          </select>
                        ) : (
                          <span className="text-[11px] text-[#A7A7A7]">{rule.unit}</span>
                        )}
                      </div>
                    </div>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => removeRule(rule.id)}
                      className="p-1.5 rounded-lg hover:bg-[#E5534B]/10 text-[#6A6A6A] hover:text-[#E5534B] transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {rules.length === 0 && (
                  <p className="text-[12px] text-[#6A6A6A] text-center py-4">
                    No rules set. Add preset or custom rules above.
                  </p>
                )}
              </div>
            )}
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
