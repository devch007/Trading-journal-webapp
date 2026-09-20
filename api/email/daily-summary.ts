import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// --- Self-contained, robust serverless handler with Market Intelligence Corner ---

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header.' });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
    const resendApiKey = process.env.RESEND_API_KEY;
    const resendFromEmail = process.env.RESEND_FROM_EMAIL || 'TradeX <journal@mail.dctechnologies.in>';
    const groqApiKey = process.env.GROQ_API_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Supabase credentials missing in server environment.' });
    }

    if (!resendApiKey) {
      return res.status(500).json({ error: 'RESEND_API_KEY environment variable is not configured in Vercel.' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: authError?.message || 'Unauthorized user session.' });
    }

    const userEmail = user.email;
    if (!userEmail) {
      return res.status(400).json({ error: 'User does not have an email address.' });
    }

    const userName = user.user_metadata?.full_name || user.user_metadata?.name || userEmail.split('@')[0] || 'Trader';
    const { timezone = 'Asia/Kolkata' } = req.body || {};

    // 2. Format Date
    let todayStr = new Date().toISOString().split('T')[0];
    try {
      todayStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());
    } catch {}

    const formattedDate = new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    // 3. Query Trades
    const { data: userTrades } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', user.id);

    const trades = (userTrades || []).filter((t: any) => {
      const d = t.close_date || t.open_date || t.date || t.created_at || '';
      return String(d).startsWith(todayStr);
    });

    // 4. Calculate Stats & Identify Best / Review Trades
    let grossProfit = 0;
    let grossLoss = 0;
    let netPnl = 0;
    let wins = 0;
    let losses = 0;
    let rSum = 0;
    let rCount = 0;
    let rulesFollowed = 0;

    let bestTrade: any = null;
    let worstTrade: any = null;

    for (const t of trades) {
      const p = Number(t.net_pnl ?? t.pnl ?? 0);
      netPnl += p;
      if (p > 0.001) { grossProfit += p; wins++; }
      else if (p < -0.001) { grossLoss += Math.abs(p); losses++; }

      let tradeR: number | null = null;
      if (typeof t.r_multiple === 'number' && !isNaN(t.r_multiple)) {
        tradeR = t.r_multiple;
        rSum += tradeR;
        rCount++;
      } else if (t.entry_price && t.exit_price && t.stop_loss) {
        const isLong = String(t.type || '').toUpperCase().includes('BUY');
        const risk = isLong ? (t.entry_price - t.stop_loss) : (t.stop_loss - t.entry_price);
        const reward = isLong ? (t.exit_price - t.entry_price) : (t.entry_price - t.exit_price);
        if (risk > 0) {
          tradeR = Number((reward / risk).toFixed(2));
          rSum += tradeR;
          rCount++;
        }
      }

      if (t.rules_followed !== false) rulesFollowed++;

      // Best Trade
      if (!bestTrade || p > (bestTrade.pnl || 0)) {
        bestTrade = {
          symbol: t.symbol || 'N/A',
          direction: String(t.type || 'BUY').toUpperCase(),
          setup: t.setup || 'High Conviction',
          pnl: p,
          r: tradeR !== null ? `${tradeR >= 0 ? '+' : ''}${tradeR}R` : (p >= 0 ? `+$${p.toFixed(2)}` : `-$${Math.abs(p).toFixed(2)}`),
        };
      }

      // Review Trade
      if (!worstTrade || p < (worstTrade.pnl || 0)) {
        worstTrade = {
          symbol: t.symbol || 'N/A',
          direction: String(t.type || 'SELL').toUpperCase(),
          setup: t.setup || 'Review Execution',
          pnl: p,
          r: tradeR !== null ? `${tradeR}R` : (p >= 0 ? `+$${p.toFixed(2)}` : `-$${Math.abs(p).toFixed(2)}`),
        };
      }
    }

    const totalTrades = trades.length;
    const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : '0';
    const isProfit = netPnl >= 0;
    const pnlFormatted = `${isProfit ? '+' : '-'}$${Math.abs(netPnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const avgRText = rCount > 0 ? `${(rSum / rCount).toFixed(2)}R` : '—';
    const disciplineScore = totalTrades > 0 ? Math.round((rulesFollowed / totalTrades) * 100) : 100;

    // 5. Generate Market Intelligence Corner (Forex, Crypto, US Markets, Indian Markets)
    let marketNews = {
      forex: { title: 'DXY & Major Pairs', text: 'Dollar Index consolidates around key support; EUR/USD and GBP/USD await central bank monetary policy updates.' },
      crypto: { title: 'Bitcoin & Digital Assets', text: 'Bitcoin holds critical moving average support amid steady spot ETF institutional inflows and derivative liquidity sweeps.' },
      us_stocks: { title: 'Wall Street (S&P 500 & Nasdaq)', text: 'Tech and semiconductor leaders drive market breadth as traders price in rate trajectory and earnings momentum.' },
      india_stocks: { title: 'Dalal Street (Nifty 50 & Bank Nifty)', text: 'Nifty maintains bullish structural strength near record levels driven by robust domestic institutional flows.' },
    };

    let aiReview = {
      headline: totalTrades === 0 ? 'Patience & Capital Preservation' : isProfit ? 'Disciplined Execution & Positive Returns' : 'Risk Control Under Market Resistance',
      summary: totalTrades === 0 ? 'You remained on the sidelines today with zero trades executed, keeping your capital safe.' : `Logged ${totalTrades} trades today with ${disciplineScore}% plan adherence and ${winRate}% win rate.`,
      pattern: totalTrades === 0 ? 'High patience observed without forcing low-probability setups.' : 'Consistent risk-to-reward execution observed across session entries.',
      tomorrowFocusTitle: 'Wait For Prime Setups',
      tomorrowFocus: 'Execute strictly when your primary setup criteria and risk parameters are satisfied without hesitation.',
    };

    // AI enhancement if Groq API key is present
    if (groqApiKey) {
      try {
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${groqApiKey}`,
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              {
                role: 'system',
                content: `You are TradeX Financial Intelligence. Provide a brief daily market update for 4 sectors (Forex, Crypto, US Markets, Indian Markets) and coaching review. Return valid JSON only:
{
  "marketNews": {
    "forex": { "title": "...", "text": "1 sentence" },
    "crypto": { "title": "...", "text": "1 sentence" },
    "us_stocks": { "title": "...", "text": "1 sentence" },
    "india_stocks": { "title": "...", "text": "1 sentence" }
  },
  "headline": "Short punchy headline (max 7 words)",
  "summary": "1-2 concise sentences analyzing risk and execution.",
  "pattern": "1 key pattern detected.",
  "tomorrowFocusTitle": "Short title (max 4 words)",
  "tomorrowFocus": "1 actionable behavioral rule for tomorrow."
}`,
              },
              {
                role: 'user',
                content: `Journal stats today: ${totalTrades} trades, net P&L: ${pnlFormatted}, win rate: ${winRate}%, discipline: ${disciplineScore}%.`,
              },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.3,
            max_tokens: 700,
          }),
        });

        if (groqRes.ok) {
          const groqData = await groqRes.json();
          const parsed = JSON.parse(groqData.choices?.[0]?.message?.content || '{}');
          if (parsed.marketNews) marketNews = parsed.marketNews;
          if (parsed.headline) {
            aiReview = {
              headline: parsed.headline,
              summary: parsed.summary || aiReview.summary,
              pattern: parsed.pattern || aiReview.pattern,
              tomorrowFocusTitle: parsed.tomorrowFocusTitle || aiReview.tomorrowFocusTitle,
              tomorrowFocus: parsed.tomorrowFocus || aiReview.tomorrowFocus,
            };
          }
        }
      } catch (e) {
        console.warn('AI news enhancement fallback applied');
      }
    }

    // 6. Best & Review Trade Row HTML
    let tradeCardsHtml = '';
    if (totalTrades > 0 && bestTrade) {
      tradeCardsHtml = `
      <div style="display:flex;gap:12px;margin-bottom:20px;">
        <div style="flex:1;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:12px 14px;">
          <div style="font-size:10px;font-weight:700;color:#10B981;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">★ Best Trade</div>
          <div style="font-size:14px;font-weight:700;color:#0F172A;">${bestTrade.symbol} <span style="font-size:11px;color:#64748B;font-weight:500;">(${bestTrade.direction})</span></div>
          <div style="font-size:11px;color:#64748B;margin-top:2px;">${bestTrade.setup}</div>
          <div style="font-size:14px;font-weight:700;color:#10B981;margin-top:6px;">${bestTrade.r}</div>
        </div>
        ${worstTrade ? `
        <div style="flex:1;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:12px 14px;">
          <div style="font-size:10px;font-weight:700;color:#F59E0B;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">🔍 Trade to Review</div>
          <div style="font-size:14px;font-weight:700;color:#0F172A;">${worstTrade.symbol} <span style="font-size:11px;color:#64748B;font-weight:500;">(${worstTrade.direction})</span></div>
          <div style="font-size:11px;color:#64748B;margin-top:2px;">${worstTrade.setup}</div>
          <div style="font-size:14px;font-weight:700;color:${worstTrade.pnl < 0 ? '#EF4444' : '#64748B'};margin-top:6px;">${worstTrade.r}</div>
        </div>
        ` : ''}
      </div>
      `;
    }

    // 7. Ultra-Beautiful HTML Email Template
    const subject = totalTrades === 0
      ? `TradeX Daily Intelligence · ${formattedDate}`
      : `TradeX Daily Intelligence · ${formattedDate} (${pnlFormatted})`;

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:32px 12px;background-color:#F4F6F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0F172A;-webkit-font-smoothing:antialiased;">
  <center style="width:100%;">
    <div style="max-width:580px;text-align:left;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:24px;overflow:hidden;box-shadow:0 10px 30px -5px rgba(0,0,0,0.06);">
      
      <!-- TOP GRADIENT ACCENT -->
      <div style="height:5px;background:linear-gradient(90deg,#2563EB 0%,#7C3AED 50%,#059669 100%);"></div>
      
      <div style="padding:28px 32px 32px 32px;">
        
        <!-- HEADER -->
        <table width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:20px;">
          <tr>
            <td style="vertical-align:middle;">
              <table cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="background-color:#0F172A;border-radius:9px;width:30px;height:30px;text-align:center;color:#FFFFFF;font-weight:900;font-size:15px;line-height:30px;">
                    X
                  </td>
                  <td style="padding-left:10px;font-size:19px;font-weight:800;letter-spacing:-0.5px;color:#0F172A;">
                    TradeX
                  </td>
                </tr>
              </table>
            </td>
            <td align="right" style="vertical-align:middle;">
              <span style="display:inline-block;background-color:#F1F5F9;color:#475569;font-size:12px;font-weight:600;padding:5px 14px;border-radius:999px;letter-spacing:-0.2px;">
                ${formattedDate}
              </span>
            </td>
          </tr>
        </table>

        <!-- GREETING -->
        <h1 style="font-size:22px;font-weight:800;letter-spacing:-0.6px;color:#0F172A;margin:0 0 6px 0;">
          Good evening, ${userName}.
        </h1>
        <p style="font-size:13.5px;color:#64748B;line-height:1.5;margin:0 0 22px 0;">
          Here is your daily trading execution performance and comprehensive global market intelligence.
        </p>

        <!-- HERO P&L STAT CARD -->
        <div style="background:linear-gradient(135deg, #FAFAFC 0%, #F1F5F9 100%);border:1px solid #E2E8F0;border-radius:18px;padding:22px 24px;margin-bottom:18px;">
          <div style="font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;">
            Today's Net Result
          </div>
          <div style="font-size:36px;font-weight:800;letter-spacing:-1px;color:${isProfit ? '#059669' : '#DC2626'};line-height:1.1;margin-bottom:6px;">
            ${pnlFormatted}
          </div>
          <div style="font-size:13px;font-weight:600;color:#64748B;">
            ${totalTrades === 0 ? 'No trades executed today · Capital 100% protected' : `${totalTrades} executed trade${totalTrades !== 1 ? 's' : ''} · Win Rate: ${winRate}%`}
          </div>
        </div>

        <!-- 3 STAT PILLS -->
        <table width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:20px;">
          <tr>
            <td width="31%" style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:12px;text-align:center;">
              <div style="font-size:10px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Win Rate</div>
              <div style="font-size:17px;font-weight:800;color:#0F172A;">${winRate}%</div>
            </td>
            <td width="3%"></td>
            <td width="31%" style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:12px;text-align:center;">
              <div style="font-size:10px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Avg R</div>
              <div style="font-size:17px;font-weight:800;color:#0F172A;">${avgRText}</div>
            </td>
            <td width="3%"></td>
            <td width="31%" style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:12px;text-align:center;">
              <div style="font-size:10px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Discipline</div>
              <div style="font-size:17px;font-weight:800;color:${disciplineScore >= 80 ? '#059669' : '#D97706'};">${disciplineScore}%</div>
            </td>
          </tr>
        </table>

        <!-- BEST & REVIEW TRADES (IF ANY) -->
        ${tradeCardsHtml}

        <!-- AI TRADING COACH CARD -->
        <div style="background:#0F172A;border-radius:18px;padding:22px 24px;color:#FFFFFF;margin-bottom:24px;box-shadow:0 4px 14px rgba(15,23,42,0.15);">
          <div style="font-size:11px;font-weight:700;color:#38BDF8;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px;">
            🤖 AI Trading Coach
          </div>
          <div style="font-size:17px;font-weight:700;color:#FFFFFF;margin-bottom:8px;">
            ${aiReview.headline}
          </div>
          <div style="font-size:13.5px;color:#94A3B8;line-height:1.6;margin-bottom:14px;">
            ${aiReview.summary}
          </div>
          <div style="border-top:1px solid #1E293B;padding-top:12px;margin-top:12px;">
            <div style="font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;margin-bottom:4px;">Pattern Detected</div>
            <div style="font-size:13px;color:#E2E8F0;">${aiReview.pattern}</div>
          </div>
        </div>

        <!-- ============================================== -->
        <!-- 🌐 INFORMATION CORNER: GLOBAL MARKET PULSE    -->
        <!-- ============================================== -->
        <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:18px;padding:20px 22px;margin-bottom:24px;">
          <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #E2E8F0;padding-bottom:12px;margin-bottom:14px;">
            <div style="font-size:12px;font-weight:800;color:#0F172A;text-transform:uppercase;letter-spacing:0.8px;">
              🌍 Market Information Corner
            </div>
            <span style="font-size:10px;font-weight:700;color:#2563EB;background:#EFF6FF;padding:3px 8px;border-radius:6px;">
              Live Pulse
            </span>
          </div>

          <!-- 4 Grid Sections: Forex, Crypto, US Market, India Market -->
          <table width="100%" cellspacing="0" cellpadding="0" border="0">
            <!-- ROW 1: FOREX & CRYPTO -->
            <tr>
              <td width="48%" style="vertical-align:top;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;padding:12px 14px;margin-bottom:10px;">
                <div style="font-size:11px;font-weight:700;color:#2563EB;margin-bottom:4px;">
                  💱 Forex Markets
                </div>
                <div style="font-size:12px;font-weight:600;color:#0F172A;margin-bottom:4px;">
                  ${marketNews.forex.title}
                </div>
                <div style="font-size:11.5px;color:#64748B;line-height:1.45;">
                  ${marketNews.forex.text}
                </div>
              </td>
              <td width="4%"></td>
              <td width="48%" style="vertical-align:top;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;padding:12px 14px;">
                <div style="font-size:11px;font-weight:700;color:#7C3AED;margin-bottom:4px;">
                  ⚡ Crypto Markets
                </div>
                <div style="font-size:12px;font-weight:600;color:#0F172A;margin-bottom:4px;">
                  ${marketNews.crypto.title}
                </div>
                <div style="font-size:11.5px;color:#64748B;line-height:1.45;">
                  ${marketNews.crypto.text}
                </div>
              </td>
            </tr>
            <tr><td height="10" colspan="3"></td></tr>
            <!-- ROW 2: US STOCKS & INDIA STOCKS -->
            <tr>
              <td width="48%" style="vertical-align:top;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;padding:12px 14px;">
                <div style="font-size:11px;font-weight:700;color:#059669;margin-bottom:4px;">
                  🇺🇸 US Stock Market
                </div>
                <div style="font-size:12px;font-weight:600;color:#0F172A;margin-bottom:4px;">
                  ${marketNews.us_stocks.title}
                </div>
                <div style="font-size:11.5px;color:#64748B;line-height:1.45;">
                  ${marketNews.us_stocks.text}
                </div>
              </td>
              <td width="4%"></td>
              <td width="48%" style="vertical-align:top;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;padding:12px 14px;">
                <div style="font-size:11px;font-weight:700;color:#D97706;margin-bottom:4px;">
                  🇮🇳 Indian Stock Market
                </div>
                <div style="font-size:12px;font-weight:600;color:#0F172A;margin-bottom:4px;">
                  ${marketNews.india_stocks.title}
                </div>
                <div style="font-size:11.5px;color:#64748B;line-height:1.45;">
                  ${marketNews.india_stocks.text}
                </div>
              </td>
            </tr>
          </table>
        </div>

        <!-- TOMORROW FOCUS -->
        <div style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:14px;padding:16px 18px;margin-bottom:24px;">
          <div style="font-size:11px;font-weight:700;color:#2563EB;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">
            🎯 Tomorrow's Focus: ${aiReview.tomorrowFocusTitle}
          </div>
          <div style="font-size:13px;color:#334155;line-height:1.5;">
            ${aiReview.tomorrowFocus}
          </div>
        </div>

        <!-- CTA BUTTON -->
        <div style="text-align:center;margin-bottom:12px;">
          <a href="https://tradexjournal.vercel.app" target="_blank" style="display:inline-block;padding:14px 34px;background-color:#2563EB;color:#FFFFFF;text-decoration:none;border-radius:12px;font-size:14px;font-weight:700;letter-spacing:-0.2px;box-shadow:0 4px 12px rgba(37,99,235,0.25);">
            Open TradeX Dashboard &rarr;
          </a>
        </div>
      </div>

      <!-- FOOTER -->
      <div style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:20px 32px;text-align:center;">
        <p style="margin:0 0 6px 0;font-size:12px;font-weight:600;color:#64748B;">
          TradeX · Trading Journal &amp; Market Intelligence Platform
        </p>
        <p style="margin:0;font-size:11px;color:#94A3B8;">
          <a href="https://tradexjournal.vercel.app/settings" target="_blank" style="color:#64748B;text-decoration:underline;">Notification Preferences</a>
          &nbsp;·&nbsp;
          <a href="https://tradexjournal.vercel.app/settings" target="_blank" style="color:#64748B;text-decoration:underline;">Manage Subscription</a>
        </p>
      </div>

    </div>
  </center>
</body>
</html>`;

    // 8. Send Email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: resendFromEmail,
        to: [userEmail],
        subject: `[TEST] ${subject}`,
        html: emailHtml,
      }),
    });

    const resendResult = await resendResponse.json();

    if (!resendResponse.ok) {
      return res.status(500).json({
        success: false,
        error: resendResult.message || resendResult.error || 'Resend delivery failed.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Test daily summary email dispatched successfully!',
      messageId: resendResult.id,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal Server Error',
    });
  }
}


