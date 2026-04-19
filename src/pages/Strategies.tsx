import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Target, Plus, Trash2, Edit3, TrendingUp, TrendingDown,
  CheckSquare, Square, Tag, X, Layers, BarChart3, ChevronDown, ChevronUp, BookOpen
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

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => navigate(`/strategies/${strategy.id}`)}
      className="relative group cursor-pointer"
    >
      {/* Glow */}
      <div
        className="absolute -inset-0.5 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500"
        style={{ background: `linear-gradient(135deg, ${strategy.color}22, ${strategy.color}11)` }}
      />

      <div className="relative bg-[#0d0d16] border border-white/5 group-hover:border-white/10 rounded-2xl overflow-hidden transition-all">
        {/* Cover Image or Color stripe */}
        {strategy.imageUrl ? (
          <div className="relative h-32 w-full overflow-hidden">
            <img
              src={strategy.imageUrl}
              alt={`${strategy.name} cover`}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-[#0d0d16]" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/20" />
            {/* Color accent badge */}
            <div className="absolute top-3 left-3 w-3 h-3 rounded-full shadow-lg" style={{ backgroundColor: strategy.color, boxShadow: `0 0 10px ${strategy.color}88` }} />
          </div>
        ) : (
          <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${strategy.color}, transparent)` }} />
        )}

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
                <h3 className="type-h2 text-white">{strategy.name}</h3>
                {strategy.description && (
                  <p className="type-body text-[12px] mt-0.5 line-clamp-1">{strategy.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={(e) => { e.stopPropagation(); onEdit(); }} 
                className="p-2 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-all"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(); }} 
                className="p-2 rounded-lg hover:bg-[#E5534B]/10 text-gray-500 hover:text-[#E5534B] transition-all"
              >
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
                <p className="type-label text-[10px] mb-1">{stat.label}</p>
                <p className={cn(
                  'type-h2 tnum',
                  stat.positive !== undefined
                    ? (stat.positive ? 'text-[#1ED760]' : 'text-[#E5534B]')
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
                <span key={tf} className="px-2 py-0.5 rounded type-micro text-[10px]"
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
                <span key={tag} className="px-2 py-0.5 rounded-full type-micro text-[10px] bg-white/5 border border-white/5 text-[#6A6A6A]">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Rules toggle */}
          {strategy.rules && strategy.rules.length > 0 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setExpanded(e => !e); }}
                className="flex items-center gap-1.5 type-body text-[12px] text-[#6A6A6A] hover:text-[#A7A7A7] transition-colors mt-2"
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
                          <span className="type-body text-[12px] text-[#A7A7A7]">{rule}</span>
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
      map[key].pnl += t.pnl;
      if (t.isPositive) map[key].wins++;
    });
    return map;
  }, [trades]);

  const filtered = useMemo(() => {
    // 1. Gather all explicit strategies created by user
    const explicitStrategies = strategies;
    
    // 2. Synthesize missing strategies from trade history
    const synthesizedStrategies = Object.keys(strategyStats)
      .filter(name => name !== 'Untagged' && !explicitStrategies.some(s => s.name === name))
      .map(name => ({
        id: `auto-${name}`,
        name,
        description: 'Auto-generated from trade history',
        color: '#3b82f6', // default blue
      } as Strategy));
      
    // 3. Combine and filter by search
    return [...explicitStrategies, ...synthesizedStrategies].filter(s => 
      s.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [strategies, search, strategyStats]);

  const summaryStats = useMemo(() => {
    const totalTrades = trades.length;
    const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
    
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
    <div className="flex flex-col min-h-full pb-10 relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-5%] w-[35%] h-[35%] bg-blue-500/8 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[30%] h-[30%] bg-indigo-500/6 blur-[120px] rounded-full" />
      </div>

      <TopBar title="Strategy Builder" subtitle="Build, track & manage your trading playbooks" showSearch={false} />

      <div className="px-4 md:px-8 flex-1 space-y-8 relative z-10">

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
              <p className="type-label mb-2">{item.label}</p>
              <p className={cn('type-h1 tnum', item.positive !== undefined ? (item.positive ? 'text-[#1ED760]' : 'text-[#E5534B]') : 'text-white')}>
                {item.value}
              </p>
              <p className="type-body text-[10px] text-[#6A6A6A] mt-1">{item.sub}</p>
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
            <span className="type-label"> {filtered.length} strategies</span>
          </div>
          <button
            onClick={() => { setEditTarget(undefined); setShowForm(true); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl type-nav text-white transition-all shadow-[0_0_20px_rgba(59,130,246,0.2)] hover:shadow-[0_0_30px_rgba(59,130,246,0.35)] bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            New Strategy
          </button>
        </div>

        {/* Cards Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-60 text-gray-500">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3" />
            <span className="type-micro">Loading...</span>
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
                    onDelete={async () => {
                      if (window.confirm(`Are you sure you want to delete the strategy "${strategy.name}"? This will also remove the strategy tag from all associated trades.`)) {
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
