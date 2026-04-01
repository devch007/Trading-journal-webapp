import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronLeft, Edit, Activity, BarChart, BookOpen, Brain, TrendingUp, TrendingDown } from 'lucide-react';
import { useStrategies } from '../contexts/StrategyContext';
import { useTrades } from '../hooks/useTrades';
import { cn } from '../lib/utils';

export function StrategyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { strategies } = useStrategies();
  const { trades } = useTrades();

  const strategy = useMemo(() => strategies.find(s => s.id === id), [strategies, id]);

  const strategyTrades = useMemo(() => {
    if (!strategy) return [];
    return trades.filter(t => t.strategy === strategy.name).sort((a, b) => {
      // Sort by date ascending for cumulative PnL
      const dateA = new Date(a.date.replace('Today, ', '').replace('Yesterday, ', '')).getTime();
      const dateB = new Date(b.date.replace('Today, ', '').replace('Yesterday, ', '')).getTime();
      return dateA - dateB;
    });
  }, [trades, strategy]);

  const { stats, chartData } = useMemo(() => {
    let cumulativePnl = 0;
    const data = strategyTrades.map((t, idx) => {
      cumulativePnl += t.pnl;
      return {
        name: `Trade ${idx + 1}`,
        raw: t.pnl,
        pnl: cumulativePnl,
        isPositive: t.isPositive
      };
    });

    const wins = strategyTrades.filter(t => t.isPositive).length;
    const total = strategyTrades.length;
    const winRate = total > 0 ? (wins / total) * 100 : 0;

    return {
      stats: { total, wins, winRate, netPnl: cumulativePnl },
      chartData: data
    };
  }, [strategyTrades]);

  if (!strategy) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
        <h2 className="text-xl font-bold text-white mb-2">Strategy Not Found</h2>
        <button onClick={() => navigate('/strategies')} className="text-primary hover:underline">Return to Strategies</button>
      </div>
    );
  }

  const color = strategy.color || '#3b82f6';

  const CustomTooltip = ({ active, payload, label, data }: any) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      const isPositive = value >= 0;
      return (
        <div className="bg-[#1a1a24]/90 backdrop-blur-md p-3 rounded-xl border border-white/10 flex flex-col gap-1 shadow-xl">
          <p className="text-on-surface-variant font-label text-xs uppercase tracking-wider">{label}</p>
          <div className="flex items-center gap-2">
            <p className="font-data font-bold text-lg text-white">${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <div className={`flex items-center ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col min-h-full pb-10 overflow-hidden relative">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] opacity-10 pointer-events-none blur-[150px] rounded-full" style={{ background: color }} />

      {/* Header */}
      <div className="px-8 pt-8 pb-4 border-b border-white/5 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/strategies')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-colors border border-white/5"
          >
            <ChevronLeft className="w-4 h-4" /> Go Back
          </button>
          <div className="w-px h-6 bg-white/10" />
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }} />
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight leading-tight">{strategy.name}</h1>
              <p className="text-xs text-gray-500 font-medium">{stats.total} trades • {stats.winRate.toFixed(1)}% win rate</p>
            </div>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-white/5 hover:bg-white/10 transition-colors border border-white/10">
          <Edit className="w-4 h-4" /> Edit
        </button>
      </div>

      <div className="px-8 mt-6 flex-1 flex flex-col xl:flex-row gap-6 z-10 w-full">
        {/* Left Column (Main) */}
        <div className="flex-1 flex flex-col gap-6 w-full xl:w-2/3">
          
          {/* Stats Bar */}
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
            {[
              { label: 'Total Trades', value: stats.total.toString(), icon: BarChart },
              { label: 'All-Time Win %', value: `${stats.winRate.toFixed(1)}%`, icon: Activity, positive: stats.winRate >= 50 },
              { label: 'Closed Trades', value: stats.total.toString(), icon: BookOpen },
              { label: 'Net P&L', value: `${stats.netPnl >= 0 ? '+' : ''}$${stats.netPnl.toFixed(2)}`, icon: TrendingUp, positive: stats.netPnl >= 0 }
            ].map(stat => (
              <div key={stat.label} className="flex-1 min-w-[200px] bg-black/40 border border-white/5 rounded-2xl p-5 flex items-start gap-4">
                <div className="p-2 lg:p-3 rounded-xl bg-white/5 border border-white/5">
                  <stat.icon className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mb-1">{stat.label}</p>
                  <p className={cn(
                    "text-xl font-bold text-white",
                    stat.positive !== undefined && (stat.positive ? "text-emerald-400" : "text-rose-400")
                  )}>
                    {stat.value}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Chart Section */}
          <div className="bg-black/40 border border-white/5 rounded-2xl overflow-hidden flex flex-col flex-1 min-h-[400px]">
             <div className="p-6 border-b border-white/5">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  Cumulative Performance
                  <Activity className="w-4 h-4 text-gray-500" />
                </h2>
             </div>
             <div className="flex-1 p-6 relative">
                {stats.total === 0 ? (
                   <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
                     <BarChart className="w-12 h-12 mb-3 opacity-20" />
                     <p className="font-bold text-white/40">No closed trades yet</p>
                     <p className="text-xs">Close some trades using this strategy to see cumulative P&L</p>
                   </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorPnL" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={color} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" stroke="#ffffff20" tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={false} />
                      <YAxis stroke="#ffffff20" tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                      <Tooltip content={<CustomTooltip data={chartData} />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
                      <Area type="monotone" dataKey="pnl" stroke={color} strokeWidth={3} fillOpacity={1} fill="url(#colorPnL)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
             </div>
          </div>

          {/* Table List (Mocked structure for now) */}
          <div className="bg-black/40 border border-white/5 rounded-2xl flex-1 max-h-[300px] flex flex-col mb-4">
             <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-4 p-4 border-b border-white/5 text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-white/[0.02]">
                <div>Symbol</div>
                <div>Direction</div>
                <div>Entry Price</div>
                <div>Exit Price</div>
                <div>Status</div>
                <div>Net P&L</div>
             </div>
             <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {strategyTrades.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-sm font-bold text-gray-600">No trades recorded</div>
                ) : (
                  strategyTrades.map(trade => (
                    <div key={trade.id} className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-4 items-center px-4 py-3 bg-white/5 rounded-xl text-sm border border-white/5 hover:border-white/10 transition-colors">
                      <div className="font-bold text-white">{trade.symbol}</div>
                      <div className={cn("font-bold", trade.action === 'BUY' ? 'text-emerald-400' : 'text-rose-400')}>{trade.action}</div>
                      <div className="text-gray-300 font-mono">1.000</div>
                      <div className="text-gray-300 font-mono">--</div>
                      <div><span className="px-2 py-1 rounded bg-white/10 text-xs font-bold text-gray-300">CLOSED</span></div>
                      <div className={cn("font-bold font-mono", trade.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                        {trade.pnl >= 0 ? '+' : ''}${Math.abs(trade.pnl).toFixed(2)}
                      </div>
                    </div>
                  ))
                )}
             </div>
          </div>

        </div>

        {/* Right Column (Sidebar) */}
        <div className="w-full xl:w-1/3 flex flex-col gap-6">
          
          {/* Journal Panel */}
          <div className="bg-black/40 border border-white/5 rounded-2xl flex flex-col overflow-hidden">
             <div className="p-5 border-b border-white/5 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-gray-400" />
                <h3 className="text-sm font-bold text-white">Trading Journal</h3>
             </div>
             <div className="p-5 flex-1 flex flex-col">
                <button className="w-full py-3 rounded-xl bg-green-500/10 text-emerald-400 border border-green-500/20 font-bold text-sm mb-6 hover:bg-green-500/20 transition-colors">
                  + Write New Entry
                </button>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-bold text-white">Recent Entries</span>
                  <span className="text-xs text-gray-500">0 of 0</span>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/10 rounded-xl">
                  <BookOpen className="w-8 h-8 text-gray-600 mb-3" />
                  <p className="text-sm font-bold text-white/50 mb-1">No entries yet</p>
                  <p className="text-xs text-gray-500">Start journaling your trading experience</p>
                </div>
             </div>
          </div>

          {/* AI Insight Panel */}
          <div className="bg-black/40 border border-white/5 rounded-2xl flex flex-col overflow-hidden">
             <div className="p-5 border-b border-white/5 flex items-center gap-2">
                <Brain className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">AI Insight</h3>
             </div>
             <div className="p-5 flex-1 flex flex-col">
                 <p className="text-xs text-gray-500 mb-4">Personalized trading analysis</p>
                 <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl mb-4">
                   <div className="flex items-center gap-2 mb-2">
                     <Activity className="w-4 h-4 text-indigo-400" />
                     <span className="text-xs font-bold text-white">Latest Analysis</span>
                   </div>
                   <p className="text-xs text-indigo-100/70 leading-relaxed">
                     Your recent trades show strong momentum in crypto markets. Consider reducing position sizes on weekend trades to manage risk better.
                   </p>
                 </div>
                 <button className="w-full py-3 mt-auto rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-sm transition-colors shadow-lg shadow-indigo-500/20">
                    <span className="flex items-center justify-center gap-2">
                       <TrendingUp className="w-4 h-4" />
                       Closed Trades Analysis
                    </span>
                 </button>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}
