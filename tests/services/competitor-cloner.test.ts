import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  analyzeCompetitorWebsite,
  detectFeatures,
  detectTechStack,
  detectPricing,
  generateGapReport,
  extractMetadata,
  CloneResult,
} from '../../src/services/competitor-cloner.js';
import { scrapeCompetitor } from '../../src/services/scraper.js';

// Mock the scraper
vi.mock('../../src/services/scraper.js', () => ({
  scrapeCompetitor: vi.fn(),
  closeBrowser: vi.fn(),
}));

describe('Competitor Cloner Service', () => {
  beforeEach(() => {
    vi.mocked(scrapeCompetitor).mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('analyzeCompetitorWebsite', () => {
    it('should analyze competitor website and return structured data', async () => {
      const mockScrapeResult = {
        price: '$99/month',
        features: ['Feature 1', 'Feature 2', 'Feature 3'],
        name: 'Test Competitor',
        raw: {},
        scrapedAt: new Date().toISOString(),
        url: 'https://test-competitor.com',
      };

      vi.mocked(scrapeCompetitor).mockResolvedValue(mockScrapeResult);

      const result = await analyzeCompetitorWebsite('https://test-competitor.com');

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Competitor');
      expect(result.url).toBe('https://test-competitor.com/');
      expect(result.features).toHaveLength(3);
    });

    it('should handle URLs with trailing slashes', async () => {
      const mockScrapeResult = {
        features: [],
        name: 'Test',
        raw: {},
        scrapedAt: new Date().toISOString(),
        url: 'https://example.com/',
      };

      vi.mocked(scrapeCompetitor).mockResolvedValue(mockScrapeResult);

      const result = await analyzeCompetitorWebsite('https://example.com/');

      expect(result.url).toBe('https://example.com/');
    });

    it('should throw error for invalid URLs', async () => {
      await expect(analyzeCompetitorWebsite('not-a-url')).rejects.toThrow();
    });

    it('should extract tech stack from scraped data', async () => {
      const mockScrapeResult = {
        features: ['Feature 1'],
        name: 'Tech Site',
        techStack: ['React', 'TypeScript', 'Tailwind CSS'],
        raw: {},
        scrapedAt: new Date().toISOString(),
        url: 'https://tech-site.com',
      };

      vi.mocked(scrapeCompetitor).mockResolvedValue(mockScrapeResult);

      const result = await analyzeCompetitorWebsite('https://tech-site.com');

      expect(result.techStack).toBeDefined();
      expect(result.techStack).toContain('React');
      expect(result.techStack).toContain('TypeScript');
    });
  });

  describe('detectFeatures', () => {
    it('should detect features from scraped content', () => {
      const content = {
        features: ['Feature A', 'Feature B', 'Feature C'],
        raw: {},
      };

      const features = detectFeatures(content);

      expect(features).toHaveLength(3);
      expect(features).toContain('Feature A');
    });

    it('should return empty array when no features found', () => {
      const content = {
        features: [],
        raw: {},
      };

      const features = detectFeatures(content);

      expect(features).toEqual([]);
    });

    it('should extract features from feature list elements', () => {
      const content = {
        features: [],
        raw: {
          featureList: 'AI Analytics\nReal-time Reports\nTeam Collaboration',
        },
      };

      const features = detectFeatures(content);

      expect(features.length).toBeGreaterThan(0);
    });

    it('should deduplicate features', () => {
      const content = {
        features: ['Feature A', 'Feature A', 'Feature B'],
        raw: {},
      };

      const features = detectFeatures(content);

      const uniqueFeatures = [...new Set(features)];
      expect(features.length).toBe(uniqueFeatures.length);
    });

    it('should normalize feature text', () => {
      const content = {
        features: ['  Feature A  ', 'FEATURE B', 'feature c'],
        raw: {},
      };

      const features = detectFeatures(content);

      expect(features).toContain('Feature A');
      expect(features).toContain('Feature B');
      expect(features).toContain('Feature C');
    });
  });

  describe('detectTechStack', () => {
    it('should detect common frameworks', () => {
      const content = {
        raw: {
          scripts: 'react.production.min.js vue.js angular.js',
        },
      };

      const techStack = detectTechStack(content);

      expect(techStack.length).toBeGreaterThan(0);
    });

    it('should detect backend technologies', () => {
      const content = {
        raw: {
          server: 'express',
          headers: 'node.js',
        },
      };

      const techStack = detectTechStack(content);

      expect(techStack).toBeDefined();
    });

    it('should detect CSS frameworks', () => {
      const content = {
        raw: {
          styles: 'tailwindcss bootstrap',
        },
      };

      const techStack = detectTechStack(content);

      expect(techStack).toBeDefined();
    });

    it('should return empty array when no tech detected', () => {
      const content = {
        raw: {},
      };

      const techStack = detectTechStack(content);

      expect(techStack).toEqual([]);
    });
  });

  describe('detectPricing', () => {
    it('should detect pricing information', () => {
      const content = {
        price: '$99/month',
        raw: {},
      };

      const pricing = detectPricing(content);

      expect(pricing).toContain('$99');
    });

    it('should detect multiple pricing tiers', () => {
      const content = {
        price: 'Free - $9/month - $29/month',
        raw: {},
      };

      const pricing = detectPricing(content);

      expect(pricing).toBeDefined();
    });

    it('should return null when no pricing found', () => {
      const content = {
        raw: {},
      };

      const pricing = detectPricing(content);

      expect(pricing).toBeNull();
    });

    it('should extract pricing from common patterns', () => {
      const content = {
        raw: {
          pricingText: 'Starting at $49/month',
        },
      };

      const pricing = detectPricing(content);

      expect(pricing).toBeDefined();
    });
  });

  describe('generateGapReport', () => {
    it('should generate gap report comparing features', () => {
      const competitorFeatures = ['Feature A', 'Feature B', 'Feature C'];
      const userFeatures = ['Feature A', 'Feature D'];

      const report = generateGapReport(competitorFeatures, userFeatures);

      expect(report.missingFeatures).toContain('Feature B');
      expect(report.missingFeatures).toContain('Feature C');
      expect(report.missingFeatures).not.toContain('Feature A');
    });

    it('should identify competitive advantages', () => {
      const competitorFeatures = ['Feature A'];
      const userFeatures = ['Feature A', 'Feature D', 'Feature E'];

      const report = generateGapReport(competitorFeatures, userFeatures);

      expect(report.competitiveAdvantages).toBeDefined();
      expect(report.competitiveAdvantages).toContain('Feature D');
      expect(report.competitiveAdvantages).toContain('Feature E');
    });

    it('should generate recommendations', () => {
      const competitorFeatures = ['Feature A', 'Feature B', 'Feature C'];
      const userFeatures = ['Feature A'];

      const report = generateGapReport(competitorFeatures, userFeatures);

      expect(report.recommendations).toBeDefined();
      expect(report.recommendations.length).toBeGreaterThan(0);
    });

    it('should handle empty competitor features', () => {
      const competitorFeatures: string[] = [];
      const userFeatures = ['Feature A', 'Feature B'];

      const report = generateGapReport(competitorFeatures, userFeatures);

      expect(report.missingFeatures).toEqual([]);
      expect(report.competitiveAdvantages.length).toBe(2);
    });

    it('should handle empty user features', () => {
      const competitorFeatures = ['Feature A', 'Feature B'];
      const userFeatures: string[] = [];

      const report = generateGapReport(competitorFeatures, userFeatures);

      expect(report.missingFeatures.length).toBe(2);
      expect(report.competitiveAdvantages).toEqual([]);
    });

    it('should calculate feature overlap percentage', () => {
      const competitorFeatures = ['Feature A', 'Feature B', 'Feature C'];
      const userFeatures = ['Feature A', 'Feature B', 'Feature D'];

      const report = generateGapReport(competitorFeatures, userFeatures);

      expect(report.overlapPercentage).toBeDefined();
      expect(report.overlapPercentage).toBeGreaterThanOrEqual(0);
      expect(report.overlapPercentage).toBeLessThanOrEqual(100);
    });
  });

  describe('extractMetadata', () => {
    it('should extract title and description', () => {
      const content = {
        name: 'Test Site',
        raw: {
          title: 'Test Site - Best Solution',
          description: 'A test competitor website',
        },
      };

      const metadata = extractMetadata(content);

      expect(metadata.title).toBe('Test Site - Best Solution');
      expect(metadata.description).toBe('A test competitor website');
    });

    it('should handle missing metadata gracefully', () => {
      const content = {
        raw: {},
      };

      const metadata = extractMetadata(content);

      expect(metadata).toBeDefined();
    });

    it('should extract social media links', () => {
      const content = {
        raw: {
          twitter: 'https://twitter.com/test',
          linkedin: 'https://linkedin.com/company/test',
        },
      };

      const metadata = extractMetadata(content);

      expect(metadata.socialLinks).toBeDefined();
    });
  });

  describe('CloneResult type', () => {
    it('should have correct structure', () => {
      const result: CloneResult = {
        name: 'Test Competitor',
        url: 'https://test.com',
        features: ['Feature 1'],
        techStack: ['React'],
        pricing: '$99/month',
        metadata: {
          title: 'Test',
          description: 'Test description',
        },
        scrapedAt: new Date().toISOString(),
      };

      expect(result.name).toBe('Test Competitor');
      expect(result.features).toHaveLength(1);
    });
  });
});
