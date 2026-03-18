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
import * as schema from '../../src/db/schema.js';

describe('Authentication Middleware', () => {
  let app: Express;
  let authMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<void>;

  beforeEach(async () => {
    vi.resetModules();
    await setupTestDatabase();
    dbRef.current = getTestDb();

    // Import middleware AFTER setting up db
    authMiddleware = (await import('../../src/middleware/auth.js')).authenticateApiKey;

    app = express();
    app.use(express.json());
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  describe('authenticateApiKey', () => {
    it('should authenticate valid API key', async () => {
      const user = await createTestUser({ id: 'user-1', email: 'test@example.com' });
      const rawKey = 'cm_live_' + 'a'.repeat(64);
      const keyHash = await import('bcryptjs').then(b => b.hash(rawKey, 10));
      await createTestApiKey({ 
        userId: user.id, 
        name: 'Test Key',
        keyHash 
      });

      app.get('/protected', authMiddleware, (req: Request, res: Response) => {
        res.json({ 
          message: 'Success', 
          userId: (req as any).user?.id,
          apiKeyId: (req as any).apiKey?.id 
        });
      });

      const response = await request(app)
        .get('/protected')
        .set('X-API-Key', rawKey);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Success');
      expect(response.body.userId).toBe(user.id);
    });

    it('should return 401 when API key is missing', async () => {
      app.get('/protected', authMiddleware, (_req: Request, res: Response) => {
        res.json({ message: 'Success' });
      });

      const response = await request(app)
        .get('/protected');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('API key is required');
    });

    it('should return 401 when API key is invalid', async () => {
      app.get('/protected', authMiddleware, (_req: Request, res: Response) => {
        res.json({ message: 'Success' });
      });

      const response = await request(app)
        .get('/protected')
        .set('X-API-Key', 'invalid-key');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid API key');
    });

    it('should return 401 when API key is revoked', async () => {
      const user = await createTestUser({ id: 'user-1', email: 'test@example.com' });
      const rawKey = 'cm_live_' + 'a'.repeat(64);
      const keyHash = await import('bcryptjs').then(b => b.hash(rawKey, 10));
      await createTestApiKey({ 
        userId: user.id, 
        name: 'Test Key',
        keyHash,
        revokedAt: new Date()
      });

      app.get('/protected', authMiddleware, (_req: Request, res: Response) => {
        res.json({ message: 'Success' });
      });

      const response = await request(app)
        .get('/protected')
        .set('X-API-Key', rawKey);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('API key has been revoked');
    });

    it('should update last_used_at on successful authentication', async () => {
      const user = await createTestUser({ id: 'user-1', email: 'test@example.com' });
      const rawKey = 'cm_live_' + 'a'.repeat(64);
      const keyHash = await import('bcryptjs').then(b => b.hash(rawKey, 10));
      const apiKey = await createTestApiKey({ 
        userId: user.id, 
        name: 'Test Key',
        keyHash,
        lastUsedAt: null
      });

      app.get('/protected', authMiddleware, (_req: Request, res: Response) => {
        res.json({ message: 'Success' });
      });

      const response = await request(app)
        .get('/protected')
        .set('X-API-Key', rawKey);

      expect(response.status).toBe(200);

      // Verify last_used_at was updated
      const db = getTestDb();
      const keys = await db.select().from(schema.apiKeys);
      expect(keys[0].lastUsedAt).not.toBeNull();
    });

    it('should reject API key with wrong format', async () => {
      app.get('/protected', authMiddleware, (_req: Request, res: Response) => {
        res.json({ message: 'Success' });
      });

      const response = await request(app)
        .get('/protected')
        .set('X-API-Key', 'wrong-format-key');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid API key');
    });
  });
});
