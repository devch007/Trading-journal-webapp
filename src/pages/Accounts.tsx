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
        dateClosed: account.dateClosed || (account.status !== 'ACTIVE' ? new Date(account.createdAt || Date.now()).toLocaleDateString() : undefined)
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
        title="Accounts & Challenges" 
        subtitle="Manage and monitor funded, challenge, and personal accounts"
        showSearch={true}
        actionButton={
          <button 
            onClick={() => { setEditingAccount(null); setIsModalOpen(true); }}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Account</span>
          </button>
        }
      />
      
      <AccountModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingAccount(null); }} 
        onSubmit={handleAddAccount}
        initialData={editingAccount}
      />

      <div className="p-6 md:p-8 space-y-7 max-w-[1600px] w-full mx-auto">
        {/* Active Accounts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          
          {activeAccounts.map((account) => (
            <div 
              key={account.id} 
              className="bg-white dark:bg-[#16181f] p-6 rounded-3xl border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs flex flex-col justify-between relative overflow-hidden group cursor-pointer hover:shadow-md transition-all duration-300 min-h-[260px]"
              onClick={() => handleViewTrades(account.id)}
            >
              <div className="flex justify-between items-start mb-5 relative z-10">
                <div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[10px] font-semibold mb-2">
                    {account.type}
                  </span>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{account.firm}</h2>
                  <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">{account.name}</h3>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="bg-gray-100 dark:bg-neutral-800 px-3 py-1 rounded-full border border-gray-200/80 dark:border-neutral-700">
                    <span className="text-gray-700 dark:text-gray-300 text-[11px] font-medium">{account.badge}</span>
                  </div>
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleArchive(account.id, 'SUCCESS');
                      }} 
                      className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg transition-colors"
                      title="Mark as Success"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleArchive(account.id, 'FAILED');
                      }} 
                      className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors"
                      title="Mark as Failed"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewTrades(account.id);
                      }} 
                      className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 dark:text-gray-300 transition-colors"
                      title="View Trades"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(account);
                      }} 
                      className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 dark:text-gray-300 transition-colors" 
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(account.id);
                      }} 
                      className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors" 
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 my-auto pt-2 border-t border-gray-100 dark:border-neutral-800">
                <div>
                  <p className="text-[11px] font-medium text-gray-400">Initial Capital</p>
                  <p className="text-gray-900 dark:text-white tabular-nums font-bold text-base mt-0.5">{formatCurrency(account.initialCapital)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-gray-400">Current Equity</p>
                  <p className={`tabular-nums font-bold text-base mt-0.5 ${account.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                    {formatCurrency(account.currentEquity)}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-neutral-800">
                <div className="flex justify-between text-xs mb-1.5 font-medium">
                  <span className="text-gray-400 text-[11px]">Current Drawdown</span>
                  <span className="text-gray-800 dark:text-gray-200 tabular-nums text-[11px]">
                    <span className={account.isPositive ? 'text-emerald-600' : 'text-rose-500 font-bold'}>{account.currentDrawdown}%</span> / {account.maxDrawdown}%
                  </span>
                </div>
                <div className="h-2 w-full bg-gray-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${account.isPositive ? 'bg-emerald-500' : 'bg-rose-500'}`} 
                    style={{ width: `${Math.min((parseFloat(account.currentDrawdown) / account.maxDrawdown) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Add New Account Card */}
          <button 
            onClick={() => { setEditingAccount(null); setIsModalOpen(true); }}
            className="bg-white dark:bg-[#16181f] p-6 rounded-3xl border-2 border-dashed border-gray-200 dark:border-neutral-700/80 hover:border-blue-500/60 hover:bg-blue-50/10 dark:hover:bg-blue-950/10 transition-all group min-h-[260px] flex flex-col items-center justify-center gap-3.5 cursor-pointer shadow-2xs"
          >
            <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-neutral-800 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all shadow-2xs">
              <Plus className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-white transition-colors" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Add New Account</h3>
              <p className="text-xs font-normal text-gray-400 mt-0.5">Sync your broker or prop firm challenge</p>
            </div>
          </button>
        </div>

        {/* Account History */}
        <div className="bg-white dark:bg-[#16181f] rounded-3xl border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs overflow-hidden">
          <div className="p-6 md:p-7 flex justify-between items-center border-b border-gray-100 dark:border-neutral-800">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Account History</h3>
              <p className="text-xs text-gray-400 mt-0.5">Archived evaluations and completed challenges</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-800/30">
                  <th className="px-6 py-3.5">Account Name</th>
                  <th className="px-6 py-3.5">Firm</th>
                  <th className="px-6 py-3.5">Starting Balance</th>
                  <th className="px-6 py-3.5">Result</th>
                  <th className="px-6 py-3.5">Total Profit</th>
                  <th className="px-6 py-3.5">Date Closed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-neutral-800/40 text-xs">
                {accountHistory.length > 0 ? accountHistory.map((history) => (
                  <tr 
                    key={history.id} 
                    className="hover:bg-gray-50/70 dark:hover:bg-neutral-800/40 transition-colors group cursor-pointer"
                    onClick={() => handleViewTrades(history.id)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {history.status === 'SUCCESS' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-500" />
                        )}
                        <span className="font-semibold text-gray-900 dark:text-white">{history.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{history.firm}</td>
                    <td className="px-6 py-4 tabular-nums text-gray-900 dark:text-white font-bold">{formatCurrency(history.initialCapital)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                        history.status === 'SUCCESS' 
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' 
                          : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                      }`}>
                        {history.status}
                      </span>
                    </td>
                    <td className={`px-6 py-4 tabular-nums font-bold ${history.totalPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                      {formatProfit(history.totalPnl)}
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400 font-normal">
                      <div className="flex justify-between items-center">
                        <span>{history.dateClosed || 'N/A'}</span>
                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRestore(history.id);
                            }} 
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                            title="Restore to Active"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(history.id);
                            }} 
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors" 
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
                    <td colSpan={6} className="px-6 py-10 text-center text-gray-400">
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
          <div className="bg-white dark:bg-[#16181f] p-6 md:p-7 rounded-3xl border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs flex flex-col justify-between min-h-[160px]">
            <div className="flex justify-between items-end mb-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Global Evaluation Win Rate</h3>
                <p className="text-xs text-gray-400 mt-0.5">Success rate across all past accounts</p>
              </div>
              <span className="text-3xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{globalStats.winRate.toFixed(1)}%</span>
            </div>
            <div>
              <div className="h-2.5 w-full bg-gray-100 dark:bg-neutral-800 rounded-full overflow-hidden mb-2.5">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${globalStats.winRate}%` }} />
              </div>
              <div className="flex justify-between text-xs font-medium text-gray-400">
                <span>{globalStats.wins} Wins</span>
                <span>{globalStats.losses} Losses</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#16181f] p-6 md:p-7 rounded-3xl border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs flex flex-col justify-between min-h-[160px]">
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Total Funding Secured</h3>
              <p className="text-xs text-gray-400 mt-0.5">Aggregate funded capital under management</p>
            </div>
            <div className="flex items-baseline justify-between pt-3">
              <span className="text-3xl font-bold tabular-nums text-gray-900 dark:text-white">{formatCurrency(globalStats.totalFunding)}</span>
              <div className="flex items-center gap-1 text-emerald-600 text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>+12% active capital</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
