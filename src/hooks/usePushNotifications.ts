/**
 * src/hooks/usePushNotifications.ts
 *
 * Handles:
 * 1. Requesting push permission from the user
 * 2. Subscribing via PushManager (VAPID)
 * 3. Saving subscription + lang to Supabase push_subscriptions table
 * 4. Updating lang when user switches language
 *
 * Required env var (public, safe to expose):
 *   VITE_VAPID_PUBLIC_KEY=Bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 */

import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Language } from '../i18n';
import type { User } from '@supabase/supabase-js';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

async function getOrCreateSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
  if (!VAPID_PUBLIC_KEY) {
    console.warn('[Push] VITE_VAPID_PUBLIC_KEY not set');
    return null;
  }

  const reg = await navigator.serviceWorker.ready;

  // Reuse existing subscription if available
  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing;

  // Create new subscription
  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });
}

async function saveSubscription(
  sub: PushSubscription,
  userId: string | null,
  lang: Language
): Promise<void> {
  const subJson = sub.toJSON();
  const endpoint = subJson.endpoint!;
  const p256dh = (subJson.keys as Record<string, string>)?.p256dh;
  const auth   = (subJson.keys as Record<string, string>)?.auth;

  await supabase.from('push_subscriptions').upsert(
    {
      endpoint,
      p256dh,
      auth,
      user_id: userId ?? null,
      lang,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' }
  );
}

export function usePushNotifications(user: User | null, lang: Language) {
  const subRef  = useRef<PushSubscription | null>(null);
  const askedRef = useRef(false);

  // ── Subscribe after user interaction (called from UI button) ──
  async function requestPermission(): Promise<'granted' | 'denied' | 'default'> {
    if (!('Notification' in window)) return 'denied';

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return permission;

    try {
      const sub = await getOrCreateSubscription();
      if (sub) {
        subRef.current = sub;
        await saveSubscription(sub, user?.id ?? null, lang);
      }
    } catch (err) {
      console.error('[Push] subscribe error:', err);
    }

    return permission;
  }

  // ── Update lang in DB when user switches language ─────────────
  useEffect(() => {
    const sub = subRef.current;
    if (!sub) return;
    const endpoint = sub.toJSON().endpoint;
    if (!endpoint) return;

    supabase
      .from('push_subscriptions')
      .update({ lang, updated_at: new Date().toISOString() })
      .eq('endpoint', endpoint)
      .then(({ error }) => {
        if (error) console.warn('[Push] lang update error:', error.message);
      });
  }, [lang]);

  // ── Re-attach userId when user logs in ────────────────────────
  useEffect(() => {
    const sub = subRef.current;
    if (!sub || !user) return;

    supabase
      .from('push_subscriptions')
      .update({ user_id: user.id, updated_at: new Date().toISOString() })
      .eq('endpoint', sub.toJSON().endpoint!)
      .then(({ error }) => {
        if (error) console.warn('[Push] userId update error:', error.message);
      });
  }, [user]);

  // ── On mount: restore existing subscription silently ──────────
  useEffect(() => {
    if (Notification.permission !== 'granted') return;
    getOrCreateSubscription().then((sub) => {
      if (sub) {
        subRef.current = sub;
        // Refresh lang/userId in DB silently
        saveSubscription(sub, user?.id ?? null, lang).catch(() => {});
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { requestPermission, permission: 'Notification' in window ? Notification.permission : 'denied' };
}
