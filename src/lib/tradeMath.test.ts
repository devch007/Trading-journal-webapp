import { describe, it, expect } from 'vitest';
import { calculateTradeMetrics, calculateDrawdown } from './tradeMath';

describe('Financial Math Engine (tradeMath.ts)', () => {
  it('handles empty trades gracefully with zeroed statistics', () => {
    const metrics = calculateTradeMetrics([]);
    expect(metrics.totalTrades).toBe(0);
    expect(metrics.winRate).toBe(0);
    expect(metrics.profitFactorFormatted).toBe('0.00');
    expect(metrics.netPnL).toBe(0);
  });

  it('correctly computes win rate, gross profit, gross loss, and net P&L', () => {
    const trades = [
      { pnl: 200 },
      { pnl: -100 },
      { pnl: 300 },
      { pnl: -50 },
    ];
    const metrics = calculateTradeMetrics(trades);
    expect(metrics.totalTrades).toBe(4);
    expect(metrics.winningTrades).toBe(2);
    expect(metrics.losingTrades).toBe(2);
    expect(metrics.grossProfit).toBe(500);
    expect(metrics.grossLoss).toBe(150);
    expect(metrics.netPnL).toBe(350);
    expect(metrics.winRate).toBe(50.0);
    // Profit Factor: 500 / 150 = 3.33
    expect(metrics.profitFactorFormatted).toBe('3.33');
    expect(metrics.profitFactor).toBe(3.33);
  });

  it('handles zero losses with infinite profit factor indicator', () => {
    const trades = [
      { pnl: 150 },
      { pnl: 250 },
    ];
    const metrics = calculateTradeMetrics(trades);
    expect(metrics.winningTrades).toBe(2);
    expect(metrics.losingTrades).toBe(0);
    expect(metrics.profitFactorFormatted).toBe('∞');
    expect(metrics.winRate).toBe(100.0);
  });

  it('computes maximum drawdown correctly', () => {
    const equityCurve = [10000, 10500, 10200, 9800, 10100, 11000];
    const dd = calculateDrawdown(equityCurve);
    // Peak is 10500, lowest after peak is 9800. Amount = 700. Percent = (700 / 10500) * 100 = ~6.67%
    expect(dd.maxDrawdownAmount).toBe(700);
    expect(dd.maxDrawdownPercent).toBe(6.67);
  });
});
