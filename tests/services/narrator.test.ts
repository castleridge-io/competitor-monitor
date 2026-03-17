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
import { generateNarrative, NarrativeInput, saveNarrative, getNarrativesForCompetitor } from '../../src/services/narrator.js';

describe('Narrator Service', () => {
  beforeEach(async () => {
    await setupTestDatabase();
    vi.clearAllMocks();
    // Reset environment
    delete process.env.OPENAI_API_KEY;
  });

  afterEach(async () => {
    await teardownTestDatabase();
  });

  describe('generateNarrative', () => {
    it('should generate a price drop narrative', async () => {
      const input: NarrativeInput = {
        competitorId: 'comp-1',
        competitorName: 'Acme Corp',
        previousData: { price: '$99/month' },
        currentData: { price: '$79/month' },
      };

      const narrative = await generateNarrative(input);

      expect(narrative).toContain('Acme Corp');
      expect(narrative.toLowerCase()).toContain('price');
      expect(narrative.toLowerCase()).toMatch(/dropped|decreased|reduced|lower/);
    });

    it('should generate a price increase narrative', async () => {
      const input: NarrativeInput = {
        competitorId: 'comp-1',
        competitorName: 'Beta Inc',
        previousData: { price: '$50/month' },
        currentData: { price: '$75/month' },
      };

      const narrative = await generateNarrative(input);

      expect(narrative).toContain('Beta Inc');
      expect(narrative.toLowerCase()).toMatch(/increased|raised|higher/);
    });

    it('should generate a feature addition narrative', async () => {
      const input: NarrativeInput = {
        competitorId: 'comp-1',
        competitorName: 'Gamma LLC',
        previousData: { features: ['Feature A', 'Feature B'] },
        currentData: { features: ['Feature A', 'Feature B', 'Feature C'] },
      };

      const narrative = await generateNarrative(input);

      expect(narrative).toContain('Gamma LLC');
      expect(narrative.toLowerCase()).toMatch(/added|new feature|feature c/);
    });

    it('should generate a feature removal narrative', async () => {
      const input: NarrativeInput = {
        competitorId: 'comp-1',
        competitorName: 'Delta Co',
        previousData: { features: ['Feature A', 'Feature B', 'Feature C'] },
        currentData: { features: ['Feature A', 'Feature B'] },
      };

      const narrative = await generateNarrative(input);

      expect(narrative).toContain('Delta Co');
      expect(narrative.toLowerCase()).toMatch(/removed|no longer|feature c/);
    });

    it('should generate combined price and feature change narrative', async () => {
      const input: NarrativeInput = {
        competitorId: 'comp-1',
        competitorName: 'Epsilon Corp',
        previousData: {
          price: '$99/month',
          features: ['Feature A'],
        },
        currentData: {
          price: '$79/month',
          features: ['Feature A', 'Feature B'],
        },
      };

      const narrative = await generateNarrative(input);

      expect(narrative).toContain('Epsilon Corp');
      expect(narrative.toLowerCase()).toMatch(/price|feature/);
    });

    it('should return no-change message when data is identical', async () => {
      const input: NarrativeInput = {
        competitorId: 'comp-1',
        competitorName: 'Zeta Inc',
        previousData: { price: '$99/month', features: ['A', 'B'] },
        currentData: { price: '$99/month', features: ['A', 'B'] },
      };

      const narrative = await generateNarrative(input);

      expect(narrative).toContain('Zeta Inc');
      expect(narrative.toLowerCase()).toMatch(/no changes|no significant|unchanged/);
    });

    it('should handle missing previous data (first scrape)', async () => {
      const input: NarrativeInput = {
        competitorId: 'comp-1',
        competitorName: 'First Scrape Co',
        previousData: null,
        currentData: { price: '$99/month', features: ['A', 'B'] },
      };

      const narrative = await generateNarrative(input);

      expect(narrative).toContain('First Scrape Co');
      expect(narrative.toLowerCase()).toMatch(/initial|first|baseline/);
    });

    it('should use OpenAI when API key is available', async () => {
      process.env.OPENAI_API_KEY = 'test-key';

      mockOpenAIChat.mockResolvedValueOnce({
        choices: [{
          message: {
            content: 'Acme Corp reduced their Pro plan price from $99 to $79, signaling aggressive market positioning.',
          },
        }],
      });

      const input: NarrativeInput = {
        competitorId: 'comp-1',
        competitorName: 'Acme Corp',
        previousData: { price: '$99/month' },
        currentData: { price: '$79/month' },
      };

      const narrative = await generateNarrative(input);

      expect(mockOpenAIChat).toHaveBeenCalled();
      expect(narrative).toBe('Acme Corp reduced their Pro plan price from $99 to $79, signaling aggressive market positioning.');
    });

    it('should fallback to template when OpenAI fails', async () => {
      process.env.OPENAI_API_KEY = 'test-key';

      mockOpenAIChat.mockRejectedValueOnce(new Error('API Error'));

      const input: NarrativeInput = {
        competitorId: 'comp-1',
        competitorName: 'Acme Corp',
        previousData: { price: '$99/month' },
        currentData: { price: '$79/month' },
      };

      const narrative = await generateNarrative(input);

      expect(narrative).toContain('Acme Corp');
      expect(narrative.toLowerCase()).toMatch(/price|dropped|decreased/);
    });

    it('should fallback to template when OpenAI returns empty response', async () => {
      process.env.OPENAI_API_KEY = 'test-key';

      mockOpenAIChat.mockResolvedValueOnce({
        choices: [{
          message: { content: null },
        }],
      });

      const input: NarrativeInput = {
        competitorId: 'comp-1',
        competitorName: 'Acme Corp',
        previousData: { price: '$99/month' },
        currentData: { price: '$79/month' },
      };

      const narrative = await generateNarrative(input);

      expect(narrative).toContain('Acme Corp');
    });
  });

  describe('saveNarrative', () => {
    it('should save narrative to database', async () => {
      const competitor = await createTestCompetitor({ id: 'comp-1' });

      const result = await saveNarrative({
        competitorId: competitor.id,
        narrative: 'Test narrative for competitor.',
      });

      expect(result.id).toBeDefined();
      expect(result.competitorId).toBe(competitor.id);
      expect(result.narrative).toBe('Test narrative for competitor.');
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('should retrieve saved narrative from database', async () => {
      const competitor = await createTestCompetitor({ id: 'comp-2' });

      await saveNarrative({
        competitorId: competitor.id,
        narrative: 'Saved narrative.',
      });

      const db = getTestDb();
      const saved = await db.select()
        .from(schema.changeNarratives)
        .where(eq(schema.changeNarratives.competitorId, competitor.id));

      expect(saved).toHaveLength(1);
      expect(saved[0].narrative).toBe('Saved narrative.');
    });
  });

  describe('getNarrativesForCompetitor', () => {
    it('should return narratives for a competitor ordered by date', async () => {
      const competitor = await createTestCompetitor({ id: 'comp-3' });

      // Use explicit timestamps to ensure ordering
      const db = getTestDb();

      // First narrative (older)
      await db.insert(schema.changeNarratives).values({
        id: 'narr-1',
        competitorId: competitor.id,
        narrative: 'First narrative.',
        createdAt: new Date('2024-01-01T10:00:00Z'),
      });

      // Second narrative (newer)
      await db.insert(schema.changeNarratives).values({
        id: 'narr-2',
        competitorId: competitor.id,
        narrative: 'Second narrative.',
        createdAt: new Date('2024-01-01T11:00:00Z'),
      });

      const narratives = await getNarrativesForCompetitor(competitor.id);

      expect(narratives).toHaveLength(2);
      expect(narratives[0].narrative).toBe('Second narrative.');
      expect(narratives[1].narrative).toBe('First narrative.');
    });

    it('should return empty array for competitor with no narratives', async () => {
      const competitor = await createTestCompetitor({ id: 'comp-4' });

      const narratives = await getNarrativesForCompetitor(competitor.id);

      expect(narratives).toEqual([]);
    });

    it('should not return narratives from other competitors', async () => {
      const comp1 = await createTestCompetitor({ id: 'comp-5' });
      const comp2 = await createTestCompetitor({ id: 'comp-6', name: 'Other' });

      await saveNarrative({ competitorId: comp1.id, narrative: 'Comp1 narrative.' });
      await saveNarrative({ competitorId: comp2.id, narrative: 'Comp2 narrative.' });

      const narratives = await getNarrativesForCompetitor(comp1.id);

      expect(narratives).toHaveLength(1);
      expect(narratives[0].narrative).toBe('Comp1 narrative.');
    });

    it('should respect limit parameter', async () => {
      const competitor = await createTestCompetitor({ id: 'comp-7' });

      for (let i = 0; i < 10; i++) {
        await saveNarrative({ competitorId: competitor.id, narrative: `Narrative ${i}.` });
      }

      const narratives = await getNarrativesForCompetitor(competitor.id, 5);

      expect(narratives).toHaveLength(5);
    });
  });
});