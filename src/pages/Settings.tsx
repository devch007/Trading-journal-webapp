import React, { useState, useMemo } from 'react';
import { TopBar } from '../lib/TopBar';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useAccountContext } from '../contexts/AccountContext';
import { useNavigate } from 'react-router-dom';
import {
  Palette, Globe, BarChart2, Bell, Shield, Download, Trash2,
  Check, ChevronRight, Monitor, Zap, BookOpen, DollarSign,
  SlidersHorizontal, Clock, RefreshCw, AlertTriangle, Eye,
  Keyboard, Database, FileText, LogOut, Info, Sun, Moon
} from 'lucide-react';

// ─── Reusable Components ─────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-all focus:outline-none ${checked ? 'bg-primary shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-white/10'}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow ${checked ? 'translate-x-[18px]' : 'translate-x-1'}`} />
    </button>
  );
}

function SettingsSection({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="glass-card rounded-2xl border border-white/5 overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5 bg-white/[0.01]">
        <div className="p-2 bg-primary/10 rounded-xl">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <h2 className="type-h2 text-white">{title}</h2>
      </div>
      <div className="flex flex-col divide-y divide-white/[0.04]">
        {children}
      </div>
    </div>
  );
}

function SettingRow({ icon: Icon, label, description, toggle, checked, onToggle, action, danger = false }: any) {
  return (
    <div className={`flex items-center justify-between px-6 py-4 transition-colors ${danger ? 'hover:bg-[#E5534B]/5' : 'hover:bg-white/[0.02]'}`}>
      <div className="flex items-center gap-4">
        <div className={`p-2.5 rounded-xl border ${danger ? 'bg-[#E5534B]/10 border-[#E5534B]/20' : 'bg-white/[0.03] border-white/5'}`}>
          <Icon className={`w-4 h-4 ${danger ? 'text-[#E5534B]' : 'text-[#A7A7A7]'}`} />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className={`text-sm font-medium ${danger ? 'text-[#E5534B]' : 'text-white'}`}>{label}</span>
          <span className="text-[12px] text-[#6A6A6A]">{description}</span>
        </div>
      </div>
      {toggle !== undefined ? (
        <Toggle checked={checked} onChange={onToggle} />
      ) : action ? (
        action
      ) : (
        <ChevronRight className="w-4 h-4 text-[#6A6A6A]" />
      )}
    </div>
  );
}

function SelectRow({ icon: Icon, label, description, options, value, onChange }: any) {
  return (
    <div className="flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors">
      <div className="flex items-center gap-4">
        <div className="p-2.5 bg-white/[0.03] rounded-xl border border-white/5">
          <Icon className="w-4 h-4 text-[#A7A7A7]" />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-white">{label}</span>
          <span className="text-[12px] text-[#6A6A6A]">{description}</span>
        </div>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-white/5 border border-white/10 text-white text-xs font-medium rounded-lg px-3 py-1.5 focus:outline-none focus:border-primary/50 transition-colors cursor-pointer"
      >
        {options.map((opt: any) => (
          <option key={opt.value} value={opt.value} className="bg-[#0d0d16]">{opt.label}</option>
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

  const update = (key: string, val: any) => {
    const updated = { ...prefs, [key]: val };
    setPrefs(updated);
    localStorage.setItem(PREFS_KEY, JSON.stringify(updated));
    setSavedAnim(true);
    setTimeout(() => setSavedAnim(false), 1800);
  };

  // Account summary stats
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
      <TopBar title="Settings" subtitle="Application preferences" showSearch={true} />

      <div className="px-4 md:px-8 flex flex-col gap-6 max-w-[1200px] mx-auto w-full">

        {/* Header banner */}
        <div className="glass-card rounded-2xl p-6 border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
          <div className="flex items-center gap-4 z-10">
            <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
              <SlidersHorizontal className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="type-h1 text-white text-xl">App Preferences</h1>
              <p className="type-body text-sm mt-0.5">
                {accountSummary.activeCount} active account{accountSummary.activeCount !== 1 ? 's' : ''} •{' '}
                ${accountSummary.totalCapital.toLocaleString(undefined, { minimumFractionDigits: 2 })} total equity
              </p>
            </div>
          </div>
          {/* Auto-save indicator */}
          <motion.div
            animate={{ opacity: savedAnim ? 1 : 0, scale: savedAnim ? 1 : 0.9 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1ED760]/10 border border-[#1ED760]/20 z-10"
          >
            <Check className="w-3.5 h-3.5 text-[#1ED760]" />
            <span className="text-xs font-medium text-[#1ED760]">Saved</span>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* ── Appearance ── */}
          <SettingsSection title="Appearance" icon={Palette}>
            <SelectRow
              icon={prefs.theme === 'dark' ? Moon : Sun}
              label="Color Theme"
              description="Choose your preferred visual theme"
              options={[{ value: 'dark', label: '🌑 Dark (Default)' }, { value: 'light', label: '☀️ Light' }, { value: 'system', label: '🖥 System' }]}
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

          {/* ── Notifications ── */}
          <SettingsSection title="Notifications & Alerts" icon={Bell}>
            <SettingRow
              icon={BookOpen}
              label="Daily Journal Reminder"
              description="Evening prompt to log and review trades"
              toggle
              checked={prefs.journalReminder}
              onToggle={(v: boolean) => update('journalReminder', v)}
            />
            <SettingRow
              icon={FileText}
              label="Weekly Performance Report"
              description="Receive a weekly P&L and stats summary"
              toggle
              checked={prefs.weeklyReport}
              onToggle={(v: boolean) => update('weeklyReport', v)}
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
              <div key={action} className="flex items-center justify-between px-6 py-3.5 hover:bg-white/[0.02] transition-colors">
                <span className="text-sm text-[#A7A7A7]">{action}</span>
                <div className="flex items-center gap-1">
                  {keys.map(k => (
                    <kbd key={k} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px] font-mono text-white">{k}</kbd>
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
                  className="px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium border border-primary/20 transition-colors"
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
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-medium border border-white/10 transition-colors"
                >
                  Reset
                </button>
              }
            />
            <SettingRow
              icon={Info}
              label="About TradeX Journal"
              description="Version 1.0.0 — Platform by DC Technologies"
              action={<span className="type-micro text-[#6A6A6A]">v1.0.0</span>}
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
                  className="px-3 py-1.5 rounded-lg bg-[#E5534B]/10 hover:bg-[#E5534B]/20 text-[#E5534B] text-xs font-medium border border-[#E5534B]/20 transition-colors"
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
                <button className="px-3 py-1.5 rounded-lg bg-[#E5534B]/10 hover:bg-[#E5534B]/20 text-[#E5534B] text-xs font-medium border border-[#E5534B]/20 transition-colors">
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
