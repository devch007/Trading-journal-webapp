import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Target, X, CheckSquare, Tag } from 'lucide-react';
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
        }
      : emptyForm()
  );
  const [ruleInput, setRuleInput] = useState('');
  const [tagInput, setTagInput] = useState('');

  const addRule = () => {
    const v = ruleInput.trim();
    if (v && !form.rules.includes(v)) {
      setForm(f => ({ ...f, rules: [...f.rules, v] }));
      setRuleInput('');
    }
  };

  const addTag = () => {
    const v = tagInput.trim().toUpperCase();
    if (v && !form.tags.includes(v)) {
      setForm(f => ({ ...f, tags: [...f.tags, v] }));
      setTagInput('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-[#0d0d16] border border-blue-500/20 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-[0_0_60px_rgba(59,130,246,0.1)] overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-blue-900/20 to-transparent">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: form.color + '22', border: `2px solid ${form.color}44` }}
            >
              <Target className="w-5 h-5" style={{ color: form.color }} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{initial ? 'Edit Strategy' : 'New Strategy'}</h2>
              <p className="text-xs text-gray-500">Define your trading rules and parameters</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
          {/* Name & Color */}
          <div className="grid grid-cols-[1fr_auto] gap-4 items-end">
            <div className="space-y-2">
              <label className="text-xs text-gray-500 font-bold uppercase tracking-wider">Strategy Name *</label>
              <input
                type="text"
                placeholder="e.g. London Breakout, ICT Model..."
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-colors placeholder:text-gray-600"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-gray-500 font-bold uppercase tracking-wider">Color</label>
              <div className="flex gap-2 flex-wrap">
                {STRATEGY_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setForm(f => ({ ...f, color: c }))}
                    className={cn('w-7 h-7 rounded-full transition-all', form.color === c ? 'ring-2 ring-offset-2 ring-offset-[#0d0d16] scale-110' : 'hover:scale-105')}
                    style={{ backgroundColor: c, ringColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-xs text-gray-500 font-bold uppercase tracking-wider">Description</label>
            <textarea
              placeholder="Briefly describe when and why you take this setup..."
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-300 focus:outline-none focus:border-blue-500/50 transition-colors resize-none placeholder:text-gray-600"
            />
          </div>

          {/* Timeframes */}
          <div className="space-y-2">
            <label className="text-xs text-gray-500 font-bold uppercase tracking-wider">Timeframes</label>
            <div className="flex flex-wrap gap-2">
              {TIMEFRAME_OPTIONS.map(tf => (
                <button
                  key={tf}
                  onClick={() => setForm(f => ({
                    ...f,
                    timeframes: f.timeframes.includes(tf)
                      ? f.timeframes.filter(t => t !== tf)
                      : [...f.timeframes, tf]
                  }))}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-bold transition-all border',
                    form.timeframes.includes(tf)
                      ? 'border-transparent text-white shadow-lg'
                      : 'border-white/10 text-gray-500 hover:border-white/20 hover:text-gray-300'
                  )}
                  style={form.timeframes.includes(tf) ? { backgroundColor: form.color + '30', borderColor: form.color + '60', color: form.color } : {}}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* Rules */}
          <div className="space-y-2">
            <label className="text-xs text-gray-500 font-bold uppercase tracking-wider flex items-center gap-2">
              <CheckSquare className="w-3 h-3" /> Entry Rules
            </label>
            <div className="space-y-2 mb-3">
              {(form.rules.length === 0 ? DEFAULT_RULES.slice(0, 2) : form.rules).map((rule, i) => (
                <div key={i} className="flex items-center gap-2 p-3 bg-white/5 rounded-xl border border-white/5">
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: form.color }} />
                  <span className="text-sm text-gray-300 flex-1">{rule}</span>
                  {form.rules.length > 0 && (
                    <button
                      onClick={() => setForm(f => ({ ...f, rules: f.rules.filter((_, idx) => idx !== i) }))}
                      className="text-gray-600 hover:text-rose-400 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add a rule and press Enter..."
                value={ruleInput}
                onChange={e => setRuleInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addRule()}
                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-colors placeholder:text-gray-600"
              />
              <button onClick={addRule} className="px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 transition-all">
                Add
              </button>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <label className="text-xs text-gray-500 font-bold uppercase tracking-wider flex items-center gap-2">
              <Tag className="w-3 h-3" /> Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {form.tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border" style={{ backgroundColor: form.color + '15', borderColor: form.color + '30', color: form.color }}>
                  {tag}
                  <button onClick={() => setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }))} className="hover:opacity-60 transition-opacity">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="SCALP, BREAKOUT, ICT..."
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTag()}
                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-colors placeholder:text-gray-600"
              />
              <button onClick={addTag} className="px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 transition-all">
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 flex justify-end gap-3 bg-black/20">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all">
            Cancel
          </button>
          <button
            onClick={() => { if (form.name.trim()) { onSave(form); onClose(); } }}
            disabled={!form.name.trim()}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
            style={{ background: `linear-gradient(135deg, ${form.color}cc, ${form.color}88)`, boxShadow: `0 4px 20px ${form.color}33` }}
          >
            {initial ? 'Save Changes' : 'Create Strategy'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
