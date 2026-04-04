import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TopBar } from '../lib/TopBar';
import { GoalCard } from '../components/GoalCard';
import { GoalsSummary, GoalStatus } from '../components/GoalsSummary';
import { useTrades } from '../hooks/useTrades';
import { useAccountContext } from '../contexts/AccountContext';
import { getTradeDate } from '../lib/timeUtils';
import { startOfDay, startOfWeek, startOfMonth, subDays } from 'date-fns';
import { cn } from '../lib/utils';

type Timeframe = 'Day' | 'Week' | 'Month';

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_TARGETS: Record<string, number> = {
  'day-pnl': 300, 'day-loss': -100, 'day-trades': 5, 'day-winrate': 70, 'day-journal': 1,
  'week-pnl': 1000, 'week-loss': -300, 'week-best': 500, 'week-consistency': 80, 'week-streak': 5,
  'month-pnl': 3000, 'month-winrate': 70, 'month-pf': 2.0, 'month-loss': -1000, 'month-trades': 50,
};

// ─── Today at a Glance ───────────────────────────────────────────────────────

function TodayAtAGlance({ dayTrades }: { dayTrades: any[] }) {
  const ALL_HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7AM–8PM

  const timeline = useMemo(() => ALL_HOURS.map(h => {
    const h_trades = dayTrades.filter(t => getTradeDate(t.date).getHours() === h);
    const net = h_trades.reduce((s, t) => s + (t.pnl || 0), 0);
    return { hour: h, hasTrades: h_trades.length > 0, isPositive: net >= 0, pnl: net };
  }), [dayTrades]);

  const best = dayTrades.reduce<any>((b, t) => (!b || (t.pnl || 0) > (b.pnl || 0) ? t : b), null);
  const worst = dayTrades.reduce<any>((w, t) => (!w || (t.pnl || 0) < (w.pnl || 0) ? t : w), null);

  const streak = useMemo(() => {
    if (!dayTrades.length) return { count: 0, type: 'none' as const };
    const sorted = [...dayTrades].sort((a, b) => getTradeDate(b.date).getTime() - getTradeDate(a.date).getTime());
    const firstType = sorted[0].isPositive;
    let count = 0;
    for (const t of sorted) { if (t.isPositive === firstType) count++; else break; }
    return { count, type: firstType ? 'win' as const : 'loss' as const };
  }, [dayTrades]);

  const formatPnl = (v: number) => {
    const abs = Math.abs(v).toFixed(2);
    return `${v >= 0 ? '+' : '-'}$${abs}`;
  };

  const MICRO_LABEL: React.CSSProperties = { fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4B5563' };
  const MICRO_VAL: React.CSSProperties = { fontSize: 16, fontWeight: 700, fontFeatureSettings: "'tnum'", letterSpacing: '-0.02em', color: '#fff' };

  return (
    <div className="flex flex-col gap-3">
      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4B5563' }}>
        Today at a glance
      </span>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Timeline strip */}
        <div className="flex flex-col gap-3 p-5 rounded-[12px] border border-[#1e2a3a]" style={{ background: '#111827' }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4B5563' }}>
            Your trading activity today
          </span>
          {dayTrades.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 rounded-[8px] border border-dashed border-[#1e2a3a] text-center gap-2">
              <span style={{ fontSize: 20 }}>🎯</span>
              <p style={{ fontSize: 13, color: '#4B5563', fontWeight: 500 }}>No trades logged yet. Your activity will appear here.</p>
            </div>
          ) : (
            <div className="flex items-end gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {timeline.map(({ hour, hasTrades, isPositive }) => (
                <div key={hour} className="flex flex-col items-center gap-1 flex-shrink-0">
                  {hasTrades ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', damping: 12 }}
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: isPositive ? '#1ED760' : '#f87171', boxShadow: isPositive ? '0 0 6px #1ED76066' : '0 0 6px #f8717166' }}
                    />
                  ) : (
                    <div className="w-[1px] h-2.5 rounded-full" style={{ background: '#1e2a3a' }} />
                  )}
                  <span style={{ fontSize: 8, color: '#374151', fontWeight: 600 }}>
                    {hour > 12 ? `${hour - 12}P` : `${hour}A`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              label: 'Best Trade',
              value: best ? formatPnl(best.pnl) : '—',
              color: '#1ED760',
              empty: !best,
            },
            {
              label: 'Worst Trade',
              value: worst ? formatPnl(worst.pnl) : '—',
              color: '#f87171',
              empty: !worst,
            },
            {
              label: 'Total Trades',
              value: dayTrades.length > 0 ? String(dayTrades.length) : '—',
              color: '#60a5fa',
              empty: dayTrades.length === 0,
            },
            {
              label: streak.type === 'win' ? `Win Streak` : streak.type === 'loss' ? `Loss Streak` : 'Streak',
              value: streak.count > 0 ? `${streak.count} in a row` : '—',
              color: streak.type === 'win' ? '#1ED760' : streak.type === 'loss' ? '#f59e0b' : '#4B5563',
              empty: streak.count === 0,
            },
          ].map(({ label, value, color, empty }) => (
            <div
              key={label}
              className="flex flex-col gap-1.5 rounded-[8px] p-3 border border-[#1e2a3a]"
              style={{ background: '#0d1117' }}
            >
              <span style={MICRO_LABEL}>{label}</span>
              <span style={{ ...MICRO_VAL, color: empty ? '#374151' : color }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Goals Page ───────────────────────────────────────────────────────────────

export function Goals() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Timeframe>('Day');
  const { trades: allTrades, loading } = useTrades();
  const { selectedAccountId } = useAccountContext();
  const [targets, setTargets] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('tradova_goal_targets');
    return saved ? JSON.parse(saved) : DEFAULT_TARGETS;
  });

  useEffect(() => { localStorage.setItem('tradova_goal_targets', JSON.stringify(targets)); }, [targets]);

  const handleTargetChange = (id: string, newTarget: number) =>
    setTargets(prev => ({ ...prev, [id]: newTarget }));

  // ── Data: filter by account ─────────────────────────────────────────────
  const trades = useMemo(() =>
    selectedAccountId ? allTrades.filter(t => t.accountId === selectedAccountId) : [],
  [allTrades, selectedAccountId]);

  // ── Stats (unchanged logic) ─────────────────────────────────────────────
  const stats = useMemo(() => {
    const now = new Date();
    const dayStart = startOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const by = (start: Date) => trades.filter(t => getTradeDate(t.date) >= start);
    const dayT = by(dayStart), weekT = by(weekStart), monthT = by(monthStart);

    const pnl = (tl: any[]) => tl.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
    const wr = (tl: any[]) => !tl.length ? 0 : (tl.filter(t => t.isPositive).length / tl.length) * 100;
    const journaled = (tl: any[]) => tl.filter(t => t.notes || t.strategy).length;
    const best = (tl: any[]) => !tl.length ? 0 : Math.max(...tl.map(t => t.pnl || 0));
    const consistency = (tl: any[]) => {
      if (!tl.length) return 0;
      const days = new Set(tl.map(t => getTradeDate(t.date).toDateString()));
      let pos = 0;
      days.forEach(d => { if (tl.filter(t => getTradeDate(t.date).toDateString() === d).reduce((s, t) => s + t.pnl, 0) > 0) pos++; });
      return (pos / days.size) * 100;
    };
    const streak = () => {
      let s = 0, d = new Date();
      while (true) {
        const dt = trades.filter(t => getTradeDate(t.date).toDateString() === d.toDateString());
        if (dt.some(t => t.notes || t.strategy)) { s++; d = subDays(d, 1); } else break;
        if (s > 365) break;
      }
      return s;
    };
    const pf = (tl: any[]) => {
      const w = tl.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0);
      const l = Math.abs(tl.filter(t => t.pnl < 0).reduce((s, t) => s + t.pnl, 0));
      return l === 0 ? w : w / l;
    };
    return {
      day: { pnl: pnl(dayT), loss: Math.min(0, pnl(dayT)), trades: dayT.length, winrate: wr(dayT), journal: journaled(dayT), totalJournalable: dayT.length },
      week: { pnl: pnl(weekT), loss: Math.min(0, pnl(weekT)), best: best(weekT), consistency: consistency(weekT), streak: streak() },
      month: { pnl: pnl(monthT), winrate: wr(monthT), pf: pf(monthT), loss: Math.min(0, pnl(monthT)), trades: monthT.length },
      dayTrades: dayT,
    };
  }, [trades]);

  // ── 7-day sparkline data ────────────────────────────────────────────────
  const last7DaysPnL = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i);
    const ds = startOfDay(d);
    const de = new Date(ds); de.setHours(23, 59, 59, 999);
    return trades.filter(t => { const td = getTradeDate(t.date); return td >= ds && td <= de; })
      .reduce((s, t) => s + (Number(t.pnl) || 0), 0);
  }), [trades]);

  // ── Current goals ───────────────────────────────────────────────────────
  const currentGoals = useMemo(() => {
    const T = targets;
    if (activeTab === 'Day') return [
      { id: 'day-pnl',     label: 'Daily P&L Target',    current: stats.day.pnl,      target: T['day-pnl'],     type: 'pnl' as const,        isHero: true  },
      { id: 'day-loss',    label: 'Max Daily Loss Limit', current: stats.day.loss,     target: T['day-loss'],    type: 'pnl' as const,        reverse: true },
      { id: 'day-trades',  label: 'Trades Today',        current: stats.day.trades,   target: T['day-trades']                                              },
      { id: 'day-winrate', label: 'Win Rate Today',      current: stats.day.winrate,  target: T['day-winrate'], type: 'percentage' as const               },
      { id: 'day-journal', label: 'Journal Completion',  current: stats.day.journal,  target: stats.day.totalJournalable || T['day-journal']               },
    ];
    if (activeTab === 'Week') return [
      { id: 'week-pnl',         label: 'Weekly P&L Target',    current: stats.week.pnl,         target: T['week-pnl'],         type: 'pnl' as const,        isHero: true  },
      { id: 'week-loss',        label: 'Max Weekly Drawdown',  current: stats.week.loss,        target: T['week-loss'],        type: 'pnl' as const,        reverse: true },
      { id: 'week-best',        label: 'Best Trade Week',      current: stats.week.best,        target: T['week-best'],        type: 'pnl' as const                        },
      { id: 'week-consistency', label: 'Consistency Score',    current: stats.week.consistency, target: T['week-consistency'], type: 'percentage' as const               },
      { id: 'week-streak',      label: 'Journaling Streak',    current: stats.week.streak,      target: T['week-streak'],      unit: ' days'                               },
    ];
    return [
      { id: 'month-pnl',     label: 'Monthly P&L Target',     current: stats.month.pnl,     target: T['month-pnl'],     type: 'pnl' as const,        isHero: true },
      { id: 'month-winrate', label: 'Monthly Win Rate Target', current: stats.month.winrate, target: T['month-winrate'], type: 'percentage' as const              },
      { id: 'month-pf',      label: 'Profit Factor Target',   current: stats.month.pf,      target: T['month-pf'],      prefix: 'x'                              },
      { id: 'month-loss',    label: 'Max Monthly Drawdown',   current: stats.month.loss,    target: T['month-loss'],    type: 'pnl' as const,        reverse: true },
      { id: 'month-trades',  label: 'Total Trades Target',    current: stats.month.trades,  target: T['month-trades']                                             },
    ];
  }, [activeTab, stats, targets]);

  // ── Goal statuses for summary bar ───────────────────────────────────────
  const goalStatuses = useMemo((): GoalStatus[] => currentGoals.map(g => {
    const pct = g.reverse
      ? Math.max(0, 100 - (g.target !== 0 ? (Math.abs(g.current) / Math.abs(g.target)) * 100 : 0))
      : Math.min(Math.max(g.target !== 0 ? (g.current / g.target) * 100 : 0, 0), 100);
    if (g.reverse) {
      if (Math.abs(g.current) === 0) return { id: g.id, status: 'safe' };
      if (pct <= 0) return { id: g.id, status: 'danger' };
      if (pct <= 30) return { id: g.id, status: 'in-progress' };
      return { id: g.id, status: 'on-track' };
    }
    if (pct >= 100) return { id: g.id, status: 'achieved' };
    if (pct >= 80)  return { id: g.id, status: 'almost' };
    if (pct >= 50)  return { id: g.id, status: 'on-track' };
    if (pct > 0)    return { id: g.id, status: 'in-progress' };
    return { id: g.id, status: 'not-started' };
  }), [currentGoals]);

  const overallPercent = useMemo(() => {
    if (!currentGoals.length) return 0;
    const total = currentGoals.reduce((sum, g) => {
      const pct = g.reverse
        ? Math.max(0, 100 - (g.target !== 0 ? (Math.abs(g.current) / Math.abs(g.target)) * 100 : 0))
        : Math.min(Math.max(g.target !== 0 ? (g.current / g.target) * 100 : 0, 0), 100);
      return sum + pct;
    }, 0);
    return total / currentGoals.length;
  }, [currentGoals]);

  // ── Best day this week (for hero card) ─────────────────────────────────
  const bestDayThisWeek = useMemo(() => {
    const max = Math.max(...last7DaysPnL);
    return max > 0 ? `Best day this week: +$${max.toFixed(2)}` : undefined;
  }, [last7DaysPnL]);

  const allZero = stats.day.trades === 0 && activeTab === 'Day';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full pb-10">
      <TopBar title="Goals" subtitle="Track and manage your performance targets" showSearch />

      <div className="px-8 flex flex-col gap-6">
        {/* Tab switcher + Summary bar */}
        <div className="flex flex-col gap-3">
          <div className="flex p-1 self-start bg-[#111827] border border-[#1e2a3a] rounded-[8px]">
            {(['Day', 'Week', 'Month'] as Timeframe[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-6 py-2 text-[13px] font-bold rounded-[6px] transition-all duration-200',
                  activeTab === tab ? 'bg-[#1d4ed8] text-white shadow-lg' : 'text-[#4B5563] hover:bg-[#1a2332] hover:text-[#60a5fa]'
                )}
              >
                {tab}
              </button>
            ))}
          </div>
          <GoalsSummary goals={goalStatuses} overallPercent={overallPercent} />
        </div>

        {/* Card grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {allZero ? (
              /* Empty state */
              <div className="flex flex-col items-center justify-center gap-4 py-14 rounded-[12px] border border-dashed border-[#1e2a3a] text-center px-6">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: '#1d4ed820' }}>
                  <Target className="w-6 h-6 text-[#1d4ed8]" />
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-white font-bold text-base">Your goals are set — start trading to track progress</p>
                  <p style={{ fontSize: 13, color: '#4B5563' }}>Targets will update in real time as you log trades</p>
                </div>
                <button
                  onClick={() => navigate('/journal')}
                  className="mt-1 px-5 py-2.5 rounded-[8px] text-white font-bold text-sm hover:opacity-80 transition-opacity"
                  style={{ background: '#1d4ed8', fontSize: 13 }}
                >
                  Log your first trade →
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {currentGoals.map((goal, i) => (
                  <GoalCard
                    key={`${goal.id}-${activeTab}`}
                    label={goal.label}
                    current={goal.current}
                    target={goal.target}
                    type={goal.type as 'pnl' | 'count' | 'percentage' | 'streak' | undefined}
                    prefix={(goal as any).prefix}
                    unit={(goal as any).unit}
                    reverse={(goal as any).reverse}
                    isHero={(goal as any).isHero}
                    sparklineData={(goal as any).isHero ? last7DaysPnL : undefined}
                    bestStat={(goal as any).isHero ? bestDayThisWeek : undefined}
                    onTargetChange={newVal => handleTargetChange(goal.id, newVal)}
                  />
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Today at a Glance */}
        <TodayAtAGlance dayTrades={stats.dayTrades} />
      </div>
    </div>
  );
}
