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
import { setupTestDatabase, teardownTestDatabase, getTestDb, createTestCompetitor, createTestScrape, createTestReport, createTestWaitlistEntry } from '../utils/test-db.js';
import * as schema from '../../src/db/schema.js';

describe('Public Routes', () => {
  let app: Express;
  let publicRouter: express.Router;

  beforeEach(async () => {
    vi.resetModules();
    await setupTestDatabase();
    dbRef.current = getTestDb();
    publicRouter = (await import('../../src/routes/public.js')).default;
    app = express();
    app.use(express.json());
    app.use('/public', publicRouter);
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  describe('GET /public/reports/:id', () => {
    it('should return public report HTML', async () => {
      const competitor = await createTestCompetitor({ id: 'comp-1' });
      const scrape = await createTestScrape(competitor.id);
      await createTestReport(competitor.id, scrape.id, {
        id: 'public-report',
        isPublic: true,
        htmlContent: '<html><body>Public Report</body></html>',
      });

      const response = await request(app).get('/public/reports/public-report');

      expect(response.status).toBe(200);
      expect(response.text).toBe('<html><body>Public Report</body></html>');
      expect(response.headers['content-type']).toContain('text/html');
    });

    it('should return 404 for non-existent report', async () => {
      const response = await request(app).get('/public/reports/nonexistent');

      expect(response.status).toBe(404);
      expect(response.text).toContain('Report not found');
    });

    it('should return 404 for private report', async () => {
      const competitor = await createTestCompetitor({ id: 'comp-1' });
      const scrape = await createTestScrape(competitor.id);
      await createTestReport(competitor.id, scrape.id, {
        id: 'private-report',
        isPublic: false,
      });

      const response = await request(app).get('/public/reports/private-report');

      expect(response.status).toBe(404);
      expect(response.text).toContain('not public');
    });
  });

  describe('POST /public/waitlist', () => {
    it('should add email to waitlist', async () => {
      const response = await request(app)
        .post('/public/waitlist')
        .send({ email: 'newuser@example.com' });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Added to waitlist');
      expect(response.body.id).toBeDefined();
    });

    it('should return 400 when email is missing', async () => {
      const response = await request(app)
        .post('/public/waitlist')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('email is required');
    });

    it('should return 409 for duplicate email', async () => {
      await createTestWaitlistEntry('existing@example.com');

      const response = await request(app)
        .post('/public/waitlist')
        .send({ email: 'existing@example.com' });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Email already on waitlist');
    });

    it('should store waitlist entry in database', async () => {
      await request(app)
        .post('/public/waitlist')
        .send({ email: 'stored@example.com' });

      const db = getTestDb();
      const entries = await db.select().from(schema.waitlist);

      expect(entries.length).toBe(1);
      expect(entries[0].email).toBe('stored@example.com');
    });
  });
});