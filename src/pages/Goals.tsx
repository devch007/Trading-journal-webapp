import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Target, TrendingUp, TrendingDown, Clock, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';
import { TopBar } from '../lib/TopBar';
import { GoalCard } from '../components/GoalCard';
import { GoalsSummary, GoalStatus } from '../components/GoalsSummary';
import { useTrades } from '../hooks/useTrades';
import { useAccountContext } from '../contexts/AccountContext';
import { getTradeDate } from '../lib/timeUtils';
import { startOfDay, startOfWeek, startOfMonth, isToday, isWithinInterval, subDays } from 'date-fns';
import { cn } from '../lib/utils';

type Timeframe = 'Day' | 'Week' | 'Month';

interface GoalTarget {
  id: string;
  target: number;
}

const DEFAULT_TARGETS: Record<string, number> = {
  'day-pnl': 300,
  'day-loss': -100,
  'day-trades': 5,
  'day-winrate': 70,
  'day-journal': 1,
  'week-pnl': 1000,
  'week-loss': -300,
  'week-best': 500,
  'week-consistency': 80,
  'week-streak': 5,
  'month-pnl': 3000,
  'month-winrate': 70,
  'month-pf': 2.0,
  'month-loss': -1000,
  'month-trades': 50
};

export function Goals() {
  const [activeTab, setActiveTab] = useState<Timeframe>('Day');
  const { trades: allTrades, loading } = useTrades();
  const { selectedAccountId } = useAccountContext();
  const [targets, setTargets] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('tradova_goal_targets');
    return saved ? JSON.parse(saved) : DEFAULT_TARGETS;
  });

  useEffect(() => {
    localStorage.setItem('tradova_goal_targets', JSON.stringify(targets));
  }, [targets]);

  const handleTargetChange = (id: string, newTarget: number) => {
    setTargets(prev => ({ ...prev, [id]: newTarget }));
  };

  // Filter trades by selected account and timeframe
  const trades = useMemo(() => {
    if (!selectedAccountId) return [];
    return allTrades.filter(t => t.accountId === selectedAccountId);
  }, [allTrades, selectedAccountId]);

  const stats = useMemo(() => {
    const now = new Date();
    now.setFullYear(2026); // Match app's 2026 context if necessary

    const dayStart = startOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    const monthStart = startOfMonth(now);

    const filterByDate = (start: Date) => trades.filter(t => getTradeDate(t.date) >= start);

    const dayTrades = filterByDate(dayStart);
    const weekTrades = filterByDate(weekStart);
    const monthTrades = filterByDate(monthStart);

    const calcPnL = (tList: any[]) => tList.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);
    const calcWinRate = (tList: any[]) => {
      if (tList.length === 0) return 0;
      return (tList.filter(t => t.isPositive).length / tList.length) * 100;
    };
    const calcJournaled = (tList: any[]) => tList.filter(t => t.notes || t.strategy).length;
    const calcBestTrade = (tList: any[]) => tList.length === 0 ? 0 : Math.max(...tList.map(t => t.pnl || 0));
    
    const calcConsistency = (tList: any[], start: Date) => {
      if (tList.length === 0) return 0;
      const daysWithTrades = new Set(tList.map(t => getTradeDate(t.date).toDateString())).size;
      const profitableDays = new Set(
        tList.reduce((acc: string[], t) => {
          const dateStr = getTradeDate(t.date).toDateString();
          const dayPnL = tList.filter(tr => getTradeDate(tr.date).toDateString() === dateStr).reduce((sum, tr) => sum + tr.pnl, 0);
          if (dayPnL > 0) acc.push(dateStr);
          return acc;
        }, [])
      ).size;
      return (profitableDays / daysWithTrades) * 100;
    };

    const calcStreak = (tList: any[]) => {
      let streak = 0;
      let checkDate = new Date();
      checkDate.setFullYear(2026);
      
      while (true) {
        const dayTrades = trades.filter(t => getTradeDate(t.date).toDateString() === checkDate.toDateString());
        const hasJournaled = dayTrades.some(t => t.notes || t.strategy);
        if (hasJournaled) {
          streak++;
          checkDate = subDays(checkDate, 1);
        } else {
          break;
        }
        if (streak > 365) break; // safety
      }
      return streak;
    };

    const calcProfitFactor = (tList: any[]) => {
      const wins = tList.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
      const losses = Math.abs(tList.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0));
      return losses === 0 ? wins : wins / losses;
    };

    return {
      day: {
        pnl: calcPnL(dayTrades),
        loss: Math.min(0, calcPnL(dayTrades)), // only care if negative
        trades: dayTrades.length,
        winrate: calcWinRate(dayTrades),
        journal: calcJournaled(dayTrades),
        totalJournalable: dayTrades.length
      },
      week: {
        pnl: calcPnL(weekTrades),
        loss: Math.min(0, calcPnL(weekTrades)),
        best: calcBestTrade(weekTrades),
        consistency: calcConsistency(weekTrades, weekStart),
        streak: calcStreak(trades)
      },
      month: {
        pnl: calcPnL(monthTrades),
        winrate: calcWinRate(monthTrades),
        pf: calcProfitFactor(monthTrades),
        loss: Math.min(0, calcPnL(monthTrades)),
        trades: monthTrades.length
      }
    };
  }, [trades]);

  const currentGoals = useMemo(() => {
    if (activeTab === 'Day') {
      return [
        { id: 'day-pnl', label: 'Daily P&L Target', current: stats.day.pnl, target: targets['day-pnl'], type: 'pnl' as const },
        { id: 'day-loss', label: 'Max Daily Loss Limit', current: stats.day.loss, target: targets['day-loss'], type: 'pnl' as const, reverse: true },
        { id: 'day-trades', label: 'Trades Today', current: stats.day.trades, target: targets['day-trades'] },
        { id: 'day-winrate', label: 'Win Rate Today', current: stats.day.winrate, target: targets['day-winrate'], type: 'percentage' as const },
        { id: 'day-journal', label: 'Journal Completion', current: stats.day.journal, target: stats.day.totalJournalable || targets['day-journal'] }
      ];
    } else if (activeTab === 'Week') {
      return [
        { id: 'week-pnl', label: 'Weekly P&L Target', current: stats.week.pnl, target: targets['week-pnl'], type: 'pnl' as const },
        { id: 'week-loss', label: 'Max Weekly Drawdown', current: stats.week.loss, target: targets['week-loss'], type: 'pnl' as const, reverse: true },
        { id: 'week-best', label: 'Best Trade Week', current: stats.week.best, target: targets['week-best'], type: 'pnl' as const },
        { id: 'week-consistency', label: 'Consistency Score', current: stats.week.consistency, target: targets['week-consistency'], type: 'percentage' as const },
        { id: 'week-streak', label: 'Journaling Streak', current: stats.week.streak, target: targets['week-streak'], unit: ' days' }
      ];
    } else {
      return [
        { id: 'month-pnl', label: 'Monthly P&L Target', current: stats.month.pnl, target: targets['month-pnl'], type: 'pnl' as const },
        { id: 'month-winrate', label: 'Monthly Win Rate Target', current: stats.month.winrate, target: targets['month-winrate'], type: 'percentage' as const },
        { id: 'month-pf', label: 'Profit Factor Target', current: stats.month.pf, target: targets['month-pf'], prefix: 'x' },
        { id: 'month-loss', label: 'Max Monthly Drawdown', current: stats.month.loss, target: targets['month-loss'], type: 'pnl' as const, reverse: true },
        { id: 'month-trades', label: 'Total Trades Target', current: stats.month.trades, target: targets['month-trades'] }
      ];
    }
  }, [activeTab, stats, targets]);

  const goalStatuses = useMemo((): GoalStatus[] => {
    return currentGoals.map(g => {
      const isAchieved = g.reverse ? g.current > g.target : g.current >= g.target;
      const percentage = g.target === 0 ? 100 : (g.current / g.target) * 100;
      const isDanger = !isAchieved && (percentage < 50 && g.target !== 0);
      
      return {
        id: g.id,
        status: isAchieved ? 'achieved' : (isDanger ? 'missed' : 'in-progress')
      };
    });
  }, [currentGoals]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full pb-10">
      <TopBar 
        title="Goals" 
        subtitle="Track and manage your performance targets" 
        showSearch={true} 
      />
      
      <div className="px-8 flex flex-col gap-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex p-1 bg-[#111827] border border-[#1e2a3a] rounded-[8px]">
            {(['Day', 'Week', 'Month'] as Timeframe[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-6 py-2 text-[13px] font-bold rounded-[6px] transition-all duration-200",
                  activeTab === tab 
                    ? "bg-[#1d4ed8] text-white shadow-lg" 
                    : "text-[#4B5563] hover:bg-[#1a2332] hover:text-[#60a5fa]"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          <GoalsSummary goals={goalStatuses} />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4"
          >
            {trades.length === 0 && activeTab === 'Day' ? (
              <div className="col-span-full py-20 flex flex-col items-center justify-center glass-card border-dashed border-2 border-[#1e2a3a] rounded-[16px]">
                <Target className="w-12 h-12 text-[#4B5563] mb-4 opacity-50" />
                <p className="text-[#4B5563] font-bold text-lg">No trades logged yet today</p>
                <p className="text-[#4B5563]/60 text-sm">Log your first trade to see today's goal progress</p>
              </div>
            ) : (
              currentGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  label={goal.label}
                  current={goal.current}
                  target={goal.target}
                  type={goal.type as "pnl" | "count" | "percentage" | "streak" | undefined}
                  prefix={goal.prefix}
                  unit={goal.unit}
                  reverse={goal.reverse}
                  onTargetChange={(newVal) => handleTargetChange(goal.id, newVal)}
                />
              ))
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
