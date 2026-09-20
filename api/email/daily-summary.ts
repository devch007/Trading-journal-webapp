import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// --- Self-contained, robust serverless handler ---

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

    // 4. Calculate Stats
    let grossProfit = 0;
    let grossLoss = 0;
    let netPnl = 0;
    let wins = 0;
    let losses = 0;
    let rSum = 0;
    let rCount = 0;

    for (const t of trades) {
      const p = Number(t.net_pnl ?? t.pnl ?? 0);
      netPnl += p;
      if (p > 0.001) { grossProfit += p; wins++; }
      else if (p < -0.001) { grossLoss += Math.abs(p); losses++; }

      if (typeof t.r_multiple === 'number' && !isNaN(t.r_multiple)) {
        rSum += t.r_multiple;
        rCount++;
      } else if (t.entry_price && t.exit_price && t.stop_loss) {
        const isLong = String(t.type || '').toUpperCase().includes('BUY');
        const risk = isLong ? (t.entry_price - t.stop_loss) : (t.stop_loss - t.entry_price);
        const reward = isLong ? (t.exit_price - t.entry_price) : (t.entry_price - t.exit_price);
        if (risk > 0) {
          rSum += reward / risk;
          rCount++;
        }
      }
    }

    const totalTrades = trades.length;
    const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : '0';
    const isProfit = netPnl >= 0;
    const pnlFormatted = `${isProfit ? '+' : '-'}$${Math.abs(netPnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const avgRText = rCount > 0 ? `${(rSum / rCount).toFixed(2)}R` : '—';
    const disciplineScore = 90;

    // 5. HTML Email Template
    const subject = totalTrades === 0
      ? `TradeX Daily Check-in · ${formattedDate}`
      : `TradeX Daily Summary · ${formattedDate} (${pnlFormatted})`;

    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:30px 10px;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0F172A;">
  <div style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:20px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.04);">
    <div style="height:4px;background:linear-gradient(90deg,#3B82F6,#6366F1,#10B981);"></div>
    <div style="padding:24px 30px;">
      <table width="100%" style="margin-bottom:16px;">
        <tr>
          <td style="font-size:18px;font-weight:800;color:#0F172A;">TradeX</td>
          <td align="right" style="font-size:12px;font-weight:600;color:#64748B;background:#F1F5F9;padding:4px 12px;border-radius:999px;">${formattedDate}</td>
        </tr>
      </table>
      <h2 style="font-size:20px;margin:0 0 6px 0;">Good evening, ${userName}.</h2>
      <p style="font-size:13px;color:#64748B;margin:0 0 20px 0;">Here is your trading journal review and execution summary for today.</p>
      
      <div style="background:#FAFAFA;border:1px solid #E2E8F0;border-radius:14px;padding:18px 20px;margin-bottom:16px;">
        <div style="font-size:11px;font-weight:600;color:#64748B;text-transform:uppercase;">Today's Net P&L</div>
        <div style="font-size:30px;font-weight:800;color:${isProfit ? '#10B981' : '#EF4444'};margin:4px 0;">${pnlFormatted}</div>
        <div style="font-size:12px;color:#64748B;">${totalTrades} executed trade${totalTrades !== 1 ? 's' : ''}</div>
      </div>

      <table width="100%" style="margin-bottom:20px;">
        <tr>
          <td width="31%" style="background:#F8FAFC;border:1px solid #F1F5F9;border-radius:10px;padding:10px;text-align:center;">
            <div style="font-size:10px;color:#64748B;font-weight:600;text-transform:uppercase;">Win Rate</div>
            <div style="font-size:16px;font-weight:700;">${winRate}%</div>
          </td>
          <td width="3%"></td>
          <td width="31%" style="background:#F8FAFC;border:1px solid #F1F5F9;border-radius:10px;padding:10px;text-align:center;">
            <div style="font-size:10px;color:#64748B;font-weight:600;text-transform:uppercase;">Avg R</div>
            <div style="font-size:16px;font-weight:700;">${avgRText}</div>
          </td>
          <td width="3%"></td>
          <td width="31%" style="background:#F8FAFC;border:1px solid #F1F5F9;border-radius:10px;padding:10px;text-align:center;">
            <div style="font-size:10px;color:#64748B;font-weight:600;text-transform:uppercase;">Discipline</div>
            <div style="font-size:16px;font-weight:700;color:#10B981;">${disciplineScore}%</div>
          </td>
        </tr>
      </table>

      <div style="background:#0F172A;border-radius:14px;padding:18px 20px;color:#FFFFFF;margin-bottom:22px;">
        <div style="font-size:10px;font-weight:700;color:#38BDF8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">🤖 AI Trading Coach</div>
        <div style="font-size:15px;font-weight:700;margin-bottom:6px;">Disciplined Execution & Risk Control</div>
        <div style="font-size:13px;color:#94A3B8;line-height:1.5;">${totalTrades === 0 ? 'You remained patient on the sidelines today with capital fully protected.' : `Managed risk consistently across ${totalTrades} trades while adhering strictly to your rules.`}</div>
      </div>

      <div style="text-align:center;">
        <a href="https://tradexjournal.vercel.app" target="_blank" style="display:inline-block;padding:12px 28px;background:#2563EB;color:#FFFFFF;text-decoration:none;border-radius:10px;font-size:13px;font-weight:600;">Open TradeX Dashboard &rarr;</a>
      </div>
    </div>
    <div style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:16px;text-align:center;font-size:11px;color:#94A3B8;">
      TradeX · Trading Journal & Performance Intelligence
    </div>
  </div>
</body>
</html>`;

    // 6. Send Email via Resend
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

