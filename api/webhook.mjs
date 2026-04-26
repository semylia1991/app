/**
 * api/webhook.mjs — Vercel Serverless Function
 * Verifies Stripe webhook signature with Node.js crypto (no stripe package needed).
 *
 * Required env vars:
 *   STRIPE_WEBHOOK_SECRET     — whsec_...
 *   VITE_SUPABASE_URL         — https://xxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY — service role key
 */

import crypto from 'crypto';

export const config = {
  api: { bodyParser: false },
};

// ── Raw body ──────────────────────────────────────────────────
async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// ── Stripe signature verification (no SDK) ────────────────────
// Docs: https://stripe.com/docs/webhooks/signatures
function verifyStripeSignature(rawBody, sigHeader, secret) {
  const parts = Object.fromEntries(
    sigHeader.split(',').map((p) => p.split('='))
  );
  const timestamp = parts['t'];
  const signatures = sigHeader
    .split(',')
    .filter((p) => p.startsWith('v1='))
    .map((p) => p.slice(3));

  if (!timestamp || signatures.length === 0) {
    throw new Error('Invalid stripe-signature header');
  }

  // Replay protection: reject if older than 5 minutes
  const age = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
  if (age > 300) throw new Error('Webhook timestamp too old');

  const payload = `${timestamp}.${rawBody.toString('utf8')}`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  const valid = signatures.some((sig) =>
    crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))
  );
  if (!valid) throw new Error('Signature mismatch');
}

// ── Supabase REST helper (no SDK needed) ─────────────────────
function supabase(url, serviceKey) {
  const base = url.replace(/\/$/, '');
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${serviceKey}`,
    'apikey': serviceKey,
    'Prefer': 'resolution=merge-duplicates',
  };

  return {
    async upsert(table, row) {
      const res = await fetch(`${base}/rest/v1/${table}`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify(row),
      });
      if (!res.ok) throw new Error(`Supabase upsert ${table}: ${await res.text()}`);
    },
    async update(table, data, match) {
      const qs = Object.entries(match).map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`).join('&');
      const res = await fetch(`${base}/rest/v1/${table}?${qs}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`Supabase update ${table}: ${await res.text()}`);
    },
    async insert(table, row) {
      const res = await fetch(`${base}/rest/v1/${table}`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify(row),
      });
      if (!res.ok) throw new Error(`Supabase insert ${table}: ${await res.text()}`);
    },
  };
}

// ── Handler ───────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl   = process.env.VITE_SUPABASE_URL;
  const serviceKey    = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!webhookSecret || !supabaseUrl || !serviceKey) {
    console.error('Missing env vars: STRIPE_WEBHOOK_SECRET / VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  const rawBody = await getRawBody(req);
  const sigHeader = req.headers['stripe-signature'] || '';

  let event;
  try {
    verifyStripeSignature(rawBody, sigHeader, webhookSecret);
    event = JSON.parse(rawBody.toString('utf8'));
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  const db = supabase(supabaseUrl, serviceKey);

  try {
    switch (event.type) {

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const userId = sub.metadata?.userId;
        if (!userId) { console.warn('No userId in subscription metadata'); break; }

        const tier = sub.metadata?.tier || 'withyou';
        const weeklyAmountEur = parseFloat(sub.metadata?.weekly_amount_eur || '0') || null;

        await db.upsert('subscriptions', {
          user_id: userId,
          stripe_subscription_id: sub.id,
          stripe_customer_id: sub.customer,
          status: sub.status === 'active' ? 'active' : 'canceled',
          plan: 'premium',
          tier,
          weekly_amount_eur: weeklyAmountEur,
          currency: 'eur',
          expires_at: new Date(sub.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        });
        console.log(`✅ subscription upserted: ${userId} tier=${tier}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const userId = sub.metadata?.userId;
        if (!userId) break;

        await db.update('subscriptions',
          { status: 'canceled', updated_at: new Date().toISOString() },
          { user_id: userId }
        );
        console.log(`✅ subscription canceled: ${userId}`);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const userId = invoice.subscription_details?.metadata?.userId
                    || invoice.metadata?.userId;
        const subId  = invoice.subscription;
        if (!userId || !subId) { console.warn('No userId in invoice metadata'); break; }

        await db.insert('payments', {
          user_id: userId,
          stripe_invoice_id: invoice.id,
          stripe_subscription_id: subId,
          amount_eur: (invoice.amount_paid ?? 0) / 100,
          currency: invoice.currency || 'eur',
          tier: invoice.subscription_details?.metadata?.tier || null,
          paid_at: new Date(
            (invoice.status_transitions?.paid_at ?? invoice.created) * 1000
          ).toISOString(),
        });
        console.log(`✅ payment logged: ${userId} €${(invoice.amount_paid / 100).toFixed(2)}`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        if (!invoice.subscription) break;

        await db.update('subscriptions',
          { status: 'past_due', updated_at: new Date().toISOString() },
          { stripe_subscription_id: invoice.subscription }
        );
        console.log(`⚠️ payment failed for subscription: ${invoice.subscription}`);
        break;
      }

      default:
        console.log(`Unhandled event: ${event.type}`);
    }
  } catch (err) {
    console.error('DB error:', err.message);
    // Return 200 so Stripe doesn't retry — log the error instead
  }

  return res.status(200).json({ received: true });
}
