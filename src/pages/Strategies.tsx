import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Target, Plus, Trash2, Edit3, TrendingUp, TrendingDown,
  CheckSquare, Square, Tag, X, Layers, BarChart3, ChevronDown, ChevronUp, BookOpen
} from 'lucide-react';
import { TopBar } from '../lib/TopBar';
import { cn } from '../lib/utils';
import { useStrategies, Strategy } from '../contexts/StrategyContext';
import { useTrades } from '../hooks/useTrades';

const STRATEGY_COLORS = [
  '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#84cc16', '#f97316', '#6366f1'
];

const TIMEFRAME_OPTIONS = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1'];

const DEFAULT_RULES = [
  'Entry must align with trend direction',
  'Stop loss required before entry',
  'Min 1:2 risk-to-reward ratio',
  'No trades during major news events',
];

interface StrategyFormData {
  name: string;
  description: string;
  color: string;
  timeframes: string[];
  rules: string[];
  tags: string[];
}

const emptyForm = (): StrategyFormData => ({
  name: '',
  description: '',
  color: STRATEGY_COLORS[0],
  timeframes: ['H1'],
  rules: [],
  tags: [],
});

function StrategyModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: Strategy;
  onSave: (data: StrategyFormData) => void;
  onClose: () => void;
}) {
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

interface StrategyCardProps {
  strategy: Strategy;
  onEdit: () => void;
  onDelete: () => void;
  tradesCount: number;
  pnl: number;
  winRate: number;
}

const StrategyCard: React.FC<StrategyCardProps> = ({ strategy, onEdit, onDelete, tradesCount, pnl, winRate }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative group"
    >
      {/* Glow */}
      <div
        className="absolute -inset-0.5 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500"
        style={{ background: `linear-gradient(135deg, ${strategy.color}22, ${strategy.color}11)` }}
      />

      <div className="relative bg-[#0d0d16] border border-white/5 group-hover:border-white/10 rounded-2xl overflow-hidden transition-all">
        {/* Color stripe */}
        <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${strategy.color}, transparent)` }} />

        <div className="p-6">
          {/* Header row */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: strategy.color + '20', border: `1.5px solid ${strategy.color}40` }}
              >
                <Layers className="w-5 h-5" style={{ color: strategy.color }} />
              </div>
              <div>
                <h3 className="font-bold text-white text-base tracking-tight">{strategy.name}</h3>
                {strategy.description && (
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{strategy.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={onEdit} className="p-2 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-all">
                <Edit3 className="w-4 h-4" />
              </button>
              <button onClick={onDelete} className="p-2 rounded-lg hover:bg-rose-500/10 text-gray-500 hover:text-rose-400 transition-all">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[
              { label: 'Trades', value: tradesCount.toString(), icon: BarChart3 },
              { label: 'Win Rate', value: tradesCount > 0 ? `${winRate.toFixed(1)}%` : 'N/A', positive: winRate >= 50 },
              { label: 'Net P&L', value: tradesCount > 0 ? `${pnl >= 0 ? '+' : ''}$${Math.abs(pnl).toFixed(2)}` : 'N/A', positive: pnl >= 0 },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/[0.03] border border-white/5 rounded-xl p-3">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">{stat.label}</p>
                <p className={cn(
                  'text-sm font-bold',
                  stat.positive !== undefined
                    ? (stat.positive ? 'text-emerald-400' : 'text-rose-400')
                    : 'text-white'
                )}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* Timeframes */}
          {strategy.timeframes && strategy.timeframes.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {strategy.timeframes.map(tf => (
                <span key={tf} className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                  style={{ backgroundColor: strategy.color + '15', color: strategy.color }}>
                  {tf}
                </span>
              ))}
            </div>
          )}

          {/* Tags */}
          {strategy.tags && strategy.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {strategy.tags.map(tag => (
                <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-white/5 border border-white/5 text-gray-400">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Rules toggle */}
          {strategy.rules && strategy.rules.length > 0 && (
            <>
              <button
                onClick={() => setExpanded(e => !e)}
                className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-300 transition-colors mt-2"
              >
                <BookOpen className="w-3.5 h-3.5" />
                {strategy.rules.length} Rules
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 space-y-1.5">
                      {strategy.rules.map((rule, i) => (
                        <div key={i} className="flex items-start gap-2 p-2.5 bg-white/[0.03] rounded-lg border border-white/5">
                          <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: strategy.color }} />
                          <span className="text-xs text-gray-400">{rule}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function Strategies() {
  const { strategies, loading, addStrategy, updateStrategy, deleteStrategy } = useStrategies();
  const { trades } = useTrades();

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Strategy | undefined>(undefined);
  const [search, setSearch] = useState('');

  const strategyStats = useMemo(() => {
    const map: Record<string, { count: number; pnl: number; wins: number }> = {};
    (trades || []).forEach(t => {
      const key = t.strategy || t.tag || 'Untagged';
      if (!map[key]) map[key] = { count: 0, pnl: 0, wins: 0 };
      map[key].count++;
      map[key].pnl += t.pnl;
      if (t.isPositive) map[key].wins++;
    });
    return map;
  }, [trades]);

  const filtered = useMemo(
    () => strategies.filter(s => s.name.toLowerCase().includes(search.toLowerCase())),
    [strategies, search]
  );

  const summaryStats = useMemo(() => {
    const totalTrades = trades.length;
    const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
    const bestStrategy = strategies.reduce<{ name: string; pnl: number } | null>((best, s) => {
      const stat = strategyStats[s.name];
      if (!stat) return best;
      if (!best || stat.pnl > best.pnl) return { name: s.name, pnl: stat.pnl };
      return best;
    }, null);
    return { totalTrades, totalPnl, bestStrategy, strategyCount: strategies.length };
  }, [strategies, trades, strategyStats]);

  return (
    <div className="flex flex-col min-h-full pb-10 relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-5%] w-[35%] h-[35%] bg-blue-500/8 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[30%] h-[30%] bg-indigo-500/6 blur-[120px] rounded-full" />
      </div>

      <TopBar title="Strategy Builder" subtitle="Build, track & manage your trading playbooks" showSearch={false} />

      <div className="px-8 flex-1 space-y-8 relative z-10">

        {/* Summary Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {[
            { label: 'Total Strategies', value: summaryStats.strategyCount.toString(), sub: 'playbooks built' },
            { label: 'Best Strategy', value: summaryStats.bestStrategy?.name || 'N/A', sub: summaryStats.bestStrategy ? `$${summaryStats.bestStrategy.pnl.toFixed(2)} net P&L` : 'No data yet' },
            { label: 'Total Trades', value: summaryStats.totalTrades.toString(), sub: 'across all strategies' },
            {
              label: 'Net P&L',
              value: `${summaryStats.totalPnl >= 0 ? '+' : ''}$${summaryStats.totalPnl.toFixed(2)}`,
              sub: 'combined performance',
              positive: summaryStats.totalPnl >= 0
            },
          ].map((item) => (
            <div key={item.label} className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 backdrop-blur-xl hover:border-blue-500/20 transition-all group">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">{item.label}</p>
              <p className={cn('text-xl font-bold', item.positive !== undefined ? (item.positive ? 'text-emerald-400' : 'text-rose-400') : 'text-white')}>
                {item.value}
              </p>
              <p className="text-[10px] text-gray-600 mt-1">{item.sub}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search strategies..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-black/40 border border-white/10 rounded-xl pl-4 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/40 transition-all w-64 placeholder:text-gray-600"
              />
            </div>
            <span className="text-xs text-gray-500 font-bold">{filtered.length} strategies</span>
          </div>
          <button
            onClick={() => { setEditTarget(undefined); setShowForm(true); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-[0_0_20px_rgba(59,130,246,0.2)] hover:shadow-[0_0_30px_rgba(59,130,246,0.35)] bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            New Strategy
          </button>
        </div>

        {/* Cards Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-60 text-gray-500">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3" />
            <span className="text-sm font-bold uppercase tracking-widest">Loading...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-72 border border-dashed border-white/10 rounded-2xl text-gray-600">
            <Layers className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-base font-bold text-white/30 mb-2">No strategies yet</p>
            <p className="text-sm text-gray-600 mb-6">Build your first trading playbook to track performance per strategy</p>
            <button
              onClick={() => { setEditTarget(undefined); setShowForm(true); }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 transition-all shadow-[0_0_20px_rgba(59,130,246,0.2)]"
            >
              <Plus className="w-4 h-4" />
              Create First Strategy
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <AnimatePresence>
              {filtered.map(strategy => {
                const stat = strategyStats[strategy.name] || { count: 0, pnl: 0, wins: 0 };
                const winRate = stat.count > 0 ? (stat.wins / stat.count) * 100 : 0;
                return (
                  <StrategyCard
                    key={strategy.id}
                    strategy={strategy}
                    tradesCount={stat.count}
                    pnl={stat.pnl}
                    winRate={winRate}
                    onEdit={() => { setEditTarget(strategy); setShowForm(true); }}
                    onDelete={() => deleteStrategy(strategy.id)}
                  />
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <AnimatePresence>
        {showForm && (
          <StrategyModal
            initial={editTarget}
            onClose={() => { setShowForm(false); setEditTarget(undefined); }}
            onSave={data => {
              if (editTarget) {
                updateStrategy(editTarget.id, data);
              } else {
                addStrategy(data);
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
