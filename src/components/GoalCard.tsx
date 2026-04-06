import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export interface GoalCardProps {
  label: string;
  current: number;
  target: number;
  unit?: string;
  prefix?: string;
  type?: 'pnl' | 'count' | 'percentage' | 'streak';
  onTargetChange: (newTarget: number) => void;
  reverse?: boolean;
  isHero?: boolean;
  sparklineData?: number[];
  bestStat?: string;
}

// ─── Derived helpers ────────────────────────────────────────────────────────

function calcPercentage(current: number, target: number, reverse: boolean): number {
  if (target === 0) return 0;
  if (reverse) {
    const used = (Math.abs(current) / Math.abs(target)) * 100;
    return Math.min(Math.max(100 - used, 0), 100);
  }
  return Math.min(Math.max((current / target) * 100, 0), 100);
}

function getRingColor(pct: number, reverse: boolean): string {
  if (reverse) {
    if (pct > 80) return '#1ED760';
    if (pct > 50) return '#60a5fa';
    if (pct > 20) return '#f59e0b';
    return '#E5534B'; // Danger
  }
  if (pct === 0) return '#6A6A6A';
  if (pct < 50) return '#f59e0b';
  if (pct < 80) return '#60a5fa';
  return '#1ED760';
}

function getStatusBadge(pct: number, reverse: boolean, current: number): { text: string; bg: string; color: string } {
  if (reverse) {
    if (Math.abs(current) === 0) return { text: '✓ Safe', bg: '#1ED7601a', color: '#1ED760' };
    if (pct > 80) return { text: '✓ Safe', bg: '#1ED7601a', color: '#1ED760' };
    if (pct > 50) return { text: '● Under Limit', bg: '#60a5fa1a', color: '#60a5fa' };
    if (pct > 0) return { text: '↑ Near Limit', bg: '#f59e0b1a', color: '#f59e0b' };
    return { text: '⚠ Limit Hit', bg: '#E5534B1a', color: '#E5534B' };
  }
  if (pct === 0) return { text: '— Not Started', bg: '#ffffff0a', color: '#A7A7A7' };
  if (pct < 50) return { text: '↑ In Progress', bg: '#f59e0b1a', color: '#f59e0b' };
  if (pct < 80) return { text: '● On Track', bg: '#60a5fa1a', color: '#60a5fa' };
  if (pct < 100) return { text: '▲ Almost There', bg: '#1ED7601a', color: '#1ED760' };
  return { text: '✓ Achieved', bg: '#1ED76033', color: '#1ED760' };
}

function getMotivationalCopy(label: string, pct: number, reverse: boolean, current: number): string {
  const l = label.toLowerCase();
  if (reverse) {
    if (Math.abs(current) === 0) return 'Risk well managed — stay disciplined';
    if (pct < 20) return 'Approaching your limit — be cautious';
    return 'Loss well managed — maintain the discipline';
  }
  if (pct === 0) {
    if (l.includes('p&l') || l.includes('pnl')) return 'Market opens soon — target set';
    if (l.includes('trade') && !l.includes('rate')) return 'No trades yet — patience is a position';
    if (l.includes('win rate')) return 'First trade sets the tone';
    if (l.includes('journal')) return 'Journal your first trade to unlock insights';
    return 'Ready to go — start building progress';
  }
  if (pct >= 100) {
    if (l.includes('p&l') || l.includes('pnl')) return 'Target crushed — consider stopping for the day';
    return 'Goal achieved — excellent discipline';
  }
  if (pct >= 80) return "Almost there — don't let up now";
  if (pct >= 50) {
    if (l.includes('p&l') || l.includes('pnl')) return 'Halfway there, keep the discipline';
    return 'Good progress — stay consistent';
  }
  return "Keep going — every trade counts";
}

function formatValue(val: number, type: string, prefix: string, unit: string): string {
  if (type === 'percentage') return `${Math.abs(val).toFixed(1)}%`;
  if (type === 'pnl') {
    const absStr = Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${val >= 0 ? '+' : '-'}$${absStr}`;
  }
  if (type === 'streak') return `${Math.floor(Math.abs(val))} days`;
  return `${prefix}${Math.floor(Math.abs(val))}${unit}`;
}

function formatTarget(val: number, type: string, unit: string): string {
  if (type === 'pnl') return `$${Math.abs(val).toLocaleString()}`;
  if (type === 'percentage') return `${val}%`;
  return `${Math.abs(val)}${unit}`;
}

// ─── Sparkline ───────────────────────────────────────────────────────────────

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const W = 100, H = 36;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - min) / range) * (H - 4) - 2}`).join(' ');
  const net = data.reduce((s, v) => s + v, 0);
  const color = net >= 0 ? '#1ED760' : '#E5534B';
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="opacity-90 flex-shrink-0 mt-3 md:mt-0">
      <defs>
        <linearGradient id={`spark-${net}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <polygon points={`0,${H} ${pts} ${W},${H}`} fill={`url(#spark-${net})`} />
    </svg>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export const GoalCard: React.FC<GoalCardProps> = ({
  label, current, target, unit = '', prefix = '', type = 'count',
  onTargetChange, reverse = false, isHero = false, sparklineData, bestStat,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [displayValue, setDisplayValue] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrated, setCelebrated] = useState(false);
  const rafRef = useRef<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const pct = calcPercentage(current, target, reverse);
  const ringColor = getRingColor(pct, reverse);
  const status = getStatusBadge(pct, reverse, current);
  const motivationalCopy = getMotivationalCopy(label, pct, reverse, current);
  const isAchieved = !reverse && pct >= 100;

  // Ring geometry
  const RING_SIZE = isHero ? 72 : 60;
  const RING_R = isHero ? 32 : 26;
  const CIRC = 2 * Math.PI * RING_R;
  const dashOffset = CIRC - (CIRC * pct) / 100;

  // Number count-up
  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    const t0 = performance.now();
    const dur = 800; // Smoother
    const end = current;
    const tick = (now: number) => {
      const p = Math.min((now - t0) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setDisplayValue(end * e);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [current]);

  // Celebration trigger
  useEffect(() => {
    if (isAchieved && !celebrated) {
      setCelebrated(true);
      setShowCelebration(true);
      const t = setTimeout(() => setShowCelebration(false), 2000);
      return () => clearTimeout(t);
    }
    if (!isAchieved) setCelebrated(false);
  }, [isAchieved]);

  const handleSave = () => {
    const v = parseFloat(editValue);
    if (!isNaN(v)) onTargetChange(reverse && v > 0 ? -v : v);
    setIsEditing(false);
  };

  return (
    <motion.div
      layout
      className={cn(
        'glass-card relative flex flex-col justify-between gap-5 rounded-[20px] p-6 overflow-hidden group border transition-all duration-300',
        isHero ? 'col-span-full xl:col-span-2' : '',
        isAchieved ? 'border-l-[4px] border-l-[#1ED760]' : 'border-white/5 hover:border-white/10',
        pct < 20 && reverse ? '!border-l-[#E5534B] !border-l-[4px]' : '',
      )}
      whileHover={{ y: -4, boxShadow: '0 12px 40px rgba(0,0,0,0.3)' }}
      animate={showCelebration ? { backgroundColor: ['rgba(30,215,96,0.1)', 'transparent'] } : {}}
      transition={{ duration: 0.4 }}
    >
      {/* Dynamic Background Gradients */}
      {isHero && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
      )}
      <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full blur-[40px] opacity-0 group-hover:opacity-30 transition-opacity duration-700 pointer-events-none" style={{ backgroundColor: ringColor }} />

      {/* Floating celebration label */}
      <AnimatePresence>
        {showCelebration && (
          <motion.span
            initial={{ opacity: 1, y: 0, x: '-50%' }}
            animate={{ opacity: 0, y: -24 }}
            exit={{}}
            transition={{ duration: 1.2 }}
            className="absolute top-4 left-1/2 type-h2 text-[#1ED760] pointer-events-none z-20 whitespace-nowrap drop-shadow-md"
          >
            + Goal achieved!
          </motion.span>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-4 relative z-10">
        {/* Row 1: Label + Status badge */}
        <div className="flex justify-between items-center">
          <span className="type-label text-[11px]">
            {label}
          </span>
          <span
            className="px-2.5 py-1 rounded-full type-micro border tracking-wider"
            style={{ background: status.bg, color: status.color, borderColor: `${status.color}33`, fontSize: '9px' }}
          >
            {status.text}
          </span>
        </div>

        {/* Row 2: Progress ring + Value */}
        <div className="flex items-center justify-between gap-5">
          <div className="flex items-center gap-5 flex-1 min-w-0">
            {/* Ring */}
            <div className="relative flex-shrink-0 drop-shadow-lg" style={{ width: RING_SIZE, height: RING_SIZE }}>
              <svg width={RING_SIZE} height={RING_SIZE} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R} fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth={isHero ? 7 : 6} />
                <motion.circle
                  cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R}
                  fill="transparent" stroke={ringColor} strokeWidth={isHero ? 7 : 6}
                  strokeDasharray={CIRC}
                  initial={{ strokeDashoffset: CIRC }}
                  animate={{ strokeDashoffset: dashOffset, stroke: ringColor }}
                  transition={{ duration: 1.2, ease: [0.34, 1.56, 0.64, 1] }}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={cn("type-h2 tnum", isHero ? "text-[14px]" : "text-[12px]")}>
                  {Math.round(pct)}%
                </span>
              </div>
            </div>

            {/* Value block */}
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className={cn("type-h1 tnum text-white", isHero ? "text-[32px]" : "text-[26px]")}>
                  {formatValue(displayValue, type, prefix, unit)}
                </span>
                <span className="type-label text-[13px] text-[#A7A7A7]">
                  / {formatTarget(target, type, unit)}
                </span>
              </div>
              <p className="type-body text-[#A7A7A7] mt-1 line-clamp-1">
                {motivationalCopy}
              </p>
              {isHero && bestStat && (
                <p className="type-body text-primary font-bold mt-0.5" style={{ fontSize: 13 }}>
                  {bestStat}
                </p>
              )}
            </div>
          </div>

          {/* Sparkline (hero only) */}
          {isHero && sparklineData && sparklineData.length > 1 && (
            <Sparkline data={sparklineData} />
          )}
        </div>
      </div>

      {/* Row 3: Progress bar & Edit */}
      <div className="flex flex-col gap-3 relative z-10 w-full mt-2">
        <div className="w-full rounded-full overflow-hidden" style={{ height: 4, background: 'rgba(255,255,255,0.05)' }}>
          <motion.div
            className="h-full rounded-full shadow-[0_0_10px_rgba(255,255,255,0.2)]"
            initial={{ width: '0%' }}
            animate={{ width: `${pct}%`, backgroundColor: ringColor }}
            transition={{ duration: 1.0, ease: 'easeOut' }}
          />
        </div>

        <div className="flex justify-between items-center mt-1">
          <button
            onClick={() => { setEditValue(String(Math.abs(target))); setIsEditing(v => !v); setTimeout(() => inputRef.current?.focus(), 60); }}
            className={cn("type-micro transition-colors", isEditing ? "text-[#6A6A6A]" : "text-primary hover:text-primary/70")}
          >
            {isEditing ? 'Cancel' : 'Edit Target'}
          </button>
          <span className="type-micro text-[#6A6A6A] flex items-center gap-1.5 before:content-[''] before:block before:w-1.5 before:h-1.5 before:bg-[#1ED760] before:rounded-full before:animate-pulse">Live Tracking</span>
        </div>

        {/* Inline edit panel */}
        <AnimatePresence>
          {isEditing && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="pt-4 border-t border-white/5 flex gap-3">
                <div className="flex-1">
                  <p className="type-label mb-2">New Target</p>
                  <input
                    ref={inputRef}
                    type="text"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setIsEditing(false); }}
                    className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50 transition-all w-full tnum"
                    placeholder="Enter target..."
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <button
                    onClick={handleSave}
                    className="bg-primary text-white font-bold rounded-lg px-4 py-2 text-sm hover:bg-primary/80 transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                  >
                    Save
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
