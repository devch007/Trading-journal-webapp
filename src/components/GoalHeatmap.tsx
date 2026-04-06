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

  // Month View (GitHub-style calendar grid)
  // Compute empty squares for the start of the month
  const firstDay = data[0].date;
  const startOffset = Array.from({ length: firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1 }); // Assuming Monday start

  return (
    <div className="glass-card flex flex-col gap-4 p-6 rounded-2xl border border-white/5 relative overflow-hidden">
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-[60px] pointer-events-none" />
      
      <div className="flex flex-col gap-1 z-10 mb-2">
        <h3 className="type-h2 text-[16px] text-white">Discipline Heatmap</h3>
        <p className="type-body text-[#A7A7A7] text-[13px]">A macro view of your daily goal adherence for the month.</p>
      </div>

      <div className="flex z-10">
        <div className="flex flex-col gap-2 pt-[26px] pr-4">
          <span className="type-micro text-[#6A6A6A] h-8 flex items-center">Mon</span>
          <span className="type-micro text-[#6A6A6A] h-8 flex items-center">Wed</span>
          <span className="type-micro text-[#6A6A6A] h-8 flex items-center">Fri</span>
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,32px)] gap-2 flex-grow auto-rows-[32px] grid-flow-col">
          {/* Day Headers (Optional for Month view if using standard github style) */}
          {startOffset.map((_, i) => <div key={`offset-${i}`} className="w-8 h-8 rounded-md bg-transparent" />)}
          
          {data.map((day, i) => {
            let heatColor = 'rgba(255,255,255,0.02)';
            let borderColor = 'rgba(255,255,255,0.05)';
            let isCurrent = isSameDay(day.date, new Date());

            if (day.active) {
              if (day.breachedLimits) {
                heatColor = 'rgba(229,83,75,0.2)'; // Deep red
                borderColor = 'rgba(229,83,75,0.5)';
              } else if (day.score === 1) {
                heatColor = 'rgba(30,215,96,0.3)'; // Bright Green
                borderColor = 'rgba(30,215,96,0.6)';
              } else if (day.score >= 0.5) {
                heatColor = 'rgba(30,215,96,0.15)'; // Muted Green
                borderColor = 'rgba(30,215,96,0.3)';
              } else {
                heatColor = 'rgba(245,158,11,0.2)'; // Yellow/Orange
                borderColor = 'rgba(245,158,11,0.4)';
              }
            }

            return (
              <motion.div
                key={i}
                whileHover={{ scale: 1.15, zIndex: 10 }}
                className={cn(
                  "w-8 h-8 rounded-[6px] relative group border",
                  isCurrent ? "ring-2 ring-primary ring-offset-2 ring-offset-[#0d0d16]" : ""
                )}
                style={{ backgroundColor: heatColor, borderColor: borderColor }}
              >
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-2 bg-[#111827] border border-white/10 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-50">
                  <p className="type-label text-white mb-1">{format(day.date, 'MMM do, yyyy')}</p>
                  {day.active ? (
                    <p className="type-body text-[#A7A7A7] text-[11px]">
                      {day.breachedLimits ? 'Risk management breached' : `Followed ${Math.round(day.score * 100)}% of goals`}
                    </p>
                  ) : (
                    <p className="type-body text-[#A7A7A7] text-[11px]">No activity</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
