import React, { useMemo } from 'react';
import { Trade } from '../hooks/useTrades';

interface MonthlyPnLCalendarProps {
  trades: Trade[];
}

export function MonthlyPnLCalendar({ trades }: MonthlyPnLCalendarProps) {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  
  // Adjust so Monday is 0, Sunday is 6
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  
  // Group trades by day
  const tradesByDay = useMemo(() => {
    const grouped: Record<number, { pnl: number, count: number }> = {};
    
    trades.forEach(trade => {
      // Parse trade date. Format is "Today, 10:21:00" or actual date string
      // For simplicity, we'll assume trades with "Today" belong to today's date
      // In a real app, trade.createdAt should be used
      let tradeDate = new Date();
      if (trade.createdAt) {
        const parsed = new Date(trade.createdAt);
        if (!isNaN(parsed.getTime())) {
          tradeDate = parsed;
        }
      } else if (trade.date.startsWith('Today')) {
        tradeDate = new Date();
      } else {
        // Try to parse
        const parsed = new Date(trade.date);
        if (!isNaN(parsed.getTime())) {
          tradeDate = parsed;
        }
      }
      
      if (tradeDate.getFullYear() === year && tradeDate.getMonth() === month) {
        const day = tradeDate.getDate();
        if (!grouped[day]) {
          grouped[day] = { pnl: 0, count: 0 };
        }
        grouped[day].pnl += trade.pnl;
        grouped[day].count += 1;
      }
    });
    
    return grouped;
  }, [trades, year, month]);

  const totalMonthlyPnl: number = Object.keys(tradesByDay).reduce((sum, key) => sum + tradesByDay[Number(key)].pnl, 0);

  const formatCurrency = (val: number) => {
    const absVal = Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return val >= 0 ? `+$${absVal}` : `-$${absVal}`;
  };

  // Generate calendar grid
  const weeks: { days: (number | null)[], weeklyPnl: number }[] = [];
  let currentWeek: (number | null)[] = Array(startOffset).fill(null);
  let currentWeeklyPnl = 0;
  
  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(day);
    if (tradesByDay[day]) {
      currentWeeklyPnl += tradesByDay[day].pnl;
    }
    
    if (currentWeek.length === 7) {
      weeks.push({ days: currentWeek, weeklyPnl: currentWeeklyPnl });
      currentWeek = [];
      currentWeeklyPnl = 0;
    }
  }
  
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push({ days: currentWeek, weeklyPnl: currentWeeklyPnl });
  }

  return (
    <div className="glass-card p-6 rounded-2xl flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h3 className="font-headline text-xl font-bold text-white">Monthly P&L</h3>
        <div className="flex items-center gap-4 text-sm font-bold">
          <span className="text-gray-400">Monthly: <span className={totalMonthlyPnl >= 0 ? 'text-primary' : 'text-rose-400'}>{formatCurrency(totalMonthlyPnl)}</span></span>
          <span className="text-gray-400">{monthName} {year}</span>
        </div>
      </div>
      
      <div className="grid grid-cols-8 gap-2">
        {/* Header Row */}
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
          <div key={i} className="text-center text-xs font-bold text-gray-500 uppercase tracking-wider pb-2">
            {day}
          </div>
        ))}
        <div className="text-center text-xs font-bold text-gray-500 uppercase tracking-wider pb-2">
          Weekly
        </div>

        {/* Calendar Grid */}
        {weeks.map((week, weekIndex) => (
          <React.Fragment key={weekIndex}>
            {week.days.map((day, dayIndex) => {
              const dayData = day ? tradesByDay[day] : null;
              let bgColor = "bg-white/5";
              let borderColor = "border-white/5";
              
              if (dayData) {
                if (dayData.pnl > 0) {
                  bgColor = "bg-primary/10";
                  borderColor = "border-primary/30";
                } else if (dayData.pnl < 0) {
                  bgColor = "bg-rose-500/10";
                  borderColor = "border-rose-500/30";
                }
              }
              
              // Highlight today
              const isToday = day === currentDate.getDate();
              if (isToday && !dayData) {
                borderColor = "border-primary/50";
              }

              return (
                <div 
                  key={dayIndex} 
                  className={`aspect-square rounded-xl border ${borderColor} ${bgColor} p-2 flex flex-col justify-between transition-colors hover:border-white/20`}
                >
                  {day && (
                    <span className={`text-xs font-bold ${isToday ? 'text-primary' : 'text-gray-500'}`}>
                      {day}
                    </span>
                  )}
                  {dayData && (
                    <div className="flex flex-col items-end">
                      <span className={`text-[10px] font-bold ${dayData.pnl >= 0 ? 'text-primary' : 'text-rose-400'}`}>
                        {formatCurrency(dayData.pnl)}
                      </span>
                      <span className="text-[8px] text-gray-500 uppercase">{dayData.count} Trades</span>
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* Weekly Summary Cell */}
            <div className="aspect-square rounded-xl border border-white/5 bg-white/10 p-2 flex flex-col items-center justify-center gap-1">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Weekly</span>
              <span className={`text-sm font-bold ${week.weeklyPnl >= 0 ? 'text-gray-300' : 'text-rose-400'}`}>
                ${Math.abs(week.weeklyPnl).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
              <span className="text-[9px] text-gray-500">Traded Days</span>
            </div>
          </React.Fragment>
        ))}
      </div>
      
      {/* Legend */}
      <div className="flex justify-center items-center gap-6 pt-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary"></div>
          <span className="text-xs font-bold text-gray-400">Profit</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-rose-500"></div>
          <span className="text-xs font-bold text-gray-400">Loss</span>
        </div>
      </div>
    </div>
  );
}
