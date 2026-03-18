import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';
import crypto from 'crypto';

// Create a mutable reference for the database
const dbRef = vi.hoisted(() => ({ current: null as unknown }));

// Mock the db module before importing routes
vi.mock('../../src/db/index.js', () => ({
  getDb: () => dbRef.current,
}));

// Import test utilities - must be after mock
import { setupTestDatabase, teardownTestDatabase, getTestDb, createTestUser, createTestApiKey } from '../utils/test-db.js';

describe('API Keys Routes', () => {
  let app: Express;
  let apiKeysRouter: express.Router;

  beforeEach(async () => {
    // Reset module cache to get fresh router with new db
    vi.resetModules();

    await setupTestDatabase();
    dbRef.current = getTestDb();

    // Import router AFTER setting up db
    apiKeysRouter = (await import('../../src/routes/api-keys.js')).default;

    app = express();
    app.use(express.json());
    app.use('/api/api-keys', apiKeysRouter);
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  describe('POST /api/api-keys', () => {
    it('should create a new API key', async () => {
      const user = await createTestUser({ id: 'user-1', email: 'test@example.com' });

      const response = await request(app)
        .post('/api/api-keys')
        .send({
          userId: user.id,
          name: 'My API Key',
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.name).toBe('My API Key');
      expect(response.body.key).toBeDefined();
      expect(response.body.key).toMatch(/^cm_live_[a-f0-9]{64}$/);
      expect(response.body.keyHash).toBeUndefined(); // Should not expose hash
    });

    it('should return 400 when name is missing', async () => {
      const user = await createTestUser({ id: 'user-1', email: 'test@example.com' });

      const response = await request(app)
        .post('/api/api-keys')
        .send({
          userId: user.id,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('name is required');
    });

    it('should return 400 when userId is missing', async () => {
      const response = await request(app)
        .post('/api/api-keys')
        .send({
          name: 'My API Key',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('userId is required');
    });

    it('should return 404 when user does not exist', async () => {
      const response = await request(app)
        .post('/api/api-keys')
        .send({
          userId: 'nonexistent-user',
          name: 'My API Key',
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User not found');
    });

    it('should store hashed key in database', async () => {
      const user = await createTestUser({ id: 'user-1', email: 'test@example.com' });

      const response = await request(app)
        .post('/api/api-keys')
        .send({
          userId: user.id,
          name: 'My API Key',
        });

      expect(response.status).toBe(201);
      
      const db = getTestDb();
      const keys = await db.select().from(await import('../../src/db/schema.js').then(m => m.apiKeys));
      
      expect(keys.length).toBe(1);
      expect(keys[0].keyHash).toBeDefined();
      expect(keys[0].keyHash).not.toBe(response.body.key); // Hash should be different from raw key
    });
  });

  describe('GET /api/api-keys', () => {
    it('should return empty array when no API keys exist', async () => {
      const user = await createTestUser({ id: 'user-1', email: 'test@example.com' });

      const response = await request(app)
        .get('/api/api-keys')
        .query({ userId: user.id });

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return all API keys for a user', async () => {
      const user = await createTestUser({ id: 'user-1', email: 'test@example.com' });
      await createTestApiKey({ userId: user.id, name: 'Key 1' });
      await createTestApiKey({ userId: user.id, name: 'Key 2' });

      const response = await request(app)
        .get('/api/api-keys')
        .query({ userId: user.id });

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
      expect(response.body[0].name).toBeDefined();
      expect(response.body[0].keyHash).toBeUndefined(); // Should not expose hash
    });

    it('should not return revoked keys', async () => {
      const user = await createTestUser({ id: 'user-1', email: 'test@example.com' });
      await createTestApiKey({ userId: user.id, name: 'Active Key' });
      await createTestApiKey({ 
        userId: user.id, 
        name: 'Revoked Key', 
        revokedAt: new Date() 
      });

      const response = await request(app)
        .get('/api/api-keys')
        .query({ userId: user.id });

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
      expect(response.body[0].name).toBe('Active Key');
    });

    it('should return 400 when userId is missing', async () => {
      const response = await request(app)
        .get('/api/api-keys');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('userId is required');
    });
  });

  describe('DELETE /api/api-keys/:id', () => {
    it('should revoke an API key', async () => {
      const user = await createTestUser({ id: 'user-1', email: 'test@example.com' });
      const apiKey = await createTestApiKey({ userId: user.id, name: 'Test Key' });

      const response = await request(app)
        .delete(`/api/api-keys/${apiKey.id}`)
        .send({ userId: user.id });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('API key revoked successfully');

      // Verify key is revoked
      const db = getTestDb();
      const keys = await db.select().from(await import('../../src/db/schema.js').then(m => m.apiKeys));
      expect(keys[0].revokedAt).not.toBeNull();
    });

    it('should return 404 for non-existent API key', async () => {
      const user = await createTestUser({ id: 'user-1', email: 'test@example.com' });

      const response = await request(app)
        .delete('/api/api-keys/nonexistent')
        .send({ userId: user.id });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('API key not found');
    });

    it('should return 403 when revoking another user\'s API key', async () => {
      const user1 = await createTestUser({ id: 'user-1', email: 'user1@example.com' });
      const user2 = await createTestUser({ id: 'user-2', email: 'user2@example.com' });
      const apiKey = await createTestApiKey({ userId: user2.id, name: 'User 2 Key' });

      const response = await request(app)
        .delete(`/api/api-keys/${apiKey.id}`)
        .send({ userId: user1.id });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('You do not have permission to revoke this API key');
    });

    it('should return 400 when userId is missing', async () => {
      const apiKey = await createTestApiKey({ userId: 'user-1', name: 'Test Key' });

      const response = await request(app)
        .delete(`/api/api-keys/${apiKey.id}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('userId is required');
    });

    it('should return 400 when trying to revoke already revoked key', async () => {
      const user = await createTestUser({ id: 'user-1', email: 'test@example.com' });
      const apiKey = await createTestApiKey({ 
        userId: user.id, 
        name: 'Test Key',
        revokedAt: new Date()
      });

      const response = await request(app)
        .delete(`/api/api-keys/${apiKey.id}`)
        .send({ userId: user.id });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('API key is already revoked');
    });
  });
});
