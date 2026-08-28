import React from 'react';
import { motion } from 'motion/react';
import { format, isSameDay } from 'date-fns';
import { cn } from '../lib/utils';
import { Check, X, AlertTriangle, Minus } from 'lucide-react';

export interface DailyGoalStatus {
  id: string;
  label: string;
  status: 'achieved' | 'breached' | 'in-progress' | 'not-started';
}

export interface DailyHeatmapData {
  date: Date;
  active: boolean;
  score: number; // 0 to 1 representing percentage of positive goals
  breachedLimits: boolean; // True if max loss or something critical was breached
  goals: DailyGoalStatus[];
}

interface GoalHeatmapProps {
  data: DailyHeatmapData[];
  mode: 'week' | 'month';
}

export const GoalHeatmap: React.FC<GoalHeatmapProps> = ({ data, mode }) => {
  if (data.length === 0) return null;

  if (mode === 'week') {
    // Collect all unique goal IDs present in the data to form row headers.
    const goalOrder = data[0]?.goals.map(g => g.id) || [];
    const goalLabels = data[0]?.goals.map(g => g.label) || [];

    return (
      <div className="glass-card flex flex-col gap-4 p-6 rounded-2xl border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[60px] pointer-events-none" />
        
        <div className="flex flex-col gap-1 z-10">
          <h3 className="type-h2 text-[16px] text-white">Daily Consistency Tracker</h3>
          <p className="type-body text-[#A7A7A7] text-[13px]">Evaluate your strict adherence to daily targets and limits across the week.</p>
        </div>

        <div className="mt-4 overflow-x-auto no-scrollbar z-10">
          <div className="min-w-[600px]">
            {/* Header / Dates */}
            <div className="grid grid-cols-[180px_repeat(7,1fr)] gap-2 mb-4">
              <div className="text-left type-label text-[11px] text-[#A7A7A7] pt-2">Goal Metric</div>
              {data.map((day, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <span className={cn("type-label text-[11px]", isSameDay(day.date, new Date()) ? "text-primary font-bold" : "text-[#6A6A6A]")}>
                    {format(day.date, 'EEE')}
                  </span>
                  <span className={cn("type-h2 text-[14px]", isSameDay(day.date, new Date()) ? "text-white" : "text-[#A7A7A7]")}>
                    {format(day.date, 'dd')}
                  </span>
                </div>
              ))}
            </div>

            {/* Matrix Rows */}
            <div className="flex flex-col gap-2">
              {goalOrder.map((goalId, rowIndex) => (
                <div key={goalId} className="grid grid-cols-[180px_repeat(7,1fr)] gap-2 items-center p-2 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
                  <div className="type-body text-[13px] text-white/90 truncate pr-4">
                    {goalLabels[rowIndex]}
                  </div>
                  {data.map((day, colIndex) => {
                    const goalStatus = day.goals.find(g => g.id === goalId)?.status || 'not-started';
                    let icon = <Minus className="w-4 h-4 text-[#4B5563]" />;
                    let colorClass = "bg-[#111827] border-[#1e2a3a]";

                    if (day.active) {
                      if (goalStatus === 'achieved') {
                        icon = <Check className="w-4 h-4 text-[#1ED760]" />;
                        colorClass = "bg-[#1ED760]/10 border-[#1ED760]/30 shadow-[0_0_10px_rgba(30,215,96,0.1)]";
                      } else if (goalStatus === 'breached') {
                        icon = <X className="w-4 h-4 text-[#E5534B]" />;
                        colorClass = "bg-[#E5534B]/10 border-[#E5534B]/30 shadow-[0_0_10px_rgba(229,83,75,0.1)]";
                      } else if (goalStatus === 'in-progress') {
                        icon = <AlertTriangle className="w-3.5 h-3.5 text-[#f59e0b]" />;
                        colorClass = "bg-[#f59e0b]/10 border-[#f59e0b]/30";
                      }
                    }

                    return (
                      <div key={colIndex} className="flex justify-center">
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center border transition-all", colorClass)}>
                          {icon}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            
            {/* Overall Health Row */}
            <div className="grid grid-cols-[180px_repeat(7,1fr)] gap-2 mt-4 pt-4 border-t border-white/5">
              <div className="type-label text-[11px] text-[#A7A7A7] self-center">Overall Discipline</div>
              {data.map((day, i) => {
                let heatColor = '#111827';
                let glow = 'none';
                if (day.active) {
                  if (day.breachedLimits) {
                    heatColor = '#E5534B';
                    glow = '0 0 12px rgba(229,83,75,0.4)';
                  } else if (day.score === 1) {
                    heatColor = '#1ED760';
                    glow = '0 0 12px rgba(30,215,96,0.4)';
                  } else if (day.score >= 0.5) {
                    heatColor = '#60a5fa';
                  } else {
                    heatColor = '#f59e0b';
                  }
                }
                return (
                  <div key={i} className="flex justify-center">
                    <div className="w-full max-w-[24px] h-[4px] rounded-full" style={{ backgroundColor: heatColor, boxShadow: glow }} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Month View
  const monthlyData: Record<string, DailyHeatmapData[]> = {};
  data.forEach(d => {
    const monthKey = format(d.date, 'MMMM yyyy');
    if (!monthlyData[monthKey]) monthlyData[monthKey] = [];
    monthlyData[monthKey].push(d);
  });

  const monthEntries = Object.entries(monthlyData);
  const isSingleMonth = monthEntries.length === 1;

  // Single Month Luxury Adherence Dashboard View
  if (isSingleMonth) {
    const [monthLabel, monthDays] = monthEntries[0];
    const activeDays = monthDays.filter(d => d.active);
    const perfectDays = activeDays.filter(d => d.score === 1 && !d.breachedLimits).length;
    const breachedDays = activeDays.filter(d => d.breachedLimits).length;
    const partialDays = activeDays.length - perfectDays - breachedDays;
    const adherencePct = activeDays.length > 0 ? Math.round((perfectDays / activeDays.length) * 100) : 100;

    return (
      <div className="bg-white dark:bg-[#16181f] rounded-3xl p-4 sm:p-6 md:p-7 border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs flex flex-col gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/5 rounded-full blur-[70px] pointer-events-none" />
        
        {/* Header with Title & Month */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
                ★ Discipline Index
              </span>
              <span className="text-xs text-gray-400 font-medium">{monthLabel}</span>
            </div>
            <h3 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight mt-1">
              Monthly Discipline & Adherence
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Evaluation of your strict compliance with daily rules & profit targets</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-neutral-800/80 px-3 py-1.5 rounded-xl border border-gray-200/60 dark:border-neutral-700/60">
              {monthLabel}
            </span>
          </div>
        </div>

        {/* 3 Metric Summary Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 z-10">
          <div className="p-3.5 rounded-2xl bg-gray-50/70 dark:bg-neutral-800/40 border border-gray-100 dark:border-neutral-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-gray-400">Adherence Rate</span>
              <div className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {adherencePct}%
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-xs">
              🎯
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-gray-50/70 dark:bg-neutral-800/40 border border-gray-100 dark:border-neutral-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-gray-400">Disciplined Days</span>
              <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tabular-nums">
                {perfectDays} <span className="text-xs text-gray-400 font-normal">/ {activeDays.length} active</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs">
              📅
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-gray-50/70 dark:bg-neutral-800/40 border border-gray-100 dark:border-neutral-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-gray-400">Rule Breaches</span>
              <div className={`text-lg sm:text-xl font-bold tabular-nums ${breachedDays === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                {breachedDays} <span className="text-xs text-gray-400 font-normal">{breachedDays === 1 ? 'breach' : 'breaches'}</span>
              </div>
            </div>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${breachedDays === 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-500'}`}>
              ⚠️
            </div>
          </div>
        </div>

        {/* Month Calendar Matrix of Days */}
        <div className="z-10">
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center text-[10px] sm:text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day}>{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
            {monthDays.map((day, i) => {
              let heatClass = 'bg-gray-50/50 dark:bg-neutral-900/40 border-gray-100 dark:border-neutral-800/60 text-gray-400';
              let isCurrent = isSameDay(day.date, new Date());
              let icon = null;

              if (day.active) {
                if (day.breachedLimits) {
                  heatClass = 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-400 shadow-2xs'; 
                  icon = <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]" />;
                } else if (day.score === 1) {
                  heatClass = 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 shadow-2xs'; 
                  icon = <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />;
                } else if (day.score >= 0.5) {
                  heatClass = 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400'; 
                  icon = <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />;
                } else {
                  heatClass = 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 text-amber-600 dark:text-amber-400'; 
                  icon = <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />;
                }
              }

              return (
                <motion.div
                  key={i}
                  whileHover={{ scale: 1.05, y: -2 }}
                  className={cn(
                    "min-h-[46px] sm:min-h-[58px] p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border transition-all flex flex-col justify-between relative group cursor-pointer",
                    isCurrent ? "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-[#16181f]" : "",
                    heatClass
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[10px] sm:text-xs font-bold tabular-nums">
                      {format(day.date, 'd')}
                    </span>
                    {icon}
                  </div>

                  {day.active && (
                    <div className="text-[9px] sm:text-[10px] font-semibold truncate leading-none mt-auto">
                      {day.breachedLimits ? (
                        <span className="text-rose-600 dark:text-rose-400 font-bold">Breached</span>
                      ) : day.score === 1 ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">100% Plan</span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 font-bold">{Math.round(day.score * 100)}%</span>
                      )}
                    </div>
                  )}

                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-2 bg-gray-900/95 dark:bg-neutral-800/95 text-white border border-gray-700/50 dark:border-neutral-700/80 rounded-2xl shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-50 backdrop-blur-md">
                    <p className="text-xs font-bold text-white mb-0.5">{format(day.date, 'EEE, MMM d, yyyy')}</p>
                    {day.active ? (
                      <p className="text-[11px] text-gray-300 font-medium">
                        {day.breachedLimits ? '⚠️ Rule / Limit Breached' : `🎯 Adhered to ${Math.round(day.score * 100)}% of parameters`}
                      </p>
                    ) : (
                      <p className="text-[11px] text-gray-400">No trading activity</p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Legend Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-neutral-800/80 text-xs text-gray-400 flex-wrap gap-3 z-10">
          <div className="flex items-center gap-3.5 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-[4px] bg-emerald-500/30 border border-emerald-500/60"></span>
              <span className="text-[10px] sm:text-[11px]">100% On-Plan</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-[4px] bg-amber-500/20 border border-amber-500/40"></span>
              <span className="text-[10px] sm:text-[11px]">Partial</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-[4px] bg-rose-500/20 border border-rose-500/50"></span>
              <span className="text-[10px] sm:text-[11px]">Rule Breached</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-[4px] bg-gray-100/70 dark:bg-neutral-900/60 border border-gray-200/60 dark:border-neutral-800/60"></span>
              <span className="text-[10px] sm:text-[11px]">No Trading</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Multi-Month Stacked View fallback
  return (
    <div className="bg-white dark:bg-[#16181f] rounded-3xl p-4 sm:p-6 md:p-7 border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs flex flex-col gap-5 relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
              Adherence Matrix
            </span>
          </div>
          <h3 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight mt-1">
            Macro Discipline Heatmap
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">A macro view of your daily target & rule adherence across the last 3 months</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 z-10 overflow-x-auto no-scrollbar pb-2">
        <div className="min-w-max flex flex-col gap-3.5">
          {monthEntries.map(([monthLabel, monthDays]) => {
            const firstDayOfMonth = monthDays[0].date;
            const shortMonth = format(firstDayOfMonth, 'MMM');
            
            return (
              <div key={monthLabel} className="flex gap-3 sm:gap-4 items-center">
                <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 w-8 flex-shrink-0 tracking-wider uppercase">{shortMonth}</span>
                <div className="flex gap-1 sm:gap-1.5">
                  {monthDays.map((day, i) => {
                    let heatClass = 'bg-gray-100/70 dark:bg-neutral-900/60 border-gray-200/60 dark:border-neutral-800/60';
                    let isCurrent = isSameDay(day.date, new Date());

                    if (day.active) {
                      if (day.breachedLimits) {
                        heatClass = 'bg-rose-500/20 border-rose-500/50 text-rose-500'; 
                      } else if (day.score === 1) {
                        heatClass = 'bg-emerald-500/30 border-emerald-500/60 shadow-[0_0_8px_rgba(16,185,129,0.2)] text-emerald-500'; 
                      } else if (day.score >= 0.5) {
                        heatClass = 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'; 
                      } else {
                        heatClass = 'bg-amber-500/20 border-amber-500/40 text-amber-500'; 
                      }
                    }

                    return (
                      <motion.div
                        key={i}
                        whileHover={{ scale: 1.18, zIndex: 20 }}
                        className={cn(
                          "w-6 h-6 sm:w-7 sm:h-7 rounded-[6px] relative group border transition-all cursor-pointer",
                          isCurrent ? "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-[#16181f]" : "",
                          heatClass
                        )}
                      >
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-2 bg-gray-900/95 dark:bg-neutral-800/95 text-white border border-gray-700/50 dark:border-neutral-700/80 rounded-2xl shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-50 backdrop-blur-md">
                          <p className="text-xs font-bold text-white mb-0.5">{format(day.date, 'EEE, MMM d, yyyy')}</p>
                          {day.active ? (
                            <p className="text-[11px] text-gray-300 font-medium">
                              {day.breachedLimits ? '⚠️ Rule / Limit Breached' : `🎯 Adhered to ${Math.round(day.score * 100)}% of parameters`}
                            </p>
                          ) : (
                            <p className="text-[11px] text-gray-400">No trading activity</p>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
