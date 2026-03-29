// api/stripe.mjs
// Express routes for Stripe integration
// Mount this in server.ts: app.use('/api/stripe', stripeRouter);

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PRICE_ID = process.env.STRIPE_PRICE_ID; // your €4.99/mo price from Stripe dashboard

export async function createCheckout(req, res) {
  const { userId, lang } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId required' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: PRICE_ID, quantity: 1 }],
      // Pass userId so we can link Stripe customer → Supabase user in webhook
      client_reference_id: userId,
      metadata: { userId },
      success_url: `${process.env.VITE_APP_URL || 'https://your-app.com'}?success=1`,
      cancel_url: `${process.env.VITE_APP_URL || 'https://your-app.com'}?canceled=1`,
      // Optional: pre-fill email if you have it
      // customer_email: userEmail,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    res.status(500).json({ error: err.message });
  }
}

export async function handleWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // req.body must be raw Buffer here — use express.raw() middleware
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Import supabase admin client (server-side, uses service role key)
  const { createClient } = await import('@supabase/supabase-js');
  const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // ← service role, never expose to client!
  );

  switch (event.type) {
    // ── Subscription activated / renewed ───────────────────────────────────
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object;
      const userId = sub.metadata?.userId;
      if (!userId) break;

      const expiresAt = new Date(sub.current_period_end * 1000).toISOString();
      const status = sub.status === 'active' ? 'active' : 'canceled';

      await supabaseAdmin
        .from('subscriptions')
        .upsert(
          {
            user_id: userId,
            stripe_subscription_id: sub.id,
            stripe_customer_id: sub.customer,
            status,
            plan: 'premium',
            expires_at: expiresAt,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
      break;
    }

    // ── Subscription canceled / expired ────────────────────────────────────
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      const userId = sub.metadata?.userId;
      if (!userId) break;

      await supabaseAdmin
        .from('subscriptions')
        .update({ status: 'canceled', updated_at: new Date().toISOString() })
        .eq('user_id', userId);
      break;
    }

    // ── Payment failed ──────────────────────────────────────────────────────
    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      const sub = await stripe.subscriptions.retrieve(invoice.subscription);
      const userId = sub.metadata?.userId;
      if (!userId) break;

      await supabaseAdmin
        .from('subscriptions')
        .update({ status: 'past_due', updated_at: new Date().toISOString() })
        .eq('user_id', userId);
      break;
    }
  }

  res.json({ received: true });
}
