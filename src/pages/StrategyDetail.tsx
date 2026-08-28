import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { 
  ChevronLeft, Edit, Activity, BarChart, BookOpen, Brain, 
  TrendingUp, TrendingDown, Clock, Target, Calendar, ArrowUpRight, 
  ArrowDownRight, Search, Filter, MoreHorizontal, Plus
} from 'lucide-react';
import { useStrategies } from '../contexts/StrategyContext';
import { useTrades, Trade } from '../hooks/useTrades';
import { cn } from '../lib/utils';
import { StrategyModal } from '../components/StrategyModal';
import { TradeModal } from '../components/TradeModal';
import { useAccountContext } from '../contexts/AccountContext';
import { getTradeDate } from '../lib/timeUtils';
import { TopBar } from '../lib/TopBar';

export function StrategyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { strategies, updateStrategy } = useStrategies();
  const { trades: allTrades, updateTrades } = useTrades();
  const { accounts } = useAccountContext();
  
  const trades = useMemo(() => allTrades, [allTrades]);

  const [timeRange, setTimeRange] = useState<'1W' | '1M' | 'ALL'>('ALL');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);

  const handleTradeUpdate = async (tradeData: any) => {
    if (selectedTrade) {
      await updateTrades([selectedTrade.id], tradeData);
      setIsTradeModalOpen(false);
      setSelectedTrade(null);
    }
  };

  const strategy = useMemo(() => {
    const explicit = strategies.find(s => s.id === id);
    if (explicit) return explicit;

    if (id?.startsWith('auto-')) {
      const name = id.replace('auto-', '');
      const hasTrades = trades.some(t => {
        const sName = name.toLowerCase().trim();
        return t.strategy?.toLowerCase().trim() === sName ||
               t.tag?.toLowerCase().trim() === sName ||
               (Array.isArray(t.tags) && t.tags.some(tag => tag.toLowerCase().trim() === sName));
      });

      if (hasTrades) {
        return {
          id,
          name,
          description: 'Auto-generated from trade history',
          color: '#3b82f6',
          tags: [name]
        } as any;
      }
    }
    return undefined;
  }, [strategies, id, trades]);

  const strategyTrades = useMemo(() => {
    if (!strategy) return [];
    
    const filtered = trades.filter(t => {
      const sName = strategy.name.toLowerCase().trim();
      const sMatch = t.strategy?.toLowerCase().trim() === sName;
      const tMatch = t.tag?.toLowerCase().trim() === sName;
      const tagsMatch = Array.isArray(t.tags) && t.tags.some(tag => tag.toLowerCase().trim() === sName);
      return sMatch || tMatch || tagsMatch;
    });

    const now = new Date();
    const rangeFiltered = filtered.filter(t => {
      if (timeRange === 'ALL') return true;
      const tradeDate = getTradeDate(t.date);
      
      const diffDays = (now.getTime() - tradeDate.getTime()) / (1000 * 3600 * 24);
      if (timeRange === '1W') return diffDays <= 7 && diffDays >= -2;
      if (timeRange === '1M') return diffDays <= 30 && diffDays >= -2;
      return true;
    });

    return rangeFiltered.sort((a, b) => {
      const dateA = getTradeDate(a.date).getTime();
      const dateB = getTradeDate(b.date).getTime();
      return dateA - dateB;
    });
  }, [trades, strategy, timeRange]);

  const { stats, chartData } = useMemo(() => {
    let cumulativePnl = 0;
    const wins = strategyTrades.filter(t => t.pnl > 0);
    const losses = strategyTrades.filter(t => t.pnl < 0);
    const winRate = strategyTrades.length > 0 ? (wins.length / strategyTrades.length) * 100 : 0;
    const totalPnl = strategyTrades.reduce((acc, t) => acc + (Number(t.pnl) || 0), 0);
    
    const grossProfit = wins.reduce((acc, t) => acc + t.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((acc, t) => acc + t.pnl, 0));
    const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss) : grossProfit > 0 ? 100 : 0;

    const data = strategyTrades.map((t, idx) => {
      cumulativePnl += Number(t.pnl) || 0;
      return {
        tradeIndex: idx + 1,
        pnl: cumulativePnl,
        singlePnl: t.pnl,
        symbol: t.symbol,
        date: t.date
      };
    });

    return {
      stats: {
        total: strategyTrades.length,
        winRate,
        netPnl: totalPnl,
        profitFactor,
        winsCount: wins.length,
        lossesCount: losses.length
      },
      chartData: data
    };
  }, [strategyTrades]);

  if (!strategy) {
    return (
      <div className="flex flex-col min-h-full items-center justify-center p-8 text-center">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Strategy Not Found</h2>
        <p className="text-sm text-gray-400 mb-6">The strategy playbook you are looking for does not exist or has been removed.</p>
        <button 
          onClick={() => navigate('/strategies')} 
          className="px-5 py-2.5 rounded-2xl bg-[#111827] dark:bg-white text-white dark:text-gray-900 font-semibold text-xs shadow-xs"
        >
          Back to Strategies
        </button>
      </div>
    );
  }

  const color = strategy.color || '#3b82f6';

  return (
    <div className="flex flex-col min-h-full pb-10">
      <TopBar 
        title={strategy.name} 
        subtitle="Strategy performance analytics and playbook metrics" 
        showSearch={true}
        actionButton={
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate('/strategies')}
              className="p-2 rounded-2xl bg-white dark:bg-[#16181f] border border-gray-200 dark:border-neutral-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 shadow-2xs"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setIsEditModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-semibold text-white dark:text-gray-900 bg-[#111827] dark:bg-white shadow-xs hover:bg-black dark:hover:bg-gray-100"
            >
              <Edit className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Edit Strategy</span>
            </button>
          </div>
        }
      />

      <div className="p-6 md:p-8 space-y-7 max-w-[1600px] w-full mx-auto">
        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-[#16181f] p-5 rounded-3xl border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs flex flex-col justify-between gap-1">
            <span className="text-xs font-medium text-gray-400">Total Strategy Trades</span>
            <span className="text-2xl font-bold tabular-nums text-gray-900 dark:text-white">{stats.total}</span>
            <span className="text-[11px] text-gray-400">Across all sessions</span>
          </div>

          <div className="bg-white dark:bg-[#16181f] p-5 rounded-3xl border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs flex flex-col justify-between gap-1">
            <span className="text-xs font-medium text-gray-400">Win Rate</span>
            <span className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {stats.total > 0 ? `${stats.winRate.toFixed(1)}%` : '—'}
            </span>
            <span className="text-[11px] text-gray-400">{stats.winsCount} Wins · {stats.lossesCount} Losses</span>
          </div>

          <div className="bg-white dark:bg-[#16181f] p-5 rounded-3xl border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs flex flex-col justify-between gap-1">
            <span className="text-xs font-medium text-gray-400">Profit Factor</span>
            <span className="text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
              {stats.total > 0 ? stats.profitFactor.toFixed(2) : '—'}
            </span>
            <span className="text-[11px] text-gray-400">Risk-adjusted return</span>
          </div>

          <div className="bg-white dark:bg-[#16181f] p-5 rounded-3xl border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs flex flex-col justify-between gap-1">
            <span className="text-xs font-medium text-gray-400">Net Cumulative P&L</span>
            <span className={cn("text-2xl font-bold tabular-nums", stats.netPnl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500")}>
              {stats.netPnl >= 0 ? `+$${stats.netPnl.toFixed(2)}` : `-$${Math.abs(stats.netPnl).toFixed(2)}`}
            </span>
            <span className="text-[11px] text-gray-400">Strategy net profit</span>
          </div>
        </div>

        {/* Chart & Rules Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
          {/* Performance Chart (8 cols) */}
          <div className="lg:col-span-8 bg-white dark:bg-[#16181f] p-6 rounded-3xl border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs flex flex-col min-h-[420px]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Cumulative Performance</h3>
                <p className="text-xs text-gray-400">ROI progression across recorded trade executions</p>
              </div>
              <div className="flex bg-gray-100 dark:bg-neutral-800 p-1 rounded-xl">
                {(['1W', '1M', 'ALL'] as const).map(range => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs font-semibold transition-all",
                      timeRange === range 
                        ? "bg-white dark:bg-neutral-700 text-gray-900 dark:text-white shadow-2xs" 
                        : "text-gray-500"
                    )}
                  >
                    {range === 'ALL' ? 'All' : range}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 w-full min-h-[300px]">
              {chartData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <BarChart className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-xs font-medium">No strategy trade data in this time range</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorStrategyPnL" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.2}/>
                        <stop offset="95%" stopColor={color} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis dataKey="tradeIndex" stroke="#94a3b8" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={val => `$${val}`} />
                    <Tooltip />
                    <Area type="monotone" dataKey="pnl" stroke={color} strokeWidth={3} fill="url(#colorStrategyPnL)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Rules & Labels (4 cols) */}
          <div className="lg:col-span-4 bg-white dark:bg-[#16181f] p-6 rounded-3xl border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs space-y-5">
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Playbook Rules</h3>
              <p className="text-xs text-gray-400 mt-0.5">Checklist criteria for setup execution</p>
            </div>

            <div className="space-y-2">
              {strategy.rules && strategy.rules.length > 0 ? (
                strategy.rules.map((rule, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 p-3 bg-gray-50 dark:bg-neutral-800/40 rounded-2xl border border-gray-100 dark:border-neutral-800 text-xs text-gray-700 dark:text-gray-300">
                    <span className="w-5 h-5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center shrink-0 text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed font-medium">{rule}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-400 italic">No rules specified for this strategy.</p>
              )}
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-neutral-800 space-y-3">
              <div>
                <span className="text-[11px] font-medium text-gray-400 block mb-1.5">Active Timeframes</span>
                <div className="flex flex-wrap gap-1.5">
                  {strategy.timeframes?.map(tf => (
                    <span key={tf} className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-neutral-800 text-gray-800 dark:text-gray-200">
                      {tf}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-[11px] font-medium text-gray-400 block mb-1.5">Strategy Tags</span>
                <div className="flex flex-wrap gap-1.5">
                  {strategy.tags?.map(t => (
                    <span key={t} className="px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ backgroundColor: color + '15', color }}>
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Strategy Execution History Table */}
        <div className="bg-white dark:bg-[#16181f] rounded-3xl border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-neutral-800">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Executed Strategy Trades</h3>
            <p className="text-xs text-gray-400 mt-0.5">Historical logs linked to this playbook</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[11px] font-semibold text-gray-400 border-b border-gray-100 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-800/30">
                  <th className="px-6 py-3.5">Symbol</th>
                  <th className="px-6 py-3.5">Direction</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5 text-right">Net P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-neutral-800/40 text-xs">
                {strategyTrades.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-gray-400">
                      No trades recorded under this strategy yet.
                    </td>
                  </tr>
                ) : (
                  [...strategyTrades].reverse().map(trade => (
                    <tr 
                      key={trade.id}
                      onClick={() => { setSelectedTrade(trade); setIsTradeModalOpen(true); }}
                      className="hover:bg-gray-50/70 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{trade.symbol}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                          trade.action === 'BUY' ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40" : "bg-rose-50 text-rose-600 dark:bg-rose-950/40"
                        )}>
                          {trade.action === 'BUY' ? 'LONG' : 'SHORT'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-neutral-800 text-[10px] font-medium text-gray-600 dark:text-gray-300">
                          {trade.result || 'CLOSED'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-400 tabular-nums">{trade.date}</td>
                      <td className={cn("px-6 py-4 text-right font-bold tabular-nums", trade.pnl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500")}>
                        {trade.pnl >= 0 ? `+$${trade.pnl.toFixed(2)}` : `-$${Math.abs(trade.pnl).toFixed(2)}`}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {isEditModalOpen && (
          <StrategyModal
            initial={strategy}
            onSave={(data) => {
              updateStrategy(strategy.id, data);
              setIsEditModalOpen(false);
            }}
            onClose={() => setIsEditModalOpen(false)}
          />
        )}
        {isTradeModalOpen && selectedTrade && (
          <TradeModal
            isOpen={isTradeModalOpen}
            onClose={() => { setIsTradeModalOpen(false); setSelectedTrade(null); }}
            trade={selectedTrade}
            onSubmit={handleTradeUpdate}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
