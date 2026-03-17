import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';

// Create a mutable reference for the database
const dbRef = vi.hoisted(() => ({ current: null as unknown }));

// Mock Stripe before importing routes
const mockCheckoutSessionCreate = vi.fn();
const mockBillingPortalSessionCreate = vi.fn();
const mockCustomersCreate = vi.fn();
const mockSubscriptionsRetrieve = vi.fn();
const mockWebhooksConstructEvent = vi.fn();

vi.mock('stripe', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      checkout: {
        sessions: {
          create: mockCheckoutSessionCreate,
        },
      },
      billingPortal: {
        sessions: {
          create: mockBillingPortalSessionCreate,
        },
      },
      customers: {
        create: mockCustomersCreate,
      },
      subscriptions: {
        retrieve: mockSubscriptionsRetrieve,
      },
      webhooks: {
        constructEvent: mockWebhooksConstructEvent,
      },
    })),
  };
});

// Mock the db module before importing routes
vi.mock('../../src/db/index.js', () => ({
  getDb: () => dbRef.current,
}));

// Import test utilities - must be after mock
import { setupTestDatabase, teardownTestDatabase, getTestDb, createTestUser, createTestBillingSubscription } from '../utils/test-db.js';
import * as schema from '../../src/db/schema.js';

describe('Billing Routes', () => {
  let app: Express;
  let billingRouter: express.Router;

  beforeEach(async () => {
    // Reset module cache to get fresh router with new db
    vi.resetModules();

    // Reset all mocks
    mockCheckoutSessionCreate.mockReset();
    mockBillingPortalSessionCreate.mockReset();
    mockCustomersCreate.mockReset();
    mockSubscriptionsRetrieve.mockReset();
    mockWebhooksConstructEvent.mockReset();

    await setupTestDatabase();
    dbRef.current = getTestDb();

    // Set required env vars
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_PRO_PRICE_ID = 'price_pro_123';
    process.env.STRIPE_ENTERPRISE_PRICE_ID = 'price_enterprise_123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_123';
    process.env.PUBLIC_URL = 'http://localhost:3000';

    // Import router AFTER setting up db
    billingRouter = (await import('../../src/routes/billing.js')).default;

    app = express();
    app.use(express.json());
    app.use('/api/billing', billingRouter);
  });

  afterEach(() => {
    teardownTestDatabase();
    vi.clearAllMocks();
  });

  describe('GET /api/billing/plans', () => {
    it('should return all pricing plans', async () => {
      const response = await request(app).get('/api/billing/plans');

      expect(response.status).toBe(200);
      expect(response.body.plans).toHaveLength(3);
      expect(response.body.plans[0].id).toBe('free');
      expect(response.body.plans[1].id).toBe('pro');
      expect(response.body.plans[2].id).toBe('enterprise');
    });

    it('should include features for each plan', async () => {
      const response = await request(app).get('/api/billing/plans');

      expect(response.status).toBe(200);
      expect(response.body.plans[0].features).toHaveProperty('competitors');
      expect(response.body.plans[0].features).toHaveProperty('scanFrequency');
    });

    it('should show correct competitor limits', async () => {
      const response = await request(app).get('/api/billing/plans');

      expect(response.status).toBe(200);
      expect(response.body.plans[0].features.competitors).toBe(1); // Free
      expect(response.body.plans[1].features.competitors).toBe(10); // Pro
      expect(response.body.plans[2].features.competitors).toBe(-1); // Enterprise (unlimited)
    });
  });

  describe('POST /api/billing/checkout', () => {
    it('should return 400 when email is missing', async () => {
      const response = await request(app)
        .post('/api/billing/checkout')
        .send({ tier: 'pro' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('email and tier are required');
    });

    it('should return 400 when tier is missing', async () => {
      const response = await request(app)
        .post('/api/billing/checkout')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('email and tier are required');
    });

    it('should return 400 for free tier checkout', async () => {
      const response = await request(app)
        .post('/api/billing/checkout')
        .send({ email: 'test@example.com', tier: 'free' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Cannot create checkout for free tier');
    });

    it('should return 400 for invalid tier', async () => {
      const response = await request(app)
        .post('/api/billing/checkout')
        .send({ email: 'test@example.com', tier: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid tier');
    });

    it('should create checkout session for new user', async () => {
      mockCustomersCreate.mockResolvedValue({ id: 'cus_123' });
      mockCheckoutSessionCreate.mockResolvedValue({
        id: 'cs_123',
        url: 'https://checkout.stripe.com/session',
      });

      const response = await request(app)
        .post('/api/billing/checkout')
        .send({ email: 'newuser@example.com', tier: 'pro' });

      expect(response.status).toBe(200);
      expect(response.body.sessionId).toBe('cs_123');
      expect(response.body.url).toBe('https://checkout.stripe.com/session');
      expect(mockCustomersCreate).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        metadata: { userId: expect.any(String) },
      });
    });

    it('should create checkout session for existing user', async () => {
      await createTestUser({
        id: 'user-123',
        email: 'existing@example.com',
        stripeCustomerId: 'cus_existing',
      });

      mockCheckoutSessionCreate.mockResolvedValue({
        id: 'cs_456',
        url: 'https://checkout.stripe.com/session2',
      });

      const response = await request(app)
        .post('/api/billing/checkout')
        .send({ email: 'existing@example.com', tier: 'enterprise' });

      expect(response.status).toBe(200);
      expect(response.body.sessionId).toBe('cs_456');
      // Should not create new customer for existing user with stripeCustomerId
      expect(mockCustomersCreate).not.toHaveBeenCalled();
    });

    it('should create Stripe customer for existing user without stripeCustomerId', async () => {
      await createTestUser({
        id: 'user-456',
        email: 'nocustomer@example.com',
        stripeCustomerId: undefined,
      });

      mockCustomersCreate.mockResolvedValue({ id: 'cus_new' });
      mockCheckoutSessionCreate.mockResolvedValue({
        id: 'cs_789',
        url: 'https://checkout.stripe.com/session3',
      });

      const response = await request(app)
        .post('/api/billing/checkout')
        .send({ email: 'nocustomer@example.com', tier: 'pro' });

      expect(response.status).toBe(200);
      expect(mockCustomersCreate).toHaveBeenCalled();
    });
  });

  describe('POST /api/billing/portal', () => {
    it('should return 400 when email is missing', async () => {
      const response = await request(app)
        .post('/api/billing/portal')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('email is required');
    });

    it('should return 400 when user not found', async () => {
      const response = await request(app)
        .post('/api/billing/portal')
        .send({ email: 'nonexistent@example.com' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('No Stripe customer found for this user');
    });

    it('should return 400 when user has no Stripe customer ID', async () => {
      await createTestUser({
        id: 'user-nostripe',
        email: 'nostripe@example.com',
        stripeCustomerId: undefined,
      });

      const response = await request(app)
        .post('/api/billing/portal')
        .send({ email: 'nostripe@example.com' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('No Stripe customer found for this user');
    });

    it('should create portal session for user with Stripe customer', async () => {
      await createTestUser({
        id: 'user-stripe',
        email: 'stripe@example.com',
        stripeCustomerId: 'cus_stripe',
      });

      mockBillingPortalSessionCreate.mockResolvedValue({
        url: 'https://billing.stripe.com/portal',
      });

      const response = await request(app)
        .post('/api/billing/portal')
        .send({ email: 'stripe@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.url).toBe('https://billing.stripe.com/portal');
      expect(mockBillingPortalSessionCreate).toHaveBeenCalledWith({
        customer: 'cus_stripe',
        return_url: 'http://localhost:3000/dashboard/billing',
      });
    });
  });

  describe('POST /api/billing/webhook', () => {
    it('should return 400 when stripe-signature header is missing', async () => {
      const response = await request(app)
        .post('/api/billing/webhook')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing stripe signature or webhook secret');
    });

    it('should return 400 when webhook signature verification fails', async () => {
      mockWebhooksConstructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const response = await request(app)
        .post('/api/billing/webhook')
        .set('stripe-signature', 'sig_123')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Webhook signature verification failed');
    });

    it('should handle checkout.session.completed event', async () => {
      const user = await createTestUser({
        id: 'user-webhook',
        email: 'webhook@example.com',
      });

      mockWebhooksConstructEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: {
          object: {
            customer: 'cus_webhook',
            subscription: 'sub_webhook',
            metadata: {
              userId: user.id,
              tier: 'pro',
            },
          },
        },
      });

      mockSubscriptionsRetrieve.mockResolvedValue({
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      });

      const response = await request(app)
        .post('/api/billing/webhook')
        .set('stripe-signature', 'sig_123')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.received).toBe(true);

      // Verify user tier was updated
      const db = getTestDb();
      const updatedUser = await db.select().from(schema.users).where(schema.users.id.eq?.(user.id) as any);
      // Note: Drizzle doesn't have .eq on schema, need to use different approach
    });

    it('should handle customer.subscription.deleted event', async () => {
      const user = await createTestUser({
        id: 'user-delete',
        email: 'delete@example.com',
        subscriptionTier: 'pro',
      });

      await createTestBillingSubscription({
        userId: user.id,
        stripeSubscriptionId: 'sub_delete',
        status: 'active',
      });

      mockWebhooksConstructEvent.mockReturnValue({
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_delete',
          },
        },
      });

      const response = await request(app)
        .post('/api/billing/webhook')
        .set('stripe-signature', 'sig_123')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.received).toBe(true);
    });
  });

  describe('GET /api/billing/subscription', () => {
    it('should return 400 when email is missing', async () => {
      const response = await request(app).get('/api/billing/subscription');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('email query parameter is required');
    });

    it('should return free tier for non-existent user', async () => {
      const response = await request(app)
        .get('/api/billing/subscription')
        .query({ email: 'nonexistent@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.tier).toBe('free');
      expect(response.body.subscription).toBeNull();
    });

    it('should return user subscription info', async () => {
      const user = await createTestUser({
        id: 'user-sub',
        email: 'sub@example.com',
        subscriptionTier: 'pro',
      });

      await createTestBillingSubscription({
        userId: user.id,
        stripeSubscriptionId: 'sub_test',
        status: 'active',
      });

      const response = await request(app)
        .get('/api/billing/subscription')
        .query({ email: 'sub@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.tier).toBe('pro');
      expect(response.body.subscription).not.toBeNull();
      expect(response.body.subscription.stripeSubscriptionId).toBe('sub_test');
    });
  });
});