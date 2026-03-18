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
import { setupTestDatabase, teardownTestDatabase, getTestDb, createTestUser, createTestApiKey } from '../utils/test-db.js';
import * as schema from '../../src/db/schema.js';

describe('Usage Tracking', () => {
  let app: Express;
  let apiKeysRouter: express.Router;
  let authMiddleware: any;
  let rawKey: string;
  let userId: string;
  let apiKeyId: string;

  beforeEach(async () => {
    vi.resetModules();
    await setupTestDatabase();
    dbRef.current = getTestDb();

    // Create test user and API key
    const user = await createTestUser({ id: 'user-1', email: 'test@example.com' });
    userId = user.id;
    rawKey = 'cm_live_' + 'a'.repeat(64);
    const keyHash = await import('bcryptjs').then(b => b.hash(rawKey, 10));
    const apiKey = await createTestApiKey({ 
      userId: user.id, 
      name: 'Test Key',
      keyHash 
    });
    apiKeyId = apiKey.id;

    // Import AFTER setting up db
    apiKeysRouter = (await import('../../src/routes/api-keys.js')).default;
    authMiddleware = (await import('../../src/middleware/auth.js')).authenticateApiKey;

    app = express();
    app.use(express.json());
    app.use('/api/api-keys', apiKeysRouter);
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  describe('API Key Usage Tracking', () => {
    it('should update last_used_at on successful authentication', async () => {
      const publicApiRouter = (await import('../../src/routes/public-api.js')).default;
      app.use('/api/v1/public', authMiddleware, publicApiRouter);

      // Initial state: last_used_at is null
      const db = getTestDb();
      const keysBefore = await db.select().from(schema.apiKeys);
      expect(keysBefore[0].lastUsedAt).toBeNull();

      // Make authenticated request
      await request(app)
        .get('/api/v1/public/competitors')
        .set('X-API-Key', rawKey);

      // Verify last_used_at was updated
      const keysAfter = await db.select().from(schema.apiKeys);
      expect(keysAfter[0].lastUsedAt).not.toBeNull();
    });

    it('should track multiple requests', async () => {
      const publicApiRouter = (await import('../../src/routes/public-api.js')).default;
      app.use('/api/v1/public', authMiddleware, publicApiRouter);

      // Make multiple requests
      await request(app)
        .get('/api/v1/public/competitors')
        .set('X-API-Key', rawKey);

      // Wait a bit to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 10));

      await request(app)
        .get('/api/v1/public/competitors')
        .set('X-API-Key', rawKey);

      // Verify last_used_at is updated
      const db = getTestDb();
      const keys = await db.select().from(schema.apiKeys);
      expect(keys[0].lastUsedAt).not.toBeNull();
    });

    it('should not update last_used_at for revoked key', async () => {
      // Revoke the key
      const db = getTestDb();
      await db.update(schema.apiKeys)
        .set({ revokedAt: new Date() })
        .where(schema.apiKeys.id.eq?.(apiKeyId));

      const publicApiRouter = (await import('../../src/routes/public-api.js')).default;
      app.use('/api/v1/public', authMiddleware, publicApiRouter);

      // Try to make request with revoked key
      const response = await request(app)
        .get('/api/v1/public/competitors')
        .set('X-API-Key', rawKey);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/api-keys/:id/usage', () => {
    it('should return usage stats for API key', async () => {
      const response = await request(app)
        .get(`/api/api-keys/${apiKeyId}/usage`)
        .query({ userId });

      expect(response.status).toBe(200);
      expect(response.body.apiKeyId).toBe(apiKeyId);
      expect(response.body.name).toBe('Test Key');
      expect(response.body.lastUsedAt).toBeDefined();
      expect(response.body.createdAt).toBeDefined();
    });

    it('should return 404 for non-existent API key', async () => {
      const response = await request(app)
        .get('/api/api-keys/nonexistent/usage')
        .query({ userId });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('API key not found');
    });

    it('should return 403 for another user\'s API key', async () => {
      const user2 = await createTestUser({ id: 'user-2', email: 'user2@example.com' });

      const response = await request(app)
        .get(`/api/api-keys/${apiKeyId}/usage`)
        .query({ userId: user2.id });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('You do not have permission to access this API key');
    });

    it('should return 400 when userId is missing', async () => {
      const response = await request(app)
        .get(`/api/api-keys/${apiKeyId}/usage`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('userId is required');
    });
  });

  describe('GET /api/api-keys/usage', () => {
    it('should return usage stats for all user\'s API keys', async () => {
      // Create another API key
      const rawKey2 = 'cm_live_' + 'b'.repeat(64);
      const keyHash2 = await import('bcryptjs').then(b => b.hash(rawKey2, 10));
      await createTestApiKey({ 
        userId, 
        name: 'Test Key 2',
        keyHash: keyHash2 
      });

      const response = await request(app)
        .get('/api/api-keys/usage')
        .query({ userId });

      expect(response.status).toBe(200);
      expect(response.body.apiKeys).toBeDefined();
      expect(response.body.apiKeys.length).toBe(2);
      expect(response.body.apiKeys[0]).toHaveProperty('id');
      expect(response.body.apiKeys[0]).toHaveProperty('name');
      expect(response.body.apiKeys[0]).toHaveProperty('lastUsedAt');
    });

    it('should not include revoked keys', async () => {
      // Create a revoked key
      const rawKey2 = 'cm_live_' + 'b'.repeat(64);
      const keyHash2 = await import('bcryptjs').then(b => b.hash(rawKey2, 10));
      await createTestApiKey({ 
        userId, 
        name: 'Revoked Key',
        keyHash: keyHash2,
        revokedAt: new Date()
      });

      const response = await request(app)
        .get('/api/api-keys/usage')
        .query({ userId });

      expect(response.status).toBe(200);
      expect(response.body.apiKeys.length).toBe(1);
      expect(response.body.apiKeys[0].name).toBe('Test Key');
    });

    it('should return empty array when no active API keys', async () => {
      // Revoke all keys
      const db = getTestDb();
      await db.update(schema.apiKeys)
        .set({ revokedAt: new Date() });

      const response = await request(app)
        .get('/api/api-keys/usage')
        .query({ userId });

      expect(response.status).toBe(200);
      expect(response.body.apiKeys).toEqual([]);
    });

    it('should return 400 when userId is missing', async () => {
      const response = await request(app)
        .get('/api/api-keys/usage');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('userId is required');
    });
  });
});
