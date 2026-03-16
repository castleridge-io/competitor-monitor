import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Define mocks inline to avoid hoisting issues
vi.mock('playwright', () => {
  const mockPage = {
    goto: vi.fn().mockResolvedValue(undefined),
    $: vi.fn().mockResolvedValue(null),
    $$: vi.fn().mockResolvedValue([]),
    title: vi.fn().mockResolvedValue('Test Page'),
    close: vi.fn().mockResolvedValue(undefined),
  };

  const mockBrowser = {
    newPage: vi.fn().mockResolvedValue(mockPage),
    close: vi.fn().mockResolvedValue(undefined),
  };

  return {
    chromium: {
      launch: vi.fn().mockResolvedValue(mockBrowser),
    },
  };
});

// Import after mocking
import { scrapeCompetitor, closeBrowser, type ScraperInput } from '../../src/services/scraper.js';

describe('Scraper Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await closeBrowser();
  });

  describe('scrapeCompetitor', () => {
    it('should return scraped data with url and timestamp', async () => {
      const input: ScraperInput = {
        id: 'test-1',
        name: 'Test Competitor',
        url: 'https://example.com/pricing',
        selectors: {
          price: '.price-element',
        },
      };

      const result = await scrapeCompetitor(input);

      expect(result.url).toBe(input.url);
      expect(result.scrapedAt).toBeDefined();
    });

    it('should handle missing selectors gracefully', async () => {
      const input: ScraperInput = {
        id: 'test-2',
        name: 'Test Competitor',
        url: 'https://example.com/pricing',
        selectors: {
          price: '.nonexistent',
        },
      };

      const result = await scrapeCompetitor(input);

      expect(result).toBeDefined();
      expect(result.url).toBe(input.url);
    });

    it('should auto-detect when no selectors provided', async () => {
      const input: ScraperInput = {
        id: 'test-3',
        name: 'Test Competitor',
        url: 'https://example.com/pricing',
      };

      const result = await scrapeCompetitor(input);

      expect(result.name).toBe('Test Page');
    });

    it('should return empty features array when no features found', async () => {
      const input: ScraperInput = {
        id: 'test-5',
        name: 'Test Competitor',
        url: 'https://example.com/pricing',
        selectors: {
          features: '.nonexistent-features',
        },
      };

      const result = await scrapeCompetitor(input);

      expect(result.features).toEqual([]);
    });

    it('should handle custom selectors', async () => {
      const input: ScraperInput = {
        id: 'test-7',
        name: 'Test Competitor',
        url: 'https://example.com/pricing',
        selectors: {
          price: '.price',
          description: '.description',
          customField: '.custom',
        },
      };

      const result = await scrapeCompetitor(input);

      expect(result.raw).toBeDefined();
    });
  });

  describe('closeBrowser', () => {
    it('should close the browser without error', async () => {
      await scrapeCompetitor({
        id: 'test',
        name: 'Test',
        url: 'https://example.com',
      });

      await closeBrowser();
    });

    it('should handle closing when browser is already null', async () => {
      await closeBrowser();
      await closeBrowser();
    });
  });

  describe('ScrapeResult structure', () => {
    it('should include raw data from selectors', async () => {
      const input: ScraperInput = {
        id: 'test-raw',
        name: 'Test',
        url: 'https://example.com',
        selectors: {
          price: '.price',
        },
      };

      const result = await scrapeCompetitor(input);

      expect(result.raw).toBeDefined();
      expect(result.scrapedAt).toBeDefined();
      expect(result.url).toBe(input.url);
    });

    it('should include timestamp in ISO format', async () => {
      const input: ScraperInput = {
        id: 'test-timestamp',
        name: 'Test',
        url: 'https://example.com',
      };

      const result = await scrapeCompetitor(input);

      expect(result.scrapedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });
});