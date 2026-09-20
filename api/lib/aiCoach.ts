import { TradeSummaryStats } from './tradeAnalytics';

export interface AICoachOutput {
  headline: string;
  summary: string;
  pattern: string;
  whatWentWell: string;
  improvement: string;
  tomorrowFocusTitle: string;
  tomorrowFocus: string;
}

const SYSTEM_PROMPT = `You are TradeX AI Trading Coach.

Analyze the user's historical trading journal objectively.
Your job is to help the trader understand execution, discipline, risk management, and recurring behavioral patterns.

Strict Rules:
- Do not provide financial advice.
- Do not predict markets or asset directions.
- Do not recommend trades or assets.
- Do not invent information, statistics, or trades.
- Only make observations supported by the supplied trading data.

Prioritize:
- Rule adherence & discipline
- Risk management & R-multiples
- Repeated behavioral patterns
- Setup consistency
- Emotional triggers (FOMO, revenge, impatience)
- Overtrading & execution quality

You MUST return a valid JSON object matching this schema exactly:
{
  "headline": "Short impactful punchline (max 8 words)",
  "summary": "1-2 concise sentences analyzing today's execution and risk control.",
  "pattern": "1 key pattern detected from setups, sessions, win/loss, or emotional tags.",
  "whatWentWell": "Key strength observed today.",
  "improvement": "One primary area for improvement.",
  "tomorrowFocusTitle": "Short title for tomorrow (max 4 words)",
  "tomorrowFocus": "1 actionable behavioral rule for the next trading session."
}`;

export async function generateAICoachReview(
  stats: TradeSummaryStats,
  userProfile?: { name?: string; experience_level?: string; timezone?: string }
): Promise<AICoachOutput> {
  // If user had zero trades
  if (stats.totalTrades === 0) {
    return {
      headline: 'Capital Preservation & Market Patience',
      summary: 'You remained on the sidelines today with zero trades executed, keeping your capital safe.',
      pattern: 'High patience observed during market hours without forcing sub-optimal setups.',
      whatWentWell: 'Zero impulsive executions or emotional chasing.',
      improvement: 'Ensure tomorrow\'s watchlists and alerts are set in advance.',
      tomorrowFocusTitle: 'Wait For Prime Setups',
      tomorrowFocus: 'Only engage the market when your primary edge and risk parameters are strictly met.',
    };
  }

  const structuredInput = {
    date: new Date().toISOString().split('T')[0],
    trades: stats.totalTrades,
    wins: stats.winningTrades,
    losses: stats.losingTrades,
    winRate: `${stats.winRate}%`,
    netPnl: `$${stats.netPnl.toFixed(2)}`,
    netR: stats.netR !== null ? `${stats.netR}R` : 'N/A',
    avgR: stats.avgR !== null ? `${stats.avgR}R` : 'N/A',
    disciplineScore: `${stats.disciplineScore}%`,
    rulesFollowed: `${stats.rulesFollowedCount}/${stats.totalRulesEvaluated}`,
    bestTrade: stats.bestTrade,
    worstTrade: stats.worstTrade,
    setupsUsed: stats.setups,
    sessionsTraded: stats.sessions,
    emotionalTags: stats.emotions,
  };

  const groqApiKey = process.env.GROQ_API_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

  // Try Groq first
  if (groqApiKey) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            {
              role: 'user',
              content: `Here is today's trading journal data:\n${JSON.stringify(structuredInput, null, 2)}`,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3,
          max_tokens: 600,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          if (parsed.headline && parsed.summary && parsed.tomorrowFocus) {
            return validateAndSanitizeAIOutput(parsed, stats);
          }
        }
      }
    } catch (err) {
      console.warn('Groq AI coach generation failed, trying fallback:', err);
    }
  }

  // Try Google Gemini fallback
  if (geminiApiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: `${SYSTEM_PROMPT}\n\nJournal Data:\n${JSON.stringify(structuredInput, null, 2)}\n\nRespond ONLY with valid JSON.` },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.3,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const parsed = JSON.parse(rawText);
          if (parsed.headline && parsed.summary) {
            return validateAndSanitizeAIOutput(parsed, stats);
          }
        }
      }
    } catch (err) {
      console.warn('Gemini AI coach generation failed:', err);
    }
  }

  // Deterministic Fallback if AI APIs are unreachable or not configured
  return getDeterministicFallbackReview(stats);
}

function validateAndSanitizeAIOutput(ai: any, stats: TradeSummaryStats): AICoachOutput {
  return {
    headline: String(ai.headline || 'Trading Session Review').slice(0, 100),
    summary: String(ai.summary || `Completed ${stats.totalTrades} trades today with a ${stats.winRate}% win rate.`).slice(0, 300),
    pattern: String(ai.pattern || (stats.setups.length ? `Most active setup: ${stats.setups[0]}` : 'Consistent risk management observed.')).slice(0, 200),
    whatWentWell: String(ai.whatWentWell || (stats.winningTrades > 0 ? 'Followed profit targets on winning setups.' : 'Maintained stop loss discipline.')).slice(0, 200),
    improvement: String(ai.improvement || (stats.losingTrades > 0 ? 'Minimize losses by avoiding low-conviction entries.' : 'Continue scaling with clear validation.')).slice(0, 200),
    tomorrowFocusTitle: String(ai.tomorrowFocusTitle || 'Execute With Discipline').slice(0, 50),
    tomorrowFocus: String(ai.tomorrowFocus || 'Stick strictly to predetermined risk limits and trade setups without hesitation.').slice(0, 250),
  };
}

function getDeterministicFallbackReview(stats: TradeSummaryStats): AICoachOutput {
  const isPositive = stats.netPnl >= 0;
  const isHighDiscipline = stats.disciplineScore >= 80;

  if (isPositive && isHighDiscipline) {
    return {
      headline: 'Disciplined Execution & Positive Returns',
      summary: `You closed the day at +$${stats.netPnl.toFixed(2)} with strong ${stats.disciplineScore}% plan adherence across ${stats.totalTrades} trades.`,
      pattern: stats.setups.length > 0 ? `Consistent performance across ${stats.setups.join(', ')}.` : 'Well-managed risk-to-reward execution.',
      whatWentWell: 'Protected profits while executing strictly according to your defined rules.',
      improvement: 'Ensure winning runners are closed without leaving premature money on the table.',
      tomorrowFocusTitle: 'Preserve Consistency',
      tomorrowFocus: 'Maintain the same patient risk-first entry criteria tomorrow.',
    };
  } else if (!isPositive && isHighDiscipline) {
    return {
      headline: 'Solid Discipline Despite Market Resistance',
      summary: `Net P&L was -$${Math.abs(stats.netPnl).toFixed(2)}, but you maintained ${stats.disciplineScore}% discipline and respected your stop loss limits.`,
      pattern: 'Losses were contained within normal variance rather than revenge sizing.',
      whatWentWell: 'Honored stop loss parameters without violating maximum risk rules.',
      improvement: 'Review market conditions and setup alignment before opening early positions.',
      tomorrowFocusTitle: 'Protect Emotional Capital',
      tomorrowFocus: 'Reset completely before tomorrow\'s session. Trade only high-probability setups.',
    };
  } else {
    return {
      headline: 'Focus on Rule Adherence & Risk Control',
      summary: `Recorded ${stats.totalTrades} trades today with ${stats.disciplineScore}% rule adherence. Focus on eliminating discretionary violations.`,
      pattern: stats.emotions.length > 0 ? `Emotional markers (${stats.emotions.slice(0, 2).join(', ')}) influenced execution.` : 'Impulsive entries outside structured setups.',
      whatWentWell: 'Identified areas where trade management requires tighter adherence.',
      improvement: 'Stop trading immediately after 2 consecutive plan deviations.',
      tomorrowFocusTitle: 'Strict Rule Adherence',
      tomorrowFocus: 'Limit trade frequency tomorrow and verify every entry against your checklist.',
    };
  }
}
