import React, { useMemo, useState } from 'react';
import { Trade } from '../hooks/useTrades';
import { getTradeDate } from '../lib/timeUtils';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MonthlyPnLCalendarProps {
  trades: Trade[];
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface MonthData {
  month: number; // 0-based
  year: number;
  label: string;
  pnl: number;
  tradeCount: number;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  data: MonthData | null;
}

export function MonthlyPnLCalendar({ trades }: MonthlyPnLCalendarProps) {
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, data: null });
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const monthlyData = useMemo((): MonthData[] => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Build last 13 months (so we always show a full rolling year + current)
    const months: MonthData[] = [];
    for (let i = 12; i >= 0; i--) {
      let m = currentMonth - i;
      let y = currentYear;
      if (m < 0) { m += 12; y -= 1; }
      months.push({ month: m, year: y, label: MONTH_LABELS[m], pnl: 0, tradeCount: 0 });
    }

    trades.forEach(trade => {
      if (!trade) return;
      const pnl = Number(trade.pnl || 0);
      let tradeDate: Date;
      try {
        tradeDate = trade.date ? getTradeDate(trade.date) : (trade.createdAt ? new Date(trade.createdAt) : new Date());
      } catch { tradeDate = new Date(); }

      const tm = tradeDate.getMonth();
      const ty = tradeDate.getFullYear();
      const slot = months.find(m => m.month === tm && m.year === ty);
      if (slot) {
        slot.pnl += pnl;
        slot.tradeCount += 1;
      }
    });

    return months;
  }, [trades]);

  const maxAbs = useMemo(() => {
    const vals = monthlyData.map(d => Math.abs(d.pnl));
    return Math.max(...vals, 1);
  }, [monthlyData]);

  const totalPnl = useMemo(() => monthlyData.reduce((s, d) => s + d.pnl, 0), [monthlyData]);
  const winMonths = monthlyData.filter(d => d.pnl > 0).length;
  const activeMonths = monthlyData.filter(d => d.tradeCount > 0).length;

  const formatCurrency = (val: number) => {
    const abs = Math.abs(val);
    const formatted = abs >= 1000
      ? `$${(abs / 1000).toFixed(1)}k`
      : `$${abs.toFixed(0)}`;
    return val >= 0 ? `+${formatted}` : `-${formatted}`;
  };

  const formatFull = (val: number) => {
    const abs = Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return val >= 0 ? `+$${abs}` : `-$${abs}`;
  };

  // Chart dimensions
  const BAR_HEIGHT = 180; // px max bar height in each direction
  const CHART_HEIGHT = BAR_HEIGHT * 2 + 24; // total chart area

  const handleMouseEnter = (e: React.MouseEvent, d: MonthData, idx: number) => {
    setHoveredIndex(idx);
    setTooltip({ visible: true, x: e.clientX, y: e.clientY, data: d });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    setTooltip(prev => ({ ...prev, x: e.clientX, y: e.clientY }));
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
    setTooltip({ visible: false, x: 0, y: 0, data: null });
  };

  return (
    <div className="glass-card p-6 rounded-2xl flex flex-col gap-5 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full blur-[100px] opacity-5 pointer-events-none bg-[#1ED760]" />
      <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full blur-[100px] opacity-5 pointer-events-none bg-[#E5534B]" />

      {/* Header */}
      <div className="flex justify-between items-start z-10">
        <div className="flex flex-col gap-1">
          <h3 className="type-h2 text-white text-[16px]">Monthly P&L</h3>
          <p className="type-label text-[11px]">Rolling 13-month performance</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end gap-0.5">
            <span className="type-label text-[10px]">Net P&L</span>
            <span className={`font-bold tnum text-[16px] ${totalPnl >= 0 ? 'text-[#1ED760]' : 'text-[#E5534B]'}`}>
              {formatFull(totalPnl)}
            </span>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <span className="type-label text-[10px]">Win Months</span>
            <span className="font-bold text-white text-[16px]">
              {winMonths}<span className="text-[#A7A7A7] font-normal text-[12px]">/{activeMonths}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Chart Area */}
      <div className="relative" style={{ height: `${CHART_HEIGHT}px` }}>
        {/* Zero line */}
        <div
          className="absolute left-0 right-0 border-t border-dashed border-white/10 z-10 pointer-events-none"
          style={{ top: `${BAR_HEIGHT}px` }}
        />

        {/* Y-axis labels */}
        <div className="absolute -left-1 flex flex-col justify-between h-full text-right pointer-events-none" style={{ top: 0, width: 40 }}>
          <span className="type-micro text-[9px] text-[#6A6A6A]">{formatCurrency(maxAbs)}</span>
          <span className="type-micro text-[9px] text-[#6A6A6A]">$0</span>
          <span className="type-micro text-[9px] text-[#6A6A6A]">{formatCurrency(-maxAbs)}</span>
        </div>

        {/* Bars */}
        <div className="absolute inset-0 pl-10 flex items-stretch gap-[3px]">
          {monthlyData.map((d, i) => {
            const pct = Math.abs(d.pnl) / maxAbs; // 0-1
            const barH = pct * BAR_HEIGHT;
            const isPos = d.pnl >= 0;
            const isHovered = hoveredIndex === i;
            const hasData = d.tradeCount > 0;
            const isCurrentMonth = d.month === new Date().getMonth() && d.year === new Date().getFullYear();

            return (
              <div
                key={`${d.year}-${d.month}`}
                className="flex-1 flex flex-col justify-center items-center relative group cursor-pointer"
                onMouseEnter={(e) => handleMouseEnter(e, d, i)}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              >
                {/* Profit bar (top half) */}
                <div
                  className="w-full flex flex-col justify-end"
                  style={{ height: `${BAR_HEIGHT}px` }}
                >
                  {isPos && hasData && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: barH }}
                      transition={{ duration: 0.7, delay: i * 0.04, ease: [0.34, 1.56, 0.64, 1] }}
                      className="w-full relative overflow-hidden"
                      style={{
                        borderRadius: '6px 6px 2px 2px',
                        minHeight: 4,
                      }}
                    >
                      {/* Main gradient fill */}
                      <div
                        className="absolute inset-0"
                        style={{
                          background: isHovered
                            ? 'linear-gradient(180deg, #4DF090 0%, #1ED760 40%, #15a347 100%)'
                            : 'linear-gradient(180deg, #2eef74 0%, #1ED760 50%, #128a3a 100%)',
                          transition: 'background 0.2s',
                        }}
                      />
                      {/* 3D highlight: left bright strip */}
                      <div
                        className="absolute top-0 bottom-0 left-0 w-[28%]"
                        style={{
                          background: 'linear-gradient(90deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 100%)',
                          borderRadius: '6px 0 0 0',
                        }}
                      />
                      {/* 3D top cap highlight */}
                      <div
                        className="absolute top-0 left-0 right-0 h-[20%]"
                        style={{
                          background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 100%)',
                        }}
                      />
                      {/* Glow under hovered bar */}
                      {isHovered && (
                        <div
                          className="absolute inset-0"
                          style={{
                            boxShadow: '0 0 20px 4px rgba(30,215,96,0.5)',
                          }}
                        />
                      )}
                    </motion.div>
                  )}
                  {/* Spacer for loss months */}
                  {(!isPos || !hasData) && <div style={{ flex: 1 }} />}
                </div>

                {/* Loss bar (bottom half) */}
                <div
                  className="w-full flex flex-col justify-start"
                  style={{ height: `${BAR_HEIGHT}px` }}
                >
                  {!isPos && hasData && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: barH }}
                      transition={{ duration: 0.7, delay: i * 0.04, ease: [0.34, 1.56, 0.64, 1] }}
                      className="w-full relative overflow-hidden"
                      style={{
                        borderRadius: '2px 2px 6px 6px',
                        minHeight: 4,
                      }}
                    >
                      {/* Main gradient fill */}
                      <div
                        className="absolute inset-0"
                        style={{
                          background: isHovered
                            ? 'linear-gradient(180deg, #f05555 0%, #E5534B 50%, #a52f28 100%)'
                            : 'linear-gradient(180deg, #e86060 0%, #E5534B 50%, #882420 100%)',
                          transition: 'background 0.2s',
                        }}
                      />
                      {/* 3D highlight: left bright strip */}
                      <div
                        className="absolute top-0 bottom-0 left-0 w-[28%]"
                        style={{
                          background: 'linear-gradient(90deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0) 100%)',
                        }}
                      />
                      {/* Glow */}
                      {isHovered && (
                        <div
                          className="absolute inset-0"
                          style={{
                            boxShadow: '0 0 20px 4px rgba(229,83,75,0.5)',
                          }}
                        />
                      )}
                    </motion.div>
                  )}
                </div>

                {/* Month label */}
                <div className="mt-2 flex flex-col items-center gap-0.5">
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wide transition-colors ${
                      isCurrentMonth
                        ? 'text-primary'
                        : isHovered
                        ? 'text-white'
                        : 'text-[#6A6A6A]'
                    }`}
                  >
                    {d.label}
                  </span>
                  {isCurrentMonth && (
                    <div className="w-1 h-1 rounded-full bg-primary" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 pt-1 border-t border-white/5">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-sm"
            style={{ background: 'linear-gradient(180deg, #2eef74 0%, #1ED760 100%)' }}
          />
          <span className="type-label text-[11px]">Profit Month</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-sm"
            style={{ background: 'linear-gradient(180deg, #e86060 0%, #E5534B 100%)' }}
          />
          <span className="type-label text-[11px]">Loss Month</span>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <div className={`flex items-center gap-1.5 text-[11px] font-bold ${totalPnl >= 0 ? 'text-[#1ED760]' : 'text-[#E5534B]'}`}>
            {totalPnl >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {activeMonths > 0
              ? `${winMonths}/${activeMonths} months profitable`
              : 'No trades yet'}
          </div>
        </div>
      </div>

      {/* Floating Tooltip */}
      {tooltip.visible && tooltip.data && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: tooltip.x + 14, top: tooltip.y - 80 }}
        >
          <div className="glass-card bg-[#0d0d16]/95 backdrop-blur-xl border border-white/10 rounded-xl p-3 min-w-[160px] shadow-2xl">
            <div className="flex justify-between items-center mb-2 pb-2 border-b border-white/5">
              <span className="type-label text-[11px]">
                {tooltip.data.label} {tooltip.data.year}
              </span>
              <span className="type-micro text-[10px] text-[#6A6A6A]">
                {tooltip.data.tradeCount} trade{tooltip.data.tradeCount !== 1 ? 's' : ''}
              </span>
            </div>
            <div className={`font-bold tnum text-[16px] ${tooltip.data.pnl >= 0 ? 'text-[#1ED760]' : 'text-[#E5534B]'}`}>
              {formatFull(tooltip.data.pnl)}
            </div>
            <div className="type-micro text-[10px] text-[#6A6A6A] mt-0.5">
              {tooltip.data.pnl >= 0 ? 'Profit' : 'Loss'} this month
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
