import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Create a mutable reference for the database
const dbRef = vi.hoisted(() => ({ current: null as unknown }));

// Define mocks inline
vi.mock('node-cron', () => ({
  default: {
    schedule: vi.fn().mockReturnValue({ stop: vi.fn() }),
  },
}));

vi.mock('../../src/services/scraper.js', () => ({
  scrapeCompetitor: vi.fn().mockResolvedValue({
    price: '$99/month',
    features: ['Feature 1', 'Feature 2'],
    name: 'Test Product',
    url: 'https://example.com',
    scrapedAt: new Date().toISOString(),
    raw: {},
  }),
}));

vi.mock('../../src/services/emailer.js', () => ({
  sendChangeAlert: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('../../src/services/telegram.js', () => ({
  sendTelegramAlert: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock the db module
vi.mock('../../src/db/index.js', () => ({
  getDb: () => dbRef.current,
}));

// Import test utilities
import { setupTestDatabase, teardownTestDatabase, getTestDb, createTestCompetitor, createTestScrape, createTestSubscription } from '../utils/test-db.js';
import * as schema from '../../src/db/schema.js';

describe('Scheduler Module', () => {
  let startScheduler: () => void;
  let stopScheduler: () => void;
  let scrapeAllCompetitors: () => Promise<void>;
  let scrapeCompetitor: ReturnType<typeof vi.fn>;
  let sendChangeAlert: ReturnType<typeof vi.fn>;
  let sendTelegramAlert: ReturnType<typeof vi.fn>;
  let cron: { default: { schedule: ReturnType<typeof vi.fn> } };

  beforeEach(async () => {
    vi.resetModules();
    await setupTestDatabase();
    dbRef.current = getTestDb();

    // Import after db is set up
    const schedulerMod = await import('../../src/services/scheduler.js');
    startScheduler = schedulerMod.startScheduler;
    stopScheduler = schedulerMod.stopScheduler;
    scrapeAllCompetitors = schedulerMod.scrapeAllCompetitors;

    const scraperMod = await import('../../src/services/scraper.js');
    scrapeCompetitor = vi.mocked(scraperMod.scrapeCompetitor);

    const emailerMod = await import('../../src/services/emailer.js');
    sendChangeAlert = vi.mocked(emailerMod.sendChangeAlert);

    const telegramMod = await import('../../src/services/telegram.js');
    sendTelegramAlert = vi.mocked(telegramMod.sendTelegramAlert);

    cron = await import('node-cron');

    vi.clearAllMocks();
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  describe('startScheduler', () => {
    it('should schedule a daily job', () => {
      startScheduler();

      expect(cron.default.schedule).toHaveBeenCalled();
    });
  });

  describe('stopScheduler', () => {
    it('should stop all scheduled jobs', () => {
      startScheduler();
      stopScheduler();
      // Should not throw
    });

    it('should handle stopping when no jobs are scheduled', () => {
      stopScheduler();
    });
  });

  describe('scrapeAllCompetitors', () => {
    it('should not scrape when no competitors exist', async () => {
      await scrapeAllCompetitors();

      expect(scrapeCompetitor).not.toHaveBeenCalled();
    });

    it('should scrape all competitors', async () => {
      await createTestCompetitor({ id: 'comp-1', name: 'Competitor 1' });
      await createTestCompetitor({ id: 'comp-2', name: 'Competitor 2' });

      await scrapeAllCompetitors();

      expect(scrapeCompetitor).toHaveBeenCalledTimes(2);
    });

    it('should store scrape results in database', async () => {
      await createTestCompetitor({ id: 'comp-1' });

      await scrapeAllCompetitors();

      const db = getTestDb();
      const scrapes = await db.select().from(schema.scrapes);

      expect(scrapes.length).toBe(1);
      expect(scrapes[0].competitorId).toBe('comp-1');
    });

    it('should handle competitor with selectors', async () => {
      await createTestCompetitor({
        id: 'comp-with-selectors',
        selectors: {
          price: '.price',
          features: '.features li',
        },
      });

      await scrapeAllCompetitors();

      expect(scrapeCompetitor).toHaveBeenCalledWith(expect.objectContaining({
        id: 'comp-with-selectors',
        selectors: {
          price: '.price',
          features: '.features li',
        },
      }));
    });

    it('should continue on error for individual competitor', async () => {
      await createTestCompetitor({ id: 'comp-fail', name: 'Failing Competitor' });
      await createTestCompetitor({ id: 'comp-success', name: 'Success Competitor' });

      vi.mocked(scrapeCompetitor)
        .mockRejectedValueOnce(new Error('Scrape failed'))
        .mockResolvedValueOnce({
          price: '$99',
          features: [],
          url: 'https://example.com',
          scrapedAt: new Date().toISOString(),
          raw: {},
        });

      await scrapeAllCompetitors();

      expect(scrapeCompetitor).toHaveBeenCalledTimes(2);
    });

    it('should detect changes and send alerts', async () => {
      const competitor = await createTestCompetitor({ id: 'comp-change' });

      // Create a scrape in the past (1 hour ago) to ensure proper ordering
      const pastTime = new Date(Date.now() - 3600000);
      await createTestScrape(competitor.id, { price: '$49/month' }, pastTime);
      await createTestSubscription('user@example.com', competitor.id);

      vi.mocked(scrapeCompetitor).mockResolvedValueOnce({
        price: '$99/month',
        features: ['Feature 1'],
        url: 'https://example.com',
        scrapedAt: new Date().toISOString(),
        raw: {},
      });

      await scrapeAllCompetitors();

      expect(sendChangeAlert).toHaveBeenCalledWith(
        'user@example.com',
        expect.objectContaining({
          competitorName: 'Test Competitor',
          field: 'price',
        })
      );
    });

    it('should not send alerts for first scrape', async () => {
      await createTestCompetitor({ id: 'comp-first' });
      await createTestSubscription('user@example.com', 'comp-first');

      await scrapeAllCompetitors();

      expect(sendChangeAlert).not.toHaveBeenCalled();
    });

    it('should send Telegram alerts alongside email alerts', async () => {
      const competitor = await createTestCompetitor({ id: 'comp-telegram' });

      // Create a scrape in the past
      const pastTime = new Date(Date.now() - 3600000);
      await createTestScrape(competitor.id, { price: '$49/month' }, pastTime);
      await createTestSubscription('user@example.com', competitor.id);

      vi.mocked(scrapeCompetitor).mockResolvedValueOnce({
        price: '$99/month',
        features: ['Feature 1'],
        url: 'https://example.com',
        scrapedAt: new Date().toISOString(),
        raw: {},
      });

      await scrapeAllCompetitors();

      // Both email and telegram alerts should be sent
      expect(sendChangeAlert).toHaveBeenCalled();
      expect(sendTelegramAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          competitorName: 'Test Competitor',
          field: 'price',
        })
      );
    });

    it('should generate report after each scrape', async () => {
      await createTestCompetitor({ id: 'comp-report' });

      await scrapeAllCompetitors();

      const db = getTestDb();
      const reports = await db.select().from(schema.reports);

      expect(reports.length).toBe(1);
    });
  });
});