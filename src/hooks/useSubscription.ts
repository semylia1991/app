import { useState, useEffect, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type Plan = 'free' | 'premium';

export interface UsageLimits {
  scansPerDay: number;       // free: 15, premium: 100
  noteAnalysisPerDay: number; // free: 15, premium: 100
  askAiPerDay: number;       // free: 3,  premium: 10
}

export const LIMITS: Record<Plan, UsageLimits> = {
  free: {
    scansPerDay: 15,
    noteAnalysisPerDay: 15,
    askAiPerDay: 3,
  },
  premium: {
    scansPerDay: 100,
    noteAnalysisPerDay: 100,
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

// ── Tamper-resistant localStorage ────────────────────────────────────────────
// Signs usage data with a daily HMAC key derived from the date + a static salt.
// Not cryptographically bulletproof (key is in JS bundle), but stops casual
// DevTools edits — anyone who clears storage simply resets to 0 anyway.

const SALT = 'glowkey-usage-v1';

async function signData(data: UsageToday, date: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(`${SALT}:${date}`),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', keyMaterial, enc.encode(JSON.stringify(data)));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function verifyData(data: UsageToday, date: string, sig: string): Promise<boolean> {
  try {
    const expected = await signData(data, date);
    return expected === sig;
  } catch {
    return false;
  }
}

async function loadLocalUsage(date: string): Promise<UsageToday> {
  const empty: UsageToday = { scans: 0, noteAnalysis: 0, askAi: 0 };
  try {
    const raw = localStorage.getItem(`usage_${date}`);
    if (!raw) return empty;
    const { data, sig } = JSON.parse(raw);
    const valid = await verifyData(data, date, sig);
    if (!valid) {
      // Tampering detected — reset
      localStorage.removeItem(`usage_${date}`);
      return empty;
    }
    return data;
  } catch {
    return empty;
  }
}

async function saveLocalUsage(data: UsageToday, date: string): Promise<void> {
  const sig = await signData(data, date);
  localStorage.setItem(`usage_${date}`, JSON.stringify({ data, sig }));
}

export function useSubscription(user: User | null): SubscriptionState {
  const [plan, setPlan] = useState<Plan>('free');
  const [usage, setUsage] = useState<UsageToday>({ scans: 0, noteAnalysis: 0, askAi: 0 });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) {
      // Non-logged-in users — use signed localStorage for usage, always free
      const parsed = await loadLocalUsage(todayKey());
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
        // persist to signed localStorage
        setUsage(prev => {
          const next = { ...prev, [field]: prev[field] + 1 };
          saveLocalUsage(next, today);
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
