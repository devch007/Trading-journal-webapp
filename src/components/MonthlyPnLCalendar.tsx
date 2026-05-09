import React, { useMemo, useState } from 'react';
import { Trade } from '../hooks/useTrades';
import { getTradeDate } from '../lib/timeUtils';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MonthlyPnLCalendarProps {
  trades: Trade[];
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Each month is split into 4 fixed week buckets:
// W1 → days  1–7
// W2 → days  8–14
// W3 → days 15–21
// W4 → days 22–end
function getWeekBucket(day: number): number {
  if (day <= 7)  return 0; // W1
  if (day <= 14) return 1; // W2
  if (day <= 21) return 2; // W3
  return 3;                // W4
}

interface WeekBar {
  monthLabel: string;   // e.g. "May"
  monthYear: number;    // e.g. 2026
  monthIndex: number;   // 0-based month
  week: number;         // 0-3
  weekLabel: string;    // "W1" .. "W4"
  pnl: number;
  tradeCount: number;
  isCurrentWeek: boolean;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  bar: WeekBar | null;
}

export function MonthlyPnLCalendar({ trades }: MonthlyPnLCalendarProps) {
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, bar: null });
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // ─── Build week bars for the last 4 months ───────────────────────────────
  const { bars, months } = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const currentDay   = now.getDate();
    const currentWeekBucket = getWeekBucket(currentDay);

    // Build 4 month slots (oldest → newest)
    const monthSlots: { month: number; year: number }[] = [];
    for (let i = 3; i >= 0; i--) {
      let m = currentMonth - i;
      let y = currentYear;
      if (m < 0) { m += 12; y -= 1; }
      monthSlots.push({ month: m, year: y });
    }

    // Initialise all bars
    const allBars: WeekBar[] = [];
    monthSlots.forEach(({ month, year }) => {
      for (let w = 0; w < 4; w++) {
        const isCurr =
          month === currentMonth &&
          year  === currentYear  &&
          w     === currentWeekBucket;

        allBars.push({
          monthLabel: MONTH_LABELS[month],
          monthYear:  year,
          monthIndex: month,
          week:       w,
          weekLabel:  `W${w + 1}`,
          pnl:        0,
          tradeCount: 0,
          isCurrentWeek: isCurr,
        });
      }
    });

    // Bin trades
    trades.forEach(trade => {
      if (!trade) return;
      const pnl = Number(trade.pnl || 0);
      let d: Date;
      try {
        d = trade.date ? getTradeDate(trade.date) : new Date(trade.createdAt ?? Date.now());
      } catch { d = new Date(); }

      const tm = d.getMonth();
      const ty = d.getFullYear();
      const tw = getWeekBucket(d.getDate());

      const bar = allBars.find(b => b.monthIndex === tm && b.monthYear === ty && b.week === tw);
      if (bar) { bar.pnl += pnl; bar.tradeCount += 1; }
    });

    return { bars: allBars, months: monthSlots };
  }, [trades]);

  const maxAbs = useMemo(() => Math.max(...bars.map(b => Math.abs(b.pnl)), 1), [bars]);
  const totalPnl = useMemo(() => bars.reduce((s, b) => s + b.pnl, 0), [bars]);
  const winWeeks = bars.filter(b => b.pnl > 0).length;
  const activeWeeks = bars.filter(b => b.tradeCount > 0).length;

  const formatShort = (val: number) => {
    const abs = Math.abs(val);
    const s = abs >= 1000 ? `$${(abs / 1000).toFixed(1)}k` : `$${abs.toFixed(0)}`;
    return val >= 0 ? `+${s}` : `-${s}`;
  };

  const formatFull = (val: number) => {
    const abs = Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return val >= 0 ? `+$${abs}` : `-$${abs}`;
  };

  const BAR_HEIGHT = 160; // max px each direction

  const handleEnter = (e: React.MouseEvent, bar: WeekBar, idx: number) => {
    setHoveredIndex(idx);
    setTooltip({ visible: true, x: e.clientX, y: e.clientY, bar });
  };
  const handleMove  = (e: React.MouseEvent) => setTooltip(p => ({ ...p, x: e.clientX, y: e.clientY }));
  const handleLeave = () => { setHoveredIndex(null); setTooltip({ visible: false, x: 0, y: 0, bar: null }); };

  return (
    <div className="glass-card p-6 rounded-2xl flex flex-col gap-5 relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full blur-[90px] opacity-[0.06] pointer-events-none bg-[#1ED760]" />
      <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full blur-[90px] opacity-[0.06] pointer-events-none bg-[#E5534B]" />

      {/* ── Header ── */}
      <div className="flex justify-between items-start z-10">
        <div className="flex flex-col gap-1">
          <h3 className="type-h2 text-white text-[16px]">Weekly P&L</h3>
          <p className="type-label text-[11px]">4 weeks × last 4 months</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end gap-0.5">
            <span className="type-label text-[10px]">Net P&L</span>
            <span className={`font-bold tnum text-[16px] ${totalPnl >= 0 ? 'text-[#1ED760]' : 'text-[#E5534B]'}`}>
              {formatFull(totalPnl)}
            </span>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <span className="type-label text-[10px]">Win Weeks</span>
            <span className="font-bold text-white text-[16px]">
              {winWeeks}<span className="text-[#A7A7A7] font-normal text-[12px]">/{activeWeeks}</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── Chart ── */}
      <div className="relative" style={{ height: BAR_HEIGHT * 2 + 24 }}>
        {/* Zero line */}
        <div
          className="absolute left-0 right-0 border-t border-dashed border-white/10 z-10 pointer-events-none"
          style={{ top: BAR_HEIGHT }}
        />

        {/* Y-axis labels */}
        <div
          className="absolute -left-1 flex flex-col justify-between pointer-events-none text-right"
          style={{ top: 0, height: BAR_HEIGHT * 2 + 24, width: 40 }}
        >
          <span className="type-micro text-[9px] text-[#6A6A6A]">{formatShort(maxAbs)}</span>
          <span className="type-micro text-[9px] text-[#6A6A6A]">$0</span>
          <span className="type-micro text-[9px] text-[#6A6A6A]">{formatShort(-maxAbs)}</span>
        </div>

        {/* Bars + labels */}
        <div className="absolute inset-0 pl-10 flex items-stretch">
          {bars.map((bar, i) => {
            const pct  = Math.abs(bar.pnl) / maxAbs;
            const barH = pct * BAR_HEIGHT;
            const isPos    = bar.pnl >= 0;
            const hasData  = bar.tradeCount > 0;
            const isHov    = hoveredIndex === i;

            // Thin gap between months (after every 4th bar except last)
            const isMonthBoundary = i > 0 && i % 4 === 0;

            return (
              <React.Fragment key={i}>
                {isMonthBoundary && (
                  <div className="w-px bg-white/5 self-stretch mx-1 shrink-0" />
                )}

                <div
                  className="flex-1 flex flex-col justify-center items-center relative cursor-pointer"
                  style={{ minWidth: 0 }}
                  onMouseEnter={e => handleEnter(e, bar, i)}
                  onMouseMove={handleMove}
                  onMouseLeave={handleLeave}
                >
                  {/* ── Profit bar (grows upward) ── */}
                  <div className="w-full flex flex-col justify-end" style={{ height: BAR_HEIGHT }}>
                    {isPos && hasData && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: barH }}
                        transition={{ duration: 0.65, delay: i * 0.035, ease: [0.34, 1.56, 0.64, 1] }}
                        className="w-full relative overflow-hidden"
                        style={{ borderRadius: '5px 5px 2px 2px', minHeight: 3 }}
                      >
                        {/* Gradient fill */}
                        <div
                          className="absolute inset-0 transition-all duration-200"
                          style={{
                            background: isHov
                              ? 'linear-gradient(180deg, #4DF090 0%, #1ED760 45%, #15a347 100%)'
                              : 'linear-gradient(180deg, #2eef74 0%, #1ED760 55%, #128a3a 100%)',
                          }}
                        />
                        {/* 3D left highlight */}
                        <div
                          className="absolute top-0 bottom-0 left-0 w-[30%]"
                          style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0) 100%)', borderRadius: '5px 0 0 0' }}
                        />
                        {/* 3D top cap */}
                        <div
                          className="absolute top-0 left-0 right-0 h-[22%]"
                          style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0) 100%)' }}
                        />
                        {isHov && (
                          <div className="absolute inset-0" style={{ boxShadow: '0 0 18px 4px rgba(30,215,96,0.55)' }} />
                        )}
                      </motion.div>
                    )}
                  </div>

                  {/* ── Loss bar (grows downward) ── */}
                  <div className="w-full flex flex-col justify-start" style={{ height: BAR_HEIGHT }}>
                    {!isPos && hasData && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: barH }}
                        transition={{ duration: 0.65, delay: i * 0.035, ease: [0.34, 1.56, 0.64, 1] }}
                        className="w-full relative overflow-hidden"
                        style={{ borderRadius: '2px 2px 5px 5px', minHeight: 3 }}
                      >
                        <div
                          className="absolute inset-0 transition-all duration-200"
                          style={{
                            background: isHov
                              ? 'linear-gradient(180deg, #f06060 0%, #E5534B 50%, #a52f28 100%)'
                              : 'linear-gradient(180deg, #e86060 0%, #E5534B 55%, #882420 100%)',
                          }}
                        />
                        <div
                          className="absolute top-0 bottom-0 left-0 w-[30%]"
                          style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0) 100%)' }}
                        />
                        {isHov && (
                          <div className="absolute inset-0" style={{ boxShadow: '0 0 18px 4px rgba(229,83,75,0.55)' }} />
                        )}
                      </motion.div>
                    )}
                  </div>

                  {/* Week label */}
                  <span
                    className={`mt-2 text-[8px] font-bold uppercase tracking-wide transition-colors ${
                      bar.isCurrentWeek ? 'text-primary' : isHov ? 'text-white' : 'text-[#6A6A6A]'
                    }`}
                  >
                    {bar.weekLabel}
                  </span>
                  {bar.isCurrentWeek && <div className="w-1 h-1 rounded-full bg-primary mt-0.5" />}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ── Month group labels ── */}
      <div className="pl-10 flex">
        {months.map(({ month, year }, mi) => (
          <div
            key={`${year}-${month}`}
            className="flex-1 flex items-center justify-center gap-1"
            // account for the 1px divider between month groups
            style={{ marginLeft: mi > 0 ? 9 : 0 }}
          >
            <span className={`text-[10px] font-bold tracking-wide uppercase ${
              month === new Date().getMonth() && year === new Date().getFullYear()
                ? 'text-primary'
                : 'text-[#A7A7A7]'
            }`}>
              {MONTH_LABELS[month]}
            </span>
            <span className="text-[9px] text-[#6A6A6A]">{year}</span>
          </div>
        ))}
      </div>

      {/* ── Legend ── */}
      <div className="flex items-center gap-6 pt-1 border-t border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm" style={{ background: 'linear-gradient(180deg, #2eef74 0%, #1ED760 100%)' }} />
          <span className="type-label text-[11px]">Profit Week</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm" style={{ background: 'linear-gradient(180deg, #e86060 0%, #E5534B 100%)' }} />
          <span className="type-label text-[11px]">Loss Week</span>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-[11px] font-bold"
          style={{ color: totalPnl >= 0 ? '#1ED760' : '#E5534B' }}>
          {totalPnl >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          {activeWeeks > 0 ? `${winWeeks}/${activeWeeks} weeks profitable` : 'No trades yet'}
        </div>
      </div>

      {/* ── Floating Tooltip ── */}
      {tooltip.visible && tooltip.bar && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: tooltip.x + 14, top: tooltip.y - 90 }}
        >
          <div className="glass-card bg-[#0d0d16]/95 backdrop-blur-xl border border-white/10 rounded-xl p-3 min-w-[170px] shadow-2xl">
            <div className="flex justify-between items-center mb-2 pb-2 border-b border-white/5">
              <span className="type-label text-[11px]">
                {tooltip.bar.monthLabel} {tooltip.bar.monthYear} · {tooltip.bar.weekLabel}
              </span>
              <span className="type-micro text-[10px] text-[#6A6A6A]">
                {tooltip.bar.tradeCount} trade{tooltip.bar.tradeCount !== 1 ? 's' : ''}
              </span>
            </div>
            <div className={`font-bold tnum text-[16px] ${tooltip.bar.pnl >= 0 ? 'text-[#1ED760]' : 'text-[#E5534B]'}`}>
              {formatFull(tooltip.bar.pnl)}
            </div>
            <div className="type-micro text-[10px] text-[#6A6A6A] mt-0.5">
              {tooltip.bar.pnl >= 0 ? 'Profit' : 'Loss'} this week
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
