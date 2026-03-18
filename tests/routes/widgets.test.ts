import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express, { Request, Response } from 'express';

// Create a mutable reference for the database
const dbRef = vi.hoisted(() => ({ current: null as unknown }));

// Mock the db module
vi.mock('../../src/db/index.js', () => ({
  getDb: () => dbRef.current,
}));

// Import test utilities
import { 
  setupTestDatabase, 
  teardownTestDatabase, 
  getTestDb, 
  createTestCompetitor, 
  createTestScrape, 
  createTestNarrative 
} from '../utils/test-db.js';
import widgetsRouter from '../../src/routes/widgets.js';
import * as schema from '../../src/db/schema.js';

describe('Widgets API', () => {
  let app: express.Application;

  beforeEach(async () => {
    vi.resetModules();
    await setupTestDatabase();
    dbRef.current = getTestDb();

    app = express();
    app.use(express.json());
    app.use('/api/v1/widgets', widgetsRouter);
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  describe('GET /api/v1/widgets/:competitorId/badge', () => {
    it('should return 404 for non-existent competitor', async () => {
      const response = await request(app)
        .get('/api/v1/widgets/non-existent-id/badge');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Competitor not found');
    });

    it('should return badge data for existing competitor', async () => {
      const competitor = await createTestCompetitor({ name: 'Test Competitor' });
      await createTestScrape(competitor.id, { price: '$99/month' });

      const response = await request(app)
        .get(`/api/v1/widgets/${competitor.id}/badge`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('competitorId', competitor.id);
      expect(response.body).toHaveProperty('competitorName', 'Test Competitor');
      expect(response.body).toHaveProperty('currentPrice', '$99/month');
    });
  });

  describe('GET /api/v1/widgets/:competitorId/card', () => {
    it('should return 404 for non-existent competitor', async () => {
      const response = await request(app)
        .get('/api/v1/widgets/non-existent-id/card');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Competitor not found');
    });

    it('should return card data for existing competitor', async () => {
      const competitor = await createTestCompetitor({ name: 'Card Test' });
      const db = getTestDb();

      // Create a battlecard
      await db.insert(schema.battlecards).values({
        id: 'battlecard-test',
        competitorId: competitor.id,
        title: 'Test Battlecard',
        summary: 'Test summary',
        strengths: JSON.stringify(['Fast', 'Reliable']),
        weaknesses: JSON.stringify(['Expensive']),
        pricing: JSON.stringify({ competitor: '$199/month' }),
        features: JSON.stringify([{ feature: 'API', competitor: true, ours: false }]),
        winStrategies: JSON.stringify(['Focus on price']),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app)
        .get(`/api/v1/widgets/${competitor.id}/card`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('competitorId', competitor.id);
      expect(response.body).toHaveProperty('competitorName', 'Card Test');
      expect(response.body).toHaveProperty('title', 'Test Battlecard');
      expect(response.body.strengths).toEqual(['Fast', 'Reliable']);
    });
  });

  describe('GET /api/v1/widgets/:competitorId/timeline', () => {
    it('should return 404 for non-existent competitor', async () => {
      const response = await request(app)
        .get('/api/v1/widgets/non-existent-id/timeline');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Competitor not found');
    });

    it('should return timeline data for existing competitor', async () => {
      const competitor = await createTestCompetitor({ name: 'Timeline Test' });
      await createTestNarrative(competitor.id, 'Test narrative');

      const response = await request(app)
        .get(`/api/v1/widgets/${competitor.id}/timeline`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('competitorId', competitor.id);
      expect(response.body).toHaveProperty('competitorName', 'Timeline Test');
      expect(response.body.changes).toHaveLength(1);
      expect(response.body.changes[0]).toHaveProperty('narrative', 'Test narrative');
    });
  });
});