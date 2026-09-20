-- Migration: 20260920_daily_summary_and_notifications.sql
-- Description: Creates user notification settings and delivery logs for daily trading summary emails.

-- 1. Create user_notification_settings table
CREATE TABLE IF NOT EXISTS public.user_notification_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    daily_summary_enabled BOOLEAN NOT NULL DEFAULT true,
    daily_summary_time TEXT NOT NULL DEFAULT '21:00',
    timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    weekly_summary_enabled BOOLEAN NOT NULL DEFAULT true,
    monthly_summary_enabled BOOLEAN NOT NULL DEFAULT false,
    ai_insights_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for cron job querying enabled users
CREATE INDEX IF NOT EXISTS idx_user_notif_enabled ON public.user_notification_settings(daily_summary_enabled);

-- Enable RLS on user_notification_settings
ALTER TABLE public.user_notification_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own settings
CREATE POLICY "Users can view own notification settings"
    ON public.user_notification_settings
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can update their own settings
CREATE POLICY "Users can update own notification settings"
    ON public.user_notification_settings
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own settings
CREATE POLICY "Users can insert own notification settings"
    ON public.user_notification_settings
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 2. Create daily_summary_deliveries table for deduplication & audit trail
CREATE TABLE IF NOT EXISTS public.daily_summary_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    summary_date DATE NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'skipped', 'test')),
    message_id TEXT,
    error TEXT,
    stats_snapshot JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Enforce deduplication: strictly one non-test email per user per date
    CONSTRAINT unique_user_daily_summary UNIQUE (user_id, summary_date)
);

-- Indexes for delivery lookups
CREATE INDEX IF NOT EXISTS idx_daily_summary_user_date ON public.daily_summary_deliveries(user_id, summary_date);
CREATE INDEX IF NOT EXISTS idx_daily_summary_status ON public.daily_summary_deliveries(status);

-- Enable RLS on daily_summary_deliveries
ALTER TABLE public.daily_summary_deliveries ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own delivery history
CREATE POLICY "Users can view own delivery logs"
    ON public.daily_summary_deliveries
    FOR SELECT
    USING (auth.uid() = user_id);

-- Service role will have full access for cron jobs and serverless functions.
