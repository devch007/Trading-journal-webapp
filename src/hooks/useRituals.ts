import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

export interface MorningRitual {
  clarityScore: number;
  sleepQuality: 'Poor' | 'Average' | 'Good' | 'Excellent';
  newsChecked: boolean;
  topGoal: string;
  completedAt: string;
}

export interface EveningRitual {
  dayScore: number;
  rulesFollowed: boolean;
  biggestLesson: string;
  emotionalState: string;
  completedAt: string;
}

export interface DailyRitual {
  date: string; // YYYY-MM-DD
  userId: string;
  morning?: MorningRitual;
  evening?: EveningRitual;
}

export function useRituals() {
  const { user } = useAuth();
  const [rituals, setRituals] = useState<Record<string, DailyRitual>>({});

  useEffect(() => {
    if (!user) return;
    const stored = localStorage.getItem(`rituals_${user.id}`);
    if (stored) {
      try {
        setRituals(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse rituals from local storage', e);
      }
    }
  }, [user]);

  const saveRitual = useCallback((date: string, type: 'morning' | 'evening', data: MorningRitual | EveningRitual) => {
    if (!user) return;
    setRituals(prev => {
      const updated = { ...prev };
      if (!updated[date]) {
        updated[date] = { date, userId: user.id };
      }
      if (type === 'morning') updated[date].morning = data as MorningRitual;
      if (type === 'evening') updated[date].evening = data as EveningRitual;
      
      localStorage.setItem(`rituals_${user.id}`, JSON.stringify(updated));
      return updated;
    });
  }, [user]);

  const getTodayRitual = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    return rituals[today];
  }, [rituals]);

  return { rituals, saveRitual, getTodayRitual };
}
