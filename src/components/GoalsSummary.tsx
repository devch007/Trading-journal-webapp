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
  'not-started': { color: '#374151', label: 'Not Started' },
  danger:      { color: '#f87171', label: 'Danger' },
};

function Dot({ color }: { color: string }) {
  return <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />;
}

export function GoalsSummary({ goals, overallPercent }: GoalsSummaryProps) {
  const overallColor =
    overallPercent >= 80 ? '#1ED760'
    : overallPercent >= 50 ? '#60a5fa'
    : overallPercent >= 20 ? '#f59e0b'
    : '#374151';

  // Aggregate counts
  const groups: Partial<Record<GoalStatus['status'], number>> = {};
  goals.forEach(g => { groups[g.status] = (groups[g.status] || 0) + 1; });

  const order: GoalStatus['status'][] = ['achieved', 'safe', 'almost', 'on-track', 'in-progress', 'not-started', 'danger'];

  return (
    <div className="glass-card w-full flex flex-col gap-2 px-4 py-3 rounded-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Status groups */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {order.map(s => {
            const count = groups[s];
            if (!count) return null;
            const { color, label } = STATUS_META[s];
            return (
              <div key={s} className="flex items-center gap-1.5">
                <Dot color={color} />
                <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600 }}>
                  {count} {label}
                </span>
              </div>
            );
          })}
        </div>
        {/* Overall text */}
        <span style={{ fontSize: 10, color: '#4B5563', fontWeight: 600 }}>
          Overall: {Math.round(overallPercent)}% complete
        </span>
      </div>

      {/* Full-width progress bar */}
      <div className="w-full rounded-full overflow-hidden" style={{ height: 3, background: '#1e2a3a' }}>
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${overallPercent}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ backgroundColor: overallColor }}
        />
      </div>
    </div>
  );
}
