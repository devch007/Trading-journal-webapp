import React, { useState, useMemo, useEffect } from 'react';
import { TopBar } from '../lib/TopBar';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useAccountContext } from '../contexts/AccountContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  Palette, Globe, BarChart2, Bell, Shield, Download, Trash2,
  Check, ChevronRight, Monitor, Zap, BookOpen, DollarSign,
  SlidersHorizontal, Clock, RefreshCw, AlertTriangle, Eye,
  Keyboard, Database, FileText, LogOut, Info, Sun, Moon,
  Mail, Send
} from 'lucide-react';

// ─── Reusable Components ─────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-all focus:outline-none cursor-pointer ${
        checked ? 'bg-blue-600' : 'bg-gray-200 dark:bg-neutral-700'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-xs ${
          checked ? 'translate-x-[18px]' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function SettingsSection({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-[#16181f] rounded-3xl border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-neutral-800">
        <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
          <Icon className="w-4 h-4" />
        </div>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h2>
      </div>
      <div className="flex flex-col divide-y divide-gray-100 dark:divide-neutral-800/60">
        {children}
      </div>
    </div>
  );
}

function SettingRow({ icon: Icon, label, description, toggle, checked, onToggle, action, danger = false }: any) {
  return (
    <div className={`flex items-center justify-between px-6 py-3.5 transition-colors ${danger ? 'hover:bg-rose-50/50 dark:hover:bg-rose-950/20' : 'hover:bg-gray-50/60 dark:hover:bg-neutral-800/30'}`}>
      <div className="flex items-center gap-3.5">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${danger ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40' : 'bg-gray-50 text-gray-500 dark:bg-neutral-800 dark:text-gray-400'}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex flex-col">
          <span className={`text-xs font-semibold ${danger ? 'text-rose-600 dark:text-rose-400' : 'text-gray-900 dark:text-white'}`}>{label}</span>
          <span className="text-[11px] text-gray-400 font-normal">{description}</span>
        </div>
      </div>
      {toggle !== undefined ? (
        <Toggle checked={checked} onChange={onToggle} />
      ) : action ? (
        action
      ) : (
        <ChevronRight className="w-4 h-4 text-gray-400" />
      )}
    </div>
  );
}

function SelectRow({ icon: Icon, label, description, options, value, onChange }: any) {
  return (
    <div className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50/60 dark:hover:bg-neutral-800/30 transition-colors">
      <div className="flex items-center gap-3.5">
        <div className="w-8 h-8 rounded-xl bg-gray-50 text-gray-500 dark:bg-neutral-800 dark:text-gray-400 flex items-center justify-center">
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-gray-900 dark:text-white">{label}</span>
          <span className="text-[11px] text-gray-400 font-normal">{description}</span>
        </div>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-gray-50 dark:bg-neutral-800 border border-gray-200/90 dark:border-neutral-700 text-gray-900 dark:text-white text-xs font-medium rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-black/10 dark:focus:ring-white/20 transition-all cursor-pointer shadow-2xs"
      >
        {options.map((opt: any) => (
          <option key={opt.value} value={opt.value} className="bg-white dark:bg-[#16181f] text-gray-900 dark:text-white">{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────

const PREFS_KEY = 'app_preferences';

const DEFAULT_PREFS = {
  theme: 'dark',
  defaultCurrency: 'USD',
  dateFormat: 'MM/DD/YYYY',
  timezone: 'auto',
  defaultRR: '2',
  lotSizeDisplay: 'lots',
  chartStyle: 'area',
  equityPeriod: 'ALL',
  showPnlOnDash: true,
  compactMode: false,
  animationsEnabled: true,
  soundEffects: false,
  autoSave: true,
  confirmBeforeDelete: true,
  journalReminder: true,
  weeklyReport: true,
  breakoutAlerts: false,
  sessionAlerts: true,
};

export function Settings() {
  const { user, logout } = useAuth();
  const { selectedAccount, accounts } = useAccountContext();
  const navigate = useNavigate();

  const [prefs, setPrefs] = useState<Record<string, any>>(() => {
    try {
      const saved = localStorage.getItem(PREFS_KEY);
      return saved ? { ...DEFAULT_PREFS, ...JSON.parse(saved) } : DEFAULT_PREFS;
    } catch { return DEFAULT_PREFS; }
  });

  const [savedAnim, setSavedAnim] = useState(false);

  // Email Notification Settings State
  const [emailSettings, setEmailSettings] = useState({
    daily_summary_enabled: true,
    daily_summary_time: '21:00',
    timezone: 'Asia/Kolkata',
    weekly_summary_enabled: true,
    monthly_summary_enabled: false,
    ai_insights_enabled: true,
  });

  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testCooldown, setTestCooldown] = useState(0);
  const [testStatusMsg, setTestStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Fetch saved notification settings from Supabase
  useEffect(() => {
    if (!user?.id) return;
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('user_notification_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (data && !error) {
          setEmailSettings({
            daily_summary_enabled: data.daily_summary_enabled ?? true,
            daily_summary_time: data.daily_summary_time ?? '21:00',
            timezone: data.timezone ?? 'Asia/Kolkata',
            weekly_summary_enabled: data.weekly_summary_enabled ?? true,
            monthly_summary_enabled: data.monthly_summary_enabled ?? false,
            ai_insights_enabled: data.ai_insights_enabled ?? true,
          });
        }
      } catch (err) {
        console.warn('Could not load user notification settings:', err);
      }
    };
    fetchSettings();
  }, [user?.id]);

  // Handle cooldown timer
  useEffect(() => {
    if (testCooldown <= 0) return;
    const timer = setInterval(() => {
      setTestCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [testCooldown]);

  const updateEmailSetting = async (key: string, val: any) => {
    const updated = { ...emailSettings, [key]: val };
    setEmailSettings(updated);
    setSavedAnim(true);
    setTimeout(() => setSavedAnim(false), 1800);

    if (user?.id) {
      try {
        await supabase.from('user_notification_settings').upsert(
          {
            user_id: user.id,
            ...updated,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
      } catch (err) {
        console.error('Failed saving notification settings to Supabase:', err);
      }
    }
  };

  const handleSendTestEmail = async () => {
    if (isSendingTest || testCooldown > 0) return;
    setIsSendingTest(true);
    setTestStatusMsg(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('Please sign in to send a test summary email.');
      }

      const response = await fetch('/api/email/daily-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          timezone: emailSettings.timezone,
          isTest: true,
        }),
      });

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        throw new Error(resData.error || 'Failed to dispatch test email.');
      }

      setTestStatusMsg({
        type: 'success',
        text: `Preview email sent successfully to ${user?.email || 'your email'}!`,
      });
      setTestCooldown(60); // 60s cooldown
    } catch (err: any) {
      setTestStatusMsg({
        type: 'error',
        text: err.message || 'Error triggering test email. Check server configuration.',
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const update = (key: string, val: any) => {
    const updated = { ...prefs, [key]: val };
    setPrefs(updated);
    localStorage.setItem(PREFS_KEY, JSON.stringify(updated));
    setSavedAnim(true);
    setTimeout(() => setSavedAnim(false), 1800);
  };

  const accountSummary = useMemo(() => {
    const active = accounts?.filter(a => a.status === 'ACTIVE') ?? [];
    const totalCapital = active.reduce((s, a) => s + (a.currentEquity ?? a.initialCapital ?? 0), 0);
    return { activeCount: active.length, totalCapital };
  }, [accounts]);

  const handleExportData = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      user: user?.email,
      preferences: prefs,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `tradex_settings_${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleResetPrefs = () => {
    setPrefs(DEFAULT_PREFS);
    localStorage.removeItem(PREFS_KEY);
    setSavedAnim(true);
    setTimeout(() => setSavedAnim(false), 1800);
  };

  return (
    <div className="flex flex-col min-h-full pb-10">
      <TopBar title="Settings & Preferences" subtitle="Application configurations and platform preferences" showSearch={true} />

      <div className="p-6 md:p-8 space-y-7 max-w-[1600px] w-full mx-auto">

        {/* Header banner */}
        <div className="bg-white dark:bg-[#16181f] rounded-3xl p-6 border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30">
              <SlidersHorizontal className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 dark:text-white">Workspace Preferences</h1>
              <p className="text-xs text-gray-400 mt-0.5 font-normal">
                {accountSummary.activeCount} active account{accountSummary.activeCount !== 1 ? 's' : ''} •{' '}
                ${accountSummary.totalCapital.toLocaleString(undefined, { minimumFractionDigits: 2 })} total equity
              </p>
            </div>
          </div>
          <motion.div
            animate={{ opacity: savedAnim ? 1 : 0, scale: savedAnim ? 1 : 0.9 }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 text-xs font-semibold"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Saved</span>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* ── Appearance ── */}
          <SettingsSection title="Appearance & Layout" icon={Palette}>
            <SelectRow
              icon={prefs.theme === 'dark' ? Moon : Sun}
              label="Color Theme"
              description="Choose your preferred visual theme"
              options={[{ value: 'dark', label: '🌑 Dark' }, { value: 'light', label: '☀️ Light' }, { value: 'system', label: '🖥 System' }]}
              value={prefs.theme}
              onChange={(v: string) => update('theme', v)}
            />
            <SettingRow
              icon={Monitor}
              label="Compact Mode"
              description="Reduce padding and spacing for more data density"
              toggle
              checked={prefs.compactMode}
              onToggle={(v: boolean) => update('compactMode', v)}
            />
            <SettingRow
              icon={Zap}
              label="Animations"
              description="Enable micro-animations and transitions"
              toggle
              checked={prefs.animationsEnabled}
              onToggle={(v: boolean) => update('animationsEnabled', v)}
            />
          </SettingsSection>

          {/* ── Trading Defaults ── */}
          <SettingsSection title="Trading Defaults" icon={BarChart2}>
            <SelectRow
              icon={DollarSign}
              label="Default Currency"
              description="Primary currency for P&L display"
              options={[
                { value: 'USD', label: '🇺🇸 USD – US Dollar' },
                { value: 'EUR', label: '🇪🇺 EUR – Euro' },
                { value: 'GBP', label: '🇬🇧 GBP – British Pound' },
                { value: 'INR', label: '🇮🇳 INR – Indian Rupee' },
                { value: 'JPY', label: '🇯🇵 JPY – Japanese Yen' },
              ]}
              value={prefs.defaultCurrency}
              onChange={(v: string) => update('defaultCurrency', v)}
            />
            <SelectRow
              icon={SlidersHorizontal}
              label="Default R:R Ratio"
              description="Pre-fill risk/reward when logging trades"
              options={[
                { value: '1', label: '1:1' }, { value: '1.5', label: '1:1.5' },
                { value: '2', label: '1:2' }, { value: '3', label: '1:3' },
              ]}
              value={prefs.defaultRR}
              onChange={(v: string) => update('defaultRR', v)}
            />
            <SelectRow
              icon={BarChart2}
              label="Lot Size Display"
              description="How position sizes are displayed"
              options={[{ value: 'lots', label: 'Lots (e.g. 1.00)' }, { value: 'units', label: 'Units (e.g. 100,000)' }]}
              value={prefs.lotSizeDisplay}
              onChange={(v: string) => update('lotSizeDisplay', v)}
            />
            <SelectRow
              icon={Eye}
              label="Default Chart Style"
              description="Equity curve display style on Dashboard"
              options={[{ value: 'area', label: 'Area Chart' }, { value: 'line', label: 'Line Chart' }, { value: 'bar', label: 'Bar Chart' }]}
              value={prefs.chartStyle}
              onChange={(v: string) => update('chartStyle', v)}
            />
          </SettingsSection>

          {/* ── Regional & Format ── */}
          <SettingsSection title="Regional & Format" icon={Globe}>
            <SelectRow
              icon={Clock}
              label="Timezone"
              description="Used for session tagging and date display"
              options={[
                { value: 'auto', label: '🌐 Auto-detect' },
                { value: 'UTC', label: 'UTC +0:00' },
                { value: 'America/New_York', label: 'EST – New York' },
                { value: 'Europe/London', label: 'GMT – London' },
                { value: 'Asia/Tokyo', label: 'JST – Tokyo' },
                { value: 'Asia/Kolkata', label: 'IST – India' },
              ]}
              value={prefs.timezone}
              onChange={(v: string) => update('timezone', v)}
            />
            <SelectRow
              icon={FileText}
              label="Date Format"
              description="How dates are displayed across the app"
              options={[
                { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US)' },
                { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (EU)' },
                { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)' },
              ]}
              value={prefs.dateFormat}
              onChange={(v: string) => update('dateFormat', v)}
            />
          </SettingsSection>

          {/* ── Journal & Workflow ── */}
          <SettingsSection title="Journal & Workflow" icon={BookOpen}>
            <SettingRow
              icon={RefreshCw}
              label="Auto-Save Journal Entries"
              description="Save changes while typing (no need to hit save)"
              toggle
              checked={prefs.autoSave}
              onToggle={(v: boolean) => update('autoSave', v)}
            />
            <SettingRow
              icon={AlertTriangle}
              label="Confirm Before Deleting"
              description="Show a confirmation dialog before deleting trades"
              toggle
              checked={prefs.confirmBeforeDelete}
              onToggle={(v: boolean) => update('confirmBeforeDelete', v)}
            />
            <SettingRow
              icon={Zap}
              label="Sound Effects"
              description="Play sounds on trade log and alerts"
              toggle
              checked={prefs.soundEffects}
              onToggle={(v: boolean) => update('soundEffects', v)}
            />
          </SettingsSection>

          {/* ── Email Notifications (Daily Trading Summary) ── */}
          <SettingsSection title="Email Notifications & Reports" icon={Mail}>
            <SettingRow
              icon={Mail}
              label="Daily Trading Summary"
              description="Receive an automated evening review with P&L, stats, and AI coaching"
              toggle
              checked={emailSettings.daily_summary_enabled}
              onToggle={(v: boolean) => updateEmailSetting('daily_summary_enabled', v)}
            />
            <SelectRow
              icon={Clock}
              label="Send at Time"
              description="Local time your daily summary email will be prepared and sent"
              options={[
                { value: '18:00', label: '06:00 PM' },
                { value: '19:00', label: '07:00 PM' },
                { value: '20:00', label: '08:00 PM' },
                { value: '21:00', label: '09:00 PM (Default)' },
                { value: '22:00', label: '10:00 PM' },
                { value: '23:00', label: '11:00 PM' },
              ]}
              value={emailSettings.daily_summary_time}
              onChange={(v: string) => updateEmailSetting('daily_summary_time', v)}
            />
            <SelectRow
              icon={Globe}
              label="Summary Timezone"
              description="Used to calculate your daily trade window and delivery schedule"
              options={[
                { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST +5:30)' },
                { value: 'UTC', label: 'UTC (+0:00)' },
                { value: 'America/New_York', label: 'America/New_York (EST/EDT)' },
                { value: 'America/Chicago', label: 'America/Chicago (CST/CDT)' },
                { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT)' },
                { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
                { value: 'Europe/Frankfurt', label: 'Europe/Frankfurt (CET/CEST)' },
                { value: 'Asia/Dubai', label: 'Asia/Dubai (GST +4:00)' },
                { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT +8:00)' },
                { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST +9:00)' },
                { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST/AEDT)' },
              ]}
              value={emailSettings.timezone}
              onChange={(v: string) => updateEmailSetting('timezone', v)}
            />
            <SettingRow
              icon={FileText}
              label="Weekly Review"
              description="Receive weekly performance synthesis on Sundays"
              toggle
              checked={emailSettings.weekly_summary_enabled}
              onToggle={(v: boolean) => updateEmailSetting('weekly_summary_enabled', v)}
            />
            <SettingRow
              icon={BarChart2}
              label="Monthly Review"
              description="Monthly equity curve and setup breakdown report"
              toggle
              checked={emailSettings.monthly_summary_enabled}
              onToggle={(v: boolean) => updateEmailSetting('monthly_summary_enabled', v)}
            />
            <SettingRow
              icon={Zap}
              label="AI Insights in Summary"
              description="Include qualitative AI coach recommendations and pattern detection"
              toggle
              checked={emailSettings.ai_insights_enabled}
              onToggle={(v: boolean) => updateEmailSetting('ai_insights_enabled', v)}
            />
            <div className="px-6 py-4 bg-gray-50/50 dark:bg-neutral-900/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-gray-900 dark:text-white">
                  Delivery Destination
                </span>
                <span className="text-[11px] text-gray-500 font-mono">
                  {user?.email || 'No email attached'}
                </span>
              </div>
              <button
                onClick={handleSendTestEmail}
                disabled={isSendingTest || testCooldown > 0}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isSendingTest || testCooldown > 0
                    ? 'bg-gray-100 dark:bg-neutral-800 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                }`}
              >
                {isSendingTest ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending Preview...</span>
                  </>
                ) : testCooldown > 0 ? (
                  <span>Cooldown ({testCooldown}s)</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Test Email</span>
                  </>
                )}
              </button>
            </div>
            {testStatusMsg && (
              <div
                className={`px-6 py-2.5 text-xs font-medium flex items-center gap-2 ${
                  testStatusMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                }`}
              >
                <Info className="w-3.5 h-3.5" />
                <span>{testStatusMsg.text}</span>
              </div>
            )}
          </SettingsSection>

          {/* ── In-App Notifications ── */}
          <SettingsSection title="In-App Notifications & Alerts" icon={Bell}>
            <SettingRow
              icon={BookOpen}
              label="Daily Journal Reminder"
              description="Evening in-app prompt to log and review trades"
              toggle
              checked={prefs.journalReminder}
              onToggle={(v: boolean) => update('journalReminder', v)}
            />
            <SettingRow
              icon={Bell}
              label="Session Open Alerts"
              description="Notify when London / NY sessions open"
              toggle
              checked={prefs.sessionAlerts}
              onToggle={(v: boolean) => update('sessionAlerts', v)}
            />
            <SettingRow
              icon={BarChart2}
              label="Breakout / Key Level Alerts"
              description="Price threshold alerts from watchlist"
              toggle
              checked={prefs.breakoutAlerts}
              onToggle={(v: boolean) => update('breakoutAlerts', v)}
            />
          </SettingsSection>

          {/* ── Dashboard Display ── */}
          <SettingsSection title="Dashboard Display" icon={Monitor}>
            <SettingRow
              icon={DollarSign}
              label="Show P&L on Dashboard"
              description="Display real-time P&L in the main stats bar"
              toggle
              checked={prefs.showPnlOnDash}
              onToggle={(v: boolean) => update('showPnlOnDash', v)}
            />
            <SelectRow
              icon={BarChart2}
              label="Default Equity Period"
              description="Period shown on the equity chart by default"
              options={[
                { value: '1D', label: 'Today (1D)' },
                { value: '1W', label: 'This Week (1W)' },
                { value: '1M', label: 'This Month (1M)' },
                { value: 'ALL', label: 'All Time' },
              ]}
              value={prefs.equityPeriod}
              onChange={(v: string) => update('equityPeriod', v)}
            />
          </SettingsSection>

          {/* ── Keyboard Shortcuts ── */}
          <SettingsSection title="Keyboard Shortcuts" icon={Keyboard}>
            {[
              { keys: ['⌘', 'K'], action: 'Open Command Palette' },
              { keys: ['⌘', 'N'], action: 'Log New Trade' },
              { keys: ['⌘', 'J'], action: 'Open Journal' },
              { keys: ['⌘', 'D'], action: 'Go to Dashboard' },
            ].map(({ keys, action }) => (
              <div key={action} className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50/60 dark:hover:bg-neutral-800/30 transition-colors">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{action}</span>
                <div className="flex items-center gap-1">
                  {keys.map(k => (
                    <kbd key={k} className="px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 text-[11px] font-mono text-gray-800 dark:text-gray-200 font-semibold">{k}</kbd>
                  ))}
                </div>
              </div>
            ))}
          </SettingsSection>

          {/* ── Data & Privacy ── */}
          <SettingsSection title="Data & Privacy" icon={Database}>
            <SettingRow
              icon={Download}
              label="Export Preferences"
              description="Download your settings as a JSON backup"
              action={
                <button
                  onClick={handleExportData}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 text-xs font-semibold transition-all hover:bg-blue-100"
                >
                  Export
                </button>
              }
            />
            <SettingRow
              icon={RefreshCw}
              label="Reset All Preferences"
              description="Restore all settings to their default values"
              action={
                <button
                  onClick={handleResetPrefs}
                  className="px-3.5 py-1.5 rounded-xl bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-gray-300 text-xs font-semibold transition-all hover:bg-gray-200"
                >
                  Reset
                </button>
              }
            />
            <SettingRow
              icon={Info}
              label="About TradeX Journal"
              description="Version 2.0.0 — Platform by DC Technologies"
              action={<span className="text-[11px] font-bold text-gray-400">v2.0.0</span>}
            />
          </SettingsSection>

          {/* ── Danger Zone ── */}
          <SettingsSection title="Danger Zone" icon={AlertTriangle}>
            <SettingRow
              icon={LogOut}
              label="Sign Out"
              description="Log out of your account on this device"
              danger
              action={
                <button
                  onClick={() => logout()}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 text-xs font-semibold transition-all"
                >
                  Sign Out
                </button>
              }
            />
            <SettingRow
              icon={Trash2}
              label="Delete All Trade Data"
              description="Permanently erase all trades across all accounts"
              danger
              action={
                <button className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 text-xs font-semibold transition-all">
                  Delete
                </button>
              }
            />
          </SettingsSection>

        </div>
      </div>
    </div>
  );
}
