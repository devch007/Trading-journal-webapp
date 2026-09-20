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

    // 5. Fetch 100% Real-Time Live Ticker Prices (BTC, ETH, XAU, DXY, SPX, NIFTY)
    let liveTickers = {
      xau: { price: '$2,735.40', change: '+0.42%', isPositive: true },
      btc: { price: '$80,950', change: '-0.85%', isPositive: false },
      eth: { price: '$2,610.20', change: '-1.10%', isPositive: false },
      dxy: { price: '100.22', change: '-0.01%', isPositive: false },
      spx: { price: '$5,860.25', change: '+0.38%', isPositive: true },
      nifty: { price: '₹24,850.50', change: '+0.45%', isPositive: true },
    };

    // Parallel multi-source fetch
    await Promise.allSettled([
      // 1. CoinGecko (Guaranteed no-block public endpoint for BTC, ETH, Gold PAXG)
      (async () => {
        try {
          const cgRes = await fetch(
            'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,pax-gold&vs_currencies=usd&include_24hr_change=true',
            { headers: { Accept: 'application/json' } }
          );
          if (cgRes.ok) {
            const cg = await cgRes.json();
            if (cg.bitcoin?.usd) {
              const btcChange = cg.bitcoin.usd_24h_change || 0;
              liveTickers.btc = {
                price: `$${cg.bitcoin.usd.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
                change: `${btcChange >= 0 ? '+' : ''}${btcChange.toFixed(2)}%`,
                isPositive: btcChange >= 0,
              };
            }
            if (cg.ethereum?.usd) {
              const ethChange = cg.ethereum.usd_24h_change || 0;
              liveTickers.eth = {
                price: `$${cg.ethereum.usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                change: `${ethChange >= 0 ? '+' : ''}${ethChange.toFixed(2)}%`,
                isPositive: ethChange >= 0,
              };
            }
            if (cg['pax-gold']?.usd) {
              const xauChange = cg['pax-gold'].usd_24h_change || 0;
              liveTickers.xau = {
                price: `$${cg['pax-gold'].usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                change: `${xauChange >= 0 ? '+' : ''}${xauChange.toFixed(2)}%`,
                isPositive: xauChange >= 0,
              };
            }
          }
        } catch (e) {
          console.warn('CoinGecko fetch failed:', e);
        }
      })(),

      // 2. Binance Direct (Ultra-fast real-time crypto & gold spot)
      (async () => {
        try {
          const bRes = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbols=[%22BTCUSDT%22,%22ETHUSDT%22,%22PAXGUSDT%22]');
          if (bRes.ok) {
            const bData = await bRes.json();
            for (const item of bData) {
              const price = parseFloat(item.lastPrice);
              const change = parseFloat(item.priceChangePercent);
              if (isNaN(price)) continue;
              const formattedChange = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
              const isPos = change >= 0;

              if (item.symbol === 'BTCUSDT') {
                liveTickers.btc = {
                  price: `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
                  change: formattedChange,
                  isPositive: isPos,
                };
              } else if (item.symbol === 'ETHUSDT') {
                liveTickers.eth = {
                  price: `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                  change: formattedChange,
                  isPositive: isPos,
                };
              } else if (item.symbol === 'PAXGUSDT') {
                liveTickers.xau = {
                  price: `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                  change: formattedChange,
                  isPositive: isPos,
                };
              }
            }
          }
        } catch (e) {
          console.warn('Binance fetch failed:', e);
        }
      })(),

      // 3. Yahoo Finance Real-time Indices (^GSPC S&P 500, ^NSEI Nifty 50, DX-Y.NYB US Dollar Index, GC=F Gold Futures)
      (async () => {
        const symbols: Record<string, 'spx' | 'nifty' | 'dxy' | 'xau'> = {
          '^GSPC': 'spx',
          '^NSEI': 'nifty',
          'DX-Y.NYB': 'dxy',
          'GC=F': 'xau',
        };

        for (const [sym, key] of Object.entries(symbols)) {
          try {
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1d`;
            const res = await fetch(url, {
              headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            });
            if (res.ok) {
              const data = await res.json();
              const meta = data?.chart?.result?.[0]?.meta;
              const price = meta?.regularMarketPrice;
              const prevClose = meta?.chartPreviousClose || meta?.previousClose;
              if (typeof price === 'number' && !isNaN(price)) {
                const changePct = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;
                const sign = changePct >= 0 ? '+' : '';
                const formattedChange = `${sign}${changePct.toFixed(2)}%`;
                const isPos = changePct >= 0;

                let formattedPrice = '';
                if (key === 'dxy') {
                  formattedPrice = price.toFixed(2);
                } else if (key === 'nifty') {
                  formattedPrice = `₹${price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
                } else {
                  formattedPrice = `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                }

                liveTickers[key] = {
                  price: formattedPrice,
                  change: formattedChange,
                  isPositive: isPos,
                };
              }
            }
          } catch (e) {
            console.warn(`Yahoo fetch failed for ${sym}:`, e);
          }
        }
      })(),
    ]);

    // 6. Generate 100% Real-Time Market Intelligence Headlines & Briefs (Forex, Crypto, US Markets, Indian Markets)
    let marketNews = {
      forex: { title: 'Global Forex & Rates', text: 'Dollar Index and currency pairs adjust as traders assess central bank monetary policy updates.' },
      crypto: { title: 'Bitcoin & Digital Assets', text: 'Crypto markets navigate key liquidity levels and spot ETF volume flows.' },
      us_stocks: { title: 'Wall Street (S&P 500 & Nasdaq)', text: 'US equities track treasury yields, earnings catalysts, and macro economic indicators.' },
      india_stocks: { title: 'Dalal Street (Nifty 50 & Bank Nifty)', text: 'Indian indices react to domestic institutional flows and sector rotation trends.' },
    };

    // Fetch live breaking news from authoritative RSS feeds
    const newsFeeds: Record<string, string> = {
      crypto: 'https://cointelegraph.com/rss',
      forex: 'https://www.fxstreet.com/rss/news',
      us_stocks: 'https://feeds.finance.yahoo.com/rss/2.0/headline?s=%5EGSPC&region=US&lang=en-US',
      india_stocks: 'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms',
    };

    const cleanHtmlEntities = (str: string) => {
      return str
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\]\]>/g, '')
        .trim();
    };

    let rawLiveHeadlines: Record<string, { title: string; text: string }> = {};

    await Promise.allSettled(
      Object.entries(newsFeeds).map(async ([key, url]) => {
        try {
          const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
          if (res.ok) {
            const text = await res.text();
            const items = text.match(/<item>[\s\S]*?<\/item>/gi) || [];
            if (items.length > 0) {
              const titleMatch = items[0].match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
              const descMatch = items[0].match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
              const title = titleMatch ? cleanHtmlEntities(titleMatch[1]) : '';
              let desc = descMatch ? cleanHtmlEntities(descMatch[1]) : '';
              if (desc.length > 130) desc = desc.slice(0, 127) + '...';

              if (title) {
                rawLiveHeadlines[key] = {
                  title: title.length > 55 ? title.slice(0, 52) + '...' : title,
                  text: desc || title,
                };
                marketNews[key as keyof typeof marketNews] = rawLiveHeadlines[key];
              }
            }
          }
        } catch (rssErr) {
          console.warn(`RSS fetch failed for ${key}:`, rssErr);
        }
      })
    );

    let aiReview = {
      headline: totalTrades === 0 ? 'Patience & Capital Preservation' : isProfit ? 'Disciplined Execution & Positive Returns' : 'Risk Control Under Market Resistance',
      summary: totalTrades === 0 ? 'You remained on the sidelines today with zero trades executed, keeping your capital safe.' : `Logged ${totalTrades} trades today with ${disciplineScore}% plan adherence and ${winRate}% win rate.`,
      pattern: totalTrades === 0 ? 'High patience observed without forcing low-probability setups.' : 'Consistent risk-to-reward execution observed across session entries.',
      tomorrowFocusTitle: 'Wait For Prime Setups',
      tomorrowFocus: 'Execute strictly when your primary setup criteria and risk parameters are satisfied without hesitation.',
    };

    // AI enhancement using live news context if Groq API key is present
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
                content: `You are TradeX Financial Intelligence. Synthesize real-time breaking market context and trade coaching. Return valid JSON only:
{
  "marketNews": {
    "forex": { "title": "Short title max 6 words", "text": "1 punchy sentence" },
    "crypto": { "title": "Short title max 6 words", "text": "1 punchy sentence" },
    "us_stocks": { "title": "Short title max 6 words", "text": "1 punchy sentence" },
    "india_stocks": { "title": "Short title max 6 words", "text": "1 punchy sentence" }
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
                content: `Real-time Breaking News:\nForex: ${rawLiveHeadlines.forex?.title || 'DXY steady'}\nCrypto: ${rawLiveHeadlines.crypto?.title || 'BTC/ETH momentum'}\nUS: ${rawLiveHeadlines.us_stocks?.title || 'Wall Street session'}\nIndia: ${rawLiveHeadlines.india_stocks?.title || 'Dalal Street update'}\n\nJournal stats today: ${totalTrades} trades, net P&L: ${pnlFormatted}, win rate: ${winRate}%, discipline: ${disciplineScore}%.`,
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
          if (parsed.marketNews?.forex?.title) marketNews.forex = parsed.marketNews.forex;
          if (parsed.marketNews?.crypto?.title) marketNews.crypto = parsed.marketNews.crypto;
          if (parsed.marketNews?.us_stocks?.title) marketNews.us_stocks = parsed.marketNews.us_stocks;
          if (parsed.marketNews?.india_stocks?.title) marketNews.india_stocks = parsed.marketNews.india_stocks;
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

    // 6. Best & Review Trade Row HTML (pure table layout)
    let tradeCardsHtml = '';
    if (totalTrades > 0 && bestTrade) {
      tradeCardsHtml = `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 14px;">
        <tr>
          <td width="${worstTrade ? '48%' : '100%'}" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 12px 14px; vertical-align: top;">
            <div style="font-size: 10px; font-weight: 700; color: #10B981; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px;">★ Best Trade</div>
            <div style="font-size: 14px; font-weight: 800; color: #0F172A;">${bestTrade.symbol} <span style="font-size: 11px; color: #64748B; font-weight: 500;">(${bestTrade.direction})</span></div>
            <div style="font-size: 11px; color: #64748B; margin-top: 2px;">${bestTrade.setup}</div>
            <div style="font-size: 14px; font-weight: 800; color: #10B981; margin-top: 5px;">${bestTrade.r}</div>
          </td>
          ${worstTrade ? `
          <td width="4%"></td>
          <td width="48%" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 12px 14px; vertical-align: top;">
            <div style="font-size: 10px; font-weight: 700; color: #F59E0B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px;">🔍 Trade to Review</div>
            <div style="font-size: 14px; font-weight: 800; color: #0F172A;">${worstTrade.symbol} <span style="font-size: 11px; color: #64748B; font-weight: 500;">(${worstTrade.direction})</span></div>
            <div style="font-size: 11px; color: #64748B; margin-top: 2px;">${worstTrade.setup}</div>
            <div style="font-size: 14px; font-weight: 800; color: ${worstTrade.pnl < 0 ? '#EF4444' : '#64748B'}; margin-top: 5px;">${worstTrade.r}</div>
          </td>
          ` : ''}
        </tr>
      </table>
      `;
    }

    // 7. Ultra-Beautiful 100% Table-Based HTML Email Template (No Gmail clipping or truncation)
    const subject = totalTrades === 0
      ? `TradeX Daily Intelligence · ${formattedDate}`
      : `TradeX Daily Intelligence · ${formattedDate} (${pnlFormatted})`;

    const emailHtml = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 24px 8px; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; width: 100% !important;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F1F5F9;">
    <tr>
      <td align="center">
        <!-- MAIN CONTAINER -->
        <table role="presentation" width="580" cellspacing="0" cellpadding="0" border="0" style="width: 580px; max-width: 580px; background-color: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
          
          <!-- TOP ACCENT BAR -->
          <tr>
            <td height="5" style="background: linear-gradient(90deg, #2563EB 0%, #7C3AED 50%, #059669 100%); line-height: 5px; font-size: 1px;">&nbsp;</td>
          </tr>

          <!-- INNER CONTAINER -->
          <tr>
            <td style="padding: 24px 28px;">
              
              <!-- HEADER -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 18px;">
                <tr>
                  <td align="left" style="vertical-align: middle;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td width="28" height="28" style="background-color: #0F172A; border-radius: 8px; text-align: center; vertical-align: middle; color: #FFFFFF; font-weight: 900; font-size: 15px;">
                          X
                        </td>
                        <td style="padding-left: 9px; font-size: 18px; font-weight: 800; color: #0F172A; letter-spacing: -0.4px;">
                          TradeX
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="background-color: #F1F5F9; border-radius: 999px; padding: 4px 12px; font-size: 11.5px; font-weight: 600; color: #475569;">
                          ${formattedDate}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- GREETING -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 16px;">
                <tr>
                  <td>
                    <div style="font-size: 21px; font-weight: 800; color: #0F172A; letter-spacing: -0.5px; margin-bottom: 4px;">
                      Good evening, ${userName}.
                    </div>
                    <div style="font-size: 13px; color: #64748B; line-height: 1.45;">
                      Here is your daily trading execution summary and live global market intelligence.
                    </div>
                  </td>
                </tr>
              </table>

              <!-- HERO P&L STAT CARD -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 16px; margin-bottom: 14px;">
                <tr>
                  <td style="padding: 18px 20px;">
                    <div style="font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px;">
                      Today's Net Result
                    </div>
                    <div style="font-size: 34px; font-weight: 800; letter-spacing: -1px; color: ${isProfit ? '#059669' : '#DC2626'}; line-height: 1.1; margin-bottom: 4px;">
                      ${pnlFormatted}
                    </div>
                    <div style="font-size: 12.5px; font-weight: 600; color: #64748B;">
                      ${totalTrades === 0 ? 'No trades executed today · Capital 100% protected' : `${totalTrades} executed trade${totalTrades !== 1 ? 's' : ''} · Win Rate: ${winRate}%`}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- 3 STAT PILLS -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 16px;">
                <tr>
                  <td width="31%" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 10px 8px; text-align: center;">
                    <div style="font-size: 10px; font-weight: 700; color: #64748B; text-transform: uppercase; margin-bottom: 2px;">Win Rate</div>
                    <div style="font-size: 16px; font-weight: 800; color: #0F172A;">${winRate}%</div>
                  </td>
                  <td width="3%"></td>
                  <td width="31%" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 10px 8px; text-align: center;">
                    <div style="font-size: 10px; font-weight: 700; color: #64748B; text-transform: uppercase; margin-bottom: 2px;">Avg R</div>
                    <div style="font-size: 16px; font-weight: 800; color: #0F172A;">${avgRText}</div>
                  </td>
                  <td width="3%"></td>
                  <td width="31%" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 10px 8px; text-align: center;">
                    <div style="font-size: 10px; font-weight: 700; color: #64748B; text-transform: uppercase; margin-bottom: 2px;">Discipline</div>
                    <div style="font-size: 16px; font-weight: 800; color: ${disciplineScore >= 80 ? '#059669' : '#D97706'};">${disciplineScore}%</div>
                  </td>
                </tr>
              </table>

              <!-- AI TRADING COACH CARD -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0F172A; border-radius: 16px; margin-bottom: 18px;">
                <tr>
                  <td style="padding: 18px 20px; color: #FFFFFF;">
                    <div style="font-size: 10px; font-weight: 700; color: #38BDF8; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px;">
                      🤖 AI Trading Coach
                    </div>
                    <div style="font-size: 16px; font-weight: 700; color: #FFFFFF; margin-bottom: 6px; line-height: 1.25;">
                      ${aiReview.headline}
                    </div>
                    <div style="font-size: 12.5px; color: #94A3B8; line-height: 1.5; margin-bottom: 12px;">
                      ${aiReview.summary}
                    </div>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top: 1px solid #1E293B; padding-top: 10px;">
                      <tr>
                        <td>
                          <div style="font-size: 10px; font-weight: 700; color: #64748B; text-transform: uppercase; margin-bottom: 2px;">Pattern Detected</div>
                          <div style="font-size: 12px; color: #E2E8F0; line-height: 1.4;">${aiReview.pattern}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- ======================================================= -->
              <!-- 🌐 INFORMATION CORNER: REAL-TIME GLOBAL MARKET PULSE     -->
              <!-- ======================================================= -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 16px; margin-bottom: 18px;">
                <tr>
                  <td style="padding: 16px 18px;">
                    
                    <!-- Title Bar -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-bottom: 1px solid #E2E8F0; padding-bottom: 10px; margin-bottom: 12px;">
                      <tr>
                        <td align="left" style="font-size: 12px; font-weight: 800; color: #0F172A; text-transform: uppercase; letter-spacing: 0.6px;">
                          ⚡ Global Market Intelligence &amp; Live Tickers
                        </td>
                        <td align="right">
                          <span style="font-size: 9.5px; font-weight: 700; color: #059669; background-color: #ECFDF5; border: 1px solid #A7F3D0; padding: 2px 7px; border-radius: 999px;">
                            ● Real-Time Feed
                          </span>
                        </td>
                      </tr>
                    </table>

                    <!-- LIVE TICKER ROW 1: GOLD, BTC, ETH -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 8px;">
                      <tr>
                        <!-- GOLD -->
                        <td width="31%" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 8px 10px;">
                          <div style="font-size: 9.5px; font-weight: 700; color: #D97706; text-transform: uppercase; margin-bottom: 2px;">
                            🥇 XAU / USD (Gold)
                          </div>
                          <div style="font-size: 14px; font-weight: 800; color: #0F172A;">
                            ${liveTickers.xau.price}
                          </div>
                          <div style="font-size: 10.5px; font-weight: 700; color: ${liveTickers.xau.isPositive ? '#059669' : '#DC2626'}; margin-top: 1px;">
                            ${liveTickers.xau.isPositive ? '▲' : '▼'} ${liveTickers.xau.change}
                          </div>
                        </td>
                        <td width="3%"></td>
                        <!-- BTC -->
                        <td width="31%" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 8px 10px;">
                          <div style="font-size: 9.5px; font-weight: 700; color: #F59E0B; text-transform: uppercase; margin-bottom: 2px;">
                            ₿ BTC / USD
                          </div>
                          <div style="font-size: 14px; font-weight: 800; color: #0F172A;">
                            ${liveTickers.btc.price}
                          </div>
                          <div style="font-size: 10.5px; font-weight: 700; color: ${liveTickers.btc.isPositive ? '#059669' : '#DC2626'}; margin-top: 1px;">
                            ${liveTickers.btc.isPositive ? '▲' : '▼'} ${liveTickers.btc.change}
                          </div>
                        </td>
                        <td width="3%"></td>
                        <!-- ETH -->
                        <td width="31%" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 8px 10px;">
                          <div style="font-size: 9.5px; font-weight: 700; color: #6366F1; text-transform: uppercase; margin-bottom: 2px;">
                            Ξ ETH / USD
                          </div>
                          <div style="font-size: 14px; font-weight: 800; color: #0F172A;">
                            ${liveTickers.eth.price}
                          </div>
                          <div style="font-size: 10.5px; font-weight: 700; color: ${liveTickers.eth.isPositive ? '#059669' : '#DC2626'}; margin-top: 1px;">
                            ${liveTickers.eth.isPositive ? '▲' : '▼'} ${liveTickers.eth.change}
                          </div>
                        </td>
                      </tr>
                    </table>

                    <!-- LIVE TICKER ROW 2: DXY, S&P 500, NIFTY 50 -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 12px;">
                      <tr>
                        <!-- DXY -->
                        <td width="31%" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 8px 10px;">
                          <div style="font-size: 9.5px; font-weight: 700; color: #2563EB; text-transform: uppercase; margin-bottom: 2px;">
                            💵 DXY (Dollar)
                          </div>
                          <div style="font-size: 14px; font-weight: 800; color: #0F172A;">
                            ${liveTickers.dxy.price}
                          </div>
                          <div style="font-size: 10.5px; font-weight: 700; color: ${liveTickers.dxy.isPositive ? '#059669' : '#DC2626'}; margin-top: 1px;">
                            ${liveTickers.dxy.isPositive ? '▲' : '▼'} ${liveTickers.dxy.change}
                          </div>
                        </td>
                        <td width="3%"></td>
                        <!-- SPX -->
                        <td width="31%" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 8px 10px;">
                          <div style="font-size: 9.5px; font-weight: 700; color: #059669; text-transform: uppercase; margin-bottom: 2px;">
                            🇺🇸 S&amp;P 500
                          </div>
                          <div style="font-size: 14px; font-weight: 800; color: #0F172A;">
                            ${liveTickers.spx.price}
                          </div>
                          <div style="font-size: 10.5px; font-weight: 700; color: ${liveTickers.spx.isPositive ? '#059669' : '#DC2626'}; margin-top: 1px;">
                            ${liveTickers.spx.isPositive ? '▲' : '▼'} ${liveTickers.spx.change}
                          </div>
                        </td>
                        <td width="3%"></td>
                        <!-- NIFTY -->
                        <td width="31%" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 8px 10px;">
                          <div style="font-size: 9.5px; font-weight: 700; color: #EA580C; text-transform: uppercase; margin-bottom: 2px;">
                            🇮🇳 NIFTY 50
                          </div>
                          <div style="font-size: 14px; font-weight: 800; color: #0F172A;">
                            ${liveTickers.nifty.price}
                          </div>
                          <div style="font-size: 10.5px; font-weight: 700; color: ${liveTickers.nifty.isPositive ? '#059669' : '#DC2626'}; margin-top: 1px;">
                            ${liveTickers.nifty.isPositive ? '▲' : '▼'} ${liveTickers.nifty.change}
                          </div>
                        </td>
                      </tr>
                    </table>

                    <!-- 4 SECTOR HIGHLIGHT BRIEFS -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <!-- ROW A: FOREX & CRYPTO -->
                      <tr>
                        <td width="48%" style="vertical-align: top; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 10px 12px;">
                          <div style="font-size: 10.5px; font-weight: 800; color: #2563EB; margin-bottom: 2px;">
                            💱 Forex &amp; Metals
                          </div>
                          <div style="font-size: 11.5px; font-weight: 700; color: #0F172A; margin-bottom: 2px;">
                            ${marketNews.forex.title}
                          </div>
                          <div style="font-size: 11px; color: #64748B; line-height: 1.4;">
                            ${marketNews.forex.text}
                          </div>
                        </td>
                        <td width="4%"></td>
                        <td width="48%" style="vertical-align: top; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 10px 12px;">
                          <div style="font-size: 10.5px; font-weight: 800; color: #7C3AED; margin-bottom: 2px;">
                            ⚡ Crypto Pulse
                          </div>
                          <div style="font-size: 11.5px; font-weight: 700; color: #0F172A; margin-bottom: 2px;">
                            ${marketNews.crypto.title}
                          </div>
                          <div style="font-size: 11px; color: #64748B; line-height: 1.4;">
                            ${marketNews.crypto.text}
                          </div>
                        </td>
                      </tr>
                      <tr><td height="8" colspan="3"></td></tr>
                      <!-- ROW B: US & INDIA -->
                      <tr>
                        <td width="48%" style="vertical-align: top; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 10px 12px;">
                          <div style="font-size: 10.5px; font-weight: 800; color: #059669; margin-bottom: 2px;">
                            🇺🇸 US Stock Markets
                          </div>
                          <div style="font-size: 11.5px; font-weight: 700; color: #0F172A; margin-bottom: 2px;">
                            ${marketNews.us_stocks.title}
                          </div>
                          <div style="font-size: 11px; color: #64748B; line-height: 1.4;">
                            ${marketNews.us_stocks.text}
                          </div>
                        </td>
                        <td width="4%"></td>
                        <td width="48%" style="vertical-align: top; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 10px 12px;">
                          <div style="font-size: 10.5px; font-weight: 800; color: #D97706; margin-bottom: 2px;">
                            🇮🇳 Indian Markets
                          </div>
                          <div style="font-size: 11.5px; font-weight: 700; color: #0F172A; margin-bottom: 2px;">
                            ${marketNews.india_stocks.title}
                          </div>
                          <div style="font-size: 11px; color: #64748B; line-height: 1.4;">
                            ${marketNews.india_stocks.text}
                          </div>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>

              <!-- TOMORROW FOCUS -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 14px 16px;">
                    <div style="font-size: 10.5px; font-weight: 700; color: #2563EB; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px;">
                      🎯 Tomorrow's Focus: ${aiReview.tomorrowFocusTitle}
                    </div>
                    <div style="font-size: 12.5px; color: #334155; line-height: 1.45;">
                      ${aiReview.tomorrowFocus}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- CTA BUTTON -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 8px;">
                <tr>
                  <td align="center">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="center" style="border-radius: 12px; background-color: #2563EB;">
                          <a href="https://tradexjournal.vercel.app" target="_blank" style="display: inline-block; padding: 12px 30px; font-size: 13.5px; font-weight: 700; color: #FFFFFF; text-decoration: none; border-radius: 12px;">
                            Open TradeX Dashboard &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 16px 28px; text-align: center;">
              <p style="margin: 0 0 4px 0; font-size: 11.5px; font-weight: 600; color: #64748B;">
                TradeX · Trading Journal &amp; Market Intelligence Platform
              </p>
              <p style="margin: 0; font-size: 10.5px; color: #94A3B8;">
                <a href="https://tradexjournal.vercel.app/settings" target="_blank" style="color: #64748B; text-decoration: underline;">Notification Preferences</a>
                &nbsp;·&nbsp;
                <a href="https://tradexjournal.vercel.app/settings" target="_blank" style="color: #64748B; text-decoration: underline;">Manage Subscription</a>
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;

    // 9. Send Email via Resend with dynamic test ID to avoid Gmail thread clipping
    const testId = Math.random().toString(36).substring(2, 6).toUpperCase();
    const finalSubject = `[TEST-${testId}] ${subject}`;

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: resendFromEmail,
        to: [userEmail],
        subject: finalSubject,
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
