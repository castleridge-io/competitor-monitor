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
import embedRouter from '../../src/routes/embed.js';

describe('Embed API', () => {
  let app: express.Application;

  beforeEach(async () => {
    await setupTestDatabase();
    dbRef.current = getTestDb();

    app = express();
    app.use(express.json());
    app.use('/api/v1/embed', embedRouter);
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  describe('GET /api/v1/embed/badge', () => {
    it('should return badge data in JSON format by default', async () => {
      const competitor = await createTestCompetitor({ name: 'Test Competitor' });
      await createTestScrape(competitor.id, { price: '$99/month' });

      const response = await request(app)
        .get(`/api/v1/embed/badge?competitors=${competitor.id}&apiKey=test-key`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('widgets');
      expect(response.body.widgets).toHaveLength(1);
      expect(response.body.widgets[0]).toHaveProperty('competitorName', 'Test Competitor');
      expect(response.body.widgets[0]).toHaveProperty('currentPrice', '$99/month');
    });

    it('should return HTML when Accept header is text/html', async () => {
      const competitor = await createTestCompetitor({ name: 'Test Competitor' });
      await createTestScrape(competitor.id, { price: '$99/month' });

      const response = await request(app)
        .get(`/api/v1/embed/badge?competitors=${competitor.id}&apiKey=test-key`)
        .set('Accept', 'text/html');

      expect(response.status).toBe(200);
      expect(response.type).toBe('text/html');
      expect(response.text).toContain('Test Competitor');
      expect(response.text).toContain('$99/month');
      expect(response.text).toContain('Powered by Competitor Monitor');
    });

    it('should handle multiple competitors', async () => {
      const comp1 = await createTestCompetitor({ id: 'comp-1', name: 'Competitor 1' });
      const comp2 = await createTestCompetitor({ id: 'comp-2', name: 'Competitor 2' });
      await createTestScrape(comp1.id, { price: '$99/month' });
      await createTestScrape(comp2.id, { price: '$149/month' });

      const response = await request(app)
        .get(`/api/v1/embed/badge?competitors=${comp1.id},${comp2.id}&apiKey=test-key`);

      expect(response.status).toBe(200);
      expect(response.body.widgets).toHaveLength(2);
      expect(response.body.widgets[0].competitorName).toBe('Competitor 1');
      expect(response.body.widgets[1].competitorName).toBe('Competitor 2');
    });

    it('should apply theme customization', async () => {
      const competitor = await createTestCompetitor({ name: 'Test Competitor' });
      await createTestScrape(competitor.id, { price: '$99/month' });

      const response = await request(app)
        .get(`/api/v1/embed/badge?competitors=${competitor.id}&apiKey=test-key-2&theme=dark`)
        .set('Accept', 'text/html');

      expect(response.status).toBe(200);
      expect(response.text).toContain('theme-dark');
    });

    it('should require apiKey parameter', async () => {
      const response = await request(app)
        .get('/api/v1/embed/badge?competitors=some-id');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('apiKey is required');
    });
  });

  describe('GET /api/v1/embed/timeline', () => {
    it('should return timeline data in JSON format', async () => {
      const competitor = await createTestCompetitor({ name: 'Test Competitor' });
      await createTestNarrative(competitor.id, 'First change');
      await createTestNarrative(competitor.id, 'Second change');

      const response = await request(app)
        .get(`/api/v1/embed/timeline?competitors=${competitor.id}&apiKey=test-key`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('widgets');
      expect(response.body.widgets).toHaveLength(1);
      expect(response.body.widgets[0]).toHaveProperty('changes');
      expect(response.body.widgets[0].changes).toHaveLength(2);
    });

    it('should respect limit parameter', async () => {
      const competitor = await createTestCompetitor({ name: 'Test Competitor' });
      await createTestNarrative(competitor.id, 'Change 1');
      await createTestNarrative(competitor.id, 'Change 2');
      await createTestNarrative(competitor.id, 'Change 3');

      const response = await request(app)
        .get(`/api/v1/embed/timeline?competitors=${competitor.id}&apiKey=test-key&limit=2`);

      expect(response.status).toBe(200);
      expect(response.body.widgets[0].changes).toHaveLength(2);
    });

    it('should return HTML with timeline visualization', async () => {
      const competitor = await createTestCompetitor({ name: 'Test Competitor' });
      await createTestNarrative(competitor.id, 'Test change');

      const response = await request(app)
        .get(`/api/v1/embed/timeline?competitors=${competitor.id}&apiKey=test-key`)
        .set('Accept', 'text/html');

      expect(response.status).toBe(200);
      expect(response.type).toBe('text/html');
      expect(response.text).toContain('timeline');
      expect(response.text).toContain('Test change');
    });
  });

  describe('GET /api/v1/embed/comparison', () => {
    it('should return comparison card data in JSON format', async () => {
      const competitor = await createTestCompetitor({ name: 'Test Competitor' });
      await createTestScrape(competitor.id, { 
        price: '$99/month',
        features: ['Feature 1', 'Feature 2']
      });

      const response = await request(app)
        .get(`/api/v1/embed/comparison?competitors=${competitor.id}&apiKey=test-key`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('widgets');
      expect(response.body.widgets).toHaveLength(1);
      expect(response.body.widgets[0]).toHaveProperty('features');
    });

    it('should return HTML comparison card', async () => {
      const competitor = await createTestCompetitor({ name: 'Test Competitor' });
      await createTestScrape(competitor.id, { 
        price: '$99/month',
        features: ['Feature 1', 'API']
      });

      const response = await request(app)
        .get(`/api/v1/embed/comparison?competitors=${competitor.id}&apiKey=test-key`)
        .set('Accept', 'text/html');

      expect(response.status).toBe(200);
      expect(response.type).toBe('text/html');
      expect(response.text).toContain('Test Competitor');
    });
  });

  describe('CORS headers', () => {
    it('should include proper CORS headers for cross-origin requests', async () => {
      const competitor = await createTestCompetitor({ name: 'Test' });
      await createTestScrape(competitor.id, { price: '$99' });

      const response = await request(app)
        .get(`/api/v1/embed/badge?competitors=${competitor.id}&apiKey=test-key`)
        .set('Origin', 'https://example.com');

      expect(response.headers['access-control-allow-origin']).toBe('*');
      expect(response.headers['access-control-allow-methods']).toContain('GET');
    });
  });
});
