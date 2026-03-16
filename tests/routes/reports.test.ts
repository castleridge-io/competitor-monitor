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
import { setupTestDatabase, teardownTestDatabase, getTestDb, createTestCompetitor, createTestScrape, createTestReport } from '../utils/test-db.js';

describe('Reports Routes', () => {
  let app: Express;
  let reportsRouter: express.Router;

  beforeEach(async () => {
    vi.resetModules();
    await setupTestDatabase();
    dbRef.current = getTestDb();
    reportsRouter = (await import('../../src/routes/reports.js')).default;
    app = express();
    app.use(express.json());
    app.use('/api/reports', reportsRouter);
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  describe('GET /api/reports', () => {
    it('should return empty array when no reports exist', async () => {
      const response = await request(app).get('/api/reports');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return all reports', async () => {
      const competitor = await createTestCompetitor({ id: 'comp-1' });
      const scrape = await createTestScrape(competitor.id);
      await createTestReport(competitor.id, scrape.id, { id: 'report-1' });
      await createTestReport(competitor.id, scrape.id, { id: 'report-2' });

      const response = await request(app).get('/api/reports');

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
    });

    it('should not include htmlContent and jsonData in list', async () => {
      const competitor = await createTestCompetitor({ id: 'comp-1' });
      const scrape = await createTestScrape(competitor.id);
      await createTestReport(competitor.id, scrape.id);

      const response = await request(app).get('/api/reports');

      expect(response.status).toBe(200);
      expect(response.body[0].htmlContent).toBeUndefined();
      expect(response.body[0].jsonData).toBeUndefined();
    });
  });

  describe('GET /api/reports/:id', () => {
    it('should return a single report', async () => {
      const competitor = await createTestCompetitor({ id: 'comp-1' });
      const scrape = await createTestScrape(competitor.id);
      await createTestReport(competitor.id, scrape.id, {
        id: 'report-1',
        jsonData: { price: '$99', name: 'Test' },
      });

      const response = await request(app).get('/api/reports/report-1');

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('report-1');
      expect(response.body.jsonData.price).toBe('$99');
    });

    it('should return 404 for non-existent report', async () => {
      const response = await request(app).get('/api/reports/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Report not found');
    });

    it('should include htmlContent', async () => {
      const competitor = await createTestCompetitor({ id: 'comp-1' });
      const scrape = await createTestScrape(competitor.id);
      const report = await createTestReport(competitor.id, scrape.id, { id: 'report-1' });

      const response = await request(app).get(`/api/reports/${report.id}`);

      expect(response.status).toBe(200);
      expect(response.body.htmlContent).toBeDefined();
    });
  });

  describe('PATCH /api/reports/:id/public', () => {
    it('should make report public', async () => {
      const competitor = await createTestCompetitor({ id: 'comp-1' });
      const scrape = await createTestScrape(competitor.id);
      const report = await createTestReport(competitor.id, scrape.id, { isPublic: false });

      const response = await request(app)
        .patch(`/api/reports/${report.id}/public`)
        .send({ isPublic: true });

      expect(response.status).toBe(200);
      expect(response.body.isPublic).toBe(true);
    });

    it('should make report private', async () => {
      const competitor = await createTestCompetitor({ id: 'comp-1' });
      const scrape = await createTestScrape(competitor.id);
      const report = await createTestReport(competitor.id, scrape.id, { isPublic: true });

      const response = await request(app)
        .patch(`/api/reports/${report.id}/public`)
        .send({ isPublic: false });

      expect(response.status).toBe(200);
      expect(response.body.isPublic).toBe(false);
    });

    it('should return 404 for non-existent report', async () => {
      const response = await request(app)
        .patch('/api/reports/nonexistent/public')
        .send({ isPublic: true });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Report not found');
    });
  });
});