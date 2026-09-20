import { TradeSummaryStats } from './tradeAnalytics';
import { AICoachOutput } from './aiCoach';

export interface EmailRenderContext {
  recipientName: string;
  recipientEmail: string;
  summaryDate: string; // e.g. "September 20, 2026"
  formattedDatePill: string;
  stats: TradeSummaryStats;
  ai: AICoachOutput;
  dashboardUrl?: string;
  settingsUrl?: string;
  unsubscribeUrl?: string;
}

// Utility to escape HTML special characters to prevent HTML injection
function escapeHtml(str?: string | number | null): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function renderDailySummaryEmail(ctx: EmailRenderContext): { html: string; text: string; subject: string } {
  const {
    recipientName = 'Trader',
    summaryDate,
    stats,
    ai,
    dashboardUrl = 'https://dctechnologies.in',
    settingsUrl = 'https://dctechnologies.in/settings',
    unsubscribeUrl = 'https://dctechnologies.in/settings',
  } = ctx;

  const isZeroTrades = stats.totalTrades === 0;
  const isProfit = stats.netPnl >= 0;
  const pnlSign = isProfit ? '+' : '-';
  const pnlFormatted = `${pnlSign}$${Math.abs(stats.netPnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const pnlColor = isProfit ? '#10B981' : '#EF4444';
  const pnlBgColor = isProfit ? '#ECFDF5' : '#FEF2F2';

  const rText = stats.netR !== null ? `${stats.netR >= 0 ? '+' : ''}${stats.netR.toFixed(1)}R` : null;
  const avgRText = stats.avgR !== null ? `${stats.avgR >= 0 ? '+' : ''}${stats.avgR.toFixed(2)}R` : '—';

  const subject = isZeroTrades
    ? `TradeX Daily Check-in · ${summaryDate}`
    : `TradeX Daily Summary · ${summaryDate} (${pnlFormatted})`;

  const plainText = `
TradeX Trading Intelligence
Daily Summary for ${summaryDate}
Good evening, ${recipientName}.

${isZeroTrades ? 'No trades were logged today. Your capital remained protected.' : `Today's Net P&L: ${pnlFormatted} (${rText ? `${rText} · ` : ''}${stats.totalTrades} trades)`}
Trades: ${stats.totalTrades} | Win Rate: ${stats.winRate}% | Avg R: ${avgRText} | Discipline: ${stats.disciplineScore}%

AI Trading Coach Review:
${ai.headline}
${ai.summary}

Important Pattern:
${ai.pattern}

Tomorrow's Focus:
${ai.tomorrowFocusTitle}: ${ai.tomorrowFocus}

View your full dashboard: ${dashboardUrl}
Notification settings: ${settingsUrl}
`.trim();

  // Trade Cards (Best & Review)
  let tradesSectionHtml = '';
  if (!isZeroTrades && (stats.bestTrade || stats.worstTrade)) {
    tradesSectionHtml = `
      <tr>
        <td style="padding-top: 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              ${
                stats.bestTrade
                  ? `
              <td width="48%" style="vertical-align: top; background-color: #FAFAFA; border: 1px solid #F0F0F0; border-radius: 12px; padding: 14px 16px;">
                <div style="font-size: 10px; font-weight: 700; color: #10B981; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
                  ★ Best Trade
                </div>
                <div style="font-size: 15px; font-weight: 700; color: #0F172A; margin-bottom: 2px;">
                  ${escapeHtml(stats.bestTrade.symbol)}
                </div>
                <div style="font-size: 12px; color: #64748B; margin-bottom: 8px;">
                  ${escapeHtml(stats.bestTrade.direction)} · ${escapeHtml(stats.bestTrade.setup)}
                </div>
                <div style="font-size: 14px; font-weight: 700; color: #10B981;">
                  ${escapeHtml(stats.bestTrade.displayR)}
                </div>
              </td>
              `
                  : ''
              }
              ${stats.bestTrade && stats.worstTrade ? `<td width="4%"></td>` : ''}
              ${
                stats.worstTrade
                  ? `
              <td width="48%" style="vertical-align: top; background-color: #FAFAFA; border: 1px solid #F0F0F0; border-radius: 12px; padding: 14px 16px;">
                <div style="font-size: 10px; font-weight: 700; color: #F59E0B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
                  🔍 Trade to Review
                </div>
                <div style="font-size: 15px; font-weight: 700; color: #0F172A; margin-bottom: 2px;">
                  ${escapeHtml(stats.worstTrade.symbol)}
                </div>
                <div style="font-size: 12px; color: #64748B; margin-bottom: 8px;">
                  ${escapeHtml(stats.worstTrade.direction)} · ${escapeHtml(stats.worstTrade.setup)}
                </div>
                <div style="font-size: 14px; font-weight: 700; color: ${stats.worstTrade.pnl < 0 ? '#EF4444' : '#64748B'};">
                  ${escapeHtml(stats.worstTrade.displayR)}
                </div>
              </td>
              `
                  : ''
              }
            </tr>
          </table>
        </td>
      </tr>
    `;
  }

  const html = `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${escapeHtml(subject)}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, div, p, a { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important; }
  </style>
  <![endif]-->
  <style type="text/css">
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 12px !important; }
      .stat-grid { display: block !important; width: 100% !important; }
      .stat-cell { display: inline-block !important; width: 46% !important; margin-bottom: 8px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0F172A;">
  <center style="width: 100%; background-color: #F8FAFC; padding: 32px 0;">
    <table class="container" role="presentation" width="580" cellspacing="0" cellpadding="0" border="0" style="width: 580px; max-width: 580px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);">
      
      <!-- TOP ACCENT BAR -->
      <tr>
        <td height="4" style="background: linear-gradient(90deg, #3B82F6 0%, #6366F1 50%, #10B981 100%);"></td>
      </tr>

      <!-- HEADER -->
      <tr>
        <td style="padding: 28px 32px 16px 32px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="vertical-align: middle;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="background-color: #2563EB; border-radius: 8px; width: 28px; height: 28px; text-align: center; vertical-align: middle; color: #FFFFFF; font-weight: 800; font-size: 15px;">
                      X
                    </td>
                    <td style="padding-left: 10px; font-size: 18px; font-weight: 800; letter-spacing: -0.5px; color: #0F172A;">
                      TradeX
                    </td>
                  </tr>
                </table>
              </td>
              <td align="right" style="vertical-align: middle;">
                <span style="display: inline-block; background-color: #F1F5F9; color: #475569; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 9999px; letter-spacing: -0.2px;">
                  ${escapeHtml(summaryDate)}
                </span>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- GREETING -->
      <tr>
        <td style="padding: 4px 32px 20px 32px;">
          <h1 style="margin: 0 0 6px 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; color: #0F172A;">
            Good evening, ${escapeHtml(recipientName)}.
          </h1>
          <p style="margin: 0; font-size: 13.5px; color: #64748B; line-height: 1.5;">
            ${
              isZeroTrades
                ? 'Here is your daily check-in. Staying patient and preserving capital is a core part of consistent edge.'
                : 'Here’s what happened in your trading today — performance, discipline, and the patterns worth paying attention to.'
            }
          </p>
        </td>
      </tr>

      ${
        !isZeroTrades
          ? `
      <!-- HERO P&L CARD -->
      <tr>
        <td style="padding: 0 32px 16px 32px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #FAFAFA; border: 1px solid #E2E8F0; border-radius: 16px; padding: 22px 24px;">
            <tr>
              <td>
                <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #64748B; margin-bottom: 6px;">
                  Today's Net P&amp;L
                </div>
                <div style="font-size: 34px; font-weight: 800; letter-spacing: -1px; color: ${pnlColor}; line-height: 1.1; margin-bottom: 6px;">
                  ${escapeHtml(pnlFormatted)}
                </div>
                <div style="font-size: 13px; font-weight: 600; color: #64748B;">
                  ${rText ? `<span style="color: #0F172A;">${escapeHtml(rText)}</span> · ` : ''}${stats.totalTrades} executed trade${stats.totalTrades > 1 ? 's' : ''}
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- 4 COMPACT STAT CARDS -->
      <tr>
        <td style="padding: 0 32px 16px 32px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td width="23%" style="background-color: #F8FAFC; border: 1px solid #F1F5F9; border-radius: 12px; padding: 12px 10px; text-align: center;">
                <div style="font-size: 11px; font-weight: 600; color: #64748B; text-transform: uppercase; margin-bottom: 4px;">Trades</div>
                <div style="font-size: 18px; font-weight: 700; color: #0F172A;">${stats.totalTrades}</div>
              </td>
              <td width="3%"></td>
              <td width="23%" style="background-color: #F8FAFC; border: 1px solid #F1F5F9; border-radius: 12px; padding: 12px 10px; text-align: center;">
                <div style="font-size: 11px; font-weight: 600; color: #64748B; text-transform: uppercase; margin-bottom: 4px;">Win Rate</div>
                <div style="font-size: 18px; font-weight: 700; color: ${stats.winRate >= 50 ? '#10B981' : '#64748B'};">${stats.winRate}%</div>
              </td>
              <td width="3%"></td>
              <td width="23%" style="background-color: #F8FAFC; border: 1px solid #F1F5F9; border-radius: 12px; padding: 12px 10px; text-align: center;">
                <div style="font-size: 11px; font-weight: 600; color: #64748B; text-transform: uppercase; margin-bottom: 4px;">Avg R</div>
                <div style="font-size: 18px; font-weight: 700; color: #0F172A;">${escapeHtml(avgRText)}</div>
              </td>
              <td width="3%"></td>
              <td width="23%" style="background-color: #F8FAFC; border: 1px solid #F1F5F9; border-radius: 12px; padding: 12px 10px; text-align: center;">
                <div style="font-size: 11px; font-weight: 600; color: #64748B; text-transform: uppercase; margin-bottom: 4px;">Discipline</div>
                <div style="font-size: 18px; font-weight: 700; color: ${stats.disciplineScore >= 80 ? '#10B981' : '#F59E0B'};">${stats.disciplineScore}%</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      `
          : `
      <!-- NO TRADES NOTICE -->
      <tr>
        <td style="padding: 0 32px 16px 32px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F8FAFC; border: 1px dashed #CBD5E1; border-radius: 16px; padding: 22px 24px; text-align: center;">
            <tr>
              <td>
                <div style="font-size: 24px; margin-bottom: 8px;">🛡️</div>
                <div style="font-size: 15px; font-weight: 700; color: #0F172A; margin-bottom: 4px;">No Trades Executed Today</div>
                <div style="font-size: 13px; color: #64748B;">Sitting on hands when market conditions are unclear is a hallmark of professional risk management.</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      `
      }

      ${tradesSectionHtml}

      <!-- AI TRADING COACH CARD (PREMIUM DARK ACCENT) -->
      <tr>
        <td style="padding: 8px 32px 16px 32px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0F172A; border-radius: 16px; padding: 22px 24px; color: #FFFFFF;">
            <tr>
              <td>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 12px;">
                  <tr>
                    <td style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #38BDF8;">
                      🤖 AI Trading Coach
                    </td>
                  </tr>
                </table>
                <div style="font-size: 17px; font-weight: 700; color: #FFFFFF; line-height: 1.3; margin-bottom: 8px;">
                  ${escapeHtml(ai.headline)}
                </div>
                <div style="font-size: 13.5px; color: #94A3B8; line-height: 1.55; margin-bottom: 16px;">
                  ${escapeHtml(ai.summary)}
                </div>

                <div style="border-top: 1px solid #1E293B; padding-top: 14px; margin-top: 14px;">
                  <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748B; letter-spacing: 0.5px; margin-bottom: 4px;">
                    Pattern Detected
                  </div>
                  <div style="font-size: 13px; color: #E2E8F0; line-height: 1.45;">
                    ${escapeHtml(ai.pattern)}
                  </div>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- DISCIPLINE & TOMORROW'S FOCUS CARD -->
      <tr>
        <td style="padding: 0 32px 24px 32px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 16px; padding: 20px 22px;">
            <tr>
              <td>
                <!-- Discipline row -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 16px;">
                  <tr>
                    <td style="font-size: 13px; font-weight: 700; color: #0F172A;">
                      Execution Discipline
                    </td>
                    <td align="right" style="font-size: 13px; font-weight: 700; color: ${stats.disciplineScore >= 80 ? '#10B981' : '#F59E0B'};">
                      ${stats.disciplineScore}%
                    </td>
                  </tr>
                  <tr>
                    <td colspan="2" style="padding-top: 8px;">
                      <div style="background-color: #E2E8F0; height: 6px; border-radius: 999px; overflow: hidden; width: 100%;">
                        <div style="background-color: ${stats.disciplineScore >= 80 ? '#10B981' : '#F59E0B'}; height: 6px; width: ${Math.max(5, Math.min(100, stats.disciplineScore))}%; border-radius: 999px;"></div>
                      </div>
                    </td>
                  </tr>
                </table>

                <!-- Tomorrow Focus -->
                <div style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px 16px;">
                  <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #2563EB; letter-spacing: 0.5px; margin-bottom: 4px;">
                    🎯 Tomorrow's Focus: ${escapeHtml(ai.tomorrowFocusTitle)}
                  </div>
                  <div style="font-size: 13px; color: #334155; line-height: 1.45;">
                    ${escapeHtml(ai.tomorrowFocus)}
                  </div>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- CTA BUTTON -->
      <tr>
        <td align="center" style="padding: 0 32px 28px 32px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td align="center" style="border-radius: 12px; background-color: #2563EB;">
                <a href="${escapeHtml(dashboardUrl)}" target="_blank" style="display: inline-block; padding: 13px 32px; font-size: 14px; font-weight: 600; color: #FFFFFF; text-decoration: none; border-radius: 12px; letter-spacing: -0.2px;">
                  Open TradeX Dashboard &rarr;
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- FOOTER -->
      <tr>
        <td style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 22px 32px; text-align: center;">
          <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600; color: #64748B;">
            TradeX · Trading Journal &amp; Performance Intelligence
          </p>
          <p style="margin: 0; font-size: 11.5px; color: #94A3B8;">
            <a href="${escapeHtml(settingsUrl)}" target="_blank" style="color: #64748B; text-decoration: underline;">Notification Settings</a>
            &nbsp;·&nbsp;
            <a href="${escapeHtml(unsubscribeUrl)}" target="_blank" style="color: #64748B; text-decoration: underline;">Unsubscribe</a>
          </p>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>
  `.trim();

  return { html, text: plainText, subject };
}
