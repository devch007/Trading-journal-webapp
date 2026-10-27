/**
 * Core Financial Math Engine for TradeX Trading Journal
 * Standardized, production-tested calculation utilities.
 */

export interface TradeMathInput {
  pnl?: number | string | null;
  isPositive?: boolean | null;
  action?: string | null;
  date?: string | null;
  createdAt?: string | null;
}

export interface TradeCalculations {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakEvenTrades: number;
  winRate: number; // Percentage 0 - 100
  grossProfit: number;
  grossLoss: number;
  netPnL: number;
  profitFactor: number; // Numeric value, e.g. 2.15, or 0
  profitFactorFormatted: string; // "2.15", "∞", or "0.00"
  avgWin: number;
  avgLoss: number;
  riskRewardRatio: number;
  largestWin: number;
  largestLoss: number;
  expectancy: number; // Expectancy per trade in currency
}

/**
 * Calculates all primary portfolio performance metrics from an array of trades.
 */
export function calculateTradeMetrics(trades: TradeMathInput[]): TradeCalculations {
  if (!trades || trades.length === 0) {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      breakEvenTrades: 0,
      winRate: 0,
      grossProfit: 0,
      grossLoss: 0,
      netPnL: 0,
      profitFactor: 0,
      profitFactorFormatted: '0.00',
      avgWin: 0,
      avgLoss: 0,
      riskRewardRatio: 0,
      largestWin: 0,
      largestLoss: 0,
      expectancy: 0,
    };
  }

  let totalWins = 0;
  let totalLosses = 0;
  let totalBreakEven = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let netPnL = 0;
  let largestWin = 0;
  let largestLoss = 0;

  trades.forEach(trade => {
    const rawVal = trade.pnl !== undefined && trade.pnl !== null ? Number(trade.pnl) : 0;
    const pnl = isNaN(rawVal) ? 0 : rawVal;

    netPnL += pnl;

    if (pnl > 0.0001) {
      totalWins += 1;
      grossProfit += pnl;
      if (pnl > largestWin) largestWin = pnl;
    } else if (pnl < -0.0001) {
      totalLosses += 1;
      const absLoss = Math.abs(pnl);
      grossLoss += absLoss;
      if (absLoss > largestLoss) largestLoss = absLoss;
    } else {
      totalBreakEven += 1;
    }
  });

  const totalTrades = trades.length;
  const decidedTrades = totalWins + totalLosses;
  const winRate = decidedTrades > 0 ? (totalWins / decidedTrades) * 100 : 0;
  
  const avgWin = totalWins > 0 ? grossProfit / totalWins : 0;
  const avgLoss = totalLosses > 0 ? grossLoss / totalLosses : 0;
  const riskRewardRatio = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? avgWin : 0;

  let profitFactor = 0;
  let profitFactorFormatted = '0.00';

  if (grossLoss > 0) {
    profitFactor = grossProfit / grossLoss;
    profitFactorFormatted = profitFactor.toFixed(2);
  } else if (grossProfit > 0) {
    profitFactor = 999;
    profitFactorFormatted = '∞';
  }

  // Expectancy = (Win Rate% * Avg Win) - (Loss Rate% * Avg Loss)
  const winProb = decidedTrades > 0 ? totalWins / decidedTrades : 0;
  const lossProb = decidedTrades > 0 ? totalLosses / decidedTrades : 0;
  const expectancy = (winProb * avgWin) - (lossProb * avgLoss);

  return {
    totalTrades,
    winningTrades: totalWins,
    losingTrades: totalLosses,
    breakEvenTrades: totalBreakEven,
    winRate: Number(winRate.toFixed(1)),
    grossProfit: Number(grossProfit.toFixed(2)),
    grossLoss: Number(grossLoss.toFixed(2)),
    netPnL: Number(netPnL.toFixed(2)),
    profitFactor: Number(profitFactor.toFixed(2)),
    profitFactorFormatted,
    avgWin: Number(avgWin.toFixed(2)),
    avgLoss: Number(avgLoss.toFixed(2)),
    riskRewardRatio: Number(riskRewardRatio.toFixed(2)),
    largestWin: Number(largestWin.toFixed(2)),
    largestLoss: Number(largestLoss.toFixed(2)),
    expectancy: Number(expectancy.toFixed(2)),
  };
}

/**
 * Calculates maximum drawdown percentage and amount from cumulative equity points.
 */
export function calculateDrawdown(equityPoints: number[]): { maxDrawdownPercent: number; maxDrawdownAmount: number } {
  if (!equityPoints || equityPoints.length === 0) {
    return { maxDrawdownPercent: 0, maxDrawdownAmount: 0 };
  }

  let peak = equityPoints[0];
  let maxDrawdownAmount = 0;
  let maxDrawdownPercent = 0;

  for (const equity of equityPoints) {
    if (equity > peak) {
      peak = equity;
    }
    const drawdownAmount = peak - equity;
    if (drawdownAmount > maxDrawdownAmount) {
      maxDrawdownAmount = drawdownAmount;
    }
    if (peak > 0) {
      const drawdownPercent = (drawdownAmount / peak) * 100;
      if (drawdownPercent > maxDrawdownPercent) {
        maxDrawdownPercent = drawdownPercent;
      }
    }
  }

  return {
    maxDrawdownPercent: Number(maxDrawdownPercent.toFixed(2)),
    maxDrawdownAmount: Number(maxDrawdownAmount.toFixed(2)),
  };
}
