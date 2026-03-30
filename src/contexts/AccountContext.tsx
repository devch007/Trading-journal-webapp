import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useAccounts, Account } from '../hooks/useAccounts';
import { useTrades } from '../hooks/useTrades';

interface AccountContextType {
  accounts: Account[];
  loading: boolean;
  addAccount: (accountData: Omit<Account, 'id' | 'createdAt' | 'userId'>) => Promise<void>;
  updateAccount: (accountId: string, accountData: Partial<Omit<Account, 'id' | 'createdAt' | 'userId'>>) => Promise<void>;
  deleteAccount: (accountId: string) => Promise<void>;
  selectedAccountId: string | null;
  setSelectedAccountId: (id: string | null) => void;
  selectedAccount: Account | null;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const { accounts, loading, addAccount, updateAccount, deleteAccount } = useAccounts();
  const { trades } = useTrades();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  // Automatically select the first account if none is selected and accounts are available
  useEffect(() => {
    if (!loading && accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
    } else if (!loading && accounts.length === 0) {
      setSelectedAccountId(null);
    }
  }, [accounts, loading, selectedAccountId]);

  // Ensure selectedAccountId is still valid
  useEffect(() => {
    if (selectedAccountId && accounts.length > 0) {
      const exists = accounts.some(a => a.id === selectedAccountId);
      if (!exists) {
        setSelectedAccountId(accounts[0].id);
      }
    }
  }, [accounts, selectedAccountId]);

  const selectedAccount = accounts.find(a => a.id === selectedAccountId) || null;

  // Calculate dynamic account data for syncing
  const processedAccounts = useMemo(() => {
    return accounts.map(account => {
      const accountTrades = trades.filter(t => t.accountId === account.id);
      const totalPnl = accountTrades.reduce((sum, t) => sum + t.pnl, 0);
      const currentEquity = account.initialCapital + totalPnl;
      
      // Simplified drawdown calculation for display purposes
      const maxEquity = Math.max(account.initialCapital, ...accountTrades.map((_, i) => 
        account.initialCapital + accountTrades.slice(0, i + 1).reduce((sum, t) => sum + t.pnl, 0)
      ));
      const currentDrawdown = maxEquity > 0 ? ((maxEquity - currentEquity) / maxEquity) * 100 : 0;

      return {
        ...account,
        currentEquity,
        currentDrawdown: currentDrawdown.toFixed(1),
      };
    });
  }, [accounts, trades]);

  // Auto-sync account status and equity based on trades
  useEffect(() => {
    const syncAccountData = async () => {
      for (const processed of processedAccounts) {
        if (processed.status === 'ACTIVE') {
          const originalAccount = accounts.find(a => a.id === processed.id);
          if (!originalAccount) continue;

          const drawdownNum = parseFloat(processed.currentDrawdown);
          const hasBreached = drawdownNum >= processed.maxDrawdown || drawdownNum >= processed.dailyDrawdown;
          
          const updates: any = {};
          let needsUpdate = false;
          
          if (hasBreached) {
            updates.status = 'FAILED';
            updates.dateClosed = new Date().toLocaleDateString();
            needsUpdate = true;
          }
          
          if (Math.abs((originalAccount.currentEquity || originalAccount.initialCapital) - processed.currentEquity) > 0.01) {
            updates.currentEquity = processed.currentEquity;
            needsUpdate = true;
          }
          
          if (needsUpdate) {
            await updateAccount(processed.id, updates);
          }
        }
      }
    };
    
    if (processedAccounts.length > 0) {
      syncAccountData();
    }
  }, [processedAccounts, accounts, updateAccount]);

  return (
    <AccountContext.Provider value={{
      accounts,
      loading,
      addAccount,
      updateAccount,
      deleteAccount,
      selectedAccountId,
      setSelectedAccountId,
      selectedAccount
    }}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccountContext() {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error('useAccountContext must be used within an AccountProvider');
  }
  return context;
}
