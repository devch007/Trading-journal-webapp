import React, { useState, useMemo } from 'react';
import { TopBar } from '../lib/TopBar';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useTrades } from '../hooks/useTrades';
import { useAccountContext } from '../contexts/AccountContext';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';
import { 
  User, Mail, Phone, Globe, DollarSign, Edit2, Shield, Lock, 
  Smartphone, Bell, CreditCard, Download, Trash2, Check,
  TrendingUp, Activity, Target, ShieldCheck, CheckCircle2,
  AlertCircle, Cloud, LogOut, Zap, Clock, Key, CreditCard as CardIcon
} from 'lucide-react';
import { getTradeDate } from '../lib/timeUtils';
import { cn } from '../lib/utils';

// --- Reusable UI Components ---

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
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

function SectionCard({ title, icon: Icon, children, className = "" }: any) {
  return (
    <div className={`bg-white dark:bg-[#16181f] p-6 rounded-3xl border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs flex flex-col gap-5 ${className}`}>
      <div className="flex items-center gap-3 border-b border-gray-100 dark:border-neutral-800 pb-4">
        <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
          <Icon className="w-4 h-4" />
        </div>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h2>
      </div>
      <div className="flex flex-col gap-4">
        {children}
      </div>
    </div>
  );
}

function EditableField({ label, value, icon: Icon, type = "text", onChange }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [val, setVal] = useState(value);

  return (
    <div className="flex flex-col gap-1.5 group">
      <span className="text-[11px] font-medium text-gray-400">{label}</span>
      <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-neutral-800/60 border border-gray-100 dark:border-neutral-700">
        <div className="flex items-center gap-3 flex-1">
          <Icon className="w-4 h-4 text-gray-400" />
          {isEditing ? (
            <input 
              type={type}
              value={val}
              onChange={(e) => setVal(e.target.value)}
              className="bg-transparent border-none outline-none text-gray-900 dark:text-white text-xs w-full font-semibold"
              autoFocus
            />
          ) : (
            <span className="text-gray-900 dark:text-white text-xs font-semibold">{val}</span>
          )}
        </div>
        <button 
          onClick={() => {
            if (isEditing && onChange) onChange(val);
            setIsEditing(!isEditing);
          }}
          className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-neutral-700 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          {isEditing ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Edit2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

function SettingRow({ icon: Icon, label, description, toggle, checked, onToggle, action }: any) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-3.5">
        <div className="w-8 h-8 rounded-xl bg-gray-50 dark:bg-neutral-800 flex items-center justify-center text-gray-500 dark:text-gray-400">
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-gray-900 dark:text-white">{label}</span>
          <span className="text-[11px] text-gray-400 font-normal">{description}</span>
        </div>
      </div>
      {toggle ? (
        <Toggle checked={checked} onChange={onToggle} />
      ) : (
        action
      )}
    </div>
  );
}

export function Profile() {
  const { userProfile, user } = useAuth();
  const { trades: allTrades } = useTrades();
  const { selectedAccount, selectedAccountId } = useAccountContext();

  const trades = useMemo(() => {
    if (!selectedAccountId) return allTrades;
    return allTrades.filter(t => t.accountId === selectedAccountId);
  }, [allTrades, selectedAccountId]);

  const [profileData, setProfileData] = useState(() => {
    const saved = localStorage.getItem('user_profile_data');
    return saved ? JSON.parse(saved) : {
      fullName: 'Dev Chaudhary',
      phone: '+1 (555) 019-2831',
      location: 'New York, USA (EST)',
      currency: 'USD ($)',
      riskPerTrade: '1.0%'
    };
  });

  const updateProfileData = (key: string, value: string) => {
    const updated = { ...profileData, [key]: value };
    setProfileData(updated);
    localStorage.setItem('user_profile_data', JSON.stringify(updated));
  };

  const [settings, setSettings] = useState({
    twoFa: true,
    loginAlerts: true,
    tradeReminders: true,
    dailyJournal: true,
    pnlAlerts: false,
    emailNotifs: true,
  });

  const updateSetting = (key: string, val: boolean) => setSettings(p => ({ ...p, [key]: val }));

  const stats = useMemo(() => {
    if (!trades.length) return { totalTrades: 0, winRate: 0, netPnl: 0, bestTrade: 0, worstTrade: 0, avgRR: 0 };
    
    const wins = trades.filter(t => t.isPositive);
    const winRate = (wins.length / trades.length) * 100;
    const netPnl = trades.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);
    const bestTrade = Math.max(...trades.map(t => Number(t.pnl) || 0));
    const worstTrade = Math.min(...trades.map(t => Number(t.pnl) || 0));
    
    const avgWin = wins.length ? wins.reduce((s, t) => s + (Number(t.pnl) || 0), 0) / wins.length : 0;
    const losses = trades.filter(t => !t.isPositive);
    const avgLoss = losses.length ? Math.abs(losses.reduce((s, t) => s + (Number(t.pnl) || 0), 0) / losses.length) : 0;
    const avgRR = avgLoss === 0 ? avgWin : avgWin / avgLoss;

    return {
      totalTrades: trades.length,
      winRate,
      netPnl,
      bestTrade,
      worstTrade,
      avgRR
    };
  }, [trades]);

  const consistencyScore = useMemo(() => {
    if (!trades.length) return 85;
    const days = new Set(trades.map(t => getTradeDate(t.date).toDateString()));
    let positiveDays = 0;
    days.forEach(d => {
      const dayPnl = trades.filter(t => getTradeDate(t.date).toDateString() === d).reduce((s, t) => s + (Number(t.pnl) || 0), 0);
      if (dayPnl > 0) positiveDays++;
    });
    return Math.round((positiveDays / days.size) * 100);
  }, [trades]);

  return (
    <div className="flex flex-col min-h-full pb-10">
      <TopBar title="User Profile & Identity" subtitle="Manage your account, trading parameters, and subscription" showSearch={true} showAccountSelector={false} />
      
      <div className="p-6 md:p-8 space-y-7 max-w-[1600px] w-full mx-auto">
        
        {/* 1. HEADER SECTION */}
        <div className="bg-white dark:bg-[#16181f] rounded-3xl p-6 md:p-8 border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-3xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 shadow-xs text-2xl font-bold">
              {profileData.fullName.charAt(0)}
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{profileData.fullName}</h1>
                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 text-[10px] font-bold uppercase">PRO TRADER</span>
              </div>
              <p className="text-xs text-gray-400 font-normal">
                {userProfile?.email || user?.email || 'devchaudhary@example.com'} · Verified Identity
              </p>
            </div>
          </div>

          <div className="flex gap-6 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 border-gray-100 dark:border-neutral-800">
            <div className="flex flex-col">
              <span className="text-[11px] font-medium text-gray-400">Total Trades</span>
              <span className="text-xl font-bold tabular-nums text-gray-900 dark:text-white">{stats.totalTrades}</span>
            </div>
            <div className="w-px h-10 bg-gray-200 dark:bg-neutral-800" />
            <div className="flex flex-col">
              <span className="text-[11px] font-medium text-gray-400">Win Rate</span>
              <span className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{stats.winRate.toFixed(1)}%</span>
            </div>
            <div className="w-px h-10 bg-gray-200 dark:bg-neutral-800" />
            <div className="flex flex-col">
              <span className="text-[11px] font-medium text-gray-400">Net Result</span>
              <span className={cn("text-xl font-bold tabular-nums", stats.netPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500')}>
                {stats.netPnl >= 0 ? '+' : '-'}${Math.abs(stats.netPnl).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-7">
          
          {/* Left Column (5 COLS) */}
          <div className="xl:col-span-5 space-y-6">
            <SectionCard title="Personal Information" icon={User}>
              <EditableField label="Full Name" value={profileData.fullName} icon={User} onChange={(val: string) => updateProfileData('fullName', val)} />
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-gray-400">Email Address</span>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-neutral-800/60 border border-gray-100 dark:border-neutral-700">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900 dark:text-white text-xs font-semibold">{userProfile?.email || user?.email || 'devchaudhary@example.com'}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 text-[10px] font-bold">Verified</span>
                </div>
              </div>
              <EditableField label="Phone Number" value={profileData.phone} icon={Phone} onChange={(val: string) => updateProfileData('phone', val)} />
              <EditableField label="Location / Timezone" value={profileData.location} icon={Globe} onChange={(val: string) => updateProfileData('location', val)} />
              <EditableField label="Preferred Currency" value={profileData.currency} icon={DollarSign} onChange={(val: string) => updateProfileData('currency', val)} />
            </SectionCard>

            <SectionCard title="Security & Authentication" icon={Shield}>
              <SettingRow 
                icon={Lock} 
                label="Account Password" 
                description="Managed securely via Supabase Auth" 
                action={<button className="px-3 py-1.5 rounded-xl bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-gray-300 text-xs font-semibold">Update</button>}
              />
              <SettingRow 
                icon={Smartphone} 
                label="Two-Factor Authentication" 
                description="Secure session with OTP authentication" 
                toggle={true} checked={settings.twoFa} onToggle={(v: boolean) => updateSetting('twoFa', v)}
              />
              <SettingRow 
                icon={Activity} 
                label="Login Activity Alerts" 
                description="Email notifications for new logins" 
                toggle={true} checked={settings.loginAlerts} onToggle={(v: boolean) => updateSetting('loginAlerts', v)}
              />
            </SectionCard>
          </div>

          {/* Right Column (7 COLS) */}
          <div className="xl:col-span-7 space-y-6">
            <SectionCard title="Trading Identity & Discipline" icon={ShieldCheck}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-neutral-800/50 p-4 rounded-2xl border border-gray-100 dark:border-neutral-800 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-medium text-gray-400">Consistency Score</p>
                    <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">{consistencyScore}%</p>
                  </div>
                  <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                </div>
                <div className="bg-gray-50 dark:bg-neutral-800/50 p-4 rounded-2xl border border-gray-100 dark:border-neutral-800 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-medium text-gray-400">Active Capital Rule</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">Max 1.0% Risk / Trade</p>
                  </div>
                  <Target className="w-7 h-7 text-blue-500" />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <EditableField label="Default Risk Per Trade" value={profileData.riskPerTrade} icon={AlertCircle} onChange={(val: string) => updateProfileData('riskPerTrade', val)} />
                <EditableField label="Active Portfolio Base" value={selectedAccount ? `$${selectedAccount.initialCapital.toLocaleString()}` : '$100,000'} icon={DollarSign} />
              </div>
            </SectionCard>

            <SectionCard title="Subscription & Plan" icon={CardIcon}>
              <div className="p-5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    Pro Trader Annual Plan
                    <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[9px] font-bold uppercase">Active</span>
                  </span>
                  <span className="text-xs text-gray-400 mt-0.5 block">$29.00 / month · Renews Oct 2026</span>
                </div>
                <button className="px-4 py-2 rounded-2xl bg-[#111827] dark:bg-white text-white dark:text-gray-900 text-xs font-semibold shadow-xs">
                  Manage Plan
                </button>
              </div>
            </SectionCard>
          </div>

        </div>
      </div>
    </div>
  );
}
