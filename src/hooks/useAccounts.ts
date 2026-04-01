import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

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
  createdAt: string;
  dateClosed?: string;
}

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchAccounts = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('userId', user.id)
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('Error fetching accounts:', error);
    } else {
      setAccounts(data as Account[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setAccounts([]);
      setLoading(false);
      return;
    }

    fetchAccounts();

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
