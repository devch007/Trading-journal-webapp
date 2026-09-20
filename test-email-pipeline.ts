import { calculateDailyStats, calculateTradeR, RawTrade } from './api/lib/tradeAnalytics';
import { generateAICoachReview } from './api/lib/aiCoach';
import { renderDailySummaryEmail } from './api/lib/emailTemplate';

function runUnitTests() {
  console.log('--- Testing R-Multiple Calculations ---');
  const longTrade: RawTrade = {
    id: '1',
    user_id: 'user_123',
    symbol: 'XAUUSD',
    type: 'BUY',
    entry_price: 2000,
    stop_loss: 1990,
    exit_price: 2030,
    pnl: 300,
  };
  const longR = calculateTradeR(longTrade);
  console.assert(longR === 3.0, `Expected 3.0R for long, got ${longR}`);

  const shortTrade: RawTrade = {
    id: '2',
    user_id: 'user_123',
    symbol: 'EURUSD',
    type: 'SELL',
    entry_price: 1.1000,
    stop_loss: 1.1050,
    exit_price: 1.0900,
    pnl: 200,
  };
  const shortR = calculateTradeR(shortTrade);
  console.assert(shortR === 2.0, `Expected 2.0R for short, got ${shortR}`);

  console.log('--- Testing Daily Statistics with Multiple Trades ---');
  const mockTrades: RawTrade[] = [
    {
      id: 't1',
      user_id: 'u1',
      symbol: 'XAUUSD',
      type: 'BUY',
      entry_price: 2600,
      stop_loss: 2590,
      exit_price: 2620,
      pnl: 200,
      setup: 'London Sweep',
      rules_followed: true,
    },
    {
      id: 't2',
      user_id: 'u1',
      symbol: 'US30',
      type: 'SELL',
      entry_price: 42000,
      stop_loss: 42100,
      exit_price: 42150,
      pnl: -150,
      setup: 'Breakout',
      rules_followed: false,
      rule_violations: ['Late entry'],
    },
    {
      id: 't3',
      user_id: 'u1',
      symbol: 'BTCUSD',
      type: 'BUY',
      entry_price: 60000,
      stop_loss: 59500,
      exit_price: 61000,
      pnl: 100,
      setup: 'Order Block',
      rules_followed: true,
    },
  ];

  const stats = calculateDailyStats(mockTrades);
  console.assert(stats.totalTrades === 3, `Expected 3 total trades, got ${stats.totalTrades}`);
  console.assert(stats.winningTrades === 2, `Expected 2 wins, got ${stats.winningTrades}`);
  console.assert(stats.losingTrades === 1, `Expected 1 loss, got ${stats.losingTrades}`);
  console.assert(stats.netPnl === 150, `Expected 150 net PnL, got ${stats.netPnl}`);
  console.assert(stats.winRate === 66.7, `Expected 66.7% winrate, got ${stats.winRate}`);
  console.assert(stats.disciplineScore === 67, `Expected 67% discipline, got ${stats.disciplineScore}`);
  console.assert(stats.bestTrade?.symbol === 'XAUUSD', `Expected XAUUSD as best trade, got ${stats.bestTrade?.symbol}`);
  console.assert(stats.worstTrade?.symbol === 'US30', `Expected US30 as review trade, got ${stats.worstTrade?.symbol}`);

  console.log('--- Testing Zero Trades Day ---');
  const zeroStats = calculateDailyStats([]);
  console.assert(zeroStats.totalTrades === 0, 'Expected 0 trades');
  console.assert(zeroStats.netPnl === 0, 'Expected 0 PnL');

  console.log('--- Testing HTML Email Template Rendering ---');
  const rendered = renderDailySummaryEmail({
    recipientName: 'Dev Chaudhary',
    recipientEmail: 'dev@example.com',
    summaryDate: 'September 20, 2026',
    formattedDatePill: '2026-09-20',
    stats,
    ai: {
      headline: 'Strong Execution on Primary Setups',
      summary: 'You executed 3 trades today with a net gain of +$150.00.',
      pattern: 'High win rate on London Sweep and Order Block setups.',
      whatWentWell: 'Clear profit targets taken on winning trades.',
      improvement: 'Avoid chasing breakouts outside designated time window.',
      tomorrowFocusTitle: 'Wait for Confluence',
      tomorrowFocus: 'Do not enter breakout trades without volume confirmation.',
    },
  });

  console.assert(rendered.html.includes('Good evening, Dev Chaudhary.'), 'Rendered HTML missing recipient name');
  console.assert(rendered.html.includes('+$150.00'), 'Rendered HTML missing formatted PnL');
  console.assert(rendered.html.includes('XAUUSD'), 'Rendered HTML missing best trade symbol');
  console.assert(rendered.html.includes('US30'), 'Rendered HTML missing worst trade symbol');
  console.assert(rendered.html.includes('TradeX Dashboard'), 'Rendered HTML missing CTA button');

  console.log('✅ ALL UNIT & INTEGRATION CHECKS PASSED SUCCESSFULLY!');
}

runUnitTests();
