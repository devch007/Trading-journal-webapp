import React from 'react';
import { motion } from 'motion/react';

export interface GoalStatus {
  id: string;
  status: 'achieved' | 'on-track' | 'almost' | 'in-progress' | 'not-started' | 'danger' | 'safe';
}

interface GoalsSummaryProps {
  goals: GoalStatus[];
  overallPercent: number;
}

const STATUS_META: Record<GoalStatus['status'], { color: string; label: string }> = {
  achieved:    { color: '#1ED760', label: 'Achieved' },
  safe:        { color: '#1ED760', label: 'Safe' },
  almost:      { color: '#86efac', label: 'Almost There' },
  'on-track':  { color: '#60a5fa', label: 'On Track' },
  'in-progress': { color: '#f59e0b', label: 'In Progress' },
  'not-started': { color: '#6A6A6A', label: 'Not Started' },
  danger:      { color: '#E5534B', label: 'Danger' },
};

function Dot({ color }: { color: string }) {
  return (
    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color, boxShadow: `0 0 8px ${color}66` }} />
  );
}

export function GoalsSummary({ goals, overallPercent }: GoalsSummaryProps) {
  const overallColor =
    overallPercent >= 80 ? '#1ED760'
    : overallPercent >= 50 ? '#60a5fa'
    : overallPercent >= 20 ? '#f59e0b'
    : '#6A6A6A';

  // Aggregate counts
  const groups: Partial<Record<GoalStatus['status'], number>> = {};
  goals.forEach(g => { groups[g.status] = (groups[g.status] || 0) + 1; });

  const order: GoalStatus['status'][] = ['achieved', 'safe', 'almost', 'on-track', 'in-progress', 'not-started', 'danger'];

  return (
    <div className="glass-card w-full flex flex-col gap-3 p-5 rounded-2xl relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      
      <div className="flex flex-wrap items-center justify-between gap-3 relative z-10">
        {/* Status groups */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {order.map(s => {
            const count = groups[s];
            if (!count) return null;
            const { color, label } = STATUS_META[s];
            return (
              <div key={s} className="flex items-center gap-2">
                <Dot color={color} />
                <span className="type-label font-medium text-white/70 tracking-wide text-[11px]">
                  <span className="text-white font-bold mr-1">{count}</span>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
        {/* Overall text */}
        <span className="type-h2 text-[14px] text-white">
          {Math.round(overallPercent)}% <span className="text-[#A7A7A7] font-normal">Complete</span>
        </span>
      </div>

      {/* Full-width progress bar */}
      <div className="w-full rounded-full overflow-hidden relative z-10" style={{ height: 6, background: 'rgba(255,255,255,0.05)' }}>
        <motion.div
          className="h-full rounded-full relative"
          initial={{ width: 0 }}
          animate={{ width: `${overallPercent}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ backgroundColor: overallColor }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/30" />
        </motion.div>
      </div>
    </div>
  );
}
