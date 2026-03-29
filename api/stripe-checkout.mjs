/**
 * api/stripe-checkout.mjs — Vercel/Netlify Serverless Function
 * Creates a Stripe Checkout Session and returns the redirect URL.
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY   — sk_live_... or sk_test_...
 *   STRIPE_PRICE_ID     — price_1...
 *   VITE_APP_URL        — https://your-app.com (for success/cancel redirect)
 */

export default async function handler(req, res) {
  // CORS
  const origin = req.headers['origin'] || '';
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const { userId } = req.body ?? {};
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId   = process.env.STRIPE_PRICE_ID;
  const appUrl    = process.env.VITE_APP_URL || origin || 'https://your-app.com';

  if (!secretKey || !priceId) {
    return res.status(500).json({ error: 'Stripe env vars not configured' });
  }

  try {
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        mode: 'subscription',
        'payment_method_types[0]': 'card',
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': '1',
        client_reference_id: userId,
        'metadata[userId]': userId,
        success_url: `${appUrl}?success=1`,
        cancel_url:  `${appUrl}?canceled=1`,
      }),
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
