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

  const refresh = useCallback(() => {
    const stored = loadFromStorage();
    setStrategies(stored);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) refresh();
    else { setStrategies([]); setLoading(false); }
  }, [user, refresh]);

  const addStrategy = useCallback(async (data: Omit<Strategy, 'id' | 'createdAt'>) => {
    const newStrategy: Strategy = {
      ...data,
      id: Math.random().toString(36).substring(2),
      createdAt: new Date().toISOString(),
    };
    const updated = [...strategies, newStrategy];
    setStrategies(updated);
    saveToStorage(updated);
  }, [strategies]);

  const updateStrategy = useCallback(async (id: string, data: Partial<Strategy>) => {
    const updated = strategies.map(s => s.id === id ? { ...s, ...data } : s);
    setStrategies(updated);
    saveToStorage(updated);
  }, [strategies]);

  const deleteStrategy = useCallback(async (id: string) => {
    const updated = strategies.filter(s => s.id !== id);
    setStrategies(updated);
    saveToStorage(updated);
  }, [strategies]);

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
