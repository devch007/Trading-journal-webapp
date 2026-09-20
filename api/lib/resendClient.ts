import { getSupabaseServerClient } from './supabaseServer';
import { calculateDailyStats, RawTrade } from './tradeAnalytics';
import { generateAICoachReview } from './aiCoach';
import { renderDailySummaryEmail } from './emailTemplate';

export interface DispatchSummaryOptions {
  userId: string;
  userEmail: string;
  userName?: string;
  summaryDateStr: string; // YYYY-MM-DD
  timezone?: string;
  isTest?: boolean;
}

export interface DispatchResult {
  success: boolean;
  status: 'sent' | 'failed' | 'skipped' | 'test';
  messageId?: string;
  error?: string;
  stats?: any;
}

export async function dispatchDailySummaryForUser(options: DispatchSummaryOptions): Promise<DispatchResult> {
  const {
    userId,
    userEmail,
    userName = 'Trader',
    summaryDateStr,
    timezone = 'Asia/Kolkata',
    isTest = false,
  } = options;

  const supabase = getSupabaseServerClient();
  const resendApiKey = process.env.RESEND_API_KEY;
  const resendFromEmail = process.env.RESEND_FROM_EMAIL || 'TradeX <journal@mail.dctechnologies.in>';

  if (!resendApiKey) {
    const errorMsg = 'RESEND_API_KEY environment variable is not configured on server.';
    console.error(errorMsg);
    return { success: false, status: 'failed', error: errorMsg };
  }

  // 1. Deduplication check: If not test mode, check if already sent for this date
  if (!isTest) {
    const { data: existingDelivery } = await supabase
      .from('daily_summary_deliveries')
      .select('id, status, sent_at')
      .eq('user_id', userId)
      .eq('summary_date', summaryDateStr)
      .maybeSingle();

    if (existingDelivery && existingDelivery.status === 'sent') {
      console.log(`[DailySummary] User ${userId} already received summary for ${summaryDateStr}. Skipping.`);
      return { success: true, status: 'skipped' };
    }
  }

  try {
    // 2. Query today's completed trades for this user
    // Query trades by user_id
    const { data: rawTrades, error: tradesError } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId);

    if (tradesError) {
      console.warn(`[DailySummary] Error querying trades for user ${userId}:`, tradesError);
    }

    const allUserTrades: RawTrade[] = rawTrades || [];

    // Filter today's trades safely in JS matching summaryDateStr (YYYY-MM-DD)
    const trades = allUserTrades.filter((t: any) => {
      const dateStr = t.close_date || t.open_date || t.date || t.created_at || '';
      return String(dateStr).startsWith(summaryDateStr);
    });

    // 3. Deterministic calculation
    const stats = calculateDailyStats(trades);

    // 4. Generate AI coaching review
    const aiReview = await generateAICoachReview(stats, {
      name: userName,
      timezone,
    });

    // Format human-readable date pill
    const dateObj = new Date(summaryDateStr);
    const dateOptions: Intl.DateTimeFormatOptions = {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC', // Keep consistent with YYYY-MM-DD string
    };
    const formattedDate = dateObj.toLocaleDateString('en-US', dateOptions);

    // 5. Render HTML template
    const { html, text, subject } = renderDailySummaryEmail({
      recipientName: userName,
      recipientEmail: userEmail,
      summaryDate: formattedDate,
      formattedDatePill: summaryDateStr,
      stats,
      ai: aiReview,
      dashboardUrl: process.env.VITE_APP_URL || 'https://dctechnologies.in',
      settingsUrl: `${process.env.VITE_APP_URL || 'https://dctechnologies.in'}/settings`,
      unsubscribeUrl: `${process.env.VITE_APP_URL || 'https://dctechnologies.in'}/settings`,
    });

    // 6. Send via Resend REST API
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: resendFromEmail,
        to: [userEmail],
        subject: isTest ? `[TEST] ${subject}` : subject,
        html,
        text,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      const errorDetail = resendData.message || resendData.error || JSON.stringify(resendData);
      console.error(`[DailySummary] Resend API error for user ${userId}:`, errorDetail);

      // Record failed delivery
      if (!isTest) {
        await supabase.from('daily_summary_deliveries').upsert(
          {
            user_id: userId,
            summary_date: summaryDateStr,
            sent_at: new Date().toISOString(),
            status: 'failed',
            error: errorDetail,
            stats_snapshot: stats,
          },
          { onConflict: 'user_id,summary_date' }
        );
      }

      return {
        success: false,
        status: 'failed',
        error: `Resend error: ${errorDetail}`,
        stats,
      };
    }

    const messageId = resendData.id || resendData.messageId;

    // 7. Record successful delivery
    if (!isTest) {
      await supabase.from('daily_summary_deliveries').upsert(
        {
          user_id: userId,
          summary_date: summaryDateStr,
          sent_at: new Date().toISOString(),
          status: 'sent',
          message_id: messageId,
          error: null,
          stats_snapshot: stats,
        },
        { onConflict: 'user_id,summary_date' }
      );
    }

    return {
      success: true,
      status: isTest ? 'test' : 'sent',
      messageId,
      stats,
    };
  } catch (err: any) {
    const errorMsg = err.message || String(err);
    console.error(`[DailySummary] Unexpected error for user ${userId}:`, errorMsg);

    if (!isTest) {
      try {
        await supabase.from('daily_summary_deliveries').upsert(
          {
            user_id: userId,
            summary_date: summaryDateStr,
            sent_at: new Date().toISOString(),
            status: 'failed',
            error: errorMsg,
          },
          { onConflict: 'user_id,summary_date' }
        );
      } catch (logErr) {
        console.error('[DailySummary] Failed logging failure to database:', logErr);
      }
    }

    return {
      success: false,
      status: 'failed',
      error: errorMsg,
    };
  }
}
