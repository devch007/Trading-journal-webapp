import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Target, Plus, Trash2, Edit3, TrendingUp, TrendingDown,
  CheckSquare, Square, Tag, X, Layers, BarChart3, ChevronDown, ChevronUp, BookOpen, Search
} from 'lucide-react';
import { TopBar } from '../lib/TopBar';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { useStrategies, Strategy } from '../contexts/StrategyContext';
import { useTrades } from '../hooks/useTrades';
import { StrategyModal } from '../components/StrategyModal';
import { STRATEGY_COLORS } from '../constants/strategy';
import { useAccountContext } from '../contexts/AccountContext';

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
  const navigate = useNavigate();
  const isPos = pnl >= 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => navigate(`/strategies/${strategy.id}`)}
      className="bg-white dark:bg-[#16181f] border border-gray-200/80 dark:border-neutral-800/80 rounded-3xl overflow-hidden shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group cursor-pointer"
    >
      <div>
        {/* Cover Image or Color stripe */}
        {strategy.imageUrl ? (
          <div className="relative h-36 w-full overflow-hidden">
            <img
              src={strategy.imageUrl}
              alt={`${strategy.name} cover`}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute top-3 left-3 w-3.5 h-3.5 rounded-full shadow-md ring-2 ring-white" style={{ backgroundColor: strategy.color }} />
          </div>
        ) : (
          <div className="h-2 w-full" style={{ background: `linear-gradient(90deg, ${strategy.color}, ${strategy.color}40)` }} />
        )}

        <div className="p-6">
          {/* Header row */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-2xs"
                style={{ backgroundColor: strategy.color + '15', border: `1px solid ${strategy.color}30` }}
              >
                <Layers className="w-5 h-5" style={{ color: strategy.color }} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white tracking-tight">{strategy.name}</h3>
                {strategy.description && (
                  <p className="text-xs font-normal text-gray-400 mt-0.5 line-clamp-1">{strategy.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={(e) => { e.stopPropagation(); onEdit(); }} 
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(); }} 
                className="p-1.5 rounded-lg hover:bg-rose-50 text-gray-400 hover:text-rose-600 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2.5 mb-4">
            <div className="bg-gray-50/80 dark:bg-neutral-800/40 border border-gray-100 dark:border-neutral-800 rounded-2xl p-3">
              <p className="text-[10px] font-medium text-gray-400 mb-0.5">Trades</p>
              <p className="text-sm font-bold tabular-nums text-gray-900 dark:text-white">
                {tradesCount}
              </p>
            </div>
            <div className="bg-gray-50/80 dark:bg-neutral-800/40 border border-gray-100 dark:border-neutral-800 rounded-2xl p-3">
              <p className="text-[10px] font-medium text-gray-400 mb-0.5">Win Rate</p>
              <p className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {tradesCount > 0 ? `${winRate.toFixed(1)}%` : '—'}
              </p>
            </div>
            <div className="bg-gray-50/80 dark:bg-neutral-800/40 border border-gray-100 dark:border-neutral-800 rounded-2xl p-3">
              <p className="text-[10px] font-medium text-gray-400 mb-0.5">Net P&L</p>
              <p className={`text-sm font-bold tabular-nums truncate ${isPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                {tradesCount > 0 ? `${isPos ? '+' : '-'}$${Math.abs(pnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
              </p>
            </div>
          </div>

          {/* Timeframes & Tags */}
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            {strategy.timeframes?.map(tf => (
              <span key={tf} className="px-2 py-0.5 rounded-md text-[10px] font-semibold"
                style={{ backgroundColor: strategy.color + '15', color: strategy.color }}>
                {tf}
              </span>
            ))}
            {strategy.tags?.map(tag => (
              <span key={tag} className="px-2 py-0.5 rounded-md text-[10px] bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-gray-400 font-normal">
                #{tag}
              </span>
            ))}
          </div>

          {/* Rules toggle */}
          {strategy.rules && strategy.rules.length > 0 && (
            <div className="pt-2 border-t border-gray-100 dark:border-neutral-800">
              <button
                onClick={(e) => { e.stopPropagation(); setExpanded(e => !e); }}
                className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>{strategy.rules.length} Rules</span>
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
                        <div key={i} className="flex items-start gap-2 p-2.5 bg-gray-50 dark:bg-neutral-800/60 rounded-xl border border-gray-100 dark:border-neutral-700/60 text-xs text-gray-700 dark:text-gray-300">
                          <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: strategy.color }} />
                          <span>{rule}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export function Strategies() {
  const { strategies, loading, addStrategy, updateStrategy, deleteStrategy } = useStrategies();
  const { trades: allTrades, updateTrades } = useTrades();
  const { selectedAccountId } = useAccountContext();

  const trades = useMemo(() => allTrades, [allTrades]);

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Strategy | undefined>(undefined);
  const [search, setSearch] = useState('');

  const strategyStats = useMemo(() => {
    const map: Record<string, { count: number; pnl: number; wins: number }> = {};
    (trades || []).forEach(t => {
      const key = t.strategy || t.tag || 'Untagged';
      if (!map[key]) map[key] = { count: 0, pnl: 0, wins: 0 };
      map[key].count++;
      map[key].pnl += Number(t.pnl) || 0;
      if (t.isPositive || Number(t.pnl) > 0) map[key].wins++;
    });
    return map;
  }, [trades]);

  const filtered = useMemo(() => {
    const explicitStrategies = strategies;
    const synthesizedStrategies = Object.keys(strategyStats)
      .filter(name => name !== 'Untagged' && !explicitStrategies.some(s => s.name === name))
      .map(name => ({
        id: `auto-${name}`,
        name,
        description: 'Auto-generated from trade history',
        color: '#3b82f6',
      } as Strategy));
      
    return [...explicitStrategies, ...synthesizedStrategies].filter(s => 
      s.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [strategies, search, strategyStats]);

  const summaryStats = useMemo(() => {
    const totalTrades = trades.length;
    const totalPnl = trades.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
    
    let best = null as { name: string; pnl: number } | null;
    Object.keys(strategyStats).forEach(name => {
      if (name !== 'Untagged') {
        const stat = strategyStats[name];
        if (!best || stat.pnl > best.pnl) {
          best = { name, pnl: stat.pnl };
        }
      }
    });

    const uniqueCount = Object.keys(strategyStats).filter(n => n !== 'Untagged').length 
                        + strategies.filter(s => !strategyStats[s.name]).length;

    return { totalTrades, totalPnl, bestStrategy: best, strategyCount: uniqueCount };
  }, [strategies, trades, strategyStats]);

  return (
    <div className="flex flex-col min-h-full pb-10">
      <TopBar 
        title="Strategy Builder" 
        subtitle="Build, track & manage your trading playbooks" 
        showSearch={true}
        actionButton={
          <button 
            onClick={() => { setEditTarget(undefined); setShowForm(true); }}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            <span>New Strategy</span>
          </button>
        }
      />

      <div className="p-6 md:p-8 space-y-7 max-w-[1600px] w-full mx-auto">

        {/* Summary Metric Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-[#16181f] p-5 rounded-3xl border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs flex flex-col justify-between gap-1.5">
            <p className="text-xs font-medium text-gray-400">Total Strategies</p>
            <h2 className="text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
              {summaryStats.strategyCount}
            </h2>
            <p className="text-[11px] text-gray-400 font-normal">Active & tested playbooks</p>
          </div>

          <div className="bg-white dark:bg-[#16181f] p-5 rounded-3xl border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs flex flex-col justify-between gap-1.5">
            <p className="text-xs font-medium text-gray-400">Best Strategy</p>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">
              {summaryStats.bestStrategy?.name || 'Gold Strategy'}
            </h2>
            <p className="text-[11px] font-semibold text-emerald-600 tabular-nums">
              {summaryStats.bestStrategy ? `+$${summaryStats.bestStrategy.pnl.toFixed(2)} Net P&L` : '+75% Win Rate'}
            </p>
          </div>

          <div className="bg-white dark:bg-[#16181f] p-5 rounded-3xl border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs flex flex-col justify-between gap-1.5">
            <p className="text-xs font-medium text-gray-400">Total Strategy Trades</p>
            <h2 className="text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
              {summaryStats.totalTrades}
            </h2>
            <p className="text-[11px] text-gray-400 font-normal">Executed journal entries</p>
          </div>

          <div className="bg-white dark:bg-[#16181f] p-5 rounded-3xl border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs flex flex-col justify-between gap-1.5">
            <p className="text-xs font-medium text-gray-400">Combined Net P&L</p>
            <h2 className={`text-2xl font-bold tabular-nums ${summaryStats.totalPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
              {summaryStats.totalPnl >= 0 ? `+$${summaryStats.totalPnl.toFixed(2)}` : `-$${Math.abs(summaryStats.totalPnl).toFixed(2)}`}
            </h2>
            <p className="text-[11px] text-gray-400 font-normal">Across all playbooks</p>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search strategies..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#16181f] border border-gray-200/90 dark:border-neutral-800 rounded-2xl text-xs text-gray-900 dark:text-white placeholder:text-gray-400 font-normal focus:outline-none focus:ring-1 focus:ring-black/10 dark:focus:ring-white/20 shadow-2xs transition-all"
            />
          </div>
          <span className="text-xs font-medium text-gray-400">
            {filtered.length} strategies active
          </span>
        </div>

        {/* Strategies Cards Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-60 text-gray-400">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3" />
            <span className="text-xs font-medium">Loading strategies...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-[#16181f] rounded-3xl border border-gray-200/80 dark:border-neutral-800/80 p-12 text-center shadow-2xs flex flex-col items-center justify-center">
            <Layers className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
            <h3 className="text-base font-bold text-gray-900 dark:text-white">No strategies found</h3>
            <p className="text-xs text-gray-400 mt-1 mb-5">Create your first trading playbook with defined rules</p>
            <button
              onClick={() => { setEditTarget(undefined); setShowForm(true); }}
              className="px-5 py-2.5 rounded-2xl bg-[#111827] dark:bg-white text-white dark:text-gray-900 font-semibold text-xs shadow-xs"
            >
              Create Strategy
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
                    onDelete={async () => {
                      if (window.confirm(`Are you sure you want to delete "${strategy.name}"?`)) {
                        if (!strategy.id.startsWith('auto-')) {
                          deleteStrategy(strategy.id);
                        }
                        const tradeIds = trades.filter(t => t.strategy === strategy.name || t.tag === strategy.name).map(t => t.id);
                        if (tradeIds.length > 0) {
                          await updateTrades(tradeIds, { strategy: '', tag: '' });
                        }
                      }
                    }}
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
