import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseServerClient } from '../lib/supabaseServer';
import { dispatchDailySummaryForUser } from '../lib/resendClient';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Validate Cron Secret if configured (Vercel automatic crons pass Authorization: Bearer <CRON_SECRET>)
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;

  // If CRON_SECRET is set in Vercel and auth header is provided, verify it matches
  if (cronSecret && authHeader && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized cron trigger.' });
  }

  const supabase = getSupabaseServerClient();
  const summaryResults: {
    totalEligible: number;
    successful: number;
    failed: number;
    skipped: number;
    details: any[];
  } = {
    totalEligible: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
    details: [],
  };

  try {
    // 2. Fetch all users who enabled daily summary
    const { data: activeSettings, error: settingsError } = await supabase
      .from('user_notification_settings')
      .select('user_id, daily_summary_enabled, daily_summary_time, timezone')
      .eq('daily_summary_enabled', true);

    if (settingsError) {
      console.error('[Cron DailySummary] Failed to query user notification settings:', settingsError);
      return res.status(500).json({ error: settingsError.message });
    }

    if (!activeSettings || activeSettings.length === 0) {
      return res.status(200).json({
        message: 'No users currently have daily summary enabled.',
        results: summaryResults,
      });
    }

    summaryResults.totalEligible = activeSettings.length;

    // 3. Process each user independently with error isolation
    for (const setting of activeSettings) {
      const { user_id, daily_summary_time = '21:00', timezone = 'Asia/Kolkata' } = setting;

      try {
        const now = new Date();

        // Format today's date in user's timezone
        const userDateStr = new Intl.DateTimeFormat('en-CA', {
          timeZone: timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(now);

        // Fetch user profile/auth email
        let userEmail = '';
        let userName = 'Trader';

        try {
          const { data: userData } = await supabase.auth.admin.getUserById(user_id);
          if (userData?.user?.email) {
            userEmail = userData.user.email;
            userName = userData.user.user_metadata?.full_name || userData.user.user_metadata?.name || userEmail.split('@')[0];
          }
        } catch (adminErr) {
          console.warn(`[Cron DailySummary] Admin getUserById failed for ${user_id}, checking profile tables:`, adminErr);
        }

        // Fallback: check profiles or users table if admin auth API didn't return email
        if (!userEmail) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name, name')
            .eq('id', user_id)
            .maybeSingle();

          if (profile?.email) {
            userEmail = profile.email;
            userName = profile.full_name || profile.name || userEmail.split('@')[0];
          }
        }

        if (!userEmail) {
          console.warn(`[Cron DailySummary] Could not find auth email for user ${user_id}`);
          summaryResults.failed++;
          summaryResults.details.push({ userId: user_id, status: 'failed', error: 'User email not found' });
          continue;
        }

        // Dispatch summary
        const result = await dispatchDailySummaryForUser({
          userId: user_id,
          userEmail,
          userName,
          summaryDateStr: userDateStr,
          timezone,
          isTest: false,
        });

        if (result.status === 'sent') {
          summaryResults.successful++;
        } else if (result.status === 'skipped') {
          summaryResults.skipped++;
        } else {
          summaryResults.failed++;
        }

        summaryResults.details.push({
          userId: user_id,
          email: userEmail,
          status: result.status,
          date: userDateStr,
          error: result.error,
        });
      } catch (userErr: any) {
        console.error(`[Cron DailySummary] Processing error for user ${user_id}:`, userErr);
        summaryResults.failed++;
        summaryResults.details.push({
          userId: user_id,
          status: 'failed',
          error: userErr.message || String(userErr),
        });
      }
    }

    return res.status(200).json({
      message: `Daily summary cron completed. Sent: ${summaryResults.successful}, Skipped: ${summaryResults.skipped}, Failed: ${summaryResults.failed}.`,
      results: summaryResults,
    });
  } catch (globalErr: any) {
    console.error('[Cron DailySummary] Global cron execution error:', globalErr);
    return res.status(500).json({ error: globalErr.message || 'Global cron error' });
  }
}
