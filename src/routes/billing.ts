import { Router } from 'express';
import type { Router as RouterType } from 'express';
import Stripe from 'stripe';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/index.js';
import { users, billingSubscriptions } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const router: RouterType = Router();
const db = getDb();

// Initialize Stripe
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required');
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2026-02-25.clover',
});

// Subscription tier configuration
export const PRICING_PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    priceId: null,
    features: {
      competitors: 1,
      scanFrequency: 'daily',
      reports: 'basic',
      aiNarratives: false,
      historicalTrends: false,
      realTimeAlerts: false,
      apiAccess: false,
      battlecards: false,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 29,
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    features: {
      competitors: 10,
      scanFrequency: 'hourly',
      reports: 'advanced',
      aiNarratives: true,
      historicalTrends: true,
      realTimeAlerts: false,
      apiAccess: false,
      battlecards: false,
    },
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99,
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
    features: {
      competitors: -1, // Unlimited
      scanFrequency: 'realtime',
      reports: 'advanced',
      aiNarratives: true,
      historicalTrends: true,
      realTimeAlerts: true,
      apiAccess: true,
      battlecards: true,
    },
  },
} as const;

export type SubscriptionTier = keyof typeof PRICING_PLANS;

// GET /billing/plans - List available plans
router.get('/plans', (_req, res) => {
  const plans = Object.values(PRICING_PLANS).map((plan) => ({
    id: plan.id,
    name: plan.name,
    price: plan.price,
    features: plan.features,
  }));

  res.json({ plans });
});

// POST /billing/checkout - Create Stripe checkout session
router.post('/checkout', async (req, res) => {
  const { email, tier, successUrl, cancelUrl } = req.body;

  if (!email || !tier) {
    return res.status(400).json({ error: 'email and tier are required' });
  }

  if (tier === 'free') {
    return res.status(400).json({ error: 'Cannot create checkout for free tier' });
  }

  const plan = PRICING_PLANS[tier as SubscriptionTier];
  if (!plan || !plan.priceId) {
    return res.status(400).json({ error: 'Invalid tier' });
  }

  try {
    // Find or create user
    let user = await db.select().from(users).where(eq(users.email, email)).limit(1);

    let userId: string;
    let stripeCustomerId: string | null = null;

    if (user.length === 0) {
      // Create new user
      userId = uuidv4();
      await db.insert(users).values({
        id: userId,
        email,
        subscriptionTier: 'free',
        createdAt: new Date(),
      });
    } else {
      userId = user[0].id;
      stripeCustomerId = user[0].stripeCustomerId;
    }

    // Create Stripe customer if not exists
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: {
          userId,
        },
      });
      stripeCustomerId = customer.id;

      await db.update(users)
        .set({ stripeCustomerId })
        .where(eq(users.id, userId));
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl || `${process.env.PUBLIC_URL}/dashboard/billing?success=true`,
      cancel_url: cancelUrl || `${process.env.PUBLIC_URL}/dashboard/billing?canceled=true`,
      metadata: {
        userId,
        tier,
      },
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to create checkout session', message });
  }
});

// POST /billing/portal - Create customer portal session
router.post('/portal', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'email is required' });
  }

  try {
    const user = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (user.length === 0 || !user[0].stripeCustomerId) {
      return res.status(400).json({ error: 'No Stripe customer found for this user' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user[0].stripeCustomerId,
      return_url: `${process.env.PUBLIC_URL}/dashboard/billing`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Portal error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to create portal session', message });
  }
});

// POST /billing/webhook - Handle Stripe webhooks
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return res.status(400).json({ error: 'Missing stripe signature or webhook secret' });
  }

  let event: Stripe.Event;

  try {
    // Use raw body for webhook signature verification
    const rawBody = req.body instanceof Buffer ? req.body : JSON.stringify(req.body);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(400).json({ error: 'Webhook signature verification failed', message });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const { userId, tier } = session.metadata || {};
        const stripeCustomerId = session.customer as string;
        const stripeSubscriptionId = session.subscription as string;

        if (!userId || !tier || !stripeSubscriptionId) {
          console.error('Missing required metadata in checkout session');
          break;
        }

        // Get subscription details for period end
        const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        const currentPeriodEnd = new Date((subscription as any).current_period_end * 1000);

        // Update user subscription tier
        await db.update(users)
          .set({ subscriptionTier: tier as SubscriptionTier, stripeCustomerId })
          .where(eq(users.id, userId));

        // Create or update billing subscription
        const existingSub = await db.select()
          .from(billingSubscriptions)
          .where(eq(billingSubscriptions.stripeSubscriptionId, stripeSubscriptionId))
          .limit(1);

        if (existingSub.length === 0) {
          await db.insert(billingSubscriptions).values({
            id: uuidv4(),
            userId,
            stripeSubscriptionId,
            status: 'active',
            currentPeriodEnd,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        } else {
          await db.update(billingSubscriptions)
            .set({
              status: 'active',
              currentPeriodEnd,
              updatedAt: new Date(),
            })
            .where(eq(billingSubscriptions.stripeSubscriptionId, stripeSubscriptionId));
        }

        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const stripeSubscriptionId = subscription.id;
        const status = subscription.status;
        const currentPeriodEnd = new Date((subscription as any).current_period_end * 1000);

        const existingSub = await db.select()
          .from(billingSubscriptions)
          .where(eq(billingSubscriptions.stripeSubscriptionId, stripeSubscriptionId))
          .limit(1);

        if (existingSub.length > 0) {
          await db.update(billingSubscriptions)
            .set({
              status,
              currentPeriodEnd,
              updatedAt: new Date(),
            })
            .where(eq(billingSubscriptions.stripeSubscriptionId, stripeSubscriptionId));

          // Update user tier if subscription is canceled
          if (status === 'canceled') {
            await db.update(users)
              .set({ subscriptionTier: 'free' })
              .where(eq(users.id, existingSub[0].userId));
          }
        }

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const stripeSubscriptionId = subscription.id;

        const existingSub = await db.select()
          .from(billingSubscriptions)
          .where(eq(billingSubscriptions.stripeSubscriptionId, stripeSubscriptionId))
          .limit(1);

        if (existingSub.length > 0) {
          await db.update(billingSubscriptions)
            .set({
              status: 'canceled',
              updatedAt: new Date(),
            })
            .where(eq(billingSubscriptions.stripeSubscriptionId, stripeSubscriptionId));

          await db.update(users)
            .set({ subscriptionTier: 'free' })
            .where(eq(users.id, existingSub[0].userId));
        }

        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handling error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Webhook handling failed', message });
  }
});

// GET /billing/subscription - Get current user subscription
router.get('/subscription', async (req, res) => {
  const email = req.query.email as string;

  if (!email) {
    return res.status(400).json({ error: 'email query parameter is required' });
  }

  try {
    const user = await db.select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (user.length === 0) {
      return res.json({
        tier: 'free',
        subscription: null,
      });
    }

    const subscription = await db.select()
      .from(billingSubscriptions)
      .where(eq(billingSubscriptions.userId, user[0].id))
      .limit(1);

    res.json({
      tier: user[0].subscriptionTier,
      subscription: subscription.length > 0 ? subscription[0] : null,
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to get subscription', message });
  }
});

export default router;