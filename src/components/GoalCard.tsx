import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check } from 'lucide-react';
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
    return '#f87171';
  }
  if (pct === 0) return '#374151';
  if (pct < 50) return '#f59e0b';
  if (pct < 80) return '#60a5fa';
  return '#1ED760';
}

function getStatusBadge(pct: number, reverse: boolean, current: number): { text: string; bg: string; color: string } {
  if (reverse) {
    if (Math.abs(current) === 0) return { text: '✓ Safe', bg: '#052e16', color: '#1ED760' };
    if (pct > 80) return { text: '✓ Safe', bg: '#052e16', color: '#1ED760' };
    if (pct > 50) return { text: '● Under Limit', bg: '#1e3a5f', color: '#60a5fa' };
    if (pct > 0) return { text: '↑ Near Limit', bg: '#1e1a05', color: '#f59e0b' };
    return { text: '⚠ Limit Hit', bg: '#2d0a0a', color: '#f87171' };
  }
  if (pct === 0) return { text: '— Not Started', bg: '#1a1a2e', color: '#6B7280' };
  if (pct < 50) return { text: '↑ In Progress', bg: '#1e1a05', color: '#f59e0b' };
  if (pct < 80) return { text: '● On Track', bg: '#1e3a5f', color: '#60a5fa' };
  if (pct < 100) return { text: '▲ Almost There', bg: '#052e16', color: '#86efac' };
  return { text: '✓ Achieved', bg: '#052e16', color: '#1ED760' };
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
  const W = 80, H = 32;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - min) / range) * (H - 4) - 2}`).join(' ');
  const net = data.reduce((s, v) => s + v, 0);
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="opacity-70 flex-shrink-0">
      <polyline points={pts} fill="none" stroke={net >= 0 ? '#1ED760' : '#f87171'} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
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
  const RING_SIZE = isHero ? 80 : 64;
  const RING_R = isHero ? 37 : 29;
  const CIRC = 2 * Math.PI * RING_R;
  const dashOffset = CIRC - (CIRC * pct) / 100;

  // Number count-up
  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    const t0 = performance.now();
    const dur = 700;
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
      const t = setTimeout(() => setShowCelebration(false), 1000);
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
        'glass-card relative flex flex-col gap-3 rounded-2xl p-5 overflow-hidden group',
        isHero ? 'col-span-full' : '',
        isAchieved ? 'border-l-[3px] !border-l-[#1ED760]' : '',
        pct < 20 && reverse ? '!border-[#7f1d1d]' : '',
      )}
      whileHover={{ y: -2, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
      transition={{ duration: 0.2 }}
      animate={showCelebration ? { backgroundColor: ['rgba(255,255,255,0.04)', '#052e16', 'rgba(255,255,255,0.04)'] } : {}}
    >
      {/* Decorative glow blob — matches Dashboard cards */}
      <div className="absolute -right-4 -top-4 w-28 h-28 bg-white/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors duration-500 pointer-events-none" />
      {/* Extra tint for hero card */}
      {isHero && <div className="absolute -left-8 -bottom-8 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />}
      {/* Floating celebration label */}
      <AnimatePresence>
        {showCelebration && (
          <motion.span
            initial={{ opacity: 1, y: 0, x: '-50%' }}
            animate={{ opacity: 0, y: -24 }}
            exit={{}}
            transition={{ duration: 0.8 }}
            className="absolute top-4 left-1/2 text-[#1ED760] font-bold pointer-events-none z-20 whitespace-nowrap"
            style={{ fontSize: 10 }}
          >
            + Goal achieved!
          </motion.span>
        )}
      </AnimatePresence>

      {/* Row 1: Label + Status badge */}
      <div className="flex justify-between items-center">
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4B5563' }}>
          {label}
        </span>
        <span
          className="px-2 py-0.5 rounded-full"
          style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', background: status.bg, color: status.color }}
        >
          {status.text}
        </span>
      </div>

      {/* Row 2: Progress ring + Value */}
      <div className="flex items-center gap-4">
        {/* Ring */}
        <div className="relative flex-shrink-0" style={{ width: RING_SIZE, height: RING_SIZE }}>
          <svg width={RING_SIZE} height={RING_SIZE} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R} fill="transparent" stroke="#1e2a3a" strokeWidth={6} />
            <motion.circle
              cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R}
              fill="transparent" stroke={ringColor} strokeWidth={6}
              strokeDasharray={CIRC}
              initial={{ strokeDashoffset: CIRC }}
              animate={{ strokeDashoffset: dashOffset, stroke: ringColor }}
              transition={{ duration: 0.9, ease: [0.34, 1.56, 0.64, 1] }}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span style={{ fontSize: isHero ? 13 : 11, fontWeight: 800, color: '#fff', fontFeatureSettings: "'tnum'" }}>
              {Math.round(pct)}%
            </span>
          </div>
        </div>

        {/* Value block */}
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span style={{ fontSize: isHero ? 28 : 22, fontWeight: 800, letterSpacing: '-0.04em', color: '#fff', fontFeatureSettings: "'tnum'" }}>
              {formatValue(displayValue, type, prefix, unit)}
            </span>
            <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 400 }}>
              / {formatTarget(target, type, unit)}
            </span>
          </div>
          <p style={{ fontSize: 11, color: '#4B5563', fontStyle: 'italic', fontWeight: 400 }}>
            {motivationalCopy}
          </p>
          {isHero && bestStat && (
            <p style={{ fontSize: 11, color: '#60a5fa', fontWeight: 700, fontFeatureSettings: "'tnum'" }}>
              {bestStat}
            </p>
          )}
        </div>

        {/* Sparkline (hero only) */}
        {isHero && sparklineData && sparklineData.length > 1 && (
          <Sparkline data={sparklineData} />
        )}
      </div>

      {/* Row 3: Progress bar */}
      <div className="w-full rounded-full overflow-hidden" style={{ height: 5, background: '#1e2a3a' }}>
        <motion.div
          className="h-full rounded-full"
          initial={{ width: '0%' }}
          animate={{ width: `${pct}%`, backgroundColor: ringColor }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
      </div>

      {/* Row 4: Edit target link + timestamp */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => { setEditValue(String(Math.abs(target))); setIsEditing(v => !v); setTimeout(() => inputRef.current?.focus(), 60); }}
          style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: isEditing ? '#6B7280' : '#2563eb' }}
          className="hover:opacity-70 transition-opacity"
        >
          {isEditing ? 'Cancel' : 'Edit Target'}
        </button>
        <span style={{ fontSize: 10, color: '#374151' }}>Live</span>
      </div>

      {/* Inline edit panel */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-3 border-t border-[#1e2a3a] flex gap-2">
              <div className="flex-1">
                <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#4B5563', marginBottom: 6 }}>
                  New Target
                </p>
                <input
                  ref={inputRef}
                  type="text"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setIsEditing(false); }}
                  style={{ background: '#1a2332', border: '1px solid #2563eb', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: '#fff', width: '100%', outline: 'none' }}
                  placeholder="Enter target..."
                />
              </div>
              <div className="flex flex-col gap-1 justify-end">
                <button
                  onClick={handleSave}
                  style={{ background: '#1d4ed8', borderRadius: 6, padding: '8px 14px', fontSize: 12, color: '#fff', fontWeight: 700 }}
                  className="hover:bg-[#1e40af] transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
