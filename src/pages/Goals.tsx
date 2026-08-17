import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Target, Shield, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TopBar } from '../lib/TopBar';
import { GoalCard } from '../components/GoalCard';
import { GoalsSummary, GoalStatus } from '../components/GoalsSummary';
import { GoalHeatmap, DailyHeatmapData, DailyGoalStatus } from '../components/GoalHeatmap';
import { useTrades } from '../hooks/useTrades';
import { useAuth } from '../contexts/AuthContext';
import { useAccountContext } from '../contexts/AccountContext';
import { TradingRule } from '../hooks/useAccounts';
import { getTradeDate } from '../lib/timeUtils';
import { startOfDay, startOfWeek, startOfMonth, subDays } from 'date-fns';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

type Timeframe = 'Day' | 'Week' | 'Month';

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_TARGETS: Record<string, number> = {
  'day-pnl': 300, 'day-loss': -100, 'day-trades': 5, 'day-winrate': 70, 'day-journal': 1,
  'week-pnl': 1000, 'week-loss': -300, 'week-best': 500, 'week-consistency': 80, 'week-streak': 5,
  'month-pnl': 3000, 'month-winrate': 70, 'month-pf': 2.0, 'month-loss': -1000, 'month-trades': 50,
};

// ─── Today at a Glance ───────────────────────────────────────────────────────

function TodayAtAGlance({ dayTrades, selectedDay, onDayChange }: { dayTrades: any[], selectedDay: Date, onDayChange: (d: Date) => void }) {
  const ALL_HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7AM–8PM
  const today = startOfDay(new Date());
  const isToday = selectedDay.toDateString() === today.toDateString();

  const goBack = () => {
    const prev = new Date(selectedDay);
    prev.setDate(prev.getDate() - 1);
    onDayChange(prev);
  };

  const goForward = () => {
    if (!isToday) {
      const next = new Date(selectedDay);
      next.setDate(next.getDate() + 1);
      onDayChange(next);
    }
  };

  const formatDisplayDate = (d: Date) => {
    if (d.toDateString() === today.toDateString()) return "Today's Trading Activity";
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday's Trading Activity";
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };

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

  return (
    <div className="flex flex-col gap-4 mb-4">
      {/* Day Navigation Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Target className="w-4 h-4" />
          </div>
          <AnimatePresence mode="wait">
            <motion.h3
              key={selectedDay.toDateString()}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.2 }}
              className="text-base font-bold text-gray-900 dark:text-white"
            >
              {formatDisplayDate(selectedDay)}
            </motion.h3>
          </AnimatePresence>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={goBack}
            className="p-2 rounded-xl bg-white dark:bg-[#16181f] border border-gray-200 dark:border-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-all text-gray-600 dark:text-gray-400 shadow-2xs"
            title="Previous day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {!isToday && (
            <button
              onClick={() => onDayChange(today)}
              className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40 text-blue-600 dark:text-blue-400 text-xs font-bold"
              title="Back to today"
            >
              TODAY
            </button>
          )}

          <button
            onClick={goForward}
            disabled={isToday}
            className={`p-2 rounded-xl border transition-all ${
              isToday
                ? 'bg-gray-100 dark:bg-neutral-800 border-gray-200 dark:border-neutral-800 opacity-40 cursor-not-allowed'
                : 'bg-white dark:bg-[#16181f] border-gray-200 dark:border-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-800 shadow-2xs'
            }`}
            title="Next day"
          >
            <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Timeline strip */}
        <div className="bg-white dark:bg-[#16181f] flex flex-col justify-between gap-4 p-6 rounded-3xl border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-gray-900 dark:text-white">Activity Timeline</span>
            <span className="text-[11px] font-medium text-gray-400">EST Times</span>
          </div>

          {dayTrades.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 rounded-2xl border border-dashed border-gray-200 dark:border-neutral-800 text-center gap-2 bg-gray-50/50 dark:bg-neutral-800/20">
              <Target className="w-6 h-6 text-gray-400" />
              <p className="text-xs font-normal text-gray-400">No trades logged yet for this day</p>
            </div>
          ) : (
            <div className="flex items-end justify-between overflow-x-auto no-scrollbar pb-1 pt-2">
              {timeline.map(({ hour, hasTrades, isPositive }) => (
                <div key={hour} className="flex flex-col items-center justify-end gap-2 flex-shrink-0 min-w-[22px]">
                  {hasTrades ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', damping: 12 }}
                      className="w-3 h-3 rounded-full z-10"
                      style={{ background: isPositive ? '#1ED760' : '#E5534B' }}
                    />
                  ) : (
                    <div className="w-[2px] h-3 rounded-full bg-gray-200 dark:bg-neutral-700" />
                  )}
                  <span className="text-[10px] font-medium text-gray-400">
                    {hour > 12 ? `${hour - 12}P` : hour === 12 ? '12P' : `${hour}A`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick stats grid */}
        <div className="grid grid-cols-2 gap-3.5">
          {[
            {
              label: 'Best Trade',
              value: best ? formatPnl(best.pnl) : '—',
              color: 'text-emerald-600 dark:text-emerald-400',
              empty: !best,
            },
            {
              label: 'Worst Trade',
              value: worst ? formatPnl(worst.pnl) : '—',
              color: 'text-rose-500',
              empty: !worst,
            },
            {
              label: 'Total Trades',
              value: dayTrades.length > 0 ? String(dayTrades.length) : '—',
              color: 'text-gray-900 dark:text-white',
              empty: dayTrades.length === 0,
            },
            {
              label: streak.type === 'win' ? `Win Streak` : streak.type === 'loss' ? `Loss Streak` : 'Streak',
              value: streak.count > 0 ? `${streak.count} in a row` : '—',
              color: streak.type === 'win' ? 'text-emerald-600 dark:text-emerald-400' : streak.type === 'loss' ? 'text-amber-500' : 'text-gray-900 dark:text-white',
              empty: streak.count === 0,
            },
          ].map(({ label, value, color, empty }) => (
            <div
              key={label}
              className="bg-white dark:bg-[#16181f] flex flex-col justify-center gap-1 rounded-3xl p-5 border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs"
            >
              <span className="text-[11px] font-medium text-gray-400">{label}</span>
              <span className={cn("text-xl font-bold tabular-nums", empty ? "text-gray-400" : color)}>
                {value}
              </span>
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
  const [selectedDay, setSelectedDay] = useState<Date>(startOfDay(new Date()));
  const { trades: allTrades, loading } = useTrades();
  const { user } = useAuth();
  const { selectedAccountId, selectedAccount } = useAccountContext();
  const [targets, setTargets] = useState<Record<string, number>>(DEFAULT_TARGETS);
  const [targetsLoading, setTargetsLoading] = useState(true);

  // Account trading rules
  const accountRules = useMemo(() => selectedAccount?.rules?.filter(r => r.enabled) || [], [selectedAccount]);

  // Load targets from Supabase
  useEffect(() => {
    if (!user) {
      setTargetsLoading(false);
      return;
    }
    supabase
      .from('goal_targets')
      .select('goal_id, target')
      .eq('userId', user.id)
      .then(({ data, error }) => {
        if (error) {
          console.error('[Goals] Failed to load targets from DB:', error.message);
        } else if (data && data.length > 0) {
          const loaded: Record<string, number> = { ...DEFAULT_TARGETS };
          data.forEach((row: any) => { loaded[row.goal_id] = Number(row.target); });
          setTargets(loaded);
        }
        setTargetsLoading(false);
      });
  }, [user]);

  const handleTargetChange = useCallback(async (id: string, newTarget: number) => {
    if (!user) return;
    // Optimistic update
    setTargets(prev => ({ ...prev, [id]: newTarget }));
    const { error } = await supabase.from('goal_targets').upsert(
      { userId: user.id, goal_id: id, target: newTarget },
      { onConflict: 'userId,goal_id' }
    );
    if (error) {
      console.error('[Goals] Failed to save target to DB:', error.message);
    }
  }, [user]);

  // ── Data: filter by account ─────────────────────────────────────────────
  const trades = useMemo(() =>
    selectedAccountId ? allTrades.filter(t => t.accountId === selectedAccountId) : [],
  [allTrades, selectedAccountId]);

  // ── Stats (unchanged logic) ─────────────────────────────────────────────
  const stats = useMemo(() => {
    const now = new Date();
    // Use selectedDay for day-level stats so navigation works
    const dayStart = startOfDay(selectedDay);
    const dayEnd = new Date(dayStart); dayEnd.setHours(23, 59, 59, 999);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const dayT = trades.filter(t => { const d = getTradeDate(t.date); return d >= dayStart && d <= dayEnd; });
    const by = (start: Date) => trades.filter(t => getTradeDate(t.date) >= start);
    const weekT = by(weekStart), monthT = by(monthStart);

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
    const grossLoss = (tl: any[]) => tl.filter(t => (t.pnl || 0) < 0).reduce((s, t) => s + (Number(t.pnl) || 0), 0);
    return {
      day: { pnl: pnl(dayT), loss: grossLoss(dayT), trades: dayT.length, winrate: wr(dayT), journal: journaled(dayT), totalJournalable: dayT.length },
      week: { pnl: pnl(weekT), loss: Math.min(0, pnl(weekT)), best: best(weekT), consistency: consistency(weekT), streak: streak() },
      month: { pnl: pnl(monthT), winrate: wr(monthT), pf: pf(monthT), loss: Math.min(0, pnl(monthT)), trades: monthT.length },
      dayTrades: dayT,
    };
  }, [trades, selectedDay]);

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
    if (activeTab === 'Day') {
      const equity = selectedAccount?.currentEquity || selectedAccount?.initialCapital || 100000;
      const dayTrades = stats.dayTrades;
      const grossLossAbs = Math.abs(stats.day.loss); // absolute gross loss in $

      // Find the daily_loss_limit account rule (if any)
      const dailyLossRule = accountRules.find(r => r.type === 'daily_loss_limit');

      // Resolve day-loss card: use account rule value if available, else fallback to goal target
      let dayLossTarget: number;
      let dayLossCurrent: number;
      let dayLossType: 'pnl' | 'percentage' = 'pnl';

      if (dailyLossRule) {
        if (dailyLossRule.unit === '%') {
          dayLossType = 'percentage';
          dayLossCurrent = equity > 0 ? (grossLossAbs / equity) * 100 : 0;
          dayLossTarget = -dailyLossRule.value; // stored negative for reverse cards
        } else {
          dayLossType = 'pnl';
          dayLossCurrent = stats.day.loss; // negative gross loss
          dayLossTarget = -dailyLossRule.value; // negative limit
        }
      } else {
        dayLossCurrent = stats.day.loss;
        dayLossTarget = T['day-loss'];
        dayLossType = 'pnl';
      }

      const baseGoals = [
        { id: 'day-pnl',     label: 'Daily P&L Target',    current: stats.day.pnl,   target: T['day-pnl'],     type: 'pnl' as const,        isHero: true  },
        { id: 'day-loss',    label: 'Max Daily Loss Limit', current: dayLossCurrent,  target: dayLossTarget,    type: dayLossType as 'pnl' | 'percentage', reverse: true },
        { id: 'day-trades',  label: 'Trades Today',        current: stats.day.trades, target: T['day-trades']                                              },
        { id: 'day-winrate', label: 'Win Rate Today',      current: stats.day.winrate, target: T['day-winrate'], type: 'percentage' as const               },
        { id: 'day-journal', label: 'Journal Completion',  current: stats.day.journal, target: stats.day.totalJournalable || T['day-journal']               },
      ];

      // Add account trading rules as goal cards — skip daily_loss_limit (already shown above)
      const ruleGoals = accountRules
        .filter(rule => rule.type !== 'daily_loss_limit')
        .map(rule => {
          const todayPnl = dayTrades.reduce((s: number, t: any) => s + (Number(t.pnl) || 0), 0);

          let current = 0;
          let type: 'count' | 'pnl' | 'percentage' = 'count';
          let reverse = false;
          let unit: string | undefined;

          switch (rule.type) {
            case 'max_trades_per_day':
              current = dayTrades.length;
              reverse = true;
              unit = ' trades';
              break;
            case 'max_loss_per_trade': {
              const worst = dayTrades.reduce((w: number, t: any) => Math.min(w, t.pnl || 0), 0);
              current = Math.abs(worst);
              type = 'pnl';
              reverse = true;
              break;
            }
            case 'custom':
              if (rule.unit === 'trades') {
                current = dayTrades.length;
                reverse = true;
                unit = ' trades';
              } else if (rule.unit === '$') {
                current = Math.abs(Math.min(0, todayPnl));
                type = 'pnl';
                reverse = true;
              } else {
                current = equity > 0 ? (Math.abs(Math.min(0, todayPnl)) / equity) * 100 : 0;
                type = 'percentage';
                reverse = true;
              }
              break;
          }

          return {
            id: `rule-${rule.id}`,
            label: `⛡ ${rule.name}`,
            current,
            target: reverse ? -rule.value : rule.value,
            type,
            reverse,
            unit,
            isRule: true,
          };
        });

      return [...baseGoals, ...ruleGoals];
    }
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
  }, [activeTab, stats, targets, accountRules, selectedAccount]);

  // ── Goal statuses for summary bar ───────────────────────────────────────
  const goalStatuses = useMemo((): GoalStatus[] => currentGoals.map(g => {
    const pct = g.reverse
      ? Math.max(0, 100 - (g.target !== 0 ? (Math.abs(g.current) / Math.abs(g.target)) * 100 : 0))
      : Math.min(Math.max(g.target !== 0 ? (g.current / g.target) * 100 : 0, 0), 100);
    let s: GoalStatus['status'] = 'not-started';
    if (g.reverse) {
      if (Math.abs(g.current) === 0) s = 'safe';
      else if (pct <= 0) s = 'danger';
      else if (pct <= 30) s = 'in-progress';
      else s = 'on-track';
    } else {
      if (pct >= 100) s = 'achieved';
      else if (pct >= 80) s = 'almost';
      else if (pct >= 50) s = 'on-track';
      else if (pct > 0) s = 'in-progress';
      else s = 'not-started';
    }
    return { id: g.id, status: s };
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

  // ── Heatmap Data Generation ─────────────────────────────────────────────
  const heatmapData = useMemo<DailyHeatmapData[]>(() => {
    if (activeTab === 'Day') return [];
    
    const days: Date[] = [];
    const now = new Date();
    
    if (activeTab === 'Week') {
      const start = startOfWeek(now, { weekStartsOn: 1 }); // Monday
      for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        days.push(d);
      }
    } else if (activeTab === 'Month') {
      const start = startOfMonth(now);
      start.setMonth(start.getMonth() - 2); // Get current and previous 2 months
      
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0); // End of current month
      
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const daysInPeriod = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
      for (let i = 0; i < daysInPeriod; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        days.push(d);
      }
    }

    return days.map(day => {
      const dayStart = startOfDay(day);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);
      
      const dayT = trades.filter(t => {
        const d = getTradeDate(t.date);
        return d >= dayStart && d <= dayEnd;
      });

      const pnl = dayT.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
      const winrate = dayT.length ? (dayT.filter(t => t.isPositive).length / dayT.length) * 100 : 0;
      const tCount = dayT.length;

      const pnlTarget = targets['day-pnl'] || DEFAULT_TARGETS['day-pnl'];
      const lossLimit = targets['day-loss'] || DEFAULT_TARGETS['day-loss'];
      const winrateTarget = targets['day-winrate'] || DEFAULT_TARGETS['day-winrate'];
      
      const getStat = (current: number, target: number, reverse: boolean) => {
        const pct = reverse 
          ? Math.max(0, 100 - (target !== 0 ? (Math.abs(current) / Math.abs(target)) * 100 : 0))
          : Math.min(Math.max(target !== 0 ? (current / target) * 100 : 0, 0), 100);
        if (reverse) {
          if (pct <= 0) return 'breached';
          if (pct <= 50) return 'in-progress';
          return 'achieved';
        } else {
          if (pct >= 100) return 'achieved';
          if (pct >= 50) return 'in-progress';
          return 'not-started';
        }
      };

      const active = tCount > 0;
      
      const goalStatuses: DailyGoalStatus[] = [
        { id: 'pnl', label: 'Daily PnL Target', status: active ? (getStat(pnl, pnlTarget, false) as any) : 'not-started' },
        { id: 'loss', label: 'Max Daily Loss', status: active ? (getStat(pnl, lossLimit, true) as any) : 'not-started' },
        { id: 'winrate', label: 'Win Rate Target', status: active ? (getStat(winrate, winrateTarget, false) as any) : 'not-started' },
      ];

      // Add account rule compliance to heatmap
      const equity = selectedAccount?.currentEquity || selectedAccount?.initialCapital || 100000;
      for (const rule of accountRules) {
        let ruleStatus: DailyGoalStatus['status'] = 'not-started';
        if (active) {
          switch (rule.type) {
            case 'max_trades_per_day':
              ruleStatus = tCount > rule.value ? 'breached' : tCount === rule.value ? 'in-progress' : 'achieved';
              break;
            case 'max_loss_per_trade': {
              const worstTrade = dayT.reduce((w, t) => Math.min(w, t.pnl || 0), 0);
              ruleStatus = Math.abs(worstTrade) > rule.value ? 'breached' : 'achieved';
              break;
            }
            case 'daily_loss_limit': {
              const loss = Math.abs(Math.min(0, pnl));
              if (rule.unit === '%') {
                const lossPct = equity > 0 ? (loss / equity) * 100 : 0;
                ruleStatus = lossPct > rule.value ? 'breached' : lossPct >= rule.value * 0.8 ? 'in-progress' : 'achieved';
              } else {
                ruleStatus = loss > rule.value ? 'breached' : 'achieved';
              }
              break;
            }
            case 'custom': {
              if (rule.unit === 'trades') {
                ruleStatus = tCount > rule.value ? 'breached' : 'achieved';
              } else if (rule.unit === '$') {
                const totalLoss = Math.abs(Math.min(0, pnl));
                ruleStatus = totalLoss > rule.value ? 'breached' : 'achieved';
              } else {
                const lossPct = equity > 0 ? (Math.abs(Math.min(0, pnl)) / equity) * 100 : 0;
                ruleStatus = lossPct > rule.value ? 'breached' : 'achieved';
              }
              break;
            }
          }
        }
        goalStatuses.push({ id: `rule-${rule.id}`, label: `⛡ ${rule.name}`, status: ruleStatus });
      }

      const passedGoals = goalStatuses.filter(g => g.status === 'achieved').length;
      const breachedAny = goalStatuses.some(g => g.status === 'breached');
      const score = active ? passedGoals / goalStatuses.length : 0;
      
      return {
        date: day,
        active,
        breachedLimits: active && breachedAny,
        score,
        goals: goalStatuses
      };
    });
  }, [activeTab, trades, targets, accountRules, selectedAccount]);

  const allZero = stats.day.trades === 0 && activeTab === 'Day';

  if (loading || targetsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full pb-10">
      <TopBar title="Goals & Performance Targets" subtitle="Track and manage your discipline & performance targets" showSearch />

      <div className="p-6 md:p-8 space-y-7 max-w-[1600px] w-full mx-auto">
        {/* Tab switcher + Summary bar */}
        <div className="flex flex-col gap-4">
          <div className="segment-pill-container self-start">
            {(['Day', 'Week', 'Month'] as Timeframe[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`segment-pill-btn px-6 py-2 ${
                  activeTab === tab ? 'segment-pill-btn-active' : ''
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <GoalsSummary goals={goalStatuses} overallPercent={overallPercent} />
        </div>

        {/* Today at a Glance - Only visible on "Day" tab */}
        {activeTab === 'Day' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <TodayAtAGlance
              dayTrades={stats.dayTrades}
              selectedDay={selectedDay}
              onDayChange={setSelectedDay}
            />
          </motion.div>
        )}

        {/* Card grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={{ duration: 0.2 }}
          >
            {allZero ? (
              /* Empty state */
              <div className="bg-white dark:bg-[#16181f] flex flex-col items-center justify-center gap-3.5 py-12 rounded-3xl border-2 border-dashed border-gray-200 dark:border-neutral-800 text-center px-6 shadow-2xs">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                  <Target className="w-6 h-6" />
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-gray-900 dark:text-white font-bold text-base">Your goals are set — start trading to track progress</p>
                  <p className="text-xs text-gray-400">Targets will update in real time as you log trades</p>
                </div>
                <button
                  onClick={() => navigate('/journal')}
                  className="mt-2 px-5 py-2.5 rounded-2xl bg-[#111827] dark:bg-white text-white dark:text-gray-900 font-semibold text-xs shadow-xs hover:bg-black dark:hover:bg-gray-100 transition-all"
                >
                  Log your first trade →
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {currentGoals.map((goal) => (
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

            {/* Heatmap Section */}
            {activeTab !== 'Day' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="mt-6"
              >
                <GoalHeatmap data={heatmapData} mode={activeTab === 'Week' ? 'week' : 'month'} />
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
