import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export interface GoalStatus {
  id: string;
  status: 'achieved' | 'in-progress' | 'missed';
}

interface GoalsSummaryProps {
  goals: GoalStatus[];
}

export function GoalsSummary({ goals }: GoalsSummaryProps) {
  const achievedCount = goals.filter(g => g.status === 'achieved').length;
  const totalCount = goals.length;
  
  return (
    <div className="flex flex-col md:flex-row items-center gap-4 px-6 py-3 bg-[#111827]/50 border border-white/5 rounded-[12px] backdrop-blur-md">
      <div className="flex items-center gap-2">
        <span className="text-[12px] font-bold text-white uppercase tracking-[0.05em]">
          {achievedCount} of {totalCount} goals on track
        </span>
      </div>
      
      <div className="flex items-center gap-1.5 px-3 py-2 bg-[#1a2332] rounded-full border border-white/5">
        {goals.map((goal, index) => (
          <motion.div
            key={goal.id}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.05, type: 'spring', damping: 10, stiffness: 200 }}
            className={cn(
              "w-[8px] h-[8px] rounded-full",
              goal.status === 'achieved' && "bg-[#1ED760] shadow-[0_0_8px_rgba(30,215,96,0.4)]",
              goal.status === 'in-progress' && "bg-[#f59e0b] shadow-[0_0_8px_rgba(245,158,11,0.4)]",
              goal.status === 'missed' && "bg-[#f87171] shadow-[0_0_8px_rgba(248,113,113,0.4)]"
            )}
          />
        ))}
      </div>
    </div>
  );
}
