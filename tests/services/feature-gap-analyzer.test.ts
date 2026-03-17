import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupTestDatabase, teardownTestDatabase, createTestCompetitor, getTestDb } from '../utils/test-db.js';
import * as schema from '../../src/db/schema.js';
import { eq } from 'drizzle-orm';

// Mock the db module
vi.mock('../../src/db/index.js', () => ({
  getDb: () => getTestDb(),
}));

// Mock OpenAI
const mockOpenAIChat = vi.fn();
vi.mock('openai', () => {
  return {
    default: vi.fn(() => ({
      chat: {
        completions: {
          create: mockOpenAIChat,
        },
      },
    })),
  };
});

// Import after mocking
import {
  analyzeFeatureGaps,
  FeatureGapInput,
  saveGapAnalysis,
  getGapAnalysis,
  getAllGapAnalyses,
} from '../../src/services/feature-gap-analyzer.js';

describe('Feature Gap Analyzer Service', () => {
  beforeEach(async () => {
    await setupTestDatabase();
    vi.clearAllMocks();
    // Reset environment
    delete process.env.OPENAI_API_KEY;
  });

  afterEach(async () => {
    await teardownTestDatabase();
  });

  describe('analyzeFeatureGaps', () => {
    it('should identify missing features in competitor', async () => {
      const input: FeatureGapInput = {
        competitorId: 'comp-1',
        competitorName: 'Acme Corp',
        competitorFeatures: ['Feature A', 'Feature B', 'Feature C'],
        userFeatures: ['Feature A', 'Feature B'],
      };

      const result = await analyzeFeatureGaps(input);

      expect(result.missingFeatures).toContain('Feature C');
      expect(result.missingFeatures).toHaveLength(1);
    });

    it('should identify multiple missing features', async () => {
      const input: FeatureGapInput = {
        competitorId: 'comp-1',
        competitorName: 'Beta Inc',
        competitorFeatures: ['Feature A', 'Feature B', 'Feature C', 'Feature D'],
        userFeatures: ['Feature A'],
      };

      const result = await analyzeFeatureGaps(input);

      expect(result.missingFeatures).toHaveLength(3);
      expect(result.missingFeatures).toContain('Feature B');
      expect(result.missingFeatures).toContain('Feature C');
      expect(result.missingFeatures).toContain('Feature D');
    });

    it('should return empty array when no features are missing', async () => {
      const input: FeatureGapInput = {
        competitorId: 'comp-1',
        competitorName: 'Gamma LLC',
        competitorFeatures: ['Feature A', 'Feature B'],
        userFeatures: ['Feature A', 'Feature B', 'Feature C'],
      };

      const result = await analyzeFeatureGaps(input);

      expect(result.missingFeatures).toEqual([]);
    });

    it('should generate AI recommendations when API key is available', async () => {
      process.env.OPENAI_API_KEY = 'test-key';

      mockOpenAIChat.mockResolvedValueOnce({
        choices: [{
          message: {
            content: 'Consider implementing Feature C to stay competitive. It addresses customer needs for X.',
          },
        }],
      });

      const input: FeatureGapInput = {
        competitorId: 'comp-1',
        competitorName: 'Acme Corp',
        competitorFeatures: ['Feature A', 'Feature B', 'Feature C'],
        userFeatures: ['Feature A', 'Feature B'],
      };

      const result = await analyzeFeatureGaps(input);

      expect(mockOpenAIChat).toHaveBeenCalled();
      expect(result.recommendations).toContain('Consider implementing Feature C');
    });

    it('should fallback to template recommendations when no API key', async () => {
      const input: FeatureGapInput = {
        competitorId: 'comp-1',
        competitorName: 'Delta Co',
        competitorFeatures: ['Feature A', 'Feature B', 'Feature C'],
        userFeatures: ['Feature A', 'Feature B'],
      };

      const result = await analyzeFeatureGaps(input);

      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should fallback to template when OpenAI fails', async () => {
      process.env.OPENAI_API_KEY = 'test-key';

      mockOpenAIChat.mockRejectedValueOnce(new Error('API Error'));

      const input: FeatureGapInput = {
        competitorId: 'comp-1',
        competitorName: 'Epsilon Corp',
        competitorFeatures: ['Feature A', 'Feature B', 'Feature C'],
        userFeatures: ['Feature A', 'Feature B'],
      };

      const result = await analyzeFeatureGaps(input);

      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should handle empty feature lists', async () => {
      const input: FeatureGapInput = {
        competitorId: 'comp-1',
        competitorName: 'Empty Corp',
        competitorFeatures: [],
        userFeatures: [],
      };

      const result = await analyzeFeatureGaps(input);

      expect(result.missingFeatures).toEqual([]);
    });

    it('should handle case-insensitive feature comparison', async () => {
      const input: FeatureGapInput = {
        competitorId: 'comp-1',
        competitorName: 'Case Corp',
        competitorFeatures: ['Feature A', 'feature b', 'FEATURE C'],
        userFeatures: ['feature a', 'Feature B'],
      };

      const result = await analyzeFeatureGaps(input);

      expect(result.missingFeatures).toHaveLength(1);
      expect(result.missingFeatures.some(f => f.toLowerCase() === 'feature c')).toBe(true);
    });
  });

  describe('saveGapAnalysis', () => {
    it('should save gap analysis to database', async () => {
      const competitor = await createTestCompetitor({ id: 'comp-1' });

      const result = await saveGapAnalysis({
        competitorId: competitor.id,
        missingFeatures: ['Feature X', 'Feature Y'],
        recommendations: 'Consider implementing these features.',
      });

      expect(result.id).toBeDefined();
      expect(result.competitorId).toBe(competitor.id);
      expect(result.missingFeatures).toEqual(['Feature X', 'Feature Y']);
      expect(result.recommendations).toBe('Consider implementing these features.');
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('should retrieve saved gap analysis from database', async () => {
      const competitor = await createTestCompetitor({ id: 'comp-2' });

      await saveGapAnalysis({
        competitorId: competitor.id,
        missingFeatures: ['Feature Z'],
        recommendations: 'Test recommendation.',
      });

      const db = getTestDb();
      const saved = await db.select()
        .from(schema.featureGaps)
        .where(eq(schema.featureGaps.competitorId, competitor.id));

      expect(saved).toHaveLength(1);
      // Database stores as JSON string, so we need to parse it
      expect(JSON.parse(saved[0].missingFeatures)).toEqual(['Feature Z']);
      expect(saved[0].recommendations).toBe('Test recommendation.');
    });
  });

  describe('getGapAnalysis', () => {
    it('should return gap analysis for a competitor', async () => {
      const competitor = await createTestCompetitor({ id: 'comp-3' });

      await saveGapAnalysis({
        competitorId: competitor.id,
        missingFeatures: ['Feature A'],
        recommendations: 'Recommendation.',
      });

      const result = await getGapAnalysis(competitor.id);

      expect(result).toBeDefined();
      expect(result?.competitorId).toBe(competitor.id);
      expect(result?.missingFeatures).toEqual(['Feature A']);
    });

    it('should return null for competitor with no gap analysis', async () => {
      const competitor = await createTestCompetitor({ id: 'comp-4' });

      const result = await getGapAnalysis(competitor.id);

      expect(result).toBeNull();
    });

    it('should return most recent gap analysis', async () => {
      const competitor = await createTestCompetitor({ id: 'comp-5' });
      const db = getTestDb();

      // Old analysis
      await db.insert(schema.featureGaps).values({
        id: 'gap-1',
        competitorId: competitor.id,
        missingFeatures: JSON.stringify(['Old Feature']),
        recommendations: 'Old recommendation.',
        createdAt: new Date('2024-01-01T10:00:00Z'),
      });

      // New analysis
      await db.insert(schema.featureGaps).values({
        id: 'gap-2',
        competitorId: competitor.id,
        missingFeatures: JSON.stringify(['New Feature']),
        recommendations: 'New recommendation.',
        createdAt: new Date('2024-01-01T11:00:00Z'),
      });

      const result = await getGapAnalysis(competitor.id);

      expect(result?.missingFeatures).toEqual(['New Feature']);
    });
  });

  describe('getAllGapAnalyses', () => {
    it('should return all gap analyses', async () => {
      const comp1 = await createTestCompetitor({ id: 'comp-6' });
      const comp2 = await createTestCompetitor({ id: 'comp-7', name: 'Other' });

      await saveGapAnalysis({
        competitorId: comp1.id,
        missingFeatures: ['Feature 1'],
        recommendations: 'Rec 1.',
      });

      await saveGapAnalysis({
        competitorId: comp2.id,
        missingFeatures: ['Feature 2'],
        recommendations: 'Rec 2.',
      });

      const results = await getAllGapAnalyses();

      expect(results).toHaveLength(2);
      expect(results.map(r => r.competitorId)).toContain(comp1.id);
      expect(results.map(r => r.competitorId)).toContain(comp2.id);
    });

    it('should return empty array when no gap analyses exist', async () => {
      const results = await getAllGapAnalyses();
      expect(results).toEqual([]);
    });
  });
});
