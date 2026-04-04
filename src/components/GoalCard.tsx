import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, AlertCircle, Play } from 'lucide-react';
import { cn } from '../lib/utils';

interface GoalCardProps {
  label: string;
  current: number;
  target: number;
  unit?: string;
  prefix?: string;
  type?: 'pnl' | 'count' | 'percentage' | 'streak';
  onTargetChange: (newTarget: number) => void;
  reverse?: boolean; // If true, lower is better (e.g. Max Loss)
}

export const GoalCard: React.FC<GoalCardProps> = ({ 
  label, 
  current, 
  target, 
  unit = '', 
  prefix = '', 
  type = 'count',
  onTargetChange,
  reverse = false 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(target.toString());
  const [displayValue, setDisplayValue] = useState(0);
  const [isAchieved, setIsAchieved] = useState(false);
  const [isDanger, setIsDanger] = useState(false);
  
  // Animation for numbers
  useEffect(() => {
    let start = 0;
    const end = current;
    const duration = 600;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      setDisplayValue(start + (end - start) * easeOut);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [current]);

  // Status determination
  useEffect(() => {
    const percentage = target === 0 ? 100 : (current / target) * 100;
    
    if (reverse) {
      // For goals like Max Loss (-$100 target, -$150 current)
      // current is worse than target
      setIsAchieved(current > target); // e.g. -50 > -100 is good
      setIsDanger(current <= target); // e.g. -110 <= -100 is bad
    } else {
      setIsAchieved(current >= target);
      setIsDanger(percentage < 50 && target !== 0);
    }
  }, [current, target, reverse]);

  const percentage = Math.min(Math.max(target === 0 ? 0 : (current / target) * 100, 0), 100);
  const ringColor = isAchieved ? '#1ED760' : (isDanger ? '#f87171' : '#f59e0b');
  const badgeColors = isAchieved 
    ? 'bg-[#052e16] text-[#1ED760]' 
    : (isDanger ? 'bg-[#2d0a0a] text-[#f87171]' : 'bg-[#1e1a05] text-[#f59e0b]');
  
  const statusLabel = isAchieved ? 'Achieved' : (isDanger ? (reverse ? 'Danger' : 'Missed') : 'In Progress');

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(editValue);
    if (!isNaN(val)) {
      onTargetChange(val);
    }
    setIsEditing(false);
  };

  const formatValue = (val: number) => {
    if (type === 'percentage') return `${val.toFixed(1)}%`;
    if (type === 'pnl') {
      const absVal = Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return `${val >= 0 ? '+' : '-'}$${absVal}`;
    }
    return `${prefix}${Math.floor(val)}${unit}`;
  };

  const formatTarget = (val: number) => {
    if (type === 'pnl') return `$${Math.abs(val)}`;
    return `${val}${unit}`;
  };

  return (
    <motion.div 
      layout
      whileHover={{ backgroundColor: '#1a2332', borderColor: '#2563eb44' }}
      className={cn(
        "relative flex flex-col gap-4 p-[14px_16px] bg-[#111827] border border-[#1e2a3a] rounded-[8px] transition-all duration-300 overflow-hidden",
        isAchieved && "border-l-[3px] border-l-[#1ED760] animate-achieved-pulse",
        isDanger && "border border-[#7f1d1d]"
      )}
      animate={isAchieved ? {
        backgroundColor: ["#111827", "#052e16", "#111827"],
      } : {}}
      transition={isAchieved ? {
        duration: 0.3,
        times: [0, 0.5, 1],
      } : {}}
    >
      {/* Pulse effect on achieve */}
      {isAchieved && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.5, 0] }}
          transition={{ duration: 1, times: [0, 0.5, 1] }}
          className="absolute inset-0 pointer-events-none bg-[#1ED760]/5 z-0"
        />
      )}

      <div className="flex justify-between items-start z-10">
        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-bold tracking-[0.1em] uppercase text-[#A7A7A7]">
            {label}
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-[18px] font-extrabold tracking-[-0.04em] text-white tnum">
              {formatValue(displayValue)}
            </span>
            <span className="text-[11px] font-bold text-[#4B5563] tnum">
              / {formatTarget(target)}
            </span>
          </div>
        </div>

        <div className="relative w-[48px] h-[48px] flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="24"
              cy="24"
              r="19"
              fill="transparent"
              stroke="#1e2a3a"
              strokeWidth="5"
            />
            <motion.circle
              cx="24"
              cy="24"
              r="19"
              fill="transparent"
              stroke={ringColor}
              strokeWidth="5"
              strokeDasharray={120} // 2 * pi * r
              initial={{ strokeDashoffset: 120 }}
              animate={{ strokeDashoffset: 120 - (120 * (percentage / 100)) }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute text-[10px] font-bold text-white tnum">
            {Math.round(percentage)}%
          </span>
        </div>
      </div>

      <div className="flex justify-between items-center z-10">
        <div className={cn("px-2 py-1 rounded-[6px] text-[9px] font-bold uppercase tracking-[0.05em]", badgeColors)}>
          {statusLabel}
        </div>
        
        <button 
          onClick={() => {
            setEditValue(target.toString());
            setIsEditing(!isEditing);
          }}
          className="text-[10px] font-bold text-[#2563eb] hover:text-[#60a5fa] transition-colors uppercase tracking-[0.05em]"
        >
          {isEditing ? 'Cancel' : 'Edit Target'}
        </button>
      </div>

      <AnimatePresence>
        {isEditing && (
          <motion.form 
            initial={{ height: 0, opacity: 0, marginTop: 0 }}
            animate={{ height: 'auto', opacity: 1, marginTop: 8 }}
            exit={{ height: 0, opacity: 0, marginTop: 0 }}
            onSubmit={handleEditSubmit}
            className="overflow-hidden z-10"
          >
            <div className="flex gap-2">
              <input 
                autoFocus
                type="text" 
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="flex-1 bg-[#1a2332] border border-[#2563eb] rounded-[6px] px-3 py-1.5 text-[13px] text-white outline-none focus:ring-1 ring-[#2563eb]"
                placeholder="Target value..."
              />
              <button 
                type="submit"
                className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-3 py-1.5 rounded-[6px] transition-colors"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="w-full h-[4px] bg-[#1e2a3a] rounded-[3px] overflow-hidden z-10 mt-auto">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{ backgroundColor: ringColor }}
          className="h-full rounded-[3px]"
        />
      </div>
    </motion.div>
  );
}
