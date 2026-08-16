import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Target, X, CheckSquare, Tag, ImagePlus, Trash2, Plus } from 'lucide-react';
import { cn } from '../lib/utils';
import { Strategy } from '../contexts/StrategyContext';
import { STRATEGY_COLORS, TIMEFRAME_OPTIONS, DEFAULT_RULES, StrategyFormData, emptyForm } from '../constants/strategy';

interface StrategyModalProps {
  initial?: Strategy;
  onSave: (data: StrategyFormData) => void;
  onClose: () => void;
}

export function StrategyModal({ initial, onSave, onClose }: StrategyModalProps) {
  const [form, setForm] = useState<StrategyFormData>(
    initial
      ? {
          name: initial.name,
          description: initial.description || '',
          color: initial.color || STRATEGY_COLORS[0],
          timeframes: initial.timeframes || ['H1'],
          rules: initial.rules || [],
          tags: initial.tags || [],
          imageUrl: initial.imageUrl || '',
        }
      : emptyForm()
  );
  
  if (!initial && form.rules.length === 0) {
    form.rules = DEFAULT_RULES.slice(0, 2);
  }

  const [ruleInput, setRuleInput] = useState('');
  const [tagInput, setTagInput] = useState('');
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setForm(f => ({ ...f, imageUrl: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const addRule = () => {
    const v = ruleInput.trim();
    if (!v) return;
    setForm(f => ({ ...f, rules: [...f.rules, v] }));
    setRuleInput('');
  };

  const removeRule = (idx: number) => {
    setForm(f => ({ ...f, rules: f.rules.filter((_, i) => i !== idx) }));
  };

  const addTag = () => {
    const v = tagInput.trim().toUpperCase();
    if (!v || form.tags.includes(v)) return;
    setForm(f => ({ ...f, tags: [...f.tags, v] }));
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }));
  };

  const inputClass = "w-full bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-2xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 font-semibold focus:outline-none focus:ring-1 focus:ring-black/10 dark:focus:ring-white/20 transition-all shadow-2xs";
  const labelClass = "text-xs font-semibold text-gray-900 dark:text-white block mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white dark:bg-[#16181f] border border-gray-200/90 dark:border-neutral-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-neutral-800 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-xs"
              style={{ backgroundColor: `${form.color}15`, border: `1px solid ${form.color}40` }}
            >
              <Target className="w-5 h-5" style={{ color: form.color }} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">{initial ? 'Edit Strategy' : 'New Strategy'}</h2>
              <p className="text-xs text-gray-400">Define setup parameters, rules, and playbook tags</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-xl transition-colors text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-7">
            
            {/* Left Column */}
            <div className="space-y-5">
              <div>
                <label className={labelClass}>Strategy Name</label>
                <input
                  type="text"
                  placeholder="e.g. London Breakout, ICT FVG Model..."
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className={inputClass}
                />
              </div>
              
              <div>
                <label className={labelClass}>Theme Color</label>
                <div className="flex gap-2 flex-wrap bg-gray-50 dark:bg-neutral-800 p-2.5 rounded-2xl border border-gray-200 dark:border-neutral-700">
                  {STRATEGY_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, color: c }))}
                      className={cn(
                        'w-7 h-7 rounded-full transition-all relative flex items-center justify-center cursor-pointer',
                        form.color === c ? 'scale-110 shadow-sm' : 'opacity-70 hover:opacity-100'
                      )}
                      style={{ backgroundColor: c }}
                    >
                      {form.color === c && (
                        <div className="w-2.5 h-2.5 rounded-full bg-white shadow-xs" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelClass}>Strategy Description</label>
                <textarea
                  placeholder="Outline the core concept, entry triggers, and setup conditions..."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-2xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 font-semibold focus:outline-none focus:ring-1 focus:ring-black/10 dark:focus:ring-white/20 transition-all resize-none shadow-2xs"
                />
              </div>

              <div>
                <label className={labelClass}>Cover Image</label>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                {form.imageUrl ? (
                  <div className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-neutral-700 group shadow-xs">
                    <img
                      src={form.imageUrl}
                      alt="Cover preview"
                      className="w-full h-36 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        className="px-3 py-1.5 bg-white text-gray-900 rounded-xl text-xs font-semibold shadow-xs"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, imageUrl: '' }))}
                        className="p-1.5 bg-rose-600 text-white rounded-xl shadow-xs"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="w-full h-28 rounded-2xl border-2 border-dashed border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800/40 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ImagePlus className="w-5 h-5 text-gray-400" />
                    <span className="text-xs font-semibold text-gray-400">Click to upload strategy diagram</span>
                  </button>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-5">
              <div>
                <label className={labelClass}>Timeframe Filters</label>
                <div className="flex flex-wrap gap-1.5">
                  {TIMEFRAME_OPTIONS.map(tf => {
                    const isSelected = form.timeframes.includes(tf);
                    return (
                      <button
                        key={tf}
                        type="button"
                        onClick={() => setForm(f => ({
                          ...f,
                          timeframes: isSelected
                            ? f.timeframes.filter(t => t !== tf)
                            : [...f.timeframes, tf]
                        }))}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                          isSelected
                            ? "bg-[#111827] dark:bg-white text-white dark:text-gray-900 shadow-xs"
                            : "bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200"
                        )}
                      >
                        {tf}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className={labelClass}>Playbook Entry Rules</label>
                <div className="flex gap-2 mb-2.5">
                  <input
                    type="text"
                    placeholder="e.g. Higher timeframe liquidity sweep..."
                    value={ruleInput}
                    onChange={e => setRuleInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addRule())}
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={addRule}
                    className="px-4 py-2.5 rounded-2xl bg-blue-600 text-white text-xs font-bold shrink-0 hover:bg-blue-700 transition-all cursor-pointer"
                  >
                    Add
                  </button>
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto no-scrollbar">
                  {form.rules.map((rule, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-neutral-800 border border-gray-200/80 dark:border-neutral-700 text-xs text-gray-800 dark:text-gray-200 font-medium">
                      <span className="truncate pr-2">{rule}</span>
                      <button type="button" onClick={() => removeRule(idx)} className="text-gray-400 hover:text-rose-600 shrink-0 cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelClass}>Classification Tags</label>
                <div className="flex gap-2 mb-2.5">
                  <input
                    type="text"
                    placeholder="e.g. ICT, SCALPING, FVG..."
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="px-4 py-2.5 rounded-2xl bg-gray-200 dark:bg-neutral-700 text-gray-800 dark:text-gray-200 text-xs font-bold shrink-0 hover:bg-gray-300 transition-all cursor-pointer"
                  >
                    Tag
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {form.tags.map(t => (
                    <span key={t} className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 rounded-xl text-xs font-semibold">
                      #{t}
                      <button type="button" onClick={() => removeTag(t)} className="hover:text-rose-600 cursor-pointer">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-100 dark:border-neutral-800 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-2xl bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 text-xs font-semibold hover:bg-gray-200 transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (!form.name.trim()) return;
              onSave(form);
            }}
            disabled={!form.name.trim()}
            className="px-6 py-2.5 rounded-2xl bg-[#111827] dark:bg-white text-white dark:text-gray-900 text-xs font-semibold disabled:opacity-40 shadow-xs hover:bg-black dark:hover:bg-gray-100 transition-all cursor-pointer"
          >
            {initial ? 'Save Changes' : 'Create Playbook'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
