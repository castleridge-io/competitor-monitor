import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';

// Create a mutable reference for the database
const dbRef = vi.hoisted(() => ({ current: null as unknown }));

// Mock the db module
vi.mock('../../src/db/index.js', () => ({
  getDb: () => dbRef.current,
}));

// Mock scraper
vi.mock('../../src/services/scraper.js', () => ({
  scrapeCompetitor: vi.fn().mockResolvedValue({
    price: '$99/month',
    features: ['Feature 1', 'Feature 2'],
    name: 'Test Product',
    url: 'https://example.com',
    scrapedAt: new Date().toISOString(),
    raw: {},
  }),
}));

// Mock reporter
vi.mock('../../src/services/reporter.js', () => ({
  generateReport: vi.fn().mockResolvedValue({
    id: 'report-123',
    competitorId: 'comp-1',
    scrapeId: 'scrape-123',
    htmlContent: '<html></html>',
    jsonData: {},
    isPublic: false,
    createdAt: new Date(),
  }),
}));

// Import test utilities
import { setupTestDatabase, teardownTestDatabase, getTestDb, createTestCompetitor, createTestScrape } from '../utils/test-db.js';
import * as schema from '../../src/db/schema.js';

describe('Scrape Routes', () => {
  let app: Express;
  let scrapeRouter: express.Router;
  let scrapeCompetitor: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    await setupTestDatabase();
    dbRef.current = getTestDb();

    // Import after db is set up
    scrapeRouter = (await import('../../src/routes/scrape.js')).default;
    const scraperMod = await import('../../src/services/scraper.js');
    scrapeCompetitor = vi.mocked(scraperMod.scrapeCompetitor);

    app = express();
    app.use(express.json());
    app.use('/api/scrape', scrapeRouter);
    vi.clearAllMocks();
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  describe('POST /api/scrape/:competitorId', () => {
    it('should trigger scrape for a competitor', async () => {
      await createTestCompetitor({ id: 'comp-1', name: 'Test Competitor' });

      const response = await request(app).post('/api/scrape/comp-1');

      expect(response.status).toBe(200);
      expect(response.body.scrapeId).toBeDefined();
      expect(response.body.reportId).toBeDefined();
      expect(response.body.data).toBeDefined();
    });

    it('should return 404 for non-existent competitor', async () => {
      const response = await request(app).post('/api/scrape/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Competitor not found');
    });

    it('should store scrape in database', async () => {
      await createTestCompetitor({ id: 'comp-1' });

      await request(app).post('/api/scrape/comp-1');

      const db = getTestDb();
      const scrapes = await db.select().from(schema.scrapes);

      expect(scrapes.length).toBe(1);
      expect(scrapes[0].competitorId).toBe('comp-1');
    });

    it('should handle scrape errors gracefully', async () => {
      await createTestCompetitor({ id: 'comp-1' });
      vi.mocked(scrapeCompetitor).mockRejectedValueOnce(new Error('Scrape failed'));

      const response = await request(app).post('/api/scrape/comp-1');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Scrape failed');
    });
  });

  describe('GET /api/scrape/:competitorId', () => {
    it('should return scrape history for competitor', async () => {
      await createTestCompetitor({ id: 'comp-1' });
      await createTestScrape('comp-1', { price: '$99' });
      await createTestScrape('comp-1', { price: '$79' });

      const response = await request(app).get('/api/scrape/comp-1');

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
    });

    it('should return empty array when no scrapes exist', async () => {
      await createTestCompetitor({ id: 'comp-1' });

      const response = await request(app).get('/api/scrape/comp-1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should limit results to 10', async () => {
      await createTestCompetitor({ id: 'comp-1' });

      // Create 15 scrapes
      for (let i = 0; i < 15; i++) {
        await createTestScrape('comp-1', { price: `$${i}` });
      }

      const response = await request(app).get('/api/scrape/comp-1');

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(10);
    });
  });
});