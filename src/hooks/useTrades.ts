import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface Trade {
  id: string;
  userId: string;
  accountId?: string;
  date: string;
  symbol: string;
  action: string;
  size: string;
  result: string;
  isPositive: boolean;
  pnl: number;
  createdAt: string;
  entry?: string;
  exit?: string;
  duration?: string;
  session?: 'Asian' | 'London' | 'NY' | 'Else';
  confidence?: 'High' | 'Medium' | 'Low';
  tag?: string;
  // Journaling fields
  strategy?: string;
  notes?: string;
  emotions?: string[];
  tags?: string[];
  proof?: string | null;
  rating?: number;
  checklist?: { label: string; checked: boolean }[];
  tradeType?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
}

export function useTrades() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setTrades([]);
      setLoading(false);
      return;
    }

    const fetchTrades = async () => {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('userId', user.id)
        .order('createdAt', { ascending: false });

      if (error) {
        console.error('Error fetching trades:', error);
      } else {
        setTrades(data as Trade[]);
      }
      setLoading(false);
    };

    fetchTrades();

    // Subscribe to changes
    const channel = supabase
      .channel('trades_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'trades',
        filter: `userId=eq.${user.id}`
      }, () => {
        fetchTrades();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const addTrade = useCallback(async (tradeData: Omit<Trade, 'id' | 'createdAt' | 'userId'>) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('trades')
        .insert([{
          ...tradeData,
          userId: user.id,
          createdAt: new Date().toISOString()
        }]);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error adding trade:', error);
      throw error;
    }
  }, [user]);

  const deleteTrades = useCallback(async (tradeIds: string[]) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('trades')
        .delete()
        .in('id', tradeIds);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting trades:', error);
      throw error;
    }
  }, [user]);

  const updateTrades = useCallback(async (tradeIds: string[], data: Partial<Trade>) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('trades')
        .update(data)
        .in('id', tradeIds);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error updating trades:', error);
      throw error;
    }
  }, [user]);

  return { trades, loading, addTrade, deleteTrades, updateTrades };
}
