import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';

// Create a mutable reference for the database
const dbRef = vi.hoisted(() => ({ current: null as unknown }));

// Mock the db module
vi.mock('../../src/db/index.js', () => ({
  getDb: () => dbRef.current,
}));

// Mock grammy
vi.mock('grammy', () => {
  const mockBot = {
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    command: vi.fn(),
    on: vi.fn(),
    api: {
      sendMessage: vi.fn().mockResolvedValue({ message_id: 1 }),
    },
    use: vi.fn(),
    catch: vi.fn(),
  };

  return {
    Bot: vi.fn().mockImplementation(() => mockBot),
    GrammyError: class GrammyError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'GrammyError';
      }
    },
  };
});

// Import test utilities
import { setupTestDatabase, teardownTestDatabase, getTestDb, createTestTelegramSettings } from '../utils/test-db.js';
import * as schema from '../../src/db/schema.js';

describe('Settings Routes', () => {
  let app: Express;
  let settingsRouter: express.Router;

  beforeEach(async () => {
    vi.resetModules();
    await setupTestDatabase();
    dbRef.current = getTestDb();
    process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token';

    settingsRouter = (await import('../../src/routes/settings.js')).default;
    app = express();
    app.use(express.json());
    app.use('/api/settings', settingsRouter);
  });

  afterEach(() => {
    teardownTestDatabase();
    delete process.env.TELEGRAM_BOT_TOKEN;
  });

  describe('GET /api/settings/telegram', () => {
    it('should return null when no settings exist', async () => {
      const response = await request(app).get('/api/settings/telegram');

      expect(response.status).toBe(200);
      expect(response.body).toBeNull();
    });

    it('should return existing telegram settings', async () => {
      await createTestTelegramSettings({ chatId: '123456789', enabled: true });

      const response = await request(app).get('/api/settings/telegram');

      expect(response.status).toBe(200);
      expect(response.body.chatId).toBe('123456789');
      expect(response.body.enabled).toBe(true);
    });
  });

  describe('PATCH /api/settings/telegram', () => {
    it('should create settings when none exist', async () => {
      const response = await request(app)
        .patch('/api/settings/telegram')
        .send({
          chatId: '987654321',
          enabled: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.chatId).toBe('987654321');
      expect(response.body.enabled).toBe(true);

      // Verify it was saved
      const db = getTestDb();
      const rows = await db.select().from(schema.telegramSettings);
      expect(rows.length).toBe(1);
    });

    it('should update existing settings', async () => {
      await createTestTelegramSettings({ chatId: '123456', enabled: false });

      const response = await request(app)
        .patch('/api/settings/telegram')
        .send({
          chatId: '789012',
          enabled: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.chatId).toBe('789012');
      expect(response.body.enabled).toBe(true);
    });

    it('should update only enabled flag', async () => {
      await createTestTelegramSettings({ chatId: '123456', enabled: false });

      const response = await request(app)
        .patch('/api/settings/telegram')
        .send({ enabled: true });

      expect(response.status).toBe(200);
      expect(response.body.chatId).toBe('123456');
      expect(response.body.enabled).toBe(true);
    });

    it('should update only chatId', async () => {
      await createTestTelegramSettings({ chatId: '123456', enabled: true });

      const response = await request(app)
        .patch('/api/settings/telegram')
        .send({ chatId: '999999' });

      expect(response.status).toBe(200);
      expect(response.body.chatId).toBe('999999');
      expect(response.body.enabled).toBe(true);
    });

    it('should accept empty body and return current settings', async () => {
      await createTestTelegramSettings({ chatId: '123456', enabled: true });

      const response = await request(app)
        .patch('/api/settings/telegram')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.chatId).toBe('123456');
      expect(response.body.enabled).toBe(true);
    });

    it('should reject invalid enabled value', async () => {
      const response = await request(app)
        .patch('/api/settings/telegram')
        .send({ enabled: 'not-a-boolean' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('enabled must be a boolean');
    });

    it('should reject invalid chatId value', async () => {
      const response = await request(app)
        .patch('/api/settings/telegram')
        .send({ chatId: 12345 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('chatId must be a string');
    });
  });
});