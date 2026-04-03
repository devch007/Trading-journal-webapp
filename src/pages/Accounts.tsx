import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { TopBar } from "../lib/TopBar";
import { Plus, CheckCircle2, XCircle, TrendingUp, Building2, Edit2, Trash2, Archive, RotateCcw, Eye } from "lucide-react";
import { useAccounts, Account } from "../hooks/useAccounts";
import { useTrades } from "../hooks/useTrades";
import { AccountModal } from "../components/AccountModal";
import { useAccountContext } from "../contexts/AccountContext";

export function Accounts() {
  const navigate = useNavigate();
  const { accounts, loading, addAccount, updateAccount, deleteAccount, setSelectedAccountId } = useAccountContext();
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
    // Using a simpler confirmation or just performing the action for now to avoid iframe issues
    await deleteAccount(id);
  };

  const handleArchive = async (id: string, status: 'SUCCESS' | 'FAILED') => {
    const dateClosed = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
    await updateAccount(id, { status, dateClosed });
  };

  const handleRestore = async (id: string) => {
    await updateAccount(id, { status: 'ACTIVE', dateClosed: undefined });
  };

  const handleViewTrades = (id: string) => {
    setSelectedAccountId(id);
    navigate("/trades");
  };

  // Calculate dynamic account data
  const processedAccounts = useMemo(() => {
    return (accounts || []).map(account => {
      const accountTrades = (trades || []).filter(t => t.accountId === account.id);
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
            <div 
              key={account.id} 
              className="glass-card p-6 rounded-2xl flex flex-col relative overflow-hidden group cursor-pointer hover:bg-white/[0.02] transition-colors"
              onClick={() => handleViewTrades(account.id)}
            >
              <div className="absolute right-0 top-0 opacity-5 pointer-events-none">
                <Building2 className="w-32 h-32 -mt-4 -mr-4" />
              </div>
              
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div>
                  <p className="type-micro text-primary mb-1">{account.type}</p>
                  <h2 className="text-white type-h1">{account.firm}</h2>
                  <h3 className="text-white type-h2">{account.name}</h3>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="bg-white/10 px-3 py-1 rounded-full border border-white/5">
                    <span className="text-white/70 type-micro">{account.badge}</span>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleArchive(account.id, 'SUCCESS');
                      }} 
                      className="p-1.5 bg-[#1ED760]/10 hover:bg-[#1ED760]/20 text-[#1ED760] rounded-lg transition-colors"
                      title="Mark as Success"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleArchive(account.id, 'FAILED');
                      }} 
                      className="p-1.5 bg-[#E5534B]/10 hover:bg-[#E5534B]/20 text-[#E5534B] rounded-lg transition-colors"
                      title="Mark as Failed"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewTrades(account.id);
                      }} 
                      className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                      title="View Trades"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(account);
                      }} 
                      className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors" 
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(account.id);
                      }} 
                      className="p-1.5 bg-[#E5534B]/10 hover:bg-[#E5534B]/20 text-[#E5534B] rounded-lg transition-colors" 
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8 relative z-10">
                <div>
                  <p className="type-label mb-1">Initial Capital</p>
                  <p className="text-white tnum font-bold text-lg">{formatCurrency(account.initialCapital)}</p>
                </div>
                <div>
                  <p className="type-label mb-1">Current Equity</p>
                  <p className={`tnum font-bold text-lg ${account.isPositive ? 'text-[#1ED760]' : 'text-[#E5534B]'}`}>
                    {formatCurrency(account.currentEquity)}
                  </p>
                </div>
              </div>

              <div className="mt-auto relative z-10">
                <div className="flex justify-between text-xs mb-2">
                  <span className="type-label text-[11px]">Current Drawdown</span>
                  <span className="text-white tnum text-[12px]">
                    <span className={account.isPositive ? 'text-[#1ED760]' : 'text-[#E5534B]'}>{account.currentDrawdown}%</span> / {account.maxDrawdown}%
                  </span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${account.isPositive ? 'bg-[#1ED760]' : 'bg-[#E5534B]'}`} 
                    style={{ width: `${Math.min((parseFloat(account.currentDrawdown) / account.maxDrawdown) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Add New Account Card */}
          <button 
            onClick={() => { setEditingAccount(null); setIsModalOpen(true); }}
            className="glass-card p-6 rounded-2xl flex flex-col items-center justify-center gap-4 border-dashed border-2 border-white/10 hover:border-primary/50 hover:bg-primary/5 transition-all group min-h-[280px]"
          >
            <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Plus className="w-6 h-6 text-white/50 group-hover:text-primary transition-colors" />
            </div>
            <div className="text-center">
              <h3 className="text-white type-h2 text-lg mb-1">Add New Account</h3>
              <p className="type-body">Sync your broker or prop firm</p>
            </div>
          </button>
        </div>

        {/* Account History */}
        <div className="glass-card rounded-2xl flex flex-col overflow-hidden">
          <div className="p-6 flex justify-between items-center border-b border-white/5">
            <h3 className="type-h1 text-white">Account History</h3>
            <button className="type-micro text-primary hover:text-primary/80 transition-colors">View Full Archive</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="type-label text-[11px] bg-white/[0.02]">
                  <th className="px-6 py-4">Account Name</th>
                  <th className="px-6 py-4">Firm</th>
                  <th className="px-6 py-4">Starting Balance</th>
                  <th className="px-6 py-4">Result</th>
                  <th className="px-6 py-4">Total Profit</th>
                  <th className="px-6 py-4">Date Closed</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {accountHistory.length > 0 ? accountHistory.map((history) => (
                  <tr 
                    key={history.id} 
                    className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group cursor-pointer"
                    onClick={() => handleViewTrades(history.id)}
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        {history.status === 'SUCCESS' ? (
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                        ) : (
                          <XCircle className="w-4 h-4 text-[#E5534B]" />
                        )}
                        <span className="type-h2 text-[14px] text-white">{history.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 type-body text-[13px]">{history.firm}</td>
                    <td className="px-6 py-5 tnum text-white font-bold text-[14px]">{formatCurrency(history.initialCapital)}</td>
                    <td className="px-6 py-5">
                      <span className={`px-3 py-1 rounded-full type-micro text-[11px] ${
                        history.status === 'SUCCESS' 
                          ? 'bg-[#1ED760]/10 text-[#1ED760] border border-[#1ED760]/20' 
                          : 'bg-[#E5534B]/10 text-[#E5534B] border border-[#E5534B]/20'
                      }`}>
                        {history.status}
                      </span>
                    </td>
                    <td className={`px-6 py-5 tnum font-bold text-[14px] ${history.totalPnl >= 0 ? 'text-[#1ED760]' : 'text-[#E5534B]'}`}>
                      {formatProfit(history.totalPnl)}
                    </td>
                    <td className="px-6 py-5 type-body text-[13px]">
                      <div className="flex justify-between items-center">
                        <span>{history.dateClosed || 'N/A'}</span>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewTrades(history.id);
                            }} 
                            className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                            title="View Trades"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRestore(history.id);
                            }} 
                            className="p-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors"
                            title="Restore to Active"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(history);
                            }} 
                            className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors" 
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(history.id);
                            }} 
                            className="p-1.5 bg-[#E5534B]/10 hover:bg-[#E5534B]/20 text-[#E5534B] rounded-lg transition-colors" 
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
              <h3 className="type-h2 text-white">Global Win Rate</h3>
              <span className="type-display text-primary tnum">{globalStats.winRate.toFixed(1)}%</span>
            </div>
            <div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden mb-3">
                <div className="h-full bg-primary rounded-full" style={{ width: `${globalStats.winRate}%` }} />
              </div>
              <div className="flex justify-between type-label text-[11px]">
                <span>{globalStats.wins} Wins</span>
                <span>{globalStats.losses} Losses</span>
              </div>
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl flex flex-col justify-between min-h-[160px] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-2">
                <h3 className="type-h2 text-white">Total Funding Secured</h3>
                <span className="type-display text-[#1ED760] tnum">{formatCurrency(globalStats.totalFunding)}</span>
              </div>
              <div className="flex items-center gap-1 text-[#1ED760] type-micro mt-4">
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
