import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express, { Express, Request, Response, NextFunction } from 'express';
import request from 'supertest';

// Create a mutable reference for the database
const dbRef = vi.hoisted(() => ({ current: null as unknown }));

// Mock the db module before importing middleware
vi.mock('../../src/db/index.js', () => ({
  getDb: () => dbRef.current,
}));

// Import test utilities - must be after mock
import { setupTestDatabase, teardownTestDatabase, getTestDb, createTestUser, createTestApiKey } from '../utils/test-db.js';

describe('Rate Limiting Middleware', () => {
  let app: Express;
  let rateLimiter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
  let authMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<void>;

  beforeEach(async () => {
    vi.resetModules();
    await setupTestDatabase();
    dbRef.current = getTestDb();

    // Import middleware AFTER setting up db
    const rateLimiterModule = await import('../../src/middleware/rate-limiter.js');
    rateLimiter = rateLimiterModule.rateLimiter;
    authMiddleware = (await import('../../src/middleware/auth.js')).authenticateApiKey;

    app = express();
    app.use(express.json());
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  describe('rateLimiter', () => {
    it('should allow requests within rate limit', async () => {
      const user = await createTestUser({ id: 'user-1', email: 'test@example.com' });
      const rawKey = 'cm_live_' + 'a'.repeat(64);
      const keyHash = await import('bcryptjs').then(b => b.hash(rawKey, 10));
      await createTestApiKey({ 
        userId: user.id, 
        name: 'Test Key',
        keyHash 
      });

      app.get('/api/test', authMiddleware, rateLimiter, (_req: Request, res: Response) => {
        res.json({ message: 'Success' });
      });

      // Make 5 requests (well under limit)
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .get('/api/test')
          .set('X-API-Key', rawKey);

        expect(response.status).toBe(200);
      }
    });

    it('should return 429 when rate limit exceeded', async () => {
      const user = await createTestUser({ id: 'user-1', email: 'test@example.com' });
      const rawKey = 'cm_live_' + 'a'.repeat(64);
      const keyHash = await import('bcryptjs').then(b => b.hash(rawKey, 10));
      await createTestApiKey({ 
        userId: user.id, 
        name: 'Test Key',
        keyHash 
      });

      app.get('/api/test', authMiddleware, rateLimiter, (_req: Request, res: Response) => {
        res.json({ message: 'Success' });
      });

      // Override rate limit for testing (normally 100 req/min)
      process.env.RATE_LIMIT_MAX = '5';
      vi.resetModules();
      const rateLimiterModule = await import('../../src/middleware/rate-limiter.js');
      const testRateLimiter = rateLimiterModule.rateLimiter;

      app = express();
      app.use(express.json());
      app.get('/api/test', authMiddleware, testRateLimiter, (_req: Request, res: Response) => {
        res.json({ message: 'Success' });
      });

      // Make 5 requests (at limit)
      for (let i = 0; i < 5; i++) {
        await request(app)
          .get('/api/test')
          .set('X-API-Key', rawKey);
      }

      // 6th request should be rate limited
      const response = await request(app)
        .get('/api/test')
        .set('X-API-Key', rawKey);

      expect(response.status).toBe(429);
      expect(response.body.error).toBe('Too many requests');
      expect(response.body.retryAfter).toBeDefined();

      delete process.env.RATE_LIMIT_MAX;
    });

    it('should include rate limit headers', async () => {
      const user = await createTestUser({ id: 'user-1', email: 'test@example.com' });
      const rawKey = 'cm_live_' + 'a'.repeat(64);
      const keyHash = await import('bcryptjs').then(b => b.hash(rawKey, 10));
      await createTestApiKey({ 
        userId: user.id, 
        name: 'Test Key',
        keyHash 
      });

      app.get('/api/test', authMiddleware, rateLimiter, (_req: Request, res: Response) => {
        res.json({ message: 'Success' });
      });

      const response = await request(app)
        .get('/api/test')
        .set('X-API-Key', rawKey);

      expect(response.status).toBe(200);
      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
    });

    it('should rate limit per API key independently', async () => {
      const user1 = await createTestUser({ id: 'user-1', email: 'user1@example.com' });
      const user2 = await createTestUser({ id: 'user-2', email: 'user2@example.com' });
      
      const rawKey1 = 'cm_live_' + 'a'.repeat(64);
      const keyHash1 = await import('bcryptjs').then(b => b.hash(rawKey1, 10));
      await createTestApiKey({ 
        userId: user1.id, 
        name: 'Key 1',
        keyHash: keyHash1 
      });

      const rawKey2 = 'cm_live_' + 'b'.repeat(64);
      const keyHash2 = await import('bcryptjs').then(b => b.hash(rawKey2, 10));
      await createTestApiKey({ 
        userId: user2.id, 
        name: 'Key 2',
        keyHash: keyHash2 
      });

      app.get('/api/test', authMiddleware, rateLimiter, (_req: Request, res: Response) => {
        res.json({ message: 'Success' });
      });

      // Make requests with key1
      const response1 = await request(app)
        .get('/api/test')
        .set('X-API-Key', rawKey1);

      expect(response1.status).toBe(200);
      expect(response1.headers['x-ratelimit-remaining']).toBe('99');

      // Make request with key2 - should have separate limit
      const response2 = await request(app)
        .get('/api/test')
        .set('X-API-Key', rawKey2);

      expect(response2.status).toBe(200);
      expect(response2.headers['x-ratelimit-remaining']).toBe('99');
    });

    it('should not rate limit requests without API key', async () => {
      app.get('/api/public', rateLimiter, (_req: Request, res: Response) => {
        res.json({ message: 'Success' });
      });

      const response = await request(app)
        .get('/api/public');

      // Should pass through without rate limiting
      expect(response.status).toBe(200);
    });
  });
});
