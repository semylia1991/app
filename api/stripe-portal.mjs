/**
 * api/stripe-portal.mjs — Vercel/Netlify Serverless Function
 * Создаёт Stripe Billing Portal сессию и возвращает URL редиректа.
 *
 * Перед использованием активировать Customer Portal в Stripe Dashboard:
 *   Stripe → Settings → Billing → Customer portal → Activate
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
    console.error('VITE_APP_URL is not configured');
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

  // Верифицируем пользователя через JWT — не доверяем body
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const secretKey   = process.env.STRIPE_SECRET_KEY;
  const appUrl      = ALLOWED_ORIGIN;

  if (!supabaseUrl || !serviceKey || !secretKey) {
    return res.status(500).json({ error: 'Env vars not configured' });
  }

  // Получаем user из JWT через Supabase
  let userId;
  try {
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': serviceKey,
      },
    });
    if (!userRes.ok) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    const userData = await userRes.json();
    userId = userData.id;
  } catch (err) {
    console.error('Token verification error:', err);
    return res.status(401).json({ error: 'Token verification failed' });
  }

  if (!userId) {
    return res.status(401).json({ error: 'User not found' });
  }

  // Получаем stripe_customer_id из нашей БД
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: sub, error: subError } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id, status')
    .eq('user_id', userId)
    .single();

  if (subError || !sub?.stripe_customer_id) {
    return res.status(404).json({ error: 'No subscription found. Please contact support.' });
  }

  // Создаём Stripe Billing Portal сессию
  try {
    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(secretKey);

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${appUrl}?portal=return`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe portal session error:', err);
    return res.status(500).json({ error: err.message });
  }
}
