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
  commission?: number;
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

const TRADES_CACHE_KEY = 'tradex_trades_cache_';
const TRADES_SELECT_COLUMNS = 'id, userId, accountId, date, symbol, action, size, result, isPositive, pnl, createdAt, entry, exit, duration, session, confidence, tag, commission, strategy, notes, emotions, tags, rating, checklist, tradeType, sentiment';

export function useTrades() {
  const { user } = useAuth();

  // Instant retrieval from cache
  const [trades, setTrades] = useState<Trade[]>(() => {
    if (typeof window !== 'undefined' && user?.id) {
      try {
        const cached = localStorage.getItem(`${TRADES_CACHE_KEY}${user.id}`);
        if (cached) return JSON.parse(cached);
      } catch (e) {}
    }
    return [];
  });

  const [loading, setLoading] = useState(() => trades.length === 0);

  const fetchTrades = useCallback(async (isInitial = false) => {
    if (!user) return;
    
    if (isInitial && trades.length === 0) {
      setLoading(true);
    }

    const { data, error } = await supabase
      .from('trades')
      .select(TRADES_SELECT_COLUMNS)
      .eq('userId', user.id)
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('Error fetching trades:', error);
    } else if (data) {
      setTrades(data as unknown as Trade[]);
      try {
        localStorage.setItem(`${TRADES_CACHE_KEY}${user.id}`, JSON.stringify(data));
      } catch (e) {}
    }
    setLoading(false);
  }, [user, trades.length]);

  const fetchTradeProof = useCallback(async (tradeId: string) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('trades')
      .select('proof')
      .eq('id', tradeId)
      .single();

    if (error) {
      console.error('Error fetching trade proof:', error);
      return null;
    }
    return data.proof;
  }, [user]);

  useEffect(() => {
    if (!user) {
      setTrades([]);
      setLoading(false);
      return;
    }

    // Read cache if user changed
    try {
      const cached = localStorage.getItem(`${TRADES_CACHE_KEY}${user.id}`);
      if (cached) {
        setTrades(JSON.parse(cached));
        setLoading(false);
      }
    } catch (e) {}

    fetchTrades(true);

    // Subscribe to changes (wrapped in try-catch to prevent fatal React crashes during WS disconnects)
    let channel: any = null;
    try {
      const channelName = `trades_changes_${user.id}_${Math.random().toString(36).substring(7)}`;
      channel = supabase
        .channel(channelName)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'trades',
          filter: `userId=eq.${user.id}`
        }, () => {
          fetchTrades();
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
      
      // Instantly trigger a re-fetch to update UI without relying on websocket
      fetchTrades();
    } catch (error) {
      console.error('Error adding trade:', error);
      throw error;
    }
  }, [user, fetchTrades]);

  const deleteTrades = useCallback(async (tradeIds: string[]) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('trades')
        .delete()
        .in('id', tradeIds);
      
      if (error) throw error;
      
      // Instantly trigger a re-fetch to update UI without relying on websocket
      fetchTrades();
    } catch (error) {
      console.error('Error deleting trades:', error);
      throw error;
    }
  }, [user, fetchTrades]);

  const updateTrades = useCallback(async (tradeIds: string[], data: Partial<Trade>) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('trades')
        .update(data)
        .in('id', tradeIds);
      
      if (error) {
        alert(`Database Update Error: ${error.message}`);
        throw error;
      }

      // Instantly trigger a re-fetch to update UI without relying on websocket
      fetchTrades();
    } catch (error: any) {
      console.error('Error updating trades:', error);
      if (!error.message?.includes('Database Update Error')) {
        alert(`Failed to save: ${error.message || 'Unknown error'}`);
      }
      throw error;
    }
  }, [user, fetchTrades]);

  return { trades, loading, addTrade, deleteTrades, updateTrades, fetchTradeProof };
}
