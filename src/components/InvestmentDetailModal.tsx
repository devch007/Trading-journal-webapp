import React, { useState } from 'react';
import { 
  X, 
  TrendingUp, 
  TrendingDown, 
  Award, 
  ShieldCheck, 
  Target, 
  Calendar, 
  Edit3, 
  Clock, 
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Layers,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Holding } from '../hooks/useInvestments';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

interface InvestmentDetailModalProps {
  holding: Holding | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Holding>) => void;
}

export function InvestmentDetailModal({ holding, isOpen, onClose, onUpdate }: InvestmentDetailModalProps) {
  const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M' | '6M' | '1Y' | '3Y' | 'ALL'>('1M');
  const [isEditingThesis, setIsEditingThesis] = useState(false);
  const [thesisText, setThesisText] = useState(holding?.thesis || '');

  if (!isOpen || !holding) return null;

  const investedAmount = holding.quantity * holding.avgBuyPrice;
  const currentValue = holding.quantity * holding.currentPrice;
  const totalPnL = currentValue - investedAmount;
  const returnPercent = ((totalPnL / investedAmount) * 100);
  const isPositive = totalPnL >= 0;

  const scores = holding.scores || {
    overall: 82,
    fundamentals: 86,
    valuation: 74,
    growth: 89,
    risk: 68,
    conviction: 91
  };

  const chartData = (holding.priceHistory && holding.priceHistory.length > 0) ? holding.priceHistory : [
    { date: '1M Ago', price: holding.avgBuyPrice * 0.95 },
    { date: '3W Ago', price: holding.avgBuyPrice * 0.98 },
    { date: '2W Ago', price: holding.avgBuyPrice * 1.02 },
    { date: '1W Ago', price: holding.avgBuyPrice * 1.01 },
    { date: 'Today', price: holding.currentPrice }
  ];

  const handleSaveThesis = () => {
    onUpdate(holding.id, { thesis: thesisText });
    setIsEditingThesis(false);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-[#16181f] border border-gray-200 dark:border-neutral-800 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl no-scrollbar flex flex-col"
        >
          {/* Header Bar */}
          <div className="p-6 border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between sticky top-0 bg-white/90 dark:bg-[#16181f]/90 backdrop-blur-md z-20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-base shadow-xs">
                {holding.symbol.slice(0, 3)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                    {holding.name}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-300">
                    {holding.exchange}: {holding.symbol}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${holding.term === 'Short Term' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40' : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40'}`}>
                    {holding.term}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400 font-medium mt-0.5">
                  <span>{holding.sector}</span>
                  <span>•</span>
                  <span>{holding.marketCap}</span>
                  <span>•</span>
                  <span>{holding.type}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <span className="text-xs text-gray-400 font-medium">LTP</span>
                <div className="text-lg font-bold tabular-nums text-gray-900 dark:text-white">
                  ₹{holding.currentPrice.toLocaleString('en-IN')}
                </div>
                <div className={`text-xs font-semibold tabular-nums ${holding.dayChangePercent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                  {holding.dayChangePercent >= 0 ? '+' : ''}{holding.dayChangePercent}% today
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-7">
            {/* Position Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="p-4 rounded-2xl bg-gray-50/80 dark:bg-neutral-800/40 border border-gray-100 dark:border-neutral-800 space-y-1">
                <span className="text-[11px] font-medium text-gray-400">Total Invested</span>
                <p className="text-base font-bold tabular-nums text-gray-900 dark:text-white">
                  ₹{investedAmount.toLocaleString('en-IN')}
                </p>
                <span className="text-[10px] text-gray-400">
                  {holding.quantity} shares @ ₹{holding.avgBuyPrice.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50/80 dark:bg-neutral-800/40 border border-gray-100 dark:border-neutral-800 space-y-1">
                <span className="text-[11px] font-medium text-gray-400">Current Value</span>
                <p className="text-base font-bold tabular-nums text-gray-900 dark:text-white">
                  ₹{currentValue.toLocaleString('en-IN')}
                </p>
                <span className="text-[10px] text-gray-400">
                  Market value today
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50/80 dark:bg-neutral-800/40 border border-gray-100 dark:border-neutral-800 space-y-1">
                <span className="text-[11px] font-medium text-gray-400">Total Profit / Loss</span>
                <p className={`text-base font-bold tabular-nums ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                  {isPositive ? '+' : ''}₹{Math.abs(totalPnL).toLocaleString('en-IN')}
                </p>
                <span className={`text-[10px] font-bold tabular-nums ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                  {isPositive ? '+' : ''}{returnPercent.toFixed(2)}% Return
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50/80 dark:bg-neutral-800/40 border border-gray-100 dark:border-neutral-800 space-y-1">
                <span className="text-[11px] font-medium text-gray-400">Target & Exit</span>
                <p className="text-base font-bold tabular-nums text-blue-600 dark:text-blue-400">
                  {holding.targetPrice ? `₹${holding.targetPrice.toLocaleString('en-IN')}` : 'Open'}
                </p>
                <span className="text-[10px] text-gray-400">
                  {holding.stopLoss ? `SL: ₹${holding.stopLoss.toLocaleString('en-IN')}` : `Held: ${holding.holdingDays || 0}d`}
                </span>
              </div>
            </div>

            {/* Performance Chart with Average Buy Benchmark */}
            <div className="p-6 rounded-3xl bg-gray-50/60 dark:bg-neutral-800/30 border border-gray-100 dark:border-neutral-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span>Price & Position History</span>
                    <span className="text-[11px] font-normal text-gray-400">• Avg Buy: ₹{holding.avgBuyPrice.toLocaleString('en-IN')}</span>
                  </h3>
                </div>

                <div className="flex items-center gap-1 bg-white dark:bg-neutral-800 p-1 rounded-xl border border-gray-200/80 dark:border-neutral-700">
                  {(['1D', '1W', '1M', '6M', '1Y', '3Y', 'ALL'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setTimeframe(t)}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${timeframe === t ? 'bg-[#111827] dark:bg-white text-white dark:text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-56 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="holdingCurve" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(150, 150, 150, 0.08)" vertical={false} />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} domain={['auto', 'auto']} tickFormatter={(v) => `₹${v}`} />
                    <Tooltip 
                      formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Stock Price']}
                      contentStyle={{ backgroundColor: '#181920', borderColor: '#333', borderRadius: '12px', color: '#fff' }}
                    />
                    <ReferenceLine 
                      y={holding.avgBuyPrice} 
                      stroke="#f59e0b" 
                      strokeDasharray="4 4" 
                      label={{ value: 'Avg Buy', fill: '#f59e0b', fontSize: 10, position: 'insideTopLeft' }} 
                    />
                    <Area type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={2.5} fill="url(#holdingCurve)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Custom Investment Score Section */}
            <div className="p-6 rounded-3xl bg-gray-50/70 dark:bg-neutral-800/40 border border-gray-100 dark:border-neutral-800 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                      Your Investment Framework Score
                    </h3>
                    <p className="text-[11px] text-gray-400">Multi-factor conviction assessment</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black tabular-nums text-amber-500 font-headline">
                    {scores.overall}
                  </span>
                  <span className="text-xs text-gray-400">/ 100</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { label: 'Fundamentals', score: scores.fundamentals, color: 'bg-emerald-500' },
                  { label: 'Valuation', score: scores.valuation, color: 'bg-blue-500' },
                  { label: 'Growth', score: scores.growth, color: 'bg-indigo-500' },
                  { label: 'Risk', score: scores.risk, color: 'bg-amber-500' },
                  { label: 'Conviction', score: scores.conviction, color: 'bg-purple-500' },
                ].map((s, idx) => (
                  <div key={idx} className="p-3 rounded-2xl bg-white dark:bg-[#16181f] border border-gray-100 dark:border-neutral-800 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500 text-[11px] font-medium">{s.label}</span>
                      <span className="font-bold tabular-nums text-gray-900 dark:text-white">{s.score}</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                      <div style={{ width: `${s.score}%` }} className={`h-full rounded-full ${s.color}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Investment Thesis & Review Notes */}
            <div className="p-6 rounded-3xl bg-gray-50/70 dark:bg-neutral-800/40 border border-gray-100 dark:border-neutral-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    Investment Thesis & Review Plan
                  </h3>
                </div>
                {!isEditingThesis ? (
                  <button
                    onClick={() => setIsEditingThesis(true)}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Thesis</span>
                  </button>
                ) : (
                  <button
                    onClick={handleSaveThesis}
                    className="px-3 py-1 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors"
                  >
                    Save
                  </button>
                )}
              </div>

              {isEditingThesis ? (
                <textarea
                  value={thesisText}
                  onChange={(e) => setThesisText(e.target.value)}
                  className="w-full h-24 p-3 rounded-2xl bg-white dark:bg-[#16181f] border border-gray-200 dark:border-neutral-700 text-xs text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Why did you buy this? What is your catalyst and exit plan?"
                />
              ) : (
                <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed bg-white dark:bg-[#16181f] p-4 rounded-2xl border border-gray-100 dark:border-neutral-800">
                  {holding.thesis || "No thesis written yet. Click 'Edit Thesis' to document your investment logic."}
                </p>
              )}

              <div className="flex flex-wrap gap-4 text-xs text-gray-400 pt-1">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span>Last Reviewed: {holding.lastReviewDate || 'Recent'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">Next Review: {holding.nextReviewDate || 'In 90 Days'}</span>
                </div>
              </div>
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
