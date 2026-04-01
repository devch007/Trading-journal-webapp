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

export function StrategyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { strategies, updateStrategy } = useStrategies();
  const { trades, updateTrades } = useTrades();

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

  const strategy = useMemo(() => strategies.find(s => s.id === id), [strategies, id]);

  const strategyTrades = useMemo(() => {
    if (!strategy) return [];
    
    // Robust filtering: case-insensitive and fallback to tag
    const filtered = trades.filter(t => {
      const sName = strategy.name.toLowerCase().trim();
      const sMatch = t.strategy?.toLowerCase().trim() === sName;
      const tMatch = t.tag?.toLowerCase().trim() === sName;
      return sMatch || tMatch;
    });

    // Improved date parsing for "Today, ..." and "Yesterday, ..."
    const parseTradeDate = (dateStr: string) => {
      let d = dateStr;
      if (d.startsWith('Today, ')) {
        const time = d.split(', ')[1];
        return new Date(`${new Date().toDateString()} ${time}`);
      }
      if (d.startsWith('Yesterday, ')) {
        const time = d.split(', ')[1];
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return new Date(`${yesterday.toDateString()} ${time}`);
      }
      return new Date(d);
    };

    // Time-based filtering
    const now = new Date();
    const rangeFiltered = filtered.filter(t => {
      if (timeRange === 'ALL') return true;
      const tradeDate = parseTradeDate(t.date);
      if (isNaN(tradeDate.getTime())) return true; 
      
      const diffDays = (now.getTime() - tradeDate.getTime()) / (1000 * 3600 * 24);
      if (timeRange === '1W') return diffDays <= 7;
      if (timeRange === '1M') return diffDays <= 30;
      return true;
    });

    // Safe sorting using the new parser
    return rangeFiltered.sort((a, b) => {
      const dateA = parseTradeDate(a.date).getTime();
      const dateB = parseTradeDate(b.date).getTime();
      
      if (isNaN(dateA)) return 1;
      if (isNaN(dateB)) return -1;
      return dateA - dateB;
    });
  }, [trades, strategy, timeRange]);

  const { stats, chartData } = useMemo(() => {
    let cumulativePnl = 0;
    const data = strategyTrades.map((t, idx) => {
      cumulativePnl += t.pnl;
      return {
        name: t.symbol,
        tradeIndex: idx + 1,
        raw: t.pnl,
        pnl: cumulativePnl,
        isPositive: t.pnl >= 0,
        date: t.date,
        symbol: t.symbol,
        action: t.action
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

  const journaledTrades = useMemo(() => {
    return strategyTrades.filter(t => t.notes || (t.emotions && t.emotions.length > 0));
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

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#0d0d16] border border-white/10 p-4 rounded-xl shadow-2xl backdrop-blur-md min-w-[200px]">
          <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/5">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{data.date}</span>
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded", data.action === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400')}>
              {data.action}
            </span>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Asset</span>
              <span className="text-white font-bold">{data.symbol}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Result</span>
              <span className={cn("font-bold", data.raw >= 0 ? "text-emerald-400" : "text-rose-400")}>
                {data.raw >= 0 ? '+' : ''}${Math.abs(data.raw).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm pt-2 mt-2 border-t border-white/5">
              <span className="text-gray-500">Cumulative</span>
              <span className="text-white font-bold text-lg">${data.pnl.toFixed(2)}</span>
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
      <div className="absolute top-0 right-0 w-[600px] h-[600px] opacity-10 pointer-events-none blur-[150px] rounded-full transition-colors duration-1000" style={{ background: color }} />

      {/* Header */}
      <div className="px-8 pt-8 pb-4 border-b border-white/5 flex items-center justify-between z-10 sticky top-0 bg-[#06060c]/80 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/strategies')}
            className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all border border-white/5"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Go Back
          </button>
          <div className="w-px h-6 bg-white/10" />
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full relative group">
              <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ backgroundColor: color }} />
              <div className="relative w-full h-full rounded-full shadow-[0_0_15px_rgba(0,0,0,0.5)]" style={{ backgroundColor: color, border: '2px solid rgba(255,255,255,0.1)' }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight leading-tight flex items-center gap-2">
                {strategy.name}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">{stats.total} trades recorded</span>
                <span className="w-1 h-1 rounded-full bg-gray-700" />
                <span className={cn("text-xs font-bold", stats.winRate >= 50 ? "text-emerald-400" : "text-rose-400")}>
                  {stats.winRate.toFixed(1)}% Win Rate
                </span>
              </div>
            </div>
          </div>
        </div>
        <button 
          onClick={() => setIsEditModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-white/5 hover:bg-white/10 transition-all border border-white/10 hover:border-white/20 active:scale-95"
        >
          <Edit className="w-4 h-4" /> Edit Strategy
        </button>
      </div>

      <div className="px-8 mt-6 flex-1 flex flex-col xl:flex-row gap-6 z-10 w-full">
        {/* Left Column (Main) */}
        <div className="flex-1 flex flex-col gap-6 w-full xl:w-2/3">
          
          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Trades', value: stats.total.toString(), icon: BarChart, color: 'text-indigo-400' },
              { label: 'All-Time Win %', value: `${stats.winRate.toFixed(1)}%`, icon: Activity, positive: stats.winRate >= 50, color: stats.winRate >= 50 ? 'text-emerald-400' : 'text-rose-400' },
              { label: 'Closed Trades', value: stats.total.toString(), icon: BookOpen, color: 'text-blue-400' },
              { label: 'Net P&L', value: `${stats.netPnl >= 0 ? '+' : ''}$${stats.netPnl.toFixed(2)}`, icon: TrendingUp, positive: stats.netPnl >= 0, color: stats.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400' }
            ].map(stat => (
              <div key={stat.label} className="bg-black/40 border border-white/5 rounded-2xl p-5 flex flex-col gap-3 group hover:border-white/10 transition-all shadow-sm">
                <div className="flex items-center justify-between">
                  <div className={cn("p-2 rounded-xl bg-white/5 border border-white/5 group-hover:bg-white/10 transition-colors", stat.color)}>
                    <stat.icon className="w-4 h-4" />
                  </div>
                  {stat.positive !== undefined && (
                    <div className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded capitalize", stat.positive ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400")}>
                      {stat.positive ? "Profit" : "Loss"}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mb-1">{stat.label}</p>
                  <p className={cn("text-2xl font-bold text-white tracking-tight", stat.color)}>
                    {stat.value}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Chart Section */}
          <div className="bg-black/40 border border-white/5 rounded-2xl overflow-hidden flex flex-col flex-1 min-h-[450px] shadow-sm">
             <div className="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    Cumulative Performance
                    <Activity className="w-4 h-4 text-gray-500" />
                  </h2>
                  <p className="text-xs text-on-surface-variant font-medium mt-0.5">Tracking ROI of {strategy.name} setups</p>
                </div>
                <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 self-start">
                  {(['1W', '1M', 'ALL'] as const).map(range => (
                    <button
                      key={range}
                      onClick={() => setTimeRange(range)}
                      className={cn(
                        "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                        timeRange === range 
                          ? "bg-white/10 text-white shadow-sm ring-1 ring-white/5" 
                          : "text-gray-500 hover:text-gray-300"
                      )}
                    >
                      {range === 'ALL' ? 'All Time' : range}
                    </button>
                  ))}
                </div>
             </div>
             <div className="flex-1 p-6 relative">
                {stats.total === 0 ? (
                   <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
                     <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                       <BarChart className="w-8 h-8 opacity-20" />
                     </div>
                     <p className="font-bold text-white/40">No strategy trades found</p>
                     <p className="text-xs max-w-[250px] text-center mt-1">Tag your trades with "{strategy.name}" during import or journal to see performance.</p>
                   </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorPnL" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={color} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                      <XAxis 
                        dataKey="tradeIndex" 
                        stroke="#ffffff10" 
                        tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} 
                        tickLine={false} 
                        axisLine={false} 
                        label={{ value: 'TRADE #', position: 'insideBottom', offset: -10, fill: '#475569', fontSize: 8, fontWeight: 'bold' }}
                      />
                      <YAxis 
                        stroke="#ffffff10" 
                        tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} 
                        tickLine={false} 
                        axisLine={false} 
                        tickFormatter={(val) => `$${val}`} 
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
                      <Area 
                        type="monotone" 
                        dataKey="pnl" 
                        stroke={color} 
                        strokeWidth={4} 
                        fillOpacity={1} 
                        fill="url(#colorPnL)" 
                        animationDuration={1500}
                        dot={{ r: 4, fill: '#0d0d16', stroke: color, strokeWidth: 2 }}
                        activeDot={{ r: 6, fill: color, stroke: '#fff', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
             </div>
          </div>

          {/* Table List */}
          <div className="bg-black/40 border border-white/5 rounded-2xl shadow-sm flex flex-col overflow-hidden mb-4">
             <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  Trade History
                  <Clock className="w-4 h-4 text-gray-500" />
                </h3>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input type="text" placeholder="Search strategy trades..." className="bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50" />
                  </div>
                </div>
             </div>
             
             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="border-b border-white/5 text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-white/[0.02]">
                     <th className="px-6 py-4">Symbol</th>
                     <th className="px-6 py-4">Direction</th>
                     <th className="px-6 py-4">Status</th>
                     <th className="px-6 py-4">Execution</th>
                     <th className="px-6 py-4 text-right">Result</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-white/[0.02]">
                   {strategyTrades.length === 0 ? (
                     <tr>
                       <td colSpan={5} className="px-6 py-12 text-center text-sm font-bold text-gray-600">No trades recorded</td>
                     </tr>
                   ) : (
                     [...strategyTrades].reverse().map(trade => (
                       <tr 
                        key={trade.id} 
                        onClick={() => { setSelectedTrade(trade); setIsTradeModalOpen(true); }}
                        className="group hover:bg-white/[0.03] transition-colors cursor-pointer"
                       >
                         <td className="px-6 py-4">
                           <div className="flex flex-col">
                             <span className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{trade.symbol}</span>
                             <span className="text-[10px] text-gray-500 uppercase tracking-tighter">{trade.date}</span>
                           </div>
                         </td>
                         <td className="px-6 py-4">
                           <span className={cn(
                             "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black tracking-widest uppercase",
                             trade.action === 'BUY' ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                           )}>
                             {trade.action === 'BUY' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                             {trade.action}
                           </span>
                         </td>
                         <td className="px-6 py-4">
                           <span className="px-2 py-0.5 rounded bg-white/10 text-[9px] font-bold text-gray-300">CLOSED</span>
                         </td>
                         <td className="px-6 py-4">
                            <span className="text-xs font-mono text-gray-400">1.00 Lot</span>
                         </td>
                         <td className="px-6 py-4 text-right">
                           <div className="flex flex-col items-end">
                             <span className={cn("text-sm font-bold font-mono", trade.pnl >= 0 ? "text-emerald-400" : "text-rose-400")}>
                               {trade.pnl >= 0 ? '+' : ''}${Math.abs(trade.pnl).toFixed(2)}
                             </span>
                             {trade.pnl !== 0 && (
                               <div className={cn("flex items-center text-[10px]", trade.pnl > 0 ? "text-emerald-500/50" : "text-rose-500/50")}>
                                 {trade.pnl > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                 {Math.abs((trade.pnl / 1000) * 100).toFixed(1)}% ROI
                               </div>
                             )}
                           </div>
                         </td>
                       </tr>
                     ))
                   )}
                 </tbody>
               </table>
             </div>
          </div>

        </div>

        {/* Right Column (Sidebar) */}
        <div className="w-full xl:w-1/3 flex flex-col gap-6">
          
          {/* Strategy Details Sidebar */}
          <div className="bg-black/40 border border-white/5 rounded-2xl p-6 shadow-sm">
             <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                <Target className="w-3.5 h-3.5 text-blue-400" />
                Playbook Rules
             </h3>
             <div className="space-y-3">
                {strategy.rules && strategy.rules.length > 0 ? (
                  strategy.rules.map((rule, idx) => (
                    <div key={idx} className="flex gap-3 text-xs leading-relaxed group">
                      <div className="w-5 h-5 rounded bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-gray-500 group-hover:text-blue-400 group-hover:border-blue-500/20 transition-all">
                        {idx + 1}
                      </div>
                      <p className="text-gray-400 transition-colors">{rule}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-600 italic">No specific rules defined for this strategy yet.</p>
                )}
             </div>

             <div className="mt-6 pt-6 border-t border-white/5 space-y-4">
                <div>
                   <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">Timeframes</span>
                   <div className="flex flex-wrap gap-2">
                      {strategy.timeframes?.map(tf => (
                        <span key={tf} className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] font-bold text-gray-300">{tf}</span>
                      ))}
                   </div>
                </div>
                <div>
                   <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">Labels</span>
                   <div className="flex flex-wrap gap-2">
                      {strategy.tags?.map(t => (
                        <span key={t} className="px-2 py-1 rounded border text-[10px] font-bold" style={{ backgroundColor: color + '10', borderColor: color + '30', color: color }}>{t}</span>
                      ))}
                   </div>
                </div>
             </div>
          </div>

          {/* Journal Panel */}
          <div className="bg-black/40 border border-white/5 rounded-2xl flex flex-col overflow-hidden shadow-sm">
             <div className="p-5 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-gray-400" />
                  <h3 className="text-sm font-bold text-white">Trading Journal</h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/5 text-gray-500 uppercase tracking-widest">
                  {journaledTrades.length} Logged
                </span>
             </div>
             <div className="p-5 flex-1 flex flex-col">
                <button 
                  onClick={() => navigate('/journal')}
                  className="group w-full py-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-sm mb-6 hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                  Write New Entry
                </button>
                
                {journaledTrades.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
                      <BookOpen className="w-6 h-6 text-gray-600" />
                    </div>
                    <p className="text-sm font-bold text-white/50 mb-1">Empty Journal</p>
                    <p className="text-xs text-gray-500 max-w-[150px]">Your reflective insights will appear here.</p>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col gap-3">
                    {journaledTrades.slice(0, 3).map(trade => (
                      <motion.div 
                        key={trade.id} 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-white/10 transition-all cursor-pointer group shadow-sm active:scale-[0.98]" 
                        onClick={() => navigate('/journal')}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight">{trade.symbol} • {trade.action}</span>
                          <Calendar className="w-3 h-3 text-gray-600" />
                        </div>
                        {trade.notes && (
                          <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed italic">"{trade.notes}"</p>
                        )}
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{trade.date.replace('Today, ', '').replace('Yesterday, ', '')}</span>
                          {trade.emotions && trade.emotions.length > 0 && (
                            <div className="flex gap-1.5">
                              {trade.emotions.slice(0, 2).map((emo: string) => (
                                <span key={emo} className="px-1.5 py-0.5 rounded-md bg-white/5 text-[9px] text-gray-500 font-bold uppercase">{emo}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                    {journaledTrades.length > 3 && (
                      <button onClick={() => navigate('/journal')} className="text-[10px] text-center w-full font-bold text-gray-500 hover:text-white transition-colors py-2 uppercase tracking-widest">
                        View all {journaledTrades.length} entries
                      </button>
                    )}
                  </div>
                )}
             </div>
          </div>

          {/* AI Insight Panel */}
          <div className="bg-[#0f0f1b] border border-indigo-500/20 rounded-2xl flex flex-col overflow-hidden shadow-[0_10px_40px_rgba(79,70,229,0.1)]">
             <div className="p-5 border-b border-indigo-500/10 flex items-center justify-between bg-gradient-to-r from-indigo-500/10 to-transparent">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-bold text-white tracking-tight">AI Strategy Context</h3>
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
             </div>
             <div className="p-5 flex-1 flex flex-col">
                 <p className="text-[10px] text-indigo-300/70 font-bold uppercase tracking-widest mb-4">Behavioral Intelligence</p>
                 <div className="p-4 bg-white/[0.03] border border-indigo-500/10 rounded-2xl mb-4 relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-2 opacity-50 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="w-4 h-4 text-gray-600" />
                   </div>
                   <div className="flex items-center gap-2 mb-3">
                     <div className="w-6 h-6 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                        <Activity className="w-3 h-3 text-indigo-400" />
                     </div>
                     <span className="text-[10px] font-bold text-indigo-100">Performance Forecast</span>
                   </div>
                   <p className="text-xs text-gray-400 leading-relaxed">
                     Your <span className="text-indigo-400 font-bold">"{strategy.name}"</span> setup currently has a {stats.winRate.toFixed(0)}% edge. 
                     Consistency is high, but watch for slippage during high-volatility sessions.
                   </p>
                 </div>
                 <button 
                  onClick={() => navigate('/ai-engine')}
                  className="w-full py-3.5 mt-auto rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 active:scale-[0.98] border border-indigo-400/20"
                 >
                   <TrendingUp className="w-4 h-4" />
                   Full AI Performance Deep-Dive
                 </button>
             </div>
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
