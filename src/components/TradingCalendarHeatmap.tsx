import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown, 
  Calendar as CalendarIcon,
  Sparkles,
  ArrowUpRight,
  Filter
} from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday 
} from 'date-fns';
import { getTradeDate } from '../lib/timeUtils';
import { useNavigate } from 'react-router-dom';

interface Trade {
  id?: string;
  date: string;
  pnl: number;
  symbol?: string;
  action?: string;
  isPositive?: boolean;
  accountId?: string;
  [key: string]: any;
}

interface TradingCalendarHeatmapProps {
  trades: Trade[];
  selectedAccountId?: string | null;
}

export function TradingCalendarHeatmap({ trades, selectedAccountId }: TradingCalendarHeatmapProps) {
  const navigate = useNavigate();
  
  // Find latest trade date if available, otherwise current date
  const initialDate = useMemo(() => {
    if (trades.length > 0) {
      const dates = trades.map(t => getTradeDate(t.date).getTime()).filter(t => !isNaN(t));
      if (dates.length > 0) {
        return new Date(Math.max(...dates));
      }
    }
    return new Date();
  }, [trades]);

  const [currentMonth, setCurrentMonth] = useState<Date>(initialDate);

  // Update month if trades change and current month is far off
  React.useEffect(() => {
    if (trades.length > 0) {
      const dates = trades.map(t => getTradeDate(t.date).getTime()).filter(t => !isNaN(t));
      if (dates.length > 0) {
        const latest = new Date(Math.max(...dates));
        // If current month has 0 trades but latest has trades, jump to latest
        const hasTradesInCurrent = trades.some(t => isSameMonth(getTradeDate(t.date), currentMonth));
        if (!hasTradesInCurrent) {
          setCurrentMonth(latest);
        }
      }
    }
  }, [trades]);

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const resetToLatest = () => setCurrentMonth(initialDate);

  // Group trades by date key "YYYY-MM-DD"
  const dailyTradeMap = useMemo(() => {
    const map: Record<string, { trades: Trade[]; netPnl: number; wins: number; losses: number }> = {};
    
    trades.forEach(t => {
      const d = getTradeDate(t.date);
      if (isNaN(d.getTime())) return;
      const key = format(d, 'yyyy-MM-dd');
      
      if (!map[key]) {
        map[key] = { trades: [], netPnl: 0, wins: 0, losses: 0 };
      }
      
      const pnl = Number(t.pnl) || 0;
      map[key].trades.push(t);
      map[key].netPnl += pnl;
      if (t.isPositive || pnl > 0) {
        map[key].wins += 1;
      } else if (pnl < 0) {
        map[key].losses += 1;
      }
    });

    return map;
  }, [trades]);

  // Calendar days grid
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  // Month Statistics
  const monthStats = useMemo(() => {
    let totalPnl = 0;
    let winDays = 0;
    let lossDays = 0;
    let totalTradesCount = 0;
    let bestDayPnl = 0;
    let worstDayPnl = 0;

    Object.entries(dailyTradeMap).forEach(([dateStr, data]) => {
      const d = new Date(dateStr + 'T00:00:00');
      if (isSameMonth(d, currentMonth)) {
        totalPnl += data.netPnl;
        totalTradesCount += data.trades.length;
        if (data.netPnl > 0) {
          winDays += 1;
          if (data.netPnl > bestDayPnl) bestDayPnl = data.netPnl;
        } else if (data.netPnl < 0) {
          lossDays += 1;
          if (data.netPnl < worstDayPnl) worstDayPnl = data.netPnl;
        }
      }
    });

    const activeDays = winDays + lossDays;
    const winDayRate = activeDays > 0 ? (winDays / activeDays) * 100 : 0;

    return {
      totalPnl,
      winDays,
      lossDays,
      activeDays,
      winDayRate,
      totalTradesCount,
      bestDayPnl,
      worstDayPnl
    };
  }, [dailyTradeMap, currentMonth]);

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="bg-white dark:bg-[#16181f] rounded-3xl p-4 sm:p-6 md:p-7 border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs space-y-5">
      
      {/* Top Header & Month Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] font-semibold">
              <CalendarIcon className="w-3 h-3" />
              P&L Calendar
            </span>
          </div>
          <h3 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight mt-1">
            Trading Activity Heatmap
          </h3>
        </div>

        {/* Month Selector Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={resetToLatest}
            className="btn-secondary py-1 px-2.5 text-xs"
          >
            Today
          </button>
          
          <div className="segment-pill-container">
            <button
              onClick={prevMonth}
              className="p-1 hover:bg-white dark:hover:bg-neutral-700 rounded-lg text-gray-600 dark:text-gray-300 transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-xs font-bold text-gray-900 dark:text-white min-w-[90px] text-center select-none">
              {format(currentMonth, 'MMM yyyy')}
            </span>
            <button
              onClick={nextMonth}
              className="p-1 hover:bg-white dark:hover:bg-neutral-700 rounded-lg text-gray-600 dark:text-gray-300 transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Month Performance Quick Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 pt-1">
        <div className="p-3 rounded-2xl bg-gray-50/70 dark:bg-neutral-800/40 border border-gray-100 dark:border-neutral-800 flex flex-col justify-between">
          <span className="text-[10px] sm:text-[11px] font-medium text-gray-400">Month P&L</span>
          <span className={`text-sm sm:text-base font-bold tabular-nums ${monthStats.totalPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
            {monthStats.totalPnl >= 0 ? `+$${monthStats.totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `-$${Math.abs(monthStats.totalPnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-gray-50/70 dark:bg-neutral-800/40 border border-gray-100 dark:border-neutral-800 flex flex-col justify-between">
          <span className="text-[10px] sm:text-[11px] font-medium text-gray-400">Win / Loss</span>
          <div className="flex items-baseline gap-1">
            <span className="text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {monthStats.winDays}W
            </span>
            <span className="text-xs text-gray-400">/</span>
            <span className="text-sm sm:text-base font-bold text-rose-500 tabular-nums">
              {monthStats.lossDays}L
            </span>
            <span className="text-[9px] sm:text-[10px] text-gray-400 font-medium ml-auto">
              ({monthStats.winDayRate.toFixed(0)}%)
            </span>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-gray-50/70 dark:bg-neutral-800/40 border border-gray-100 dark:border-neutral-800 flex flex-col justify-between">
          <span className="text-[10px] sm:text-[11px] font-medium text-gray-400">Best Day</span>
          <span className="text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {monthStats.bestDayPnl > 0 ? `+$${monthStats.bestDayPnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-gray-50/70 dark:bg-neutral-800/40 border border-gray-100 dark:border-neutral-800 flex flex-col justify-between">
          <span className="text-[10px] sm:text-[11px] font-medium text-gray-400">Executions</span>
          <span className="text-sm sm:text-base font-bold text-gray-900 dark:text-white tabular-nums">
            {monthStats.totalTradesCount} {monthStats.totalTradesCount === 1 ? 'trade' : 'trades'}
          </span>
        </div>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-[9px] sm:text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider py-1">
        {daysOfWeek.map((day, idx) => (
          <div key={day} className={idx >= 5 ? 'text-gray-300 dark:text-neutral-600' : ''}>
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid Matrix */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {calendarDays.map((day, idx) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayData = dailyTradeMap[dateKey];
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isCurrentDay = isToday(day);
          const hasTrades = !!dayData && dayData.trades.length > 0;
          const isPositive = hasTrades && dayData.netPnl >= 0;

          // Intensity calculation
          let bgClass = "bg-gray-50/40 dark:bg-neutral-900/30 border-gray-100/90 dark:border-neutral-800/60";
          let pnlClass = "text-gray-400";

          if (hasTrades) {
            if (isPositive) {
              bgClass = "bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200/90 dark:border-emerald-800/40 hover:bg-emerald-100/80 dark:hover:bg-emerald-950/50";
              pnlClass = "text-emerald-700 dark:text-emerald-400";
            } else {
              bgClass = "bg-rose-50/80 dark:bg-rose-950/30 border-rose-200/90 dark:border-rose-800/40 hover:bg-rose-100/80 dark:hover:bg-rose-950/50";
              pnlClass = "text-rose-700 dark:text-rose-400";
            }
          } else if (isCurrentDay) {
            bgClass = "bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/50";
          }

          return (
            <div
              key={dateKey}
              onClick={() => hasTrades && navigate('/trades')}
              className={`
                aspect-square sm:aspect-auto sm:min-h-[84px] p-1 sm:p-2 rounded-xl sm:rounded-2xl border transition-all duration-200 flex flex-col justify-between relative group
                ${isCurrentMonth ? 'opacity-100' : 'opacity-20 pointer-events-none'}
                ${bgClass}
                ${hasTrades ? 'cursor-pointer shadow-2xs hover:shadow-md hover:scale-[1.02]' : ''}
              `}
            >
              {/* Day Number Header */}
              <div className="flex items-center justify-between w-full">
                <span className={`text-[9px] sm:text-[11px] font-bold ${isCurrentDay ? 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/80 px-1 sm:px-1.5 py-0.2 rounded-md' : 'text-gray-400 dark:text-gray-500'}`}>
                  {format(day, 'd')}
                </span>
                
                {hasTrades && (
                  <>
                    <span className={`hidden sm:inline-flex text-[10px] font-semibold px-1.5 py-0.2 rounded-full ${isPositive ? 'bg-emerald-100/80 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300' : 'bg-rose-100/80 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300'}`}>
                      {dayData.trades.length} {dayData.trades.length === 1 ? 'tr' : 'trs'}
                    </span>
                    <span className={`sm:hidden w-1.5 h-1.5 rounded-full ${isPositive ? 'bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.8)]' : 'bg-rose-500 shadow-[0_0_4px_rgba(244,63,94,0.8)]'}`} />
                  </>
                )}
              </div>

              {/* Day Content / P&L (Desktop detailed, Mobile compact) */}
              {hasTrades ? (
                <>
                  <div className="space-y-0.5 mt-auto hidden sm:block">
                    <div className={`text-xs sm:text-sm font-black tabular-nums tracking-tight ${pnlClass}`}>
                      {dayData.netPnl >= 0 ? `+$${dayData.netPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `-$${Math.abs(dayData.netPnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </div>
                    <div className="text-[10px] text-gray-400 flex items-center gap-1 font-medium truncate">
                      {dayData.trades.map(t => t.symbol).filter((v, i, a) => a.indexOf(v) === i).slice(0, 2).join(', ')}
                    </div>
                  </div>
                  <div className="sm:hidden mt-auto text-[8px] font-extrabold tabular-nums tracking-tighter truncate text-center leading-none">
                    <span className={isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}>
                      {dayData.netPnl >= 0 ? '+' : '-'}${Math.abs(Math.round(dayData.netPnl))}
                    </span>
                  </div>
                </>
              ) : null}

              {/* Hover Tooltip for Detailed Day Summary */}
              {hasTrades && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col gap-1.5 p-3 rounded-2xl bg-gray-900/95 dark:bg-neutral-800/95 text-white text-xs shadow-2xl backdrop-blur-md z-30 min-w-[180px] pointer-events-none">
                  <div className="flex items-center justify-between border-b border-white/10 pb-1">
                    <span className="font-semibold text-[11px] text-gray-300">{format(day, 'EEE, MMM d, yyyy')}</span>
                    <span className={`font-bold tabular-nums ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {dayData.netPnl >= 0 ? '+' : ''}${dayData.netPnl.toFixed(2)}
                    </span>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto pt-1">
                    {dayData.trades.map((t, tIdx) => (
                      <div key={t.id || tIdx} className="flex items-center justify-between text-[11px] text-gray-300">
                        <span className="font-medium">{t.action} {t.symbol}</span>
                        <span className={`tabular-nums font-bold ${(Number(t.pnl) || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {(Number(t.pnl) || 0) >= 0 ? '+' : ''}${Number(t.pnl || 0).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-gray-100 dark:border-neutral-800/80 text-xs text-gray-400">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-md bg-emerald-500/20 border border-emerald-500/40"></span>
            <span className="text-[10px] sm:text-[11px]">Profitable</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-md bg-rose-500/20 border border-rose-500/40"></span>
            <span className="text-[10px] sm:text-[11px]">Loss</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-md bg-gray-100 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700"></span>
            <span className="text-[10px] sm:text-[11px]">No Trading</span>
          </div>
        </div>

        <button 
          onClick={() => navigate('/trades')}
          className="text-[11px] sm:text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 self-end sm:self-auto"
        >
          <span>View All in Trades Log</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

    </div>
  );
}
