import { useState, useEffect, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type Plan = 'free' | 'premium';

export interface UsageLimits {
  scansPerDay: number;       // free: 10, premium: Infinity
  noteAnalysisPerDay: number; // free: 10, premium: Infinity
  askAiPerDay: number;       // free: 3,  premium: 10
}

export const LIMITS: Record<Plan, UsageLimits> = {
  free: {
    scansPerDay: 10,
    noteAnalysisPerDay: 10,
    askAiPerDay: 3,
  },
  premium: {
    scansPerDay: Infinity,
    noteAnalysisPerDay: Infinity,
    askAiPerDay: 10,
  },
};

export interface UsageToday {
  scans: number;
  noteAnalysis: number;
  askAi: number;
}

export interface SubscriptionState {
  plan: Plan;
  isPremium: boolean;
  limits: UsageLimits;
  usage: UsageToday;
  loading: boolean;
  // check helpers
  canScan: boolean;
  canUseNote: boolean;
  canAskAi: boolean;
  // increment usage
  incrementScans: () => Promise<void>;
  incrementNoteAnalysis: () => Promise<void>;
  incrementAskAi: () => Promise<void>;
  // refresh
  refresh: () => Promise<void>;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10); // "2026-03-28"
}

export function useSubscription(user: User | null): SubscriptionState {
  const [plan, setPlan] = useState<Plan>('free');
  const [usage, setUsage] = useState<UsageToday>({ scans: 0, noteAnalysis: 0, askAi: 0 });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) {
      // Non-logged-in users — use localStorage for usage, always free
      const stored = localStorage.getItem(`usage_${todayKey()}`);
      const parsed = stored ? JSON.parse(stored) : { scans: 0, noteAnalysis: 0, askAi: 0 };
      setUsage(parsed);
      setPlan('free');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 1. Check subscription status
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('status, expires_at')
        .eq('user_id', user.id)
        .single();

      const isPremiumActive =
        sub?.status === 'active' &&
        sub?.expires_at &&
        new Date(sub.expires_at) > new Date();

      setPlan(isPremiumActive ? 'premium' : 'free');

      // 2. Fetch today's usage
      const today = todayKey();
      const { data: usageRow } = await supabase
        .from('usage_tracking')
        .select('scans, note_analysis, ask_ai')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      setUsage({
        scans: usageRow?.scans ?? 0,
        noteAnalysis: usageRow?.note_analysis ?? 0,
        askAi: usageRow?.ask_ai ?? 0,
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const incrementField = useCallback(
    async (field: 'scans' | 'noteAnalysis' | 'askAi') => {
      const dbField = field === 'noteAnalysis' ? 'note_analysis' : field === 'askAi' ? 'ask_ai' : 'scans';
      const today = todayKey();

      setUsage(prev => ({ ...prev, [field]: prev[field] + 1 }));

      if (!user) {
        // persist to localStorage
        setUsage(prev => {
          const next = { ...prev, [field]: prev[field] + 1 };
          localStorage.setItem(`usage_${today}`, JSON.stringify(next));
          return next;
        });
        return;
      }

      // Upsert to Supabase
      await supabase.rpc('increment_usage', {
        p_user_id: user.id,
        p_date: today,
        p_field: dbField,
      });
    },
    [user]
  );

  const limits = LIMITS[plan];

  return {
    plan,
    isPremium: plan === 'premium',
    limits,
    usage,
    loading,
    canScan: usage.scans < limits.scansPerDay,
    canUseNote: usage.noteAnalysis < limits.noteAnalysisPerDay,
    canAskAi: usage.askAi < limits.askAiPerDay,
    incrementScans: () => incrementField('scans'),
    incrementNoteAnalysis: () => incrementField('noteAnalysis'),
    incrementAskAi: () => incrementField('askAi'),
    refresh: fetchData,
  };
}
