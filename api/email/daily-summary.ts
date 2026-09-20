import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateUserFromHeader } from '../lib/supabaseServer';
import { dispatchDailySummaryForUser } from '../lib/resendClient';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(455).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    // 1. Authenticate user from Supabase session token
    const authHeader = req.headers.authorization;
    const { user, error: authError } = await authenticateUserFromHeader(authHeader);

    if (authError || !user) {
      return res.status(401).json({ error: authError || 'Unauthorized. Please log in.' });
    }

    const { date, timezone = 'Asia/Kolkata', isTest = true } = req.body || {};

    // Get summary date (default to today in user's timezone)
    let summaryDateStr = date;
    if (!summaryDateStr) {
      try {
        const formatter = new Intl.DateTimeFormat('en-CA', {
          timeZone: timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });
        summaryDateStr = formatter.format(new Date());
      } catch {
        summaryDateStr = new Date().toISOString().split('T')[0];
      }
    }

    const userName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Trader';
    const userEmail = user.email;

    if (!userEmail) {
      return res.status(400).json({ error: 'User does not have an email address associated.' });
    }

    // 2. Dispatch summary
    const result = await dispatchDailySummaryForUser({
      userId: user.id,
      userEmail,
      userName,
      summaryDateStr,
      timezone,
      isTest: Boolean(isTest),
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to dispatch email.',
        stats: result.stats,
      });
    }

    return res.status(200).json({
      success: true,
      message: isTest ? 'Test daily summary email dispatched successfully.' : 'Daily summary email dispatched successfully.',
      status: result.status,
      messageId: result.messageId,
      summaryDate: summaryDateStr,
      stats: result.stats,
    });
  } catch (err: any) {
    console.error('[API /api/email/daily-summary] Handler error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
