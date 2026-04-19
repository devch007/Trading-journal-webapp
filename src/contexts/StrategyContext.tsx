import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export interface Strategy {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  color?: string;
  rules?: string[];
  timeframes?: string[];
  imageUrl?: string;
  winRate?: number;
  totalTrades?: number;
  pnl?: number;
  createdAt?: string;
}

interface StrategyContextType {
  strategies: Strategy[];
  loading: boolean;
  addStrategy: (s: Omit<Strategy, 'id' | 'createdAt'>) => Promise<void>;
  updateStrategy: (id: string, s: Partial<Strategy>) => Promise<void>;
  deleteStrategy: (id: string) => Promise<void>;
  refresh: () => void;
}

const StrategyContext = createContext<StrategyContextType | null>(null);

// We store strategies in localStorage for now (no separate Supabase table needed unless you want to persist server-side).
const STORAGE_KEY = 'tradova_strategies';

function loadFromStorage(): Strategy[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToStorage(strategies: Strategy[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(strategies));
}

export function StrategyProvider({ children }: { children: React.ReactNode }) {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const refresh = useCallback(async () => {
    if (!user) {
      setStrategies([]);
      setLoading(false);
      return;
    }
    const { data: dbStrategies, error } = await supabase
      .from('strategies')
      .select('*')
      .eq('userId', user.id)
      .order('createdAt', { ascending: false });

    const stored = loadFromStorage();

    if (error) {
      console.error('Error fetching strategies from Supabase:', error);
      setStrategies(stored);
    } else {
      const dbStrats = (dbStrategies || []) as Strategy[];
      const dbIds = new Set(dbStrats.map(s => s.id));
      const dbNames = new Set(dbStrats.map(s => s.name));
      
      // Keep any local strategies that aren't completely duplicate of DB strategies
      const localOnly = stored.filter(s => !dbIds.has(s.id) && !dbNames.has(s.name));
      
      const combined = [...dbStrats, ...localOnly];
      setStrategies(combined);
      
      // Update local storage to match reality
      if (dbStrats.length > 0 || localOnly.length > 0) {
        saveToStorage(combined);
      }
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addStrategy = useCallback(async (data: Omit<Strategy, 'id' | 'createdAt'>) => {
    if (!user) return;
    
    // Optimistic / Fallback logic
    const newStrategy: Strategy = {
      ...data,
      id: Math.random().toString(36).substring(2),
      createdAt: new Date().toISOString(),
    };
    
    const { data: inserted, error } = await supabase
      .from('strategies')
      .insert([{ ...data, userId: user.id }])
      .select()
      .single();

    if (error) {
      console.error("Failed to save to database (did you run the SQL?), saving locally...", error);
      const updated = [...strategies, newStrategy];
      setStrategies(updated);
      saveToStorage(updated);
    } else {
      setStrategies(prev => {
        const updated = [inserted as Strategy, ...prev];
        saveToStorage(updated);
        return updated;
      });
    }
  }, [strategies, user]);

  const updateStrategy = useCallback(async (id: string, data: Partial<Strategy>) => {
    if (!user) return;

    // Optimistic local update
    const updated = strategies.map(s => s.id === id ? { ...s, ...data } : s);
    setStrategies(updated);
    saveToStorage(updated);

    const { error } = await supabase
      .from('strategies')
      .update(data)
      .eq('id', id)
      .eq('userId', user.id);

    if (error) {
      console.error("Update failed, but local storage updated:", error);
    } else {
      refresh(); // Sync exactly with server
    }
  }, [strategies, user, refresh]);

  const deleteStrategy = useCallback(async (id: string) => {
    if (!user) return;

    // Optimistic local update
    const updated = strategies.filter(s => s.id !== id);
    setStrategies(updated);
    saveToStorage(updated);

    const { error } = await supabase
      .from('strategies')
      .delete()
      .eq('id', id)
      .eq('userId', user.id);

    if (error) {
      console.error("Delete failed, but local storage updated:", error);
    }
  }, [strategies, user]);

  return (
    <StrategyContext.Provider value={{ strategies, loading, addStrategy, updateStrategy, deleteStrategy, refresh }}>
      {children}
    </StrategyContext.Provider>
  );
}

export function useStrategies() {
  const ctx = useContext(StrategyContext);
  if (!ctx) throw new Error('useStrategies must be used inside StrategyProvider');
  return ctx;
}
