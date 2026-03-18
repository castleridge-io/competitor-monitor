import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';

// Create a mutable reference for the database
const dbRef = vi.hoisted(() => ({ current: null as unknown }));

// Mock the db module before importing routes
vi.mock('../../src/db/index.js', () => ({
  getDb: () => dbRef.current,
}));

// Import test utilities - must be after mock
import { 
  setupTestDatabase, 
  teardownTestDatabase, 
  getTestDb, 
  createTestUser, 
  createTestApiKey,
  createTestCompetitor,
  createTestScrape,
  createTestReport
} from '../utils/test-db.js';

describe('Public API Routes', () => {
  let app: Express;
  let publicApiRouter: express.Router;
  let rawKey: string;
  let userId: string;

  beforeEach(async () => {
    vi.resetModules();
    await setupTestDatabase();
    dbRef.current = getTestDb();

    // Create test user and API key
    const user = await createTestUser({ id: 'user-1', email: 'test@example.com' });
    userId = user.id;
    rawKey = 'cm_live_' + 'a'.repeat(64);
    const keyHash = await import('bcryptjs').then(b => b.hash(rawKey, 10));
    await createTestApiKey({ 
      userId: user.id, 
      name: 'Test Key',
      keyHash 
    });

    // Import router AFTER setting up db
    publicApiRouter = (await import('../../src/routes/public-api.js')).default;

    app = express();
    app.use(express.json());
    app.use('/api/v1/public', publicApiRouter);
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  describe('GET /api/v1/public/competitors', () => {
    it('should return all competitors with valid API key', async () => {
      await createTestCompetitor({ id: 'comp-1', name: 'Competitor 1' });
      await createTestCompetitor({ id: 'comp-2', name: 'Competitor 2' });

      const response = await request(app)
        .get('/api/v1/public/competitors')
        .set('X-API-Key', rawKey);

      expect(response.status).toBe(200);
      expect(response.body.competitors).toBeDefined();
      expect(response.body.competitors.length).toBe(2);
      expect(response.body.competitors[0]).toHaveProperty('id');
      expect(response.body.competitors[0]).toHaveProperty('name');
      expect(response.body.competitors[0]).toHaveProperty('url');
      expect(response.body.competitors[0]).toHaveProperty('createdAt');
    });

    it('should return empty array when no competitors exist', async () => {
      const response = await request(app)
        .get('/api/v1/public/competitors')
        .set('X-API-Key', rawKey);

      expect(response.status).toBe(200);
      expect(response.body.competitors).toEqual([]);
    });

    it('should return 401 without API key', async () => {
      const response = await request(app)
        .get('/api/v1/public/competitors');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('API key is required');
    });

    it('should support pagination', async () => {
      for (let i = 1; i <= 25; i++) {
        await createTestCompetitor({ id: `comp-${i}`, name: `Competitor ${i}` });
      }

      const response = await request(app)
        .get('/api/v1/public/competitors')
        .query({ limit: 10, offset: 0 })
        .set('X-API-Key', rawKey);

      expect(response.status).toBe(200);
      expect(response.body.competitors.length).toBe(10);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.total).toBe(25);
      expect(response.body.pagination.limit).toBe(10);
      expect(response.body.pagination.offset).toBe(0);
    });
  });

  describe('GET /api/v1/public/competitors/:id', () => {
    it('should return a single competitor', async () => {
      await createTestCompetitor({ id: 'comp-1', name: 'Test Competitor' });

      const response = await request(app)
        .get('/api/v1/public/competitors/comp-1')
        .set('X-API-Key', rawKey);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('comp-1');
      expect(response.body.name).toBe('Test Competitor');
      expect(response.body.url).toBeDefined();
      expect(response.body.createdAt).toBeDefined();
    });

    it('should return 404 for non-existent competitor', async () => {
      const response = await request(app)
        .get('/api/v1/public/competitors/nonexistent')
        .set('X-API-Key', rawKey);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Competitor not found');
    });

    it('should return 401 without API key', async () => {
      await createTestCompetitor({ id: 'comp-1', name: 'Test Competitor' });

      const response = await request(app)
        .get('/api/v1/public/competitors/comp-1');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/public/reports/:id', () => {
    it('should return a public report', async () => {
      const competitor = await createTestCompetitor({ id: 'comp-1', name: 'Test Competitor' });
      const scrape = await createTestScrape(competitor.id);
      const report = await createTestReport(competitor.id, scrape.id, {
        id: 'report-1',
        isPublic: true
      });

      const response = await request(app)
        .get('/api/v1/public/reports/report-1')
        .set('X-API-Key', rawKey);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('report-1');
      expect(response.body.competitorId).toBe(competitor.id);
      expect(response.body.jsonData).toBeDefined();
      expect(response.body.createdAt).toBeDefined();
      expect(response.body.htmlContent).toBeUndefined(); // Should not return HTML via API
    });

    it('should return 404 for non-existent report', async () => {
      const response = await request(app)
        .get('/api/v1/public/reports/nonexistent')
        .set('X-API-Key', rawKey);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Report not found');
    });

    it('should return 404 for non-public report', async () => {
      const competitor = await createTestCompetitor({ id: 'comp-1', name: 'Test Competitor' });
      const scrape = await createTestScrape(competitor.id);
      await createTestReport(competitor.id, scrape.id, {
        id: 'report-1',
        isPublic: false
      });

      const response = await request(app)
        .get('/api/v1/public/reports/report-1')
        .set('X-API-Key', rawKey);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Report not found or not public');
    });

    it('should return 401 without API key', async () => {
      const competitor = await createTestCompetitor({ id: 'comp-1', name: 'Test Competitor' });
      const scrape = await createTestScrape(competitor.id);
      await createTestReport(competitor.id, scrape.id, {
        id: 'report-1',
        isPublic: true
      });

      const response = await request(app)
        .get('/api/v1/public/reports/report-1');

      expect(response.status).toBe(401);
    });
  });
});
