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
import { setupTestDatabase, teardownTestDatabase, getTestDb } from '../utils/test-db.js';

describe('API Documentation Routes', () => {
  let app: Express;
  let docsRouter: express.Router;

  beforeEach(async () => {
    vi.resetModules();
    await setupTestDatabase();
    dbRef.current = getTestDb();

    // Import router AFTER setting up db
    docsRouter = (await import('../../src/routes/api-docs.js')).default;

    app = express();
    app.use(express.json());
    app.use('/api', docsRouter);
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  describe('GET /api/docs', () => {
    it('should return Swagger UI HTML', async () => {
      const response = await request(app)
        .get('/api/docs');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/html/);
      expect(response.text).toContain('swagger-ui');
    });

    it('should include OpenAPI spec configuration', async () => {
      const response = await request(app)
        .get('/api/docs');

      expect(response.status).toBe(200);
      // Swagger UI loads the spec internally via url configuration
      expect(response.text).toContain('url');
    });
  });

  describe('GET /api/docs.json', () => {
    it('should return OpenAPI JSON spec', async () => {
      const response = await request(app)
        .get('/api/docs.json');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toHaveProperty('openapi');
      expect(response.body).toHaveProperty('info');
      expect(response.body).toHaveProperty('paths');
    });

    it('should include API info', async () => {
      const response = await request(app)
        .get('/api/docs.json');

      expect(response.status).toBe(200);
      expect(response.body.info).toHaveProperty('title');
      expect(response.body.info).toHaveProperty('version');
      expect(response.body.info).toHaveProperty('description');
    });

    it('should include public API endpoints', async () => {
      const response = await request(app)
        .get('/api/docs.json');

      expect(response.status).toBe(200);
      
      const paths = response.body.paths;
      
      // Check for public endpoints (without /api prefix since server URL is /api)
      expect(paths).toHaveProperty('/v1/public/competitors');
      expect(paths['/v1/public/competitors']).toHaveProperty('get');
      
      expect(paths).toHaveProperty('/v1/public/competitors/{id}');
      expect(paths['/v1/public/competitors/{id}']).toHaveProperty('get');
      
      expect(paths).toHaveProperty('/v1/public/reports/{id}');
      expect(paths['/v1/public/reports/{id}']).toHaveProperty('get');
    });

    it('should include API key authentication in spec', async () => {
      const response = await request(app)
        .get('/api/docs.json');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('components');
      expect(response.body.components).toHaveProperty('securitySchemes');
      expect(response.body.components.securitySchemes).toHaveProperty('ApiKeyAuth');
    });

    it('should document request/response schemas', async () => {
      const response = await request(app)
        .get('/api/docs.json');

      expect(response.status).toBe(200);
      
      const competitorsPath = response.body.paths['/v1/public/competitors'];
      expect(competitorsPath.get).toHaveProperty('responses');
      expect(competitorsPath.get.responses).toHaveProperty('200');
      expect(competitorsPath.get.responses['200']).toHaveProperty('description');
      expect(competitorsPath.get.responses['200']).toHaveProperty('content');
    });

    it('should document error responses', async () => {
      const response = await request(app)
        .get('/api/docs.json');

      expect(response.status).toBe(200);
      
      const competitorsPath = response.body.paths['/v1/public/competitors'];
      expect(competitorsPath.get.responses).toHaveProperty('401');
      expect(competitorsPath.get.responses['401'].description).toMatch(/unauthorized/i);
      
      expect(competitorsPath.get.responses).toHaveProperty('429');
      expect(competitorsPath.get.responses['429'].description).toMatch(/rate limit/i);
    });
  });
});
