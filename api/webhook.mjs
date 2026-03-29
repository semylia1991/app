/**
 * api/webhook.mjs — Vercel Serverless Function
 * Handles Stripe webhook events.
 * URL: https://your-app.vercel.app/api/webhook
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY        — sk_live_... or sk_test_...
 *   STRIPE_WEBHOOK_SECRET    — whsec_...
 *   VITE_SUPABASE_URL        — https://xxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY — service role key (never expose to client)
 */

export const config = {
  api: {
    bodyParser: false, // Need raw body for Stripe signature verification
  },
};

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secretKey     = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl   = process.env.VITE_SUPABASE_URL;
  const serviceKey    = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secretKey || !webhookSecret) {
    return res.status(500).json({ error: 'Stripe env vars not configured' });
  }

  // Read raw body for signature verification
  const rawBody = await getRawBody(req);
  const sig = req.headers['stripe-signature'];

  // Verify webhook signature using Web Crypto (no stripe npm needed)
  let event;
  try {
    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(secretKey);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Update Supabase based on event type
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    switch (event.type) {

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const userId = sub.metadata?.userId;
        if (!userId) break;

        await supabase.from('subscriptions').upsert({
          user_id: userId,
          stripe_subscription_id: sub.id,
          stripe_customer_id: sub.customer,
          status: sub.status === 'active' ? 'active' : 'canceled',
          plan: 'premium',
          expires_at: new Date(sub.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const userId = sub.metadata?.userId;
        if (!userId) break;

        await supabase.from('subscriptions')
          .update({ status: 'canceled', updated_at: new Date().toISOString() })
          .eq('user_id', userId);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subId = invoice.subscription;
        if (!subId) break;

        await supabase.from('subscriptions')
          .update({ status: 'past_due', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', subId);
        break;
      }
    }
  } catch (err) {
    console.error('Supabase update error:', err);
    // Still return 200 so Stripe doesn't retry
  }

  return res.status(200).json({ received: true });
}
