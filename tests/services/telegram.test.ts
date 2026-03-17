import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

describe('Telegram Module', () => {
  let sendTelegramAlert: typeof import('../../src/services/telegram.js').sendTelegramAlert;
  let getTelegramSettings: typeof import('../../src/services/telegram.js').getTelegramSettings;
  let updateTelegramSettings: typeof import('../../src/services/telegram.js').updateTelegramSettings;
  let initTelegramBot: typeof import('../../src/services/telegram.js').initTelegramBot;
  let stopTelegramBot: typeof import('../../src/services/telegram.js').stopTelegramBot;
  type TelegramAlert = import('../../src/services/telegram.js').TelegramAlert;

  const originalEnv = process.env;

  beforeEach(async () => {
    vi.resetModules();
    await setupTestDatabase();
    dbRef.current = getTestDb();
    process.env = { ...originalEnv, TELEGRAM_BOT_TOKEN: 'test-bot-token' };
  });

  afterEach(() => {
    process.env = originalEnv;
    teardownTestDatabase();
  });

  describe('getTelegramSettings', () => {
    it('should return null when no settings exist', async () => {
      // Import after db is set up
      const telegram = await import('../../src/services/telegram.js');
      getTelegramSettings = telegram.getTelegramSettings;

      const settings = await getTelegramSettings();

      expect(settings).toBeNull();
    });

    it('should return existing settings', async () => {
      await createTestTelegramSettings({ chatId: '123456789', enabled: true });

      const telegram = await import('../../src/services/telegram.js');
      getTelegramSettings = telegram.getTelegramSettings;

      const settings = await getTelegramSettings();

      expect(settings).not.toBeNull();
      expect(settings?.chatId).toBe('123456789');
      expect(settings?.enabled).toBe(true);
    });
  });

  describe('updateTelegramSettings', () => {
    it('should create settings if none exist', async () => {
      const telegram = await import('../../src/services/telegram.js');
      updateTelegramSettings = telegram.updateTelegramSettings;

      const settings = await updateTelegramSettings({
        chatId: '987654321',
        enabled: true,
      });

      expect(settings.chatId).toBe('987654321');
      expect(settings.enabled).toBe(true);

      // Verify it was saved to database
      const db = getTestDb();
      const rows = await db.select().from(schema.telegramSettings);
      expect(rows.length).toBe(1);
    });

    it('should update existing settings', async () => {
      await createTestTelegramSettings({ chatId: '123456', enabled: false });

      const telegram = await import('../../src/services/telegram.js');
      updateTelegramSettings = telegram.updateTelegramSettings;

      const settings = await updateTelegramSettings({
        chatId: '789012',
        enabled: true,
      });

      expect(settings.chatId).toBe('789012');
      expect(settings.enabled).toBe(true);

      // Verify only one record exists
      const db = getTestDb();
      const rows = await db.select().from(schema.telegramSettings);
      expect(rows.length).toBe(1);
    });

    it('should update only enabled flag', async () => {
      await createTestTelegramSettings({ chatId: '123456', enabled: false });

      const telegram = await import('../../src/services/telegram.js');
      updateTelegramSettings = telegram.updateTelegramSettings;

      const settings = await updateTelegramSettings({ enabled: true });

      expect(settings.chatId).toBe('123456');
      expect(settings.enabled).toBe(true);
    });
  });

  describe('sendTelegramAlert', () => {
    it('should return success when alert is sent', async () => {
      await createTestTelegramSettings({ chatId: '123456789', enabled: true });

      const telegram = await import('../../src/services/telegram.js');
      sendTelegramAlert = telegram.sendTelegramAlert;

      const alert: TelegramAlert = {
        competitorName: 'Acme Corp',
        competitorUrl: 'https://acme.com',
        field: 'price',
        oldValue: '$49',
        newValue: '$99',
        reportUrl: 'https://app.com/reports/123',
      };

      const result = await sendTelegramAlert(alert);

      expect(result.success).toBe(true);
    });

    it('should return error when Telegram is disabled', async () => {
      await createTestTelegramSettings({ chatId: '123456789', enabled: false });

      const telegram = await import('../../src/services/telegram.js');
      sendTelegramAlert = telegram.sendTelegramAlert;

      const alert: TelegramAlert = {
        competitorName: 'Acme Corp',
        competitorUrl: 'https://acme.com',
        field: 'price',
        oldValue: '$49',
        newValue: '$99',
        reportUrl: 'https://app.com/reports/123',
      };

      const result = await sendTelegramAlert(alert);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Telegram alerts are disabled');
    });

    it('should return error when no chat ID configured', async () => {
      await createTestTelegramSettings({ chatId: null, enabled: true });

      const telegram = await import('../../src/services/telegram.js');
      sendTelegramAlert = telegram.sendTelegramAlert;

      const alert: TelegramAlert = {
        competitorName: 'Acme Corp',
        competitorUrl: 'https://acme.com',
        field: 'price',
        oldValue: '$49',
        newValue: '$99',
        reportUrl: 'https://app.com/reports/123',
      };

      const result = await sendTelegramAlert(alert);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No chat ID configured');
    });

    it('should return error when no settings exist', async () => {
      const telegram = await import('../../src/services/telegram.js');
      sendTelegramAlert = telegram.sendTelegramAlert;

      const alert: TelegramAlert = {
        competitorName: 'Acme Corp',
        competitorUrl: 'https://acme.com',
        field: 'price',
        oldValue: '$49',
        newValue: '$99',
        reportUrl: 'https://app.com/reports/123',
      };

      const result = await sendTelegramAlert(alert);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Telegram not configured');
    });

    it('should format alert message correctly', async () => {
      await createTestTelegramSettings({ chatId: '123456789', enabled: true });

      const telegram = await import('../../src/services/telegram.js');
      sendTelegramAlert = telegram.sendTelegramAlert;

      const alert: TelegramAlert = {
        competitorName: 'Test Competitor',
        competitorUrl: 'https://test.com',
        field: 'features',
        oldValue: 'Feature A',
        newValue: 'Feature A, Feature B',
        reportUrl: 'https://app.com/reports/456',
      };

      const result = await sendTelegramAlert(alert);

      expect(result.success).toBe(true);
    });
  });

  describe('initTelegramBot', () => {
    it('should initialize bot with valid token', async () => {
      const telegram = await import('../../src/services/telegram.js');
      initTelegramBot = telegram.initTelegramBot;

      // Should not throw
      await expect(initTelegramBot()).resolves.toBeUndefined();
    });

    it('should throw error when bot token is missing', async () => {
      delete process.env.TELEGRAM_BOT_TOKEN;

      // Need to reimport to get fresh state
      vi.resetModules();
      const telegram = await import('../../src/services/telegram.js');
      initTelegramBot = telegram.initTelegramBot;

      await expect(initTelegramBot()).rejects.toThrow('TELEGRAM_BOT_TOKEN not configured');
    });
  });

  describe('stopTelegramBot', () => {
    it('should stop the bot gracefully', async () => {
      const telegram = await import('../../src/services/telegram.js');
      initTelegramBot = telegram.initTelegramBot;
      stopTelegramBot = telegram.stopTelegramBot;

      await initTelegramBot();

      // Should not throw
      await expect(stopTelegramBot()).resolves.toBeUndefined();
    });

    it('should handle stopping when bot is not initialized', async () => {
      const telegram = await import('../../src/services/telegram.js');
      stopTelegramBot = telegram.stopTelegramBot;

      // Should not throw
      await expect(stopTelegramBot()).resolves.toBeUndefined();
    });
  });
});