import React, { useState, useMemo } from "react";
import { TopBar } from "../lib/TopBar";
import { Plus, CheckCircle2, XCircle, TrendingUp, Building2, Edit2, Trash2 } from "lucide-react";
import { useAccounts, Account } from "../hooks/useAccounts";
import { useTrades } from "../hooks/useTrades";
import { AccountModal } from "../components/AccountModal";

export function Accounts() {
  const { accounts, addAccount, updateAccount, deleteAccount } = useAccounts();
  const { trades } = useTrades();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  const formatProfit = (val: number) => {
    const formatted = formatCurrency(Math.abs(val));
    return val >= 0 ? `+${formatted}` : `-${formatted}`;
  };

  const handleAddAccount = async (data: any) => {
    if (editingAccount) {
      await updateAccount(editingAccount.id, data);
    } else {
      await addAccount(data);
    }
    setIsModalOpen(false);
    setEditingAccount(null);
  };

  const openEditModal = (account: Account) => {
    setEditingAccount(account);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this account?")) {
      await deleteAccount(id);
    }
  };

  // Calculate dynamic account data
  const processedAccounts = useMemo(() => {
    return accounts.map(account => {
      const accountTrades = trades.filter(t => t.accountId === account.id);
      const totalPnl = accountTrades.reduce((sum, t) => sum + t.pnl, 0);
      const currentEquity = account.initialCapital + totalPnl;
      const isPositive = currentEquity >= account.initialCapital;
      
      // Simplified drawdown calculation for display purposes
      const maxEquity = Math.max(account.initialCapital, ...accountTrades.map((_, i) => 
        account.initialCapital + accountTrades.slice(0, i + 1).reduce((sum, t) => sum + t.pnl, 0)
      ));
      const currentDrawdown = maxEquity > 0 ? ((maxEquity - currentEquity) / maxEquity) * 100 : 0;

      return {
        ...account,
        currentEquity,
        isPositive,
        totalPnl,
        currentDrawdown: currentDrawdown.toFixed(1),
        dateClosed: account.dateClosed || (account.status !== 'ACTIVE' ? new Date(account.createdAt?.toMillis() || Date.now()).toLocaleDateString() : undefined)
      };
    });
  }, [accounts, trades]);

  const activeAccounts = processedAccounts.filter(a => a.status === 'ACTIVE');
  const accountHistory = processedAccounts.filter(a => a.status !== 'ACTIVE');

  const globalStats = useMemo(() => {
    const closedAccounts = processedAccounts.filter(a => a.status !== 'ACTIVE');
    const wins = closedAccounts.filter(a => a.status === 'SUCCESS').length;
    const losses = closedAccounts.filter(a => a.status === 'FAILED').length;
    const total = wins + losses;
    const winRate = total > 0 ? (wins / total) * 100 : 0;
    
    const totalFunding = processedAccounts.filter(a => a.status === 'SUCCESS' || a.status === 'ACTIVE')
                                          .reduce((sum, a) => sum + a.initialCapital, 0);

    return { winRate, wins, losses, totalFunding };
  }, [processedAccounts]);

  return (
    <div className="flex flex-col min-h-full pb-10">
      <TopBar 
        title="Accounts Management" 
        subtitle="Monitor and manage your prop firm evaluations and live accounts." 
        showSearch={true} 
      />
      
      <AccountModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingAccount(null); }} 
        onSubmit={handleAddAccount}
        initialData={editingAccount}
      />

      <div className="px-8 flex flex-col gap-8">
        {/* Active Accounts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          
          {activeAccounts.map((account) => (
            <div key={account.id} className="glass-card p-6 rounded-2xl flex flex-col relative overflow-hidden group">
              <div className="absolute right-0 top-0 opacity-5 pointer-events-none">
                <Building2 className="w-32 h-32 -mt-4 -mr-4" />
              </div>
              
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div>
                  <p className="text-[#3b82f6] text-xs font-bold tracking-wider mb-1 uppercase">{account.type}</p>
                  <h2 className="text-white text-2xl font-headline font-bold">{account.firm}</h2>
                  <h3 className="text-white text-xl font-headline">{account.name}</h3>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="bg-white/10 px-3 py-1 rounded-full border border-white/5">
                    <span className="text-white/70 text-xs font-mono">{account.badge}</span>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditModal(account)} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(account.id)} className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8 relative z-10">
                <div>
                  <p className="text-on-surface-variant text-xs mb-1">Initial Capital</p>
                  <p className="text-white font-mono font-bold text-lg">{formatCurrency(account.initialCapital)}</p>
                </div>
                <div>
                  <p className="text-on-surface-variant text-xs mb-1">Current Equity</p>
                  <p className={`font-mono font-bold text-lg ${account.isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatCurrency(account.currentEquity)}
                  </p>
                </div>
              </div>

              <div className="mt-auto relative z-10">
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-on-surface-variant">Current Drawdown</span>
                  <span className="text-white font-mono">
                    <span className={account.isPositive ? 'text-emerald-400' : 'text-rose-400'}>{account.currentDrawdown}%</span> / {account.maxDrawdown}%
                  </span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${account.isPositive ? 'bg-emerald-400' : 'bg-rose-400'}`} 
                    style={{ width: `${Math.min((parseFloat(account.currentDrawdown) / account.maxDrawdown) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Add New Account Card */}
          <button 
            onClick={() => { setEditingAccount(null); setIsModalOpen(true); }}
            className="glass-card p-6 rounded-2xl flex flex-col items-center justify-center gap-4 border-dashed border-2 border-white/10 hover:border-[#3b82f6]/50 hover:bg-[#3b82f6]/5 transition-all group min-h-[280px]"
          >
            <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-[#3b82f6]/20 transition-colors">
              <Plus className="w-6 h-6 text-white/50 group-hover:text-[#3b82f6] transition-colors" />
            </div>
            <div className="text-center">
              <h3 className="text-white font-headline font-bold text-lg mb-1">Add New Account</h3>
              <p className="text-on-surface-variant text-sm">Sync your broker or prop firm</p>
            </div>
          </button>
        </div>

        {/* Account History */}
        <div className="glass-card rounded-2xl flex flex-col overflow-hidden">
          <div className="p-6 flex justify-between items-center border-b border-white/5">
            <h3 className="font-headline text-xl text-white font-bold">Account History</h3>
            <button className="text-xs text-[#3b82f6] hover:text-[#2563eb] transition-colors font-bold tracking-wider uppercase">View Full Archive</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-xs text-on-surface-variant font-label uppercase bg-white/[0.02]">
                  <th className="px-6 py-4 font-bold tracking-wider">Account Name</th>
                  <th className="px-6 py-4 font-bold tracking-wider">Firm</th>
                  <th className="px-6 py-4 font-bold tracking-wider">Starting Balance</th>
                  <th className="px-6 py-4 font-bold tracking-wider">Result</th>
                  <th className="px-6 py-4 font-bold tracking-wider">Total Profit</th>
                  <th className="px-6 py-4 font-bold tracking-wider">Date Closed</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {accountHistory.length > 0 ? accountHistory.map((history) => (
                  <tr key={history.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        {history.status === 'SUCCESS' ? (
                          <CheckCircle2 className="w-4 h-4 text-[#3b82f6]" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-400" />
                        )}
                        <span className="font-bold text-white">{history.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-on-surface-variant">{history.firm}</td>
                    <td className="px-6 py-5 font-mono text-white font-bold">{formatCurrency(history.initialCapital)}</td>
                    <td className="px-6 py-5">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider ${
                        history.status === 'SUCCESS' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {history.status}
                      </span>
                    </td>
                    <td className={`px-6 py-5 font-mono font-bold ${history.totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatProfit(history.totalPnl)}
                    </td>
                    <td className="px-6 py-5 text-on-surface-variant text-sm flex justify-between items-center">
                      <span>{history.dateClosed || 'N/A'}</span>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditModal(history)} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(history.id)} className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-on-surface-variant">
                      No account history found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card p-6 rounded-2xl flex flex-col justify-between min-h-[160px]">
            <div className="flex justify-between items-end mb-6">
              <h3 className="font-headline text-lg text-white font-bold">Global Win Rate</h3>
              <span className="text-[#3b82f6] font-mono text-3xl font-bold">{globalStats.winRate.toFixed(1)}%</span>
            </div>
            <div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden mb-3">
                <div className="h-full bg-[#3b82f6] rounded-full" style={{ width: `${globalStats.winRate}%` }} />
              </div>
              <div className="flex justify-between text-xs text-on-surface-variant">
                <span>{globalStats.wins} Wins</span>
                <span>{globalStats.losses} Losses</span>
              </div>
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl flex flex-col justify-between min-h-[160px] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#3b82f6]/5 to-transparent pointer-events-none" />
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-headline text-lg text-white font-bold">Total Funding Secured</h3>
                <span className="text-emerald-400 font-mono text-3xl font-bold">{formatCurrency(globalStats.totalFunding)}</span>
              </div>
              <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold mt-4">
                <TrendingUp className="w-4 h-4" />
                <span>+12% from last month</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
