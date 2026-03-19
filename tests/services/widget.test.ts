import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Create a mutable reference for the database
const dbRef = vi.hoisted(() => ({ current: null as unknown }));

// Mock the db module
vi.mock('../../src/db/index.js', () => ({
  getDb: () => dbRef.current,
}));

// Import test utilities
import { 
  setupTestDatabase, 
  teardownTestDatabase, 
  getTestDb, 
  createTestCompetitor, 
  createTestScrape, 
  createTestNarrative 
} from '../utils/test-db.js';
import * as schema from '../../src/db/schema.js';
import { desc } from 'drizzle-orm';

describe('Widget Service', () => {
  let getBadgeData: typeof import('../../src/services/widget.js').getBadgeData;
  let getCardData: typeof import('../../src/services/widget.js').getCardData;
  let getTimelineData: typeof import('../../src/services/widget.js').getTimelineData;

  beforeEach(async () => {
    vi.resetModules();
    await setupTestDatabase();
    dbRef.current = getTestDb();

    // Import widget service after db is set up
    const widget = await import('../../src/services/widget.js');
    getBadgeData = widget.getBadgeData;
    getCardData = widget.getCardData;
    getTimelineData = widget.getTimelineData;
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  describe('getBadgeData', () => {
    it('should return null when competitor does not exist', async () => {
      const result = await getBadgeData('non-existent-id');

      expect(result).toBeNull();
    });

    it('should return badge data for a competitor with scrapes', async () => {
      const competitor = await createTestCompetitor({ name: 'Acme Corp' });
      const now = new Date();
      const earlier = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day ago

      // Create two scrapes with different prices
      await createTestScrape(competitor.id, { price: '$99/month' }, earlier);
      await createTestScrape(competitor.id, { price: '$129/month' }, now);

      const result = await getBadgeData(competitor.id);

      expect(result).not.toBeNull();
      expect(result!.competitorId).toBe(competitor.id);
      expect(result!.competitorName).toBe('Acme Corp');
      expect(result!.currentPrice).toBe('$129/month');
      expect(result!.previousPrice).toBe('$99/month');
      expect(result!.priceChange).toBe('increase');
      expect(result!.priceChangePercent).toBeCloseTo(30.3, 1);
    });

    it('should handle single scrape (no previous price)', async () => {
      const competitor = await createTestCompetitor({ name: 'Single Scrape Co' });
      await createTestScrape(competitor.id, { price: '$50/month' });

      const result = await getBadgeData(competitor.id);

      expect(result).not.toBeNull();
      expect(result!.currentPrice).toBe('$50/month');
      expect(result!.previousPrice).toBeNull();
      expect(result!.priceChange).toBeNull();
      expect(result!.priceChangePercent).toBeNull();
    });

    it('should detect price decrease', async () => {
      const competitor = await createTestCompetitor();
      const now = new Date();
      const earlier = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      await createTestScrape(competitor.id, { price: '$100' }, earlier);
      await createTestScrape(competitor.id, { price: '$80' }, now);

      const result = await getBadgeData(competitor.id);

      expect(result!.priceChange).toBe('decrease');
      expect(result!.priceChangePercent).toBeCloseTo(20, 0);
    });

    it('should detect no price change', async () => {
      const competitor = await createTestCompetitor();
      const now = new Date();
      const earlier = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      await createTestScrape(competitor.id, { price: '$99' }, earlier);
      await createTestScrape(competitor.id, { price: '$99' }, now);

      const result = await getBadgeData(competitor.id);

      expect(result!.priceChange).toBe('none');
      expect(result!.priceChangePercent).toBe(0);
    });

    it('should handle competitor without any scrapes', async () => {
      const competitor = await createTestCompetitor({ name: 'No Scrapes Inc' });

      const result = await getBadgeData(competitor.id);

      expect(result).not.toBeNull();
      expect(result!.competitorId).toBe(competitor.id);
      expect(result!.currentPrice).toBeNull();
      expect(result!.previousPrice).toBeNull();
    });

    it('should include lastUpdated timestamp', async () => {
      const competitor = await createTestCompetitor();
      const scrapeTime = new Date('2024-03-15T10:30:00Z');
      await createTestScrape(competitor.id, { price: '$49' }, scrapeTime);

      const result = await getBadgeData(competitor.id);

      expect(result!.lastUpdated).toBeInstanceOf(Date);
    });
  });

  describe('getCardData', () => {
    it('should return null when competitor does not exist', async () => {
      const result = await getCardData('non-existent-id');

      expect(result).toBeNull();
    });

    it('should return card data from battlecard when available', async () => {
      const competitor = await createTestCompetitor({ name: 'Battlecard Co' });
      const db = getTestDb();

      // Create a battlecard
      await db.insert(schema.battlecards).values({
        id: 'battlecard-1',
        competitorId: competitor.id,
        title: 'Battlecard: Battlecard Co',
        summary: 'A test competitor',
        strengths: JSON.stringify(['Strong brand', 'Good support']),
        weaknesses: JSON.stringify(['Expensive', 'Limited features']),
        pricing: JSON.stringify({
          competitor: '$199/month',
          ours: '$99/month',
          difference: '$100 more expensive',
          analysis: 'We are more affordable',
        }),
        features: JSON.stringify([
          { feature: 'Analytics', competitor: true, ours: true },
          { feature: 'API', competitor: false, ours: true },
        ]),
        winStrategies: JSON.stringify(['Highlight API availability']),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await getCardData(competitor.id);

      expect(result).not.toBeNull();
      expect(result!.competitorId).toBe(competitor.id);
      expect(result!.competitorName).toBe('Battlecard Co');
      expect(result!.strengths).toEqual(['Strong brand', 'Good support']);
      expect(result!.weaknesses).toEqual(['Expensive', 'Limited features']);
      expect(result!.pricing.competitor).toBe('$199/month');
      expect(result!.features).toHaveLength(2);
    });

    it('should fall back to scrape data when no battlecard exists', async () => {
      const competitor = await createTestCompetitor({ name: 'Scrape Only Co' });
      await createTestScrape(competitor.id, {
        price: '$79/month',
        features: ['Feature A', 'Feature B', 'Feature C'],
      });

      const result = await getCardData(competitor.id);

      expect(result).not.toBeNull();
      expect(result!.competitorName).toBe('Scrape Only Co');
      expect(result!.pricing.competitor).toBe('$79/month');
      expect(result!.features).toHaveLength(3);
      expect(result!.features[0].feature).toBe('Feature A');
    });

    it('should handle competitor without battlecard or scrapes', async () => {
      const competitor = await createTestCompetitor({ name: 'Empty Co' });

      const result = await getCardData(competitor.id);

      expect(result).not.toBeNull();
      expect(result!.competitorName).toBe('Empty Co');
      expect(result!.strengths).toEqual([]);
      expect(result!.weaknesses).toEqual([]);
      expect(result!.features).toEqual([]);
    });

    it('should return the most recent battlecard', async () => {
      const competitor = await createTestCompetitor();
      const db = getTestDb();

      // Create two battlecards
      await db.insert(schema.battlecards).values({
        id: 'battlecard-old',
        competitorId: competitor.id,
        title: 'Old Battlecard',
        summary: 'Old summary',
        strengths: JSON.stringify(['Old strength']),
        weaknesses: JSON.stringify([]),
        pricing: JSON.stringify({}),
        features: JSON.stringify([]),
        winStrategies: JSON.stringify([]),
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      });

      await db.insert(schema.battlecards).values({
        id: 'battlecard-new',
        competitorId: competitor.id,
        title: 'New Battlecard',
        summary: 'New summary',
        strengths: JSON.stringify(['New strength']),
        weaknesses: JSON.stringify([]),
        pricing: JSON.stringify({}),
        features: JSON.stringify([]),
        winStrategies: JSON.stringify([]),
        createdAt: new Date('2024-03-01'),
        updatedAt: new Date('2024-03-01'),
      });

      const result = await getCardData(competitor.id);

      expect(result!.title).toBe('New Battlecard');
      expect(result!.strengths).toEqual(['New strength']);
    });
  });

  describe('getTimelineData', () => {
    it('should return null when competitor does not exist', async () => {
      const result = await getTimelineData('non-existent-id');

      expect(result).toBeNull();
    });

    it('should return timeline data for a competitor with narratives', async () => {
      const competitor = await createTestCompetitor({ name: 'Timeline Co' });
      const now = new Date();
      const earlier = new Date(now.getTime() - 1000); // 1 second earlier
      
      // Create narratives with explicit timestamps to ensure deterministic ordering
      await createTestNarrative(competitor.id, 'Price increased from $99 to $129', earlier);
      await createTestNarrative(competitor.id, 'Added new API endpoint feature', now);

      const result = await getTimelineData(competitor.id);

      expect(result).not.toBeNull();
      expect(result!.competitorId).toBe(competitor.id);
      expect(result!.competitorName).toBe('Timeline Co');
      expect(result!.changes).toHaveLength(2);
      expect(result!.changes[0].narrative).toBe('Added new API endpoint feature');
    });

    it('should respect the limit parameter', async () => {
      const competitor = await createTestCompetitor();
      const db = getTestDb();

      // Create 10 narratives
      for (let i = 0; i < 10; i++) {
        await db.insert(schema.changeNarratives).values({
          id: `narrative-${i}`,
          competitorId: competitor.id,
          narrative: `Change ${i}`,
          createdAt: new Date(2024, 0, 1 + i),
        });
      }

      const result = await getTimelineData(competitor.id, 5);

      expect(result!.changes).toHaveLength(5);
    });

    it('should default to 5 changes when limit not specified', async () => {
      const competitor = await createTestCompetitor();
      const db = getTestDb();

      // Create 10 narratives
      for (let i = 0; i < 10; i++) {
        await db.insert(schema.changeNarratives).values({
          id: `narrative-default-${i}`,
          competitorId: competitor.id,
          narrative: `Change ${i}`,
          createdAt: new Date(2024, 0, 1 + i),
        });
      }

      const result = await getTimelineData(competitor.id);

      expect(result!.changes).toHaveLength(5);
    });

    it('should return empty changes array when no narratives exist', async () => {
      const competitor = await createTestCompetitor({ name: 'No Changes Co' });

      const result = await getTimelineData(competitor.id);

      expect(result).not.toBeNull();
      expect(result!.changes).toEqual([]);
    });

    it('should return changes in reverse chronological order', async () => {
      const competitor = await createTestCompetitor();
      const db = getTestDb();

      // Create narratives with explicit dates
      await db.insert(schema.changeNarratives).values({
        id: 'narr-old',
        competitorId: competitor.id,
        narrative: 'Oldest change',
        createdAt: new Date('2024-01-01'),
      });

      await db.insert(schema.changeNarratives).values({
        id: 'narr-new',
        competitorId: competitor.id,
        narrative: 'Newest change',
        createdAt: new Date('2024-03-01'),
      });

      const result = await getTimelineData(competitor.id);

      expect(result!.changes[0].narrative).toBe('Newest change');
      expect(result!.changes[1].narrative).toBe('Oldest change');
    });

    it('should include date for each change', async () => {
      const competitor = await createTestCompetitor();
      await createTestNarrative(competitor.id, 'Test change');

      const result = await getTimelineData(competitor.id);

      expect(result!.changes[0].date).toBeInstanceOf(Date);
    });
  });
});