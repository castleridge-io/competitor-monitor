import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Create a mutable reference for the database
const dbRef = vi.hoisted(() => ({ current: null as unknown }));

// Mock the db module
vi.mock('../../src/db/index.js', () => ({
  getDb: () => dbRef.current,
}));

// Import test utilities
import { setupTestDatabase, teardownTestDatabase, getTestDb, createTestCompetitor, createTestScrape } from '../utils/test-db.js';
import * as schema from '../../src/db/schema.js';

describe('Reporter Module', () => {
  let generateReport: typeof import('../../src/services/reporter.js').generateReport;
  type ScrapeData = import('../../src/services/reporter.js').ScrapeData;

  beforeEach(async () => {
    vi.resetModules();
    await setupTestDatabase();
    dbRef.current = getTestDb();

    // Import reporter after db is set up
    const reporter = await import('../../src/services/reporter.js');
    generateReport = reporter.generateReport;
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  describe('generateReport', () => {
    it('should generate a report with basic data', async () => {
      const competitor = await createTestCompetitor();
      const scrape = await createTestScrape(competitor.id);

      const data: ScrapeData = {
        price: '$99/month',
        features: ['Feature 1', 'Feature 2'],
        name: 'Test Product',
        url: 'https://example.com/pricing',
        scrapedAt: new Date().toISOString(),
      };

      const report = await generateReport(competitor.id, scrape.id, data);

      expect(report.id).toBeDefined();
      expect(report.competitorId).toBe(competitor.id);
      expect(report.scrapeId).toBe(scrape.id);
      expect(report.isPublic).toBe(false);
      expect(report.createdAt).toBeInstanceOf(Date);
      expect(report.jsonData).toEqual(data);
      expect(report.htmlContent).toContain('<!DOCTYPE html>');
    });

    it('should generate HTML with escaped content', async () => {
      const competitor = await createTestCompetitor();
      const scrape = await createTestScrape(competitor.id);

      const data: ScrapeData = {
        price: '$99<script>alert("xss")</script>',
        features: ['<b>Bold</b> feature'],
        name: 'Test & "Product"',
        url: 'https://example.com',
      };

      const report = await generateReport(competitor.id, scrape.id, data);

      // Should escape HTML entities
      expect(report.htmlContent).toContain('&lt;script&gt;');
      expect(report.htmlContent).toContain('&lt;b&gt;');
      expect(report.htmlContent).toContain('&amp;');
      expect(report.htmlContent).toContain('&quot;');

      // Should NOT contain raw dangerous HTML
      expect(report.htmlContent).not.toContain('<script>alert');
    });

    it('should handle missing data fields gracefully', async () => {
      const competitor = await createTestCompetitor();
      const scrape = await createTestScrape(competitor.id);

      const data: ScrapeData = {};

      const report = await generateReport(competitor.id, scrape.id, data);

      expect(report.htmlContent).toContain('Not found'); // Default price
      expect(report.htmlContent).toContain('Unknown'); // Default name
    });

    it('should store report in database', async () => {
      const competitor = await createTestCompetitor();
      const scrape = await createTestScrape(competitor.id);

      const data: ScrapeData = {
        price: '$49',
        name: 'Budget Plan',
      };

      await generateReport(competitor.id, scrape.id, data);

      const db = getTestDb();
      const reports = await db.select().from(schema.reports);

      expect(reports.length).toBe(1);
      expect(reports[0].competitorId).toBe(competitor.id);
      expect(reports[0].scrapeId).toBe(scrape.id);
      expect(JSON.parse(reports[0].jsonData)).toEqual(data);
    });
  });

  describe('HTML Report Generation', () => {
    it('should include all features in the report', async () => {
      const competitor = await createTestCompetitor();
      const scrape = await createTestScrape(competitor.id);

      const data: ScrapeData = {
        features: ['Feature A', 'Feature B', 'Feature C', 'Feature D'],
      };

      const report = await generateReport(competitor.id, scrape.id, data);

      expect(report.htmlContent).toContain('Feature A');
      expect(report.htmlContent).toContain('Feature B');
      expect(report.htmlContent).toContain('Feature C');
      expect(report.htmlContent).toContain('Feature D');
    });

    it('should not render features section when empty', async () => {
      const competitor = await createTestCompetitor();
      const scrape = await createTestScrape(competitor.id);

      const data: ScrapeData = {
        features: [],
      };

      const report = await generateReport(competitor.id, scrape.id, data);

      // Should not have features section
      expect(report.htmlContent).not.toContain('✨ Features');
    });

    it('should include URL in report', async () => {
      const competitor = await createTestCompetitor();
      const scrape = await createTestScrape(competitor.id);

      const data: ScrapeData = {
        url: 'https://specific-pricing-url.com/plans',
      };

      const report = await generateReport(competitor.id, scrape.id, data);

      expect(report.htmlContent).toContain('https://specific-pricing-url.com/plans');
    });

    it('should include competitor name in title', async () => {
      const competitor = await createTestCompetitor();
      const scrape = await createTestScrape(competitor.id);

      const data: ScrapeData = {
        name: 'Acme Pro Plan',
      };

      const report = await generateReport(competitor.id, scrape.id, data);

      expect(report.htmlContent).toContain('<title>Competitor Report - Acme Pro Plan</title>');
      expect(report.htmlContent).toContain('<h1 class="competitor-name">Acme Pro Plan</h1>');
    });

    it('should have proper CSS styling', async () => {
      const competitor = await createTestCompetitor();
      const scrape = await createTestScrape(competitor.id);

      const data: ScrapeData = {};

      const report = await generateReport(competitor.id, scrape.id, data);

      expect(report.htmlContent).toContain('font-family:');
      expect(report.htmlContent).toContain('background:');
      expect(report.htmlContent).toContain('border-radius:');
    });

    it('should include generated date badge', async () => {
      const competitor = await createTestCompetitor();
      const scrape = await createTestScrape(competitor.id);

      const data: ScrapeData = {};

      const report = await generateReport(competitor.id, scrape.id, data);

      expect(report.htmlContent).toContain('Generated');
      expect(report.htmlContent).toContain('badge');
    });

    it('should include footer with branding', async () => {
      const competitor = await createTestCompetitor();
      const scrape = await createTestScrape(competitor.id);

      const data: ScrapeData = {};

      const report = await generateReport(competitor.id, scrape.id, data);

      expect(report.htmlContent).toContain('Competitor Monitor');
      expect(report.htmlContent).toContain('Know what your competitors are doing');
    });
  });

  describe('HTML Escaping', () => {
    it('should escape ampersands', async () => {
      const competitor = await createTestCompetitor();
      const scrape = await createTestScrape(competitor.id);

      const data: ScrapeData = {
        name: 'Johnson & Johnson',
        price: '$100 & up',
      };

      const report = await generateReport(competitor.id, scrape.id, data);

      expect(report.htmlContent).toContain('Johnson &amp; Johnson');
      expect(report.htmlContent).toContain('$100 &amp; up');
    });

    it('should escape less-than and greater-than signs', async () => {
      const competitor = await createTestCompetitor();
      const scrape = await createTestScrape(competitor.id);

      const data: ScrapeData = {
        features: ['Price: < $50', 'Speed: > 100ms'],
      };

      const report = await generateReport(competitor.id, scrape.id, data);

      expect(report.htmlContent).toContain('&lt; $50');
      expect(report.htmlContent).toContain('&gt; 100ms');
    });

    it('should escape quotes', async () => {
      const competitor = await createTestCompetitor();
      const scrape = await createTestScrape(competitor.id);

      const data: ScrapeData = {
        name: 'Product "Pro" Edition',
        features: ["It's great!"],
      };

      const report = await generateReport(competitor.id, scrape.id, data);

      expect(report.htmlContent).toContain('&quot;Pro&quot;');
      expect(report.htmlContent).toContain('It&#039;s great!');
    });
  });
});