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
 *
 * Required Stripe events to enable in Dashboard:
 *   - customer.subscription.created
 *   - customer.subscription.updated
 *   - customer.subscription.deleted
 *   - invoice.payment_succeeded
 *   - invoice.payment_failed
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

  const rawBody = await getRawBody(req);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(secretKey);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    switch (event.type) {

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const userId = sub.metadata?.userId;
        if (!userId) break;

        // Pull tier + amount from metadata (set in checkout)
        const tier = sub.metadata?.tier || 'withyou';
        const weeklyAmountEur = parseFloat(sub.metadata?.weekly_amount_eur || '0') || null;

        await supabase.from('subscriptions').upsert({
          user_id: userId,
          stripe_subscription_id: sub.id,
          stripe_customer_id: sub.customer,
          status: sub.status === 'active' ? 'active' : 'canceled',
          plan: 'premium',
          tier,                                  // basic | withyou | generous | custom
          weekly_amount_eur: weeklyAmountEur,
          currency: 'eur',
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

      case 'invoice.payment_succeeded': {
        // Log every weekly payment to a separate table (used for donation reporting).
        const invoice = event.data.object;
        const subId = invoice.subscription;
        const userId = invoice.subscription_details?.metadata?.userId
                    || invoice.metadata?.userId;
        const amountPaidEur = (invoice.amount_paid ?? 0) / 100;
        const currency = invoice.currency || 'eur';
        if (!userId || !subId) break;

        await supabase.from('payments').upsert({
          user_id: userId,
          stripe_invoice_id: invoice.id,
          stripe_subscription_id: subId,
          amount_eur: amountPaidEur,
          currency,
          tier: invoice.subscription_details?.metadata?.tier
             || invoice.metadata?.tier
             || null,
          paid_at: new Date((invoice.status_transitions?.paid_at ?? invoice.created) * 1000).toISOString(),
        }, { onConflict: 'stripe_invoice_id' });
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
