import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface TradingRule {
  id: string;
  name: string;
  type: 'max_trades_per_day' | 'max_loss_per_trade' | 'daily_loss_limit' | 'custom';
  value: number;
  unit: string; // e.g. "trades", "$", "%"
  enabled: boolean;
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  firm: string;
  type: string;
  badge: string;
  initialCapital: number;
  currentEquity?: number;
  status: 'ACTIVE' | 'SUCCESS' | 'FAILED';
  maxDrawdown: number;
  dailyDrawdown: number;
  commissionForex?: number;
  commissionMetals?: number;
  rules?: TradingRule[];
  createdAt: string;
  dateClosed?: string;
}

const ACCOUNTS_CACHE_KEY = 'tradex_accounts_cache_';

export function useAccounts() {
  const { user } = useAuth();
  
  // Instant retrieval from localStorage cache if available
  const [accounts, setAccounts] = useState<Account[]>(() => {
    if (typeof window !== 'undefined' && user?.id) {
      try {
        const cached = localStorage.getItem(`${ACCOUNTS_CACHE_KEY}${user.id}`);
        if (cached) return JSON.parse(cached);
      } catch (e) {
        // ignore parse error
      }
    }
    return [];
  });
  
  const [loading, setLoading] = useState(() => accounts.length === 0);

  const fetchAccounts = useCallback(async (isInitial = false) => {
    if (!user) return;
    
    // Only show loading spinner if we don't already have cached accounts
    if (isInitial && accounts.length === 0) {
      setLoading(true);
    }
    
    const { data, error } = await supabase
      .from('accounts')
      .select('id, userId, name, firm, type, badge, initialCapital, currentEquity, status, maxDrawdown, dailyDrawdown, commissionForex, commissionMetals, rules, createdAt, dateClosed')
      .eq('userId', user.id)
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('Error fetching accounts:', error);
    } else if (data) {
      setAccounts(data as Account[]);
      try {
        localStorage.setItem(`${ACCOUNTS_CACHE_KEY}${user.id}`, JSON.stringify(data));
      } catch (e) {
        // storage quota exceeded or disabled
      }
    }
    setLoading(false);
  }, [user, accounts.length]);

  useEffect(() => {
    if (!user) {
      setAccounts([]);
      setLoading(false);
      return;
    }

    // Try reading user cache if user changed
    try {
      const cached = localStorage.getItem(`${ACCOUNTS_CACHE_KEY}${user.id}`);
      if (cached) {
        setAccounts(JSON.parse(cached));
        setLoading(false);
      }
    } catch (e) {}

    fetchAccounts(true);

    // Subscribe to changes (wrapped in try-catch to prevent fatal React crashes during WS disconnects)
    let channel: any = null;
    try {
      const channelName = `accounts_changes_${user.id}_${Math.random().toString(36).substring(7)}`;
      channel = supabase
        .channel(channelName)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'accounts',
          filter: `userId=eq.${user.id}`
        }, () => {
          fetchAccounts();
        })
        .subscribe();
    } catch (err) {
      console.warn('Realtime subscription failed, falling back to manual fetch', err);
    }

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (e) {
          // ignore cleanup errors
        }
      }
    };
  }, [user]);

  const addAccount = useCallback(async (accountData: Omit<Account, 'id' | 'createdAt' | 'userId'>) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('accounts')
        .insert([{
          ...accountData,
          userId: user.id,
          createdAt: new Date().toISOString()
        }]);
      
      if (error) throw error;
      
      fetchAccounts();
    } catch (error) {
      console.error('Error adding account:', error);
      throw error;
    }
  }, [user, fetchAccounts]);

  const updateAccount = useCallback(async (accountId: string, accountData: Partial<Omit<Account, 'id' | 'createdAt' | 'userId'>>) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('accounts')
        .update(accountData)
        .eq('id', accountId);
      
      if (error) throw error;
      
      fetchAccounts();
    } catch (error) {
      console.error('Error updating account:', error);
      throw error;
    }
  }, [user, fetchAccounts]);

  const deleteAccount = useCallback(async (accountId: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', accountId);
      
      if (error) throw error;
      
      fetchAccounts();
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  }, [user, fetchAccounts]);

  return { accounts, loading, addAccount, updateAccount, deleteAccount };
}
