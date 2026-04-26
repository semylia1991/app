/**
 * api/stripe-portal.mjs — Vercel Serverless Function
 * Создаёт Stripe Billing Portal сессию через fetch (без stripe SDK).
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY          — sk_live_... / sk_test_...
 *   VITE_APP_URL               — https://your-app.com
 *   VITE_SUPABASE_URL          — https://xxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY  — service role key
 */

const ALLOWED_ORIGIN = (process.env.VITE_APP_URL || '').replace(/\/$/, '');

export default async function handler(req, res) {
  const origin = req.headers['origin'] || '';

  if (!ALLOWED_ORIGIN) {
    return res.status(500).json({ error: 'Server misconfiguration' });
  }
  if (origin !== ALLOWED_ORIGIN) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const secretKey   = process.env.STRIPE_SECRET_KEY;
  const appUrl      = ALLOWED_ORIGIN;

  if (!supabaseUrl || !serviceKey || !secretKey) {
    return res.status(500).json({ error: 'Env vars not configured' });
  }

  // ── 1. Verify JWT → get userId ───────────────────────────────
  let userId;
  try {
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': serviceKey,
      },
    });
    if (!userRes.ok) return res.status(401).json({ error: 'Invalid token' });
    const userData = await userRes.json();
    userId = userData.id;
  } catch (err) {
    console.error('Token verification error:', err);
    return res.status(401).json({ error: 'Token verification failed' });
  }

  if (!userId) return res.status(401).json({ error: 'User not found' });

  // ── 2. Get stripe_customer_id from Supabase ──────────────────
  const subRes = await fetch(
    `${supabaseUrl}/rest/v1/subscriptions?user_id=eq.${userId}&select=stripe_customer_id,status`,
    {
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
      },
    }
  );

  if (!subRes.ok) {
    return res.status(500).json({ error: 'Failed to fetch subscription' });
  }

  const subs = await subRes.json();
  const sub = subs?.[0];

  if (!sub?.stripe_customer_id) {
    return res.status(404).json({ error: 'No subscription found. Please contact support.' });
  }

  // ── 3. Create Stripe Billing Portal session via fetch (no SDK) ─
  try {
    const params = new URLSearchParams({
      customer: sub.stripe_customer_id,
      return_url: `${appUrl}?portal=return`,
    });

    const portalRes = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    const session = await portalRes.json();

    if (!portalRes.ok) {
      console.error('Stripe portal error:', session);
      return res.status(500).json({ error: session?.error?.message ?? 'Stripe error' });
    }

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe portal session error:', err);
    return res.status(500).json({ error: err.message });
  }
}
