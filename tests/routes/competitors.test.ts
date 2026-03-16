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
import { setupTestDatabase, teardownTestDatabase, getTestDb, createTestCompetitor } from '../utils/test-db.js';
import * as schema from '../../src/db/schema.js';

describe('Competitors Routes', () => {
  let app: Express;
  let competitorsRouter: express.Router;

  beforeEach(async () => {
    // Reset module cache to get fresh router with new db
    vi.resetModules();

    await setupTestDatabase();
    dbRef.current = getTestDb();

    // Import router AFTER setting up db
    competitorsRouter = (await import('../../src/routes/competitors.js')).default;

    app = express();
    app.use(express.json());
    app.use('/api/competitors', competitorsRouter);
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  describe('GET /api/competitors', () => {
    it('should return empty array when no competitors exist', async () => {
      const response = await request(app).get('/api/competitors');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return all competitors', async () => {
      await createTestCompetitor({ id: 'comp-1', name: 'Competitor 1' });
      await createTestCompetitor({ id: 'comp-2', name: 'Competitor 2' });

      const response = await request(app).get('/api/competitors');

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
    });
  });

  describe('GET /api/competitors/:id', () => {
    it('should return a single competitor', async () => {
      await createTestCompetitor({ id: 'comp-1', name: 'Test Competitor' });

      const response = await request(app).get('/api/competitors/comp-1');

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('comp-1');
      expect(response.body.name).toBe('Test Competitor');
    });

    it('should return 404 for non-existent competitor', async () => {
      const response = await request(app).get('/api/competitors/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Competitor not found');
    });
  });

  describe('POST /api/competitors', () => {
    it('should create a new competitor', async () => {
      const response = await request(app)
        .post('/api/competitors')
        .send({
          name: 'New Competitor',
          url: 'https://newcompetitor.com',
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.name).toBe('New Competitor');
      expect(response.body.url).toBe('https://newcompetitor.com');
    });

    it('should return 400 when name is missing', async () => {
      const response = await request(app)
        .post('/api/competitors')
        .send({
          url: 'https://example.com',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('name and url are required');
    });

    it('should return 400 when url is missing', async () => {
      const response = await request(app)
        .post('/api/competitors')
        .send({
          name: 'Test Competitor',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('name and url are required');
    });

    it('should store competitor in database', async () => {
      await request(app)
        .post('/api/competitors')
        .send({
          name: 'DB Test',
          url: 'https://dbtest.com',
        });

      const db = getTestDb();
      const competitors = await db.select().from(schema.competitors);

      expect(competitors.length).toBe(1);
      expect(competitors[0].name).toBe('DB Test');
      expect(competitors[0].url).toBe('https://dbtest.com');
    });
  });

  describe('PATCH /api/competitors/:id', () => {
    it('should update competitor name', async () => {
      await createTestCompetitor({ id: 'comp-1', name: 'Original Name' });

      const response = await request(app)
        .patch('/api/competitors/comp-1')
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Name');
    });

    it('should return 404 for non-existent competitor', async () => {
      const response = await request(app)
        .patch('/api/competitors/nonexistent')
        .send({ name: 'Updated' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/competitors/:id', () => {
    it('should delete a competitor', async () => {
      await createTestCompetitor({ id: 'comp-to-delete' });

      const response = await request(app).delete('/api/competitors/comp-to-delete');

      expect(response.status).toBe(204);

      const db = getTestDb();
      const competitors = await db.select().from(schema.competitors);
      expect(competitors.find((c) => c.id === 'comp-to-delete')).toBeUndefined();
    });

    it('should return 204 even for non-existent competitor', async () => {
      const response = await request(app).delete('/api/competitors/nonexistent');

      expect(response.status).toBe(204);
    });
  });
});