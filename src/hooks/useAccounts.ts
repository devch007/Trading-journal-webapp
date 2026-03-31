import { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (!user) {
      setAccounts([]);
      setLoading(false);
      return;
    }

    const fetchAccounts = async () => {
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
    };

    fetchAccounts();

    // Subscribe to changes
    const channel = supabase
      .channel('accounts_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'accounts',
        filter: `userId=eq.${user.id}`
      }, () => {
        fetchAccounts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const addAccount = async (accountData: Omit<Account, 'id' | 'createdAt' | 'userId'>) => {
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
    } catch (error) {
      console.error('Error adding account:', error);
      throw error;
    }
  };

  const updateAccount = async (accountId: string, accountData: Partial<Omit<Account, 'id' | 'createdAt' | 'userId'>>) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('accounts')
        .update(accountData)
        .eq('id', accountId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error updating account:', error);
      throw error;
    }
  };

  const deleteAccount = async (accountId: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', accountId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  };

  return { accounts, loading, addAccount, updateAccount, deleteAccount };
}
