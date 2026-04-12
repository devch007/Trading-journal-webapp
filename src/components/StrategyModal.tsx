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
  
  // Set default rules if editing a strategy that had none, or if creating a new one
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-[#0a0a12] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden"
      >
        {/* Glow Effects */}
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] opacity-20 pointer-events-none blur-[100px] transition-all duration-700"
          style={{ background: `radial-gradient(circle, ${form.color} 0%, transparent 70%)` }}
        />

        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center relative z-10 bg-black/20">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transition-colors duration-300"
              style={{ backgroundColor: `${form.color}15`, border: `1px solid ${form.color}40`, boxShadow: `0 0 20px ${form.color}20` }}
            >
              <Target className="w-6 h-6" style={{ color: form.color }} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">{initial ? 'Edit Strategy' : 'New Strategy'}</h2>
              <p className="text-sm text-gray-400">Define your trading rules, parameters, and playbook</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar relative z-10">
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Left Column */}
            <div className="space-y-6">
              
              {/* Name & Color */}
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-bold uppercase tracking-widest pl-1">Strategy Name</label>
                  <input
                    type="text"
                    placeholder="e.g. London Breakout, ICT Model..."
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full bg-[#13131a] border border-white/5 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-white/20 focus:bg-[#1a1a24] transition-all placeholder:text-gray-600"
                  />
                </div>
                
                <div className="space-y-3">
                  <label className="text-xs text-gray-400 font-bold uppercase tracking-widest pl-1">Theme Color</label>
                  <div className="flex gap-2.5 flex-wrap bg-[#13131a] p-3 rounded-xl border border-white/5">
                    {STRATEGY_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, color: c }))}
                        className={cn(
                          'w-8 h-8 rounded-full transition-all relative flex items-center justify-center',
                          form.color === c ? 'scale-110 z-10' : 'hover:scale-110 opacity-60 hover:opacity-100'
                        )}
                        style={{ backgroundColor: c }}
                      >
                        {form.color === c && (
                          <motion.div
                            layoutId="color-ring"
                            className="absolute inset-0 rounded-full border-2 border-white"
                            initial={false}
                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            style={{ boxShadow: `0 0 10px ${c}` }}
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-bold uppercase tracking-widest pl-1">Description</label>
                <textarea
                  placeholder="Outline the core concept and typical setup conditions..."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full bg-[#13131a] border border-white/5 rounded-xl px-4 py-3.5 text-sm text-gray-300 focus:outline-none focus:border-white/20 focus:bg-[#1a1a24] transition-all resize-none placeholder:text-gray-600"
                />
              </div>

              {/* Cover Image */}
              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-bold uppercase tracking-widest pl-1">Cover Illustration</label>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                {form.imageUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-white/10 group shadow-lg">
                    <img
                      src={form.imageUrl}
                      alt="Cover preview"
                      className="w-full h-40 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-3 backdrop-blur-sm">
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-bold text-white border border-white/20 transition-all"
                      >
                        Change Image
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, imageUrl: '' }))}
                        className="p-2 bg-[#E5534B]/20 hover:bg-[#E5534B]/40 rounded-lg text-[#E5534B] border border-[#E5534B]/30 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="w-full h-40 rounded-xl border-2 border-dashed border-white/10 hover:border-white/30 bg-[#13131a] hover:bg-[#1a1a24] transition-all flex flex-col items-center justify-center gap-3 group"
                  >
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <ImagePlus className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
                    </div>
                    <span className="text-xs font-bold text-gray-500 group-hover:text-gray-300 transition-colors">Click to upload cover image</span>
                  </button>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              
              {/* Timeframes */}
              <div className="space-y-3">
                <label className="text-xs text-gray-400 font-bold uppercase tracking-widest pl-1">Primary Timeframes</label>
                <div className="flex flex-wrap gap-2">
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
                          'px-4 py-2 rounded-xl text-sm font-bold transition-all border',
                          isSelected
                            ? 'border-transparent text-white shadow-lg'
                            : 'border-white/5 bg-[#13131a] text-gray-500 hover:bg-white/5 hover:text-gray-300'
                        )}
                        style={isSelected ? { backgroundColor: form.color, boxShadow: `0 4px 15px ${form.color}40`, textShadow: '0 1px 2px rgba(0,0,0,0.5)' } : {}}
                      >
                        {tf}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Rules */}
              <div className="space-y-3">
                <label className="text-xs text-gray-400 font-bold uppercase tracking-widest pl-1 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4" /> Entry Playbook & Rules
                </label>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add a rule and press Enter..."
                    value={ruleInput}
                    onChange={e => setRuleInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addRule();
                      }
                    }}
                    className="flex-1 bg-[#13131a] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/20 focus:bg-[#1a1a24] transition-all placeholder:text-gray-600"
                  />
                  <button 
                    type="button" 
                    onClick={addRule} 
                    className="px-4 py-3 rounded-xl text-sm font-bold text-white bg-white/5 hover:bg-white/20 border border-white/10 transition-all flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                  <AnimatePresence>
                    {form.rules.map((rule, i) => (
                      <motion.div 
                        key={rule}
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0 }}
                        className="flex items-center gap-3 p-3 bg-[#13131a] rounded-xl border border-white/5 group hover:border-white/10 transition-all"
                      >
                        <div className="w-2 h-2 rounded-full flex-shrink-0 shadow-lg" style={{ backgroundColor: form.color, boxShadow: `0 0 8px ${form.color}` }} />
                        <span className="text-sm text-gray-300 flex-1 leading-relaxed">{rule}</span>
                        <button
                          type="button"
                          onClick={() => setForm(f => ({ ...f, rules: f.rules.filter((_, idx) => idx !== i) }))}
                          className="text-gray-600 hover:text-[#E5534B] opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ))}
                    {form.rules.length === 0 && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-gray-600 text-center py-4 bg-[#13131a] rounded-xl border border-white/5 border-dashed">
                        No rules added yet. Establish a strict playbook!
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-3">
                <label className="text-xs text-gray-400 font-bold uppercase tracking-widest pl-1 flex items-center gap-2">
                  <Tag className="w-4 h-4" /> Identifying Tags
                </label>
                
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    placeholder="SCALP, TREND, NY SESSION..."
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    className="flex-1 bg-[#13131a] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/20 focus:bg-[#1a1a24] transition-all placeholder:text-gray-600"
                  />
                  <button 
                    type="button" 
                    onClick={addTag} 
                    className="px-4 py-3 rounded-xl text-sm font-bold text-white bg-white/5 hover:bg-white/20 border border-white/10 transition-all flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <AnimatePresence>
                    {form.tags.map(tag => (
                      <motion.span 
                        key={tag} 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border" 
                        style={{ backgroundColor: `${form.color}15`, border: `1px solid ${form.color}40`, color: form.color }}
                      >
                        {tag}
                        <button type="button" onClick={() => setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }))} className="hover:opacity-70 transition-opacity ml-1">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </motion.span>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 flex justify-between items-center relative z-10 bg-black/40 backdrop-blur-md">
          <div className="text-xs text-gray-500 font-medium">
            {form.rules.length} Rules • {form.timeframes.length} Timeframes Set
          </div>
          <div className="flex gap-4">
            <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl text-sm font-bold text-gray-400 hover:text-white hover:bg-white/10 transition-all">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => { if (form.name.trim()) { onSave(form); onClose(); } }}
              disabled={!form.name.trim()}
              className="px-8 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg hover:brightness-110 active:scale-95"
              style={form.name.trim() ? { backgroundColor: form.color, boxShadow: `0 4px 20px ${form.color}50` } : { backgroundColor: '#333' }}
            >
              {initial ? 'Save Changes' : 'Create Strategy'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

