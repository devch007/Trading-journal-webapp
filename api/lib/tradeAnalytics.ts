export interface RawTrade {
  id: string;
  user_id: string;
  symbol: string;
  type: string; // BUY / SELL / LONG / SHORT
  entry_price?: number | null;
  exit_price?: number | null;
  stop_loss?: number | null;
  take_profit?: number | null;
  quantity?: number | null;
  pnl?: number | null;
  net_pnl?: number | null;
  pnl_percentage?: number | null;
  r_multiple?: number | null;
  risk_reward_ratio?: number | null;
  setup?: string | null;
  session?: string | null;
  emotions?: string | string[] | null;
  rules_followed?: boolean | null;
  rule_violations?: string[] | null;
  notes?: string | null;
  status?: string | null; // OPEN / CLOSED
  open_date?: string | null;
  close_date?: string | null;
  created_at?: string | null;
}

export interface TradeSummaryStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakEvenTrades: number;
  winRate: number; // Percentage, e.g. 66.7
  grossProfit: number;
  grossLoss: number;
  netPnl: number;
  avgPnl: number;
  profitFactor: number | null;
  avgR: number | null;
  netR: number | null;
  hasRData: boolean;
  disciplineScore: number; // 0 to 100
  rulesFollowedCount: number;
  totalRulesEvaluated: number;
  bestTrade: {
    symbol: string;
    direction: string;
    setup: string;
    pnl: number;
    rMultiple: number | null;
    displayR: string;
  } | null;
  worstTrade: {
    symbol: string;
    direction: string;
    setup: string;
    pnl: number;
    rMultiple: number | null;
    displayR: string;
    reviewReason: string;
  } | null;
  setups: string[];
  sessions: string[];
  emotions: string[];
}

/**
 * Deterministically calculates R-multiple for an individual trade.
 * Does NOT invent numbers. If risk cannot be determined, returns null.
 */
export function calculateTradeR(trade: RawTrade): number | null {
  // If r_multiple is already stored on trade
  if (typeof trade.r_multiple === 'number' && !isNaN(trade.r_multiple)) {
    return Number(trade.r_multiple.toFixed(2));
  }

  const entry = Number(trade.entry_price);
  const exit = Number(trade.exit_price);
  const stop = Number(trade.stop_loss);

  if (!entry || !exit || !stop) {
    return null;
  }

  const isLong = (trade.type || '').toUpperCase().includes('BUY') || (trade.type || '').toUpperCase().includes('LONG');

  if (isLong) {
    const risk = entry - stop;
    if (risk <= 0) return null; // Invalid stop loss for long
    const reward = exit - entry;
    return Number((reward / risk).toFixed(2));
  } else {
    const risk = stop - entry;
    if (risk <= 0) return null; // Invalid stop loss for short
    const reward = entry - exit;
    return Number((reward / risk).toFixed(2));
  }
}

/**
 * Calculates complete deterministic statistics from a list of completed trades for a given day.
 */
export function calculateDailyStats(trades: RawTrade[]): TradeSummaryStats {
  if (!trades || trades.length === 0) {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      breakEvenTrades: 0,
      winRate: 0,
      grossProfit: 0,
      grossLoss: 0,
      netPnl: 0,
      avgPnl: 0,
      profitFactor: null,
      avgR: null,
      netR: null,
      hasRData: false,
      disciplineScore: 100,
      rulesFollowedCount: 0,
      totalRulesEvaluated: 0,
      bestTrade: null,
      worstTrade: null,
      setups: [],
      sessions: [],
      emotions: [],
    };
  }

  let grossProfit = 0;
  let grossLoss = 0;
  let netPnl = 0;
  let winCount = 0;
  let lossCount = 0;
  let breakEvenCount = 0;

  let rSum = 0;
  let rCount = 0;

  let rulesFollowedCount = 0;
  let totalRulesEvaluated = 0;

  const setupsSet = new Set<string>();
  const sessionsSet = new Set<string>();
  const emotionsSet = new Set<string>();

  interface EnrichedTrade {
    trade: RawTrade;
    pnl: number;
    r: number | null;
    isRuleFollowed: boolean;
    hasEmotionalTag: boolean;
    reason: string;
  }

  const enrichedTrades: EnrichedTrade[] = [];

  for (const t of trades) {
    const pnl = Number(t.net_pnl ?? t.pnl ?? 0);
    netPnl += pnl;

    if (pnl > 0.001) {
      grossProfit += pnl;
      winCount++;
    } else if (pnl < -0.001) {
      grossLoss += Math.abs(pnl);
      lossCount++;
    } else {
      breakEvenCount++;
    }

    // R Multiple
    const r = calculateTradeR(t);
    if (r !== null) {
      rSum += r;
      rCount++;
    }

    // Collect tags
    if (t.setup) setupsSet.add(t.setup);
    if (t.session) sessionsSet.add(t.session);

    let hasEmotionalTag = false;
    if (t.emotions) {
      if (Array.isArray(t.emotions)) {
        t.emotions.forEach(e => {
          emotionsSet.add(e);
          if (['FOMO', 'Revenge', 'Greed', 'Fear', 'Anxious', 'Angry'].some(neg => e.toLowerCase().includes(neg.toLowerCase()))) {
            hasEmotionalTag = true;
          }
        });
      } else if (typeof t.emotions === 'string') {
        const emotionStr = t.emotions;
        emotionsSet.add(emotionStr);
        if (['FOMO', 'Revenge', 'Greed', 'Fear', 'Anxious', 'Angry'].some(neg => emotionStr.toLowerCase().includes(neg.toLowerCase()))) {
          hasEmotionalTag = true;
        }
      }
    }

    // Rule Adherence
    let isRuleFollowed = true;
    totalRulesEvaluated++;

    if (t.rules_followed === false) {
      isRuleFollowed = false;
    } else if (t.rule_violations && t.rule_violations.length > 0) {
      isRuleFollowed = false;
    } else if (t.rules_followed === true) {
      isRuleFollowed = true;
      rulesFollowedCount++;
    } else {
      // If rules_followed is null, treat as followed unless negative tags exist
      if (hasEmotionalTag) {
        isRuleFollowed = false;
      } else {
        rulesFollowedCount++;
      }
    }

    let reason = 'Loss review';
    if (!isRuleFollowed) reason = 'Rule violation';
    else if (hasEmotionalTag) reason = 'Emotional trade';

    enrichedTrades.push({
      trade: t,
      pnl,
      r,
      isRuleFollowed,
      hasEmotionalTag,
      reason,
    });
  }

  const totalTrades = trades.length;
  const winRate = totalTrades > 0 ? Number(((winCount / totalTrades) * 100).toFixed(1)) : 0;
  const avgPnl = totalTrades > 0 ? Number((netPnl / totalTrades).toFixed(2)) : 0;
  const profitFactor = grossLoss > 0 ? Number((grossProfit / grossLoss).toFixed(2)) : (grossProfit > 0 ? 99.9 : null);

  const hasRData = rCount > 0;
  const avgR = hasRData ? Number((rSum / rCount).toFixed(2)) : null;
  const netR = hasRData ? Number(rSum.toFixed(2)) : null;

  const disciplineScore = totalRulesEvaluated > 0
    ? Math.round((rulesFollowedCount / totalRulesEvaluated) * 100)
    : 100;

  // Best trade: Trade with highest R, or highest PnL if R is unavailable
  let bestEnriched: EnrichedTrade | null = null;
  if (enrichedTrades.length > 0) {
    bestEnriched = [...enrichedTrades].sort((a, b) => {
      if (a.r !== null && b.r !== null) {
        return b.r - a.r;
      }
      return b.pnl - a.pnl;
    })[0];
  }

  // Trade to review: Trade with rule violation / emotional tag / largest loss
  let worstEnriched: EnrichedTrade | null = null;
  if (enrichedTrades.length > 0) {
    const reviewCandidates = [...enrichedTrades].sort((a, b) => {
      // Prioritize rule violation (0 over 1)
      if (a.isRuleFollowed !== b.isRuleFollowed) {
        return a.isRuleFollowed ? 1 : -1;
      }
      // Then emotional tag
      if (a.hasEmotionalTag !== b.hasEmotionalTag) {
        return a.hasEmotionalTag ? -1 : 1;
      }
      // Then lowest PnL / worst R
      return a.pnl - b.pnl;
    });

    worstEnriched = reviewCandidates[0];
  }

  const formatRString = (r: number | null, pnl: number): string => {
    if (r !== null) {
      return (r >= 0 ? `+${r.toFixed(1)}R` : `${r.toFixed(1)}R`);
    }
    return (pnl >= 0 ? `+$${pnl.toFixed(2)}` : `-$${Math.abs(pnl).toFixed(2)}`);
  };

  return {
    totalTrades,
    winningTrades: winCount,
    losingTrades: lossCount,
    breakEvenTrades: breakEvenCount,
    winRate,
    grossProfit: Number(grossProfit.toFixed(2)),
    grossLoss: Number(grossLoss.toFixed(2)),
    netPnl: Number(netPnl.toFixed(2)),
    avgPnl,
    profitFactor,
    avgR,
    netR,
    hasRData,
    disciplineScore,
    rulesFollowedCount,
    totalRulesEvaluated,
    bestTrade: bestEnriched ? {
      symbol: bestEnriched.trade.symbol || 'N/A',
      direction: (bestEnriched.trade.type || 'BUY').toUpperCase(),
      setup: bestEnriched.trade.setup || 'Standard Execution',
      pnl: bestEnriched.pnl,
      rMultiple: bestEnriched.r,
      displayR: formatRString(bestEnriched.r, bestEnriched.pnl),
    } : null,
    worstTrade: worstEnriched ? {
      symbol: worstEnriched.trade.symbol || 'N/A',
      direction: (worstEnriched.trade.type || 'SELL').toUpperCase(),
      setup: worstEnriched.trade.setup || 'Execution Review',
      pnl: worstEnriched.pnl,
      rMultiple: worstEnriched.r,
      displayR: formatRString(worstEnriched.r, worstEnriched.pnl),
      reviewReason: worstEnriched.reason,
    } : null,
    setups: Array.from(setupsSet),
    sessions: Array.from(sessionsSet),
    emotions: Array.from(emotionsSet),
  };
}
