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

  const inputClass = "w-full bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-2xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 font-semibold focus:outline-none focus:ring-1 focus:ring-black/10 dark:focus:ring-white/20 transition-all shadow-2xs";
  const labelClass = "text-xs font-semibold text-gray-900 dark:text-white block mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#16181f] w-full max-w-lg rounded-3xl border border-gray-200/90 dark:border-neutral-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100 dark:border-neutral-800 shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">{initialData ? 'Edit Account' : 'New Account'}</h2>
            <p className="text-xs text-gray-400">Configure trading capital, limits, and rules</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 overflow-y-auto no-scrollbar flex-1">
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className={labelClass}>Firm / Broker</label>
              <input 
                type="text" 
                value={firm}
                onChange={(e) => setFirm(e.target.value)}
                className={inputClass}
                placeholder="e.g. FTMO, Topstep"
                required
              />
            </div>
            <div>
              <label className={labelClass}>Account Name</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                placeholder="e.g. 100K Funded"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className={labelClass}>Account Type</label>
              <input 
                type="text" 
                value={type}
                onChange={(e) => setType(e.target.value)}
                className={inputClass}
                placeholder="e.g. ACTIVE EVALUATION"
                required
              />
            </div>
            <div>
              <label className={labelClass}>Badge / ID</label>
              <input 
                type="text" 
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                className={inputClass}
                placeholder="e.g. STP-2044"
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Initial Capital ($)</label>
            <input 
              type="number" 
              value={initialCapital}
              onChange={(e) => setInitialCapital(e.target.value)}
              className={inputClass}
              placeholder="100000"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className={labelClass}>Daily Drawdown (%)</label>
              <input 
                type="number" 
                step="0.1"
                value={dailyDrawdown}
                onChange={(e) => setDailyDrawdown(e.target.value)}
                className={inputClass}
                placeholder="5.0"
                required
              />
            </div>
            <div>
              <label className={labelClass}>Max Drawdown (%)</label>
              <input 
                type="number" 
                step="0.1"
                value={maxDrawdown}
                onChange={(e) => setMaxDrawdown(e.target.value)}
                className={inputClass}
                placeholder="10.0"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className={labelClass}>Forex Comm ($/Lot)</label>
              <input 
                type="number" 
                step="0.1"
                min="0"
                value={commissionForex}
                onChange={(e) => setCommissionForex(e.target.value)}
                className={inputClass}
                placeholder="5.0"
                required
              />
            </div>
            <div>
              <label className={labelClass}>Metals Comm ($/Lot)</label>
              <input 
                type="number" 
                step="0.1"
                min="0"
                value={commissionMetals}
                onChange={(e) => setCommissionMetals(e.target.value)}
                className={inputClass}
                placeholder="5.0"
                required
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Account Status</label>
            <select 
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={inputClass}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="FAILED">FAILED</option>
            </select>
          </div>

          {/* ── Trading Rules Section ─── */}
          <div className="border-t border-gray-100 dark:border-neutral-800 pt-4">
            <button
              type="button"
              onClick={() => setShowRules(!showRules)}
              className="flex items-center justify-between w-full p-2.5 rounded-2xl bg-gray-50 dark:bg-neutral-800/60 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-bold text-gray-900 dark:text-white">Account Trading Rules</span>
                {rules.length > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 font-bold">
                    {rules.filter(r => r.enabled).length} active
                  </span>
                )}
              </div>
              {showRules 
                ? <ChevronUp className="w-4 h-4 text-gray-400" />
                : <ChevronDown className="w-4 h-4 text-gray-400" />
              }
            </button>

            {showRules && (
              <div className="mt-3 flex flex-col gap-2.5">
                {/* Preset quick-add buttons */}
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_RULES.map(preset => {
                    const exists = rules.some(r => r.type === preset.type);
                    return (
                      <button
                        key={preset.type}
                        type="button"
                        onClick={() => addPresetRule(preset)}
                        disabled={exists}
                        className={`text-xs px-3 py-1.5 rounded-xl border transition-all ${
                          exists 
                            ? 'border-gray-200 dark:border-neutral-800 text-gray-400 opacity-50 cursor-not-allowed' 
                            : 'border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 font-semibold'
                        }`}
                      >
                        + {preset.name}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={addCustomRule}
                    className="text-xs px-3 py-1.5 rounded-xl border border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-all font-semibold"
                  >
                    + Custom Rule
                  </button>
                </div>

                {/* Rules list */}
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                      rule.enabled
                        ? 'bg-gray-50 dark:bg-neutral-800/80 border-gray-200 dark:border-neutral-700'
                        : 'bg-gray-50/50 dark:bg-neutral-900/50 border-gray-100 dark:border-neutral-800 opacity-50'
                    }`}
                  >
                    {/* Toggle */}
                    <button
                      type="button"
                      onClick={() => updateRule(rule.id, 'enabled', !rule.enabled)}
                      className={`w-8 h-5 rounded-full relative transition-all shrink-0 cursor-pointer ${
                        rule.enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-neutral-700'
                      }`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                        rule.enabled ? 'left-[14px]' : 'left-0.5'
                      }`} />
                    </button>

                    {/* Rule content */}
                    <div className="flex-1 flex flex-col gap-1">
                      {rule.type === 'custom' ? (
                        <input
                          type="text"
                          value={rule.name}
                          onChange={(e) => updateRule(rule.id, 'name', e.target.value)}
                          placeholder="Rule name..."
                          className="bg-transparent text-gray-900 dark:text-white text-xs font-bold focus:outline-none border-b border-gray-200 dark:border-neutral-700 pb-0.5 w-full"
                        />
                      ) : (
                        <span className="text-gray-900 dark:text-white text-xs font-bold">{rule.name}</span>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-gray-400">Limit:</span>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={rule.value || ''}
                          onChange={(e) => updateRule(rule.id, 'value', parseFloat(e.target.value) || 0)}
                          className="bg-white dark:bg-neutral-700 border border-gray-200 dark:border-neutral-600 rounded-lg px-2 py-0.5 text-gray-900 dark:text-white tabular-nums text-xs w-20 focus:outline-none"
                        />
                        {rule.type === 'custom' ? (
                          <select
                            value={rule.unit}
                            onChange={(e) => updateRule(rule.id, 'unit', e.target.value)}
                            className="bg-white dark:bg-neutral-700 border border-gray-200 dark:border-neutral-600 rounded-lg px-2 py-0.5 text-gray-900 dark:text-white text-xs focus:outline-none"
                          >
                            <option value="trades">trades</option>
                            <option value="$">$</option>
                            <option value="%">%</option>
                          </select>
                        ) : (
                          <span className="text-[11px] font-semibold text-gray-400">{rule.unit}</span>
                        )}
                      </div>
                    </div>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => removeRule(rule.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-50 text-gray-400 hover:text-rose-600 transition-colors shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button 
            type="submit"
            className="mt-2 w-full py-3.5 rounded-2xl font-semibold text-xs text-white dark:text-gray-900 bg-[#111827] dark:bg-white hover:bg-black dark:hover:bg-gray-100 shadow-xs transition-all cursor-pointer"
          >
            {initialData ? 'Update Account' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
