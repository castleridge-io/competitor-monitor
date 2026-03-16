import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';

// Create a mutable reference for the database
const dbRef = vi.hoisted(() => ({ current: null as unknown }));

// Mock the db module
vi.mock('../../src/db/index.js', () => ({
  getDb: () => dbRef.current,
}));

// Import test utilities
import { setupTestDatabase, teardownTestDatabase, getTestDb, createTestCompetitor, createTestSubscription } from '../utils/test-db.js';
import * as schema from '../../src/db/schema.js';

describe('Subscriptions Routes', () => {
  let app: Express;
  let subscriptionsRouter: express.Router;

  beforeEach(async () => {
    vi.resetModules();
    await setupTestDatabase();
    dbRef.current = getTestDb();
    subscriptionsRouter = (await import('../../src/routes/subscriptions.js')).default;
    app = express();
    app.use(express.json());
    app.use('/api/subscriptions', subscriptionsRouter);
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  describe('POST /api/subscriptions', () => {
    it('should create a new subscription', async () => {
      await createTestCompetitor({ id: 'comp-1' });

      const response = await request(app)
        .post('/api/subscriptions')
        .send({
          email: 'user@example.com',
          competitorId: 'comp-1',
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.email).toBe('user@example.com');
      expect(response.body.competitorId).toBe('comp-1');
    });

    it('should return 400 when email is missing', async () => {
      await createTestCompetitor({ id: 'comp-1' });

      const response = await request(app)
        .post('/api/subscriptions')
        .send({
          competitorId: 'comp-1',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('email and competitorId are required');
    });

    it('should return 400 when competitorId is missing', async () => {
      const response = await request(app)
        .post('/api/subscriptions')
        .send({
          email: 'user@example.com',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('email and competitorId are required');
    });

    it('should return 404 for non-existent competitor', async () => {
      const response = await request(app)
        .post('/api/subscriptions')
        .send({
          email: 'user@example.com',
          competitorId: 'nonexistent',
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Competitor not found');
    });

    it('should return 409 for duplicate subscription', async () => {
      await createTestCompetitor({ id: 'comp-1' });
      await createTestSubscription('user@example.com', 'comp-1');

      const response = await request(app)
        .post('/api/subscriptions')
        .send({
          email: 'user@example.com',
          competitorId: 'comp-1',
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Already subscribed to this competitor');
    });

    it('should allow same email for different competitors', async () => {
      await createTestCompetitor({ id: 'comp-1' });
      await createTestCompetitor({ id: 'comp-2' });

      await createTestSubscription('user@example.com', 'comp-1');

      const response = await request(app)
        .post('/api/subscriptions')
        .send({
          email: 'user@example.com',
          competitorId: 'comp-2',
        });

      expect(response.status).toBe(201);
    });
  });

  describe('DELETE /api/subscriptions', () => {
    it('should delete a subscription', async () => {
      await createTestCompetitor({ id: 'comp-1' });
      await createTestSubscription('user@example.com', 'comp-1');

      const response = await request(app)
        .delete('/api/subscriptions')
        .send({
          email: 'user@example.com',
          competitorId: 'comp-1',
        });

      expect(response.status).toBe(204);

      const db = getTestDb();
      const subs = await db.select().from(schema.subscriptions);
      expect(subs.length).toBe(0);
    });

    it('should return 400 when email is missing', async () => {
      const response = await request(app)
        .delete('/api/subscriptions')
        .send({
          competitorId: 'comp-1',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('email and competitorId are required');
    });

    it('should return 204 even for non-existent subscription', async () => {
      const response = await request(app)
        .delete('/api/subscriptions')
        .send({
          email: 'nonexistent@example.com',
          competitorId: 'nonexistent',
        });

      expect(response.status).toBe(204);
    });
  });

  describe('GET /api/subscriptions/:email', () => {
    it('should return subscriptions for an email', async () => {
      await createTestCompetitor({ id: 'comp-1', name: 'Competitor 1' });
      await createTestCompetitor({ id: 'comp-2', name: 'Competitor 2' });
      await createTestSubscription('user@example.com', 'comp-1');
      await createTestSubscription('user@example.com', 'comp-2');

      const response = await request(app).get('/api/subscriptions/user@example.com');

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
    });

    it('should return empty array for email with no subscriptions', async () => {
      const response = await request(app).get('/api/subscriptions/nosubs@example.com');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should include competitor details', async () => {
      await createTestCompetitor({
        id: 'comp-1',
        name: 'Test Competitor',
        url: 'https://test.com',
      });
      await createTestSubscription('user@example.com', 'comp-1');

      const response = await request(app).get('/api/subscriptions/user@example.com');

      expect(response.status).toBe(200);
      expect(response.body[0].competitorName).toBe('Test Competitor');
      expect(response.body[0].competitorUrl).toBe('https://test.com');
    });
  });
});