import React, { useState, useMemo } from 'react';
import { TopBar } from '../lib/TopBar';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useTrades } from '../hooks/useTrades';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';
import { 
  User, Mail, Phone, Globe, DollarSign, Edit2, Shield, Lock, 
  Smartphone, Bell, CreditCard, Download, Trash2, Check,
  TrendingUp, Activity, Target, ShieldCheck, CheckCircle2,
  AlertCircle, Cloud, LogOut, Zap, Clock, Key, CreditCard as CardIcon
} from 'lucide-react';
import { getTradeDate } from '../lib/timeUtils';

// --- Reusable UI Components ---

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${checked ? 'bg-primary' : 'bg-white/10'}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-[18px]' : 'translate-x-1'}`} />
    </button>
  );
}

function SectionCard({ title, icon: Icon, children, className = "" }: any) {
  return (
    <div className={`glass-card p-6 rounded-2xl border border-white/5 flex flex-col gap-5 ${className}`}>
      <div className="flex items-center gap-3 border-b border-white/5 pb-4">
        <div className="p-2 bg-primary/10 rounded-xl">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <h2 className="type-h2 text-white">{title}</h2>
      </div>
      <div className="flex flex-col gap-4">
        {children}
      </div>
    </div>
  );
}

function EditableField({ label, value, icon: Icon, type = "text" }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [val, setVal] = useState(value);

  return (
    <div className="flex flex-col gap-1.5 group">
      <span className="type-micro text-[#A7A7A7]">{label}</span>
      <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 group-hover:border-white/10 transition-colors">
        <div className="flex items-center gap-3 flex-1">
          <Icon className="w-4 h-4 text-[#6A6A6A]" />
          {isEditing ? (
            <input 
              type={type}
              value={val}
              onChange={(e) => setVal(e.target.value)}
              className="bg-transparent border-none outline-none text-white text-sm w-full font-medium"
              autoFocus
            />
          ) : (
            <span className="text-white text-sm font-medium">{val}</span>
          )}
        </div>
        <button 
          onClick={() => setIsEditing(!isEditing)}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-[#6A6A6A] hover:text-white"
        >
          {isEditing ? <Check className="w-4 h-4 text-[#1ED760]" /> : <Edit2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

function SettingRow({ icon: Icon, label, description, toggle, checked, onToggle, action }: any) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-4">
        <div className="p-2.5 bg-white/[0.03] rounded-xl border border-white/5">
          <Icon className="w-4 h-4 text-[#A7A7A7]" />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-white">{label}</span>
          <span className="text-[12px] text-[#A7A7A7]">{description}</span>
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

// --- Main Profile Page ---

export function Profile() {
  const { userProfile, user } = useAuth();
  const { trades } = useTrades();

  // Mock settings state
  const [settings, setSettings] = useState({
    twoFa: true,
    loginAlerts: true,
    tradeReminders: true,
    dailyJournal: true,
    pnlAlerts: false,
    emailNotifs: true,
  });

  const updateSetting = (key: string, val: boolean) => setSettings(p => ({ ...p, [key]: val }));

  // Calculate real stats from trades
  const stats = useMemo(() => {
    if (!trades.length) return { totalTrades: 0, winRate: 0, netPnl: 0, bestTrade: 0, worstTrade: 0, avgRR: 0 };
    
    const wins = trades.filter(t => t.isPositive);
    const winRate = (wins.length / trades.length) * 100;
    const netPnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const bestTrade = Math.max(...trades.map(t => t.pnl || 0));
    const worstTrade = Math.min(...trades.map(t => t.pnl || 0));
    
    // Rough Avg RR calculation
    const avgWin = wins.length ? wins.reduce((s, t) => s + (t.pnl || 0), 0) / wins.length : 0;
    const losses = trades.filter(t => !t.isPositive);
    const avgLoss = losses.length ? Math.abs(losses.reduce((s, t) => s + (t.pnl || 0), 0) / losses.length) : 0;
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

  // Equity Curve Data
  const equityData = useMemo(() => {
    if (!trades.length) return Array.from({ length: 10 }, (_, i) => ({ value: 10000 + (i * 100) }));
    
    // Stable sort by date ascending
    const sorted = [...trades].sort((a, b) => getTradeDate(a.date).getTime() - getTradeDate(b.date).getTime());
    let current = 10000;
    return [{ value: current }, ...sorted.map(t => {
      current += (t.pnl || 0);
      return { value: current };
    })];
  }, [trades]);

  return (
    <div className="flex flex-col min-h-full pb-10">
      <TopBar title="Profile" subtitle="Manage your account, settings and trading identity" showSearch={true} showAccountSelector={false} />
      
      <div className="px-4 md:px-8 flex flex-col gap-6 md:gap-8 max-w-[1600px] mx-auto w-full">
        
        {/* 1. HEADER SECTION */}
        <div className="glass-card rounded-3xl p-6 md:p-8 border border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 relative overflow-hidden group">
          {/* Background Glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-primary/20 transition-colors duration-700" />
          
          <div className="flex items-center gap-6 z-10">
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 p-0.5 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                <div className="w-full h-full bg-[#0d0d16] rounded-2xl flex items-center justify-center overflow-hidden relative group/avatar cursor-pointer">
                  <User className="w-10 h-10 text-white/50" />
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                    <Cloud className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-lg bg-surface border border-white/10 flex items-center justify-center shadow-lg cursor-pointer hover:bg-white/5 transition-colors">
                <Edit2 className="w-3.5 h-3.5 text-white" />
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Alex Carter</h1>
                <span className="px-2 py-0.5 rounded bg-primary/20 text-primary text-xs font-bold uppercase tracking-wider border border-primary/30">Pro</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-[#A7A7A7]">
                <span>@alexcarter_fx</span>
                <span>•</span>
                <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-[#1ED760]" /> Verified</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-medium text-white flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-yellow-500" /> Advanced Trader
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-medium text-white flex items-center gap-1.5">
                  <Target className="w-3 h-3 text-[#1ED760]" /> Funded
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-6 z-10 w-full md:w-auto overflow-x-auto no-scrollbar pb-2 md:pb-0">
            <div className="flex flex-col gap-1 min-w-[100px]">
              <span className="type-label">Total Trades</span>
              <span className="type-h1 tnum text-white">{stats.totalTrades}</span>
            </div>
            <div className="w-[1px] h-12 bg-white/10" />
            <div className="flex flex-col gap-1 min-w-[100px]">
              <span className="type-label">Win Rate</span>
              <span className="type-h1 tnum text-[#1ED760]">{stats.winRate.toFixed(1)}%</span>
            </div>
            <div className="w-[1px] h-12 bg-white/10" />
            <div className="flex flex-col gap-1 min-w-[100px]">
              <span className="type-label">Net P&L</span>
              <span className={`type-h1 tnum ${stats.netPnl >= 0 ? 'text-[#1ED760]' : 'text-[#E5534B]'}`}>
                {stats.netPnl >= 0 ? '+' : '-'}${Math.abs(stats.netPnl).toLocaleString(undefined, {minimumFractionDigits: 2})}
              </span>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
          
          {/* Left Column (Info, Settings) */}
          <div className="flex flex-col gap-6 md:gap-8 xl:col-span-1">
            
            {/* 2. PERSONAL INFO CARD */}
            <SectionCard title="Personal Information" icon={User}>
              <EditableField label="Full Name" value="Alex Carter" icon={User} />
              <div className="flex flex-col gap-1.5 group">
                <span className="type-micro text-[#A7A7A7]">Email Address</span>
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-[#6A6A6A]" />
                    <span className="text-white text-sm font-medium">{userProfile?.email || user?.email || 'alex@example.com'}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#1ED760]/10 text-[#1ED760] text-[10px] font-bold uppercase">Verified</span>
                </div>
              </div>
              <EditableField label="Phone Number" value="+1 (555) 019-2834" icon={Phone} />
              <EditableField label="Location / Timezone" value="New York, USA (EST)" icon={Globe} />
              <EditableField label="Preferred Currency" value="USD ($)" icon={DollarSign} />
            </SectionCard>

            {/* 6. SECURITY SETTINGS */}
            <SectionCard title="Security" icon={Shield}>
              <SettingRow 
                icon={Lock} 
                label="Change Password" 
                description="Update your account password" 
                action={<button className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-medium border border-white/10 transition-colors">Update</button>}
              />
              <SettingRow 
                icon={Smartphone} 
                label="Two-Factor Authentication" 
                description="Secure your account with 2FA" 
                toggle={true} checked={settings.twoFa} onToggle={(v: boolean) => updateSetting('twoFa', v)}
              />
              <SettingRow 
                icon={Activity} 
                label="Login Alerts" 
                description="Get notified of new logins" 
                toggle={true} checked={settings.loginAlerts} onToggle={(v: boolean) => updateSetting('loginAlerts', v)}
              />
              <div className="mt-2 p-3 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-[#F59E0B] mt-0.5 shrink-0" />
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-[#F59E0B]">Active Sessions</span>
                  <span className="text-[11px] text-[#F59E0B]/80">MacBook Pro (Mac OS) - New York, USA • Current session</span>
                </div>
              </div>
            </SectionCard>

            {/* 7. NOTIFICATIONS SETTINGS */}
            <SectionCard title="Notifications" icon={Bell}>
              <SettingRow 
                icon={Target} 
                label="Trade Reminders" 
                description="Alerts for open positions" 
                toggle={true} checked={settings.tradeReminders} onToggle={(v: boolean) => updateSetting('tradeReminders', v)}
              />
              <SettingRow 
                icon={Edit2} 
                label="Daily Journal Reminder" 
                description="Evening wrap-up prompt" 
                toggle={true} checked={settings.dailyJournal} onToggle={(v: boolean) => updateSetting('dailyJournal', v)}
              />
              <SettingRow 
                icon={TrendingUp} 
                label="P&L Threshold Alerts" 
                description="When daily limits are reached" 
                toggle={true} checked={settings.pnlAlerts} onToggle={(v: boolean) => updateSetting('pnlAlerts', v)}
              />
              <SettingRow 
                icon={Mail} 
                label="Email Notifications" 
                description="Receive weekly summaries" 
                toggle={true} checked={settings.emailNotifs} onToggle={(v: boolean) => updateSetting('emailNotifs', v)}
              />
            </SectionCard>

          </div>

          {/* Right Column (Trading, Performance, Data) */}
          <div className="flex flex-col gap-6 md:gap-8 xl:col-span-2">
            
            {/* 4. PERFORMANCE SNAPSHOT */}
            <SectionCard title="Performance Snapshot" icon={TrendingUp} className="overflow-hidden">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="flex flex-col gap-1 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="type-label">Win/Loss Ratio</span>
                  <span className="type-h2 text-white">{stats.winRate > 0 ? (stats.winRate / (100 - stats.winRate)).toFixed(2) : '0.00'}</span>
                </div>
                <div className="flex flex-col gap-1 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="type-label">Avg RR</span>
                  <span className="type-h2 text-white">1:{stats.avgRR.toFixed(2)}</span>
                </div>
                <div className="flex flex-col gap-1 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="type-label">Best Trade</span>
                  <span className="type-h2 text-[#1ED760]">+{stats.bestTrade.toFixed(2)}</span>
                </div>
                <div className="flex flex-col gap-1 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="type-label">Worst Trade</span>
                  <span className="type-h2 text-[#E5534B]">{stats.worstTrade.toFixed(2)}</span>
                </div>
              </div>

              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={equityData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorValueProf" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorValueProf)" 
                      isAnimationActive={false}
                    />
                    <YAxis domain={['auto', 'auto']} hide />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {/* 3. TRADING PROFILE CARD */}
              <SectionCard title="Trading Profile" icon={Target}>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <span className="type-label">Primary Markets</span>
                    <div className="flex flex-wrap gap-2">
                      {['Forex', 'Indices', 'Commodities'].map(m => (
                        <span key={m} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-white">{m}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="type-label">Preferred Session</span>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-xs font-medium text-primary">New York</span>
                      <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-white">London</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <EditableField label="Risk Per Trade" value="1.0%" icon={AlertCircle} />
                    <EditableField label="Base Account Size" value="$100,000" icon={DollarSign} />
                  </div>
                  <div className="flex flex-col gap-2 mt-2">
                    <span className="type-label">Strategy Tags</span>
                    <div className="flex flex-wrap gap-2">
                      {['SMC', 'Liquidity Sweeps', 'Swing'].map(s => (
                        <span key={s} className="px-2 py-1 rounded bg-[#8a4cfc]/10 border border-[#8a4cfc]/20 text-[11px] font-medium text-[#8a4cfc]">{s}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </SectionCard>

              {/* 5. GOALS & DISCIPLINE TRACKING */}
              <SectionCard title="Discipline & Goals" icon={ShieldCheck}>
                <div className="flex flex-col gap-5">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="flex flex-col gap-1">
                      <span className="type-label">Consistency Score</span>
                      <span className="text-2xl font-bold text-[#1ED760] tnum">86%</span>
                    </div>
                    <div className="w-12 h-12 rounded-full border-4 border-[#1ED760]/20 border-t-[#1ED760] flex items-center justify-center transform rotate-45">
                      <div className="w-8 h-8 rounded-full bg-[#1ED760]/10 transform -rotate-45 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-[#1ED760]" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-3">
                    <span className="type-label">Active Rules</span>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.01] border border-white/5 hover:bg-white/[0.03] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-[#1ED760]" />
                        <span className="text-sm text-white">Max Daily Loss Limit</span>
                      </div>
                      <span className="text-xs font-bold text-[#A7A7A7]">-$500</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.01] border border-white/5 hover:bg-white/[0.03] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-[#1ED760]" />
                        <span className="text-sm text-white">Max Trades Per Day</span>
                      </div>
                      <span className="text-xs font-bold text-[#A7A7A7]">3 Trades</span>
                    </div>
                  </div>
                </div>
              </SectionCard>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {/* 8. BILLING / SUBSCRIPTION */}
              <SectionCard title="Subscription & Billing" icon={CardIcon}>
                <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-indigo-500/10 border border-primary/20 flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-bold text-white flex items-center gap-2">Pro Plan <span className="px-1.5 py-0.5 rounded text-[9px] bg-primary text-white uppercase tracking-wider">Active</span></span>
                    <span className="text-xs text-[#A7A7A7]">$29.00 / month</span>
                  </div>
                  <button className="px-4 py-2 rounded-lg bg-white text-black text-xs font-bold hover:bg-gray-200 transition-colors">Manage</button>
                </div>
                
                <div className="flex flex-col gap-3 mt-2">
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.02]">
                    <div className="p-2 bg-white/10 rounded-lg">
                      <CardIcon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex flex-col flex-1">
                      <span className="text-sm text-white font-medium">Visa ending in 4242</span>
                      <span className="text-xs text-[#A7A7A7]">Expires 12/28</span>
                    </div>
                    <button className="text-xs text-primary hover:text-primary/80 font-medium">Edit</button>
                  </div>
                  <button className="text-xs text-[#A7A7A7] hover:text-white transition-colors text-left flex items-center gap-2 py-2">
                    <Clock className="w-3.5 h-3.5" /> View Billing History
                  </button>
                </div>
              </SectionCard>

              {/* 9. DATA & EXPORT */}
              <SectionCard title="Data & Privacy" icon={Key}>
                <div className="flex flex-col gap-4">
                  <button className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10 transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                        <Download className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-sm text-white font-medium">Export Journal Data</span>
                        <span className="text-xs text-[#A7A7A7]">Download CSV of all trades</span>
                      </div>
                    </div>
                  </button>
                  
                  <button className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10 transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/5 rounded-lg group-hover:bg-white/10 transition-colors">
                        <Cloud className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-sm text-white font-medium">Backup & Restore</span>
                        <span className="text-xs text-[#A7A7A7]">Manage manual backups</span>
                      </div>
                    </div>
                  </button>

                  <div className="w-full h-[1px] bg-white/5 my-1" />
                  
                  <button className="flex items-center justify-between p-3 rounded-xl border border-[#E5534B]/20 bg-[#E5534B]/5 hover:bg-[#E5534B]/10 transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#E5534B]/10 rounded-lg">
                        <Trash2 className="w-4 h-4 text-[#E5534B]" />
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-sm text-[#E5534B] font-medium">Delete Account</span>
                        <span className="text-xs text-[#E5534B]/70">Permanently remove all data</span>
                      </div>
                    </div>
                  </button>
                </div>
              </SectionCard>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
