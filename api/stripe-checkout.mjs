/**
 * api/stripe-checkout.mjs — Vercel/Netlify Serverless Function
 * Creates a Stripe Checkout Session and returns the redirect URL.
 *
 * Supports tiers: basic | withyou | generous | custom (weekly).
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY        — sk_live_... or sk_test_...
 *   VITE_APP_URL             — https://your-app.com
 *   STRIPE_PRICE_BASIC       — price_... (€1.99/week)
 *   STRIPE_PRICE_WITHYOU     — price_... (€2.99/week)
 *   STRIPE_PRICE_GENEROUS    — price_... (€4.99/week)
 *   (For custom amounts we create price_data on the fly — no env needed.)
 */

const ALLOWED_ORIGIN = (process.env.VITE_APP_URL || '').replace(/\/$/, '');

const FIXED_PRICE_IDS = {
  basic:    process.env.STRIPE_PRICE_BASIC,
  withyou:  process.env.STRIPE_PRICE_WITHYOU,
  generous: process.env.STRIPE_PRICE_GENEROUS,
};

const FIXED_TIER_AMOUNTS = {
  basic:    1.99,
  withyou:  2.99,
  generous: 4.99,
};

const MIN_CUSTOM_EUR = 1;
const MAX_CUSTOM_EUR = 99;

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
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const { userId, tier = 'withyou', amount } = req.body ?? {};

  if (!userId || userId === 'anonymous') {
    return res.status(400).json({ error: 'User must be signed in to subscribe.' });
  }

  const validTiers = ['basic', 'withyou', 'generous', 'custom'];
  if (!validTiers.includes(tier)) {
    return res.status(400).json({ error: 'Unknown tier' });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const appUrl    = process.env.VITE_APP_URL || origin;

  if (!secretKey) {
    return res.status(500).json({ error: 'Stripe env vars not configured' });
  }

  // ── Build line item depending on tier ──────────────────────────
  const params = new URLSearchParams();
  params.append('mode', 'subscription');
  params.append('payment_method_types[0]', 'card');
  params.append('client_reference_id', userId);
  params.append('metadata[userId]', userId);
  params.append('metadata[tier]', tier);
  params.append('success_url', `${appUrl}?success=1`);
  params.append('cancel_url',  `${appUrl}?canceled=1`);
  params.append('line_items[0][quantity]', '1');

  let weeklyAmountEur = 0;

  if (tier === 'custom') {
    const parsed = Number(amount);
    if (Number.isNaN(parsed) || parsed < MIN_CUSTOM_EUR || parsed > MAX_CUSTOM_EUR) {
      return res.status(400).json({ error: `Amount must be between €${MIN_CUSTOM_EUR} and €${MAX_CUSTOM_EUR}.` });
    }
    weeklyAmountEur = Math.round(parsed * 100) / 100;
    const cents = Math.round(weeklyAmountEur * 100);

    // price_data with weekly recurring
    params.append('line_items[0][price_data][currency]', 'eur');
    params.append('line_items[0][price_data][unit_amount]', String(cents));
    params.append('line_items[0][price_data][recurring][interval]', 'week');
    params.append('line_items[0][price_data][product_data][name]', 'GlowKey Premium — Custom');
  } else {
    const priceId = FIXED_PRICE_IDS[tier];
    if (!priceId) {
      return res.status(500).json({ error: `Stripe price for tier "${tier}" not configured` });
    }
    weeklyAmountEur = FIXED_TIER_AMOUNTS[tier];
    params.append('line_items[0][price]', priceId);
  }

  params.append('metadata[weekly_amount_eur]', String(weeklyAmountEur));

  // Pass through to subscription metadata so webhook can read it
  params.append('subscription_data[metadata][userId]', userId);
  params.append('subscription_data[metadata][tier]', tier);
  params.append('subscription_data[metadata][weekly_amount_eur]', String(weeklyAmountEur));

  try {
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    const session = await response.json();

    if (!response.ok) {
      console.error('Stripe error:', session);
      return res.status(500).json({ error: session?.error?.message ?? 'Stripe error' });
    }

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err);
    return res.status(500).json({ error: err.message });
  }
}
