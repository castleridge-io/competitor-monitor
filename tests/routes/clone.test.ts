import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';

// Create a mutable reference for the database
const dbRef = vi.hoisted(() => ({ current: null as unknown }));

// Mock the db module before importing routes
vi.mock('../../src/db/index.js', () => ({
  getDb: () => dbRef.current,
}));

// Mock the scraper service
vi.mock('../../src/services/scraper.js', () => ({
  scrapeCompetitor: vi.fn(),
  closeBrowser: vi.fn(),
}));

// Mock the feature-gap-analyzer service
vi.mock('../../src/services/feature-gap-analyzer.js', () => ({
  analyzeFeatureGaps: vi.fn(),
  saveGapAnalysis: vi.fn(),
  getGapAnalysis: vi.fn(),
  getAllGapAnalyses: vi.fn(),
}));

// Import test utilities - must be after mock
import { setupTestDatabase, teardownTestDatabase, getTestDb, createTestCompetitor } from '../utils/test-db.js';
import * as schema from '../../src/db/schema.js';
import { scrapeCompetitor } from '../../src/services/scraper.js';
import { analyzeFeatureGaps, saveGapAnalysis } from '../../src/services/feature-gap-analyzer.js';

describe('Clone Routes', () => {
  let app: Express;
  let cloneRouter: express.Router;

  beforeEach(async () => {
    // Reset module cache to get fresh router with new db
    vi.resetModules();

    await setupTestDatabase();
    dbRef.current = getTestDb();

    // Import router AFTER setting up db
    cloneRouter = (await import('../../src/routes/clone.js')).default;

    app = express();
    app.use(express.json());
    app.use('/api/clone', cloneRouter);

    // Reset mocks
    vi.mocked(scrapeCompetitor).mockReset();
    vi.mocked(analyzeFeatureGaps).mockReset();
    vi.mocked(saveGapAnalysis).mockReset();
  });

  afterEach(() => {
    teardownTestDatabase();
    vi.clearAllMocks();
  });

  describe('POST /api/clone', () => {
    it('should return 400 when URL is missing', async () => {
      const response = await request(app)
        .post('/api/clone')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('URL is required');
    });

    it('should return 400 when URL is invalid', async () => {
      const response = await request(app)
        .post('/api/clone')
        .send({ url: 'not-a-valid-url' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid URL format. Must be a valid http or https URL');
    });

    it('should scrape competitor website and detect features', async () => {
      const mockScrapeResult = {
        price: '$99/month',
        features: ['Feature 1', 'Feature 2', 'Feature 3'],
        name: 'Test Competitor',
        raw: {},
        scrapedAt: new Date().toISOString(),
        url: 'https://test-competitor.com',
      };

      vi.mocked(scrapeCompetitor).mockResolvedValue(mockScrapeResult);

      const response = await request(app)
        .post('/api/clone')
        .send({ url: 'https://test-competitor.com' });

      expect(response.status).toBe(200);
      expect(response.body.detectedFeatures).toBeDefined();
      expect(response.body.detectedFeatures.features).toEqual(['Feature 1', 'Feature 2', 'Feature 3']);
      expect(response.body.detectedFeatures.pricing).toBe('$99/month');
      expect(response.body.detectedFeatures.name).toBe('Test Competitor');
    });

    it('should detect tech stack from website', async () => {
      const mockScrapeResult = {
        price: '$49/month',
        features: ['AI-powered analytics', 'Real-time dashboards'],
        name: 'Analytics Pro',
        techStack: ['React', 'Node.js', 'PostgreSQL', 'Stripe'],
        raw: {},
        scrapedAt: new Date().toISOString(),
        url: 'https://analytics-pro.com',
      };

      vi.mocked(scrapeCompetitor).mockResolvedValue(mockScrapeResult);

      const response = await request(app)
        .post('/api/clone')
        .send({ url: 'https://analytics-pro.com' });

      expect(response.status).toBe(200);
      expect(response.body.detectedFeatures.techStack).toBeDefined();
      expect(response.body.detectedFeatures.techStack).toContain('React');
      expect(response.body.detectedFeatures.techStack).toContain('Node.js');
    });

    it('should generate gap analysis comparing with user features', async () => {
      const mockScrapeResult = {
        features: ['Feature A', 'Feature B', 'Feature C'],
        name: 'Competitor X',
        raw: {},
        scrapedAt: new Date().toISOString(),
        url: 'https://competitor-x.com',
      };

      const mockGapAnalysis = {
        id: 'gap-1',
        competitorId: 'temp-competitor',
        missingFeatures: ['Feature A', 'Feature B'],
        recommendations: 'Consider implementing Feature A first...',
        createdAt: new Date(),
      };

      vi.mocked(scrapeCompetitor).mockResolvedValue(mockScrapeResult);
      vi.mocked(analyzeFeatureGaps).mockResolvedValue(mockGapAnalysis);

      const response = await request(app)
        .post('/api/clone')
        .send({
          url: 'https://competitor-x.com',
          userFeatures: ['Feature C', 'Feature D']
        });

      expect(response.status).toBe(200);
      expect(response.body.gapAnalysis).toBeDefined();
      expect(response.body.gapAnalysis.missingFeatures).toEqual(['Feature A', 'Feature B']);
      expect(analyzeFeatureGaps).toHaveBeenCalledWith(
        expect.objectContaining({
          competitorFeatures: ['Feature A', 'Feature B', 'Feature C'],
          userFeatures: ['Feature C', 'Feature D'],
        })
      );
    });

    it('should handle scraping errors gracefully', async () => {
      vi.mocked(scrapeCompetitor).mockRejectedValue(new Error('Failed to scrape website'));

      const response = await request(app)
        .post('/api/clone')
        .send({ url: 'https://failing-site.com' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to analyze competitor');
    });

    it('should return empty features array when no features detected', async () => {
      const mockScrapeResult = {
        features: [],
        name: 'Simple Site',
        raw: {},
        scrapedAt: new Date().toISOString(),
        url: 'https://simple-site.com',
      };

      vi.mocked(scrapeCompetitor).mockResolvedValue(mockScrapeResult);

      const response = await request(app)
        .post('/api/clone')
        .send({ url: 'https://simple-site.com' });

      expect(response.status).toBe(200);
      expect(response.body.detectedFeatures.features).toEqual([]);
    });

    it('should auto-detect pricing page elements', async () => {
      const mockScrapeResult = {
        price: '$29/month - Enterprise plans available',
        features: ['Unlimited users', 'Priority support'],
        name: 'SaaS Tool',
        raw: {},
        scrapedAt: new Date().toISOString(),
        url: 'https://saas-tool.com/pricing',
      };

      vi.mocked(scrapeCompetitor).mockResolvedValue(mockScrapeResult);

      const response = await request(app)
        .post('/api/clone')
        .send({ url: 'https://saas-tool.com/pricing' });

      expect(response.status).toBe(200);
      expect(response.body.detectedFeatures.pricing).toContain('$29/month');
    });

    it('should work without userFeatures (no gap analysis)', async () => {
      const mockScrapeResult = {
        features: ['Feature 1', 'Feature 2'],
        name: 'Competitor Y',
        raw: {},
        scrapedAt: new Date().toISOString(),
        url: 'https://competitor-y.com',
      };

      vi.mocked(scrapeCompetitor).mockResolvedValue(mockScrapeResult);

      const response = await request(app)
        .post('/api/clone')
        .send({ url: 'https://competitor-y.com' });

      expect(response.status).toBe(200);
      expect(response.body.detectedFeatures).toBeDefined();
      expect(response.body.gapAnalysis).toBeUndefined();
    });

    it('should include website metadata', async () => {
      const mockScrapeResult = {
        features: ['Feature 1'],
        name: 'Test Site',
        description: 'A test competitor website',
        raw: {
          title: 'Test Site - Best Solution',
          description: 'A test competitor website',
        },
        scrapedAt: new Date().toISOString(),
        url: 'https://test-site.com',
      };

      vi.mocked(scrapeCompetitor).mockResolvedValue(mockScrapeResult);

      const response = await request(app)
        .post('/api/clone')
        .send({ url: 'https://test-site.com' });

      expect(response.status).toBe(200);
      expect(response.body.detectedFeatures.metadata).toBeDefined();
    });
  });

  describe('POST /api/clone/add-to-tracking', () => {
    it('should add detected competitor to tracking list', async () => {
      const response = await request(app)
        .post('/api/clone/add-to-tracking')
        .send({
          name: 'New Competitor',
          url: 'https://new-competitor.com',
          features: ['Feature 1', 'Feature 2'],
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.name).toBe('New Competitor');
      expect(response.body.url).toBe('https://new-competitor.com');
    });

    it('should return 400 when name is missing', async () => {
      const response = await request(app)
        .post('/api/clone/add-to-tracking')
        .send({
          url: 'https://example.com',
          features: ['Feature 1'],
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('name and url are required');
    });

    it('should return 400 when url is missing', async () => {
      const response = await request(app)
        .post('/api/clone/add-to-tracking')
        .send({
          name: 'Test Competitor',
          features: ['Feature 1'],
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('name and url are required');
    });

    it('should validate URL format when adding to tracking', async () => {
      const response = await request(app)
        .post('/api/clone/add-to-tracking')
        .send({
          name: 'Invalid URL Competitor',
          url: 'not-a-url',
          features: ['Feature 1'],
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid URL format');
    });
  });

  describe('GET /api/clone/history', () => {
    it('should return cloning history', async () => {
      const response = await request(app)
        .get('/api/clone/history');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should limit history results with query parameter', async () => {
      const response = await request(app)
        .get('/api/clone/history?limit=10');

      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/clone/quick-scan', () => {
    it('should perform quick scan of competitor URL', async () => {
      const mockScrapeResult = {
        features: ['Quick Feature 1'],
        name: 'Quick Scan Site',
        raw: {},
        scrapedAt: new Date().toISOString(),
        url: 'https://quick-scan.com',
      };

      vi.mocked(scrapeCompetitor).mockResolvedValue(mockScrapeResult);

      const response = await request(app)
        .post('/api/clone/quick-scan')
        .send({ url: 'https://quick-scan.com' });

      expect(response.status).toBe(200);
      expect(response.body.summary).toBeDefined();
      expect(response.body.summary.featureCount).toBe(1);
    });

    it('should return 400 when URL is missing for quick scan', async () => {
      const response = await request(app)
        .post('/api/clone/quick-scan')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('URL is required');
    });
  });
});
