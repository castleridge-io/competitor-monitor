import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import marketPositionRouter from '../../src/routes/market-position';
import { initDatabase, getDb } from '../../src/db/index';
import { competitors, scrapes } from '../../src/db/schema';

const app = express();
app.use(express.json());
app.use('/api/market-position', marketPositionRouter);

describe('Market Position API', () => {
  beforeAll(async () => {
    await initDatabase();
  });

  beforeEach(async () => {
    const db = getDb();
    // Clear tables
    await db.delete(scrapes);
    await db.delete(competitors);

    // Insert test competitors with different price/feature profiles
    await db.insert(competitors).values([
      {
        id: 'comp-1',
        name: 'Budget Basic',
        url: 'https://budget-basic.com',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'comp-2',
        name: 'Premium Pro',
        url: 'https://premium-pro.com',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'comp-3',
        name: 'Value Leader',
        url: 'https://value-leader.com',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'comp-4',
        name: 'Enterprise Elite',
        url: 'https://enterprise-elite.com',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
    ]);

    // Insert test scrapes with different prices and feature counts
    // Budget Basic: Low price (19), Basic features (3 features)
    await db.insert(scrapes).values([
      {
        id: 'scrape-1',
        competitorId: 'comp-1',
        data: JSON.stringify({
          price: 19,
          features: ['Basic Feature 1', 'Basic Feature 2', 'Basic Feature 3'],
        }),
        scrapedAt: new Date(),
      },
    ]);

    // Premium Pro: High price (199), Basic features (4 features)
    await db.insert(scrapes).values([
      {
        id: 'scrape-2',
        competitorId: 'comp-2',
        data: JSON.stringify({
          price: 199,
          features: ['Pro Feature 1', 'Pro Feature 2', 'Pro Feature 3', 'Pro Feature 4'],
        }),
        scrapedAt: new Date(),
      },
    ]);

    // Value Leader: Low price (29), Comprehensive features (8 features)
    await db.insert(scrapes).values([
      {
        id: 'scrape-3',
        competitorId: 'comp-3',
        data: JSON.stringify({
          price: 29,
          features: [
            'Value Feature 1',
            'Value Feature 2',
            'Value Feature 3',
            'Value Feature 4',
            'Value Feature 5',
            'Value Feature 6',
            'Value Feature 7',
            'Value Feature 8',
          ],
        }),
        scrapedAt: new Date(),
      },
    ]);

    // Enterprise Elite: High price (499), Comprehensive features (12 features)
    await db.insert(scrapes).values([
      {
        id: 'scrape-4',
        competitorId: 'comp-4',
        data: JSON.stringify({
          price: 499,
          features: [
            'Enterprise Feature 1',
            'Enterprise Feature 2',
            'Enterprise Feature 3',
            'Enterprise Feature 4',
            'Enterprise Feature 5',
            'Enterprise Feature 6',
            'Enterprise Feature 7',
            'Enterprise Feature 8',
            'Enterprise Feature 9',
            'Enterprise Feature 10',
            'Enterprise Feature 11',
            'Enterprise Feature 12',
          ],
        }),
        scrapedAt: new Date(),
      },
    ]);
  });

  describe('GET /api/market-position', () => {
    it('should return market position data for all competitors', async () => {
      const response = await request(app).get('/api/market-position');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(4);
    });

    it('should return correct data structure for each competitor', async () => {
      const response = await request(app).get('/api/market-position');

      expect(response.status).toBe(200);

      response.body.forEach((item: any) => {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('name');
        expect(item).toHaveProperty('x'); // price (normalized)
        expect(item).toHaveProperty('y'); // feature count (normalized)
        expect(item).toHaveProperty('quadrant');
        expect(item).toHaveProperty('avgPrice');
        expect(item).toHaveProperty('featureCount');
        expect(typeof item.x).toBe('number');
        expect(typeof item.y).toBe('number');
        expect(item.x).toBeGreaterThanOrEqual(0);
        expect(item.x).toBeLessThanOrEqual(100);
        expect(item.y).toBeGreaterThanOrEqual(0);
        expect(item.y).toBeLessThanOrEqual(100);
      });
    });

    it('should correctly assign quadrants based on position', async () => {
      const response = await request(app).get('/api/market-position');

      expect(response.status).toBe(200);

      const data = response.body;

      // Find each competitor
      const budgetBasic = data.find((c: any) => c.id === 'comp-1');
      const premiumPro = data.find((c: any) => c.id === 'comp-2');
      const valueLeader = data.find((c: any) => c.id === 'comp-3');
      const enterpriseElite = data.find((c: any) => c.id === 'comp-4');

      // Budget Basic: Low price, low features -> Budget quadrant
      expect(budgetBasic.quadrant).toBe('Budget');

      // Premium Pro: High price, low features -> Premium quadrant
      expect(premiumPro.quadrant).toBe('Premium');

      // Value Leader: Low price, high features -> Value quadrant
      expect(valueLeader.quadrant).toBe('Value');

      // Enterprise Elite: High price, high features -> Enterprise quadrant
      expect(enterpriseElite.quadrant).toBe('Enterprise');
    });

    it('should include competitor names in response', async () => {
      const response = await request(app).get('/api/market-position');

      expect(response.status).toBe(200);

      const names = response.body.map((item: any) => item.name);
      expect(names).toContain('Budget Basic');
      expect(names).toContain('Premium Pro');
      expect(names).toContain('Value Leader');
      expect(names).toContain('Enterprise Elite');
    });

    it('should handle competitors with no scrape data', async () => {
      const db = getDb();

      // Add a competitor with no scrapes
      await db.insert(competitors).values([
        {
          id: 'comp-5',
          name: 'No Data Competitor',
          url: 'https://no-data.com',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const response = await request(app).get('/api/market-position');

      expect(response.status).toBe(200);

      const noDataCompetitor = response.body.find((c: any) => c.id === 'comp-5');
      expect(noDataCompetitor).toBeDefined();
      expect(noDataCompetitor.avgPrice).toBe(0);
      expect(noDataCompetitor.featureCount).toBe(0);
    });

    it('should use latest scrape data for calculations', async () => {
      const db = getDb();

      // Add another scrape for comp-1 with different data
      await db.insert(scrapes).values([
        {
          id: 'scrape-1-new',
          competitorId: 'comp-1',
          data: JSON.stringify({
            price: 25, // Updated price
            features: ['New Feature 1', 'New Feature 2', 'New Feature 3', 'New Feature 4'], // 4 features now
          }),
          scrapedAt: new Date(Date.now() + 1000), // Slightly later
        },
      ]);

      const response = await request(app).get('/api/market-position');

      expect(response.status).toBe(200);

      const budgetBasic = response.body.find((c: any) => c.id === 'comp-1');
      expect(budgetBasic.avgPrice).toBe(25);
      expect(budgetBasic.featureCount).toBe(4);
    });

    it('should handle empty competitors list', async () => {
      const db = getDb();
      await db.delete(scrapes);
      await db.delete(competitors);

      const response = await request(app).get('/api/market-position');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should normalize prices correctly between 0-100', async () => {
      const response = await request(app).get('/api/market-position');

      expect(response.status).toBe(200);

      // With our test data: min price = 19, max price = 499
      // Normalized should be: (price - 19) / (499 - 19) * 100
      const budgetBasic = response.body.find((c: any) => c.id === 'comp-1');
      const enterpriseElite = response.body.find((c: any) => c.id === 'comp-4');

      // Budget Basic has lowest price, should be close to 0
      expect(budgetBasic.x).toBeLessThan(10);

      // Enterprise Elite has highest price, should be close to 100
      expect(enterpriseElite.x).toBeGreaterThan(90);
    });

    it('should normalize feature counts correctly between 0-100', async () => {
      const response = await request(app).get('/api/market-position');

      expect(response.status).toBe(200);

      // With our test data: min features = 3, max features = 12
      // Normalized should be: (features - 3) / (12 - 3) * 100
      const budgetBasic = response.body.find((c: any) => c.id === 'comp-1');
      const enterpriseElite = response.body.find((c: any) => c.id === 'comp-4');

      // Budget Basic has lowest feature count, should be close to 0
      expect(budgetBasic.y).toBeLessThan(10);

      // Enterprise Elite has highest feature count, should be close to 100
      expect(enterpriseElite.y).toBeGreaterThan(90);
    });

    it('should handle competitors with features as string array in data', async () => {
      const db = getDb();

      // Add a competitor with features as a string array in data
      await db.insert(competitors).values([
        {
          id: 'comp-6',
          name: 'String Features',
          url: 'https://string-features.com',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      await db.insert(scrapes).values([
        {
          id: 'scrape-6',
          competitorId: 'comp-6',
          data: JSON.stringify({
            price: 50,
            features: 'Feature A, Feature B, Feature C', // String instead of array
          }),
          scrapedAt: new Date(),
        },
      ]);

      const response = await request(app).get('/api/market-position');

      expect(response.status).toBe(200);

      const stringFeatures = response.body.find((c: any) => c.id === 'comp-6');
      expect(stringFeatures).toBeDefined();
      // When features is a string, we should count it as 1 or parse it
      expect(stringFeatures.featureCount).toBeGreaterThanOrEqual(1);
    });

    it('should handle price as string with currency symbols', async () => {
      const db = getDb();

      await db.insert(competitors).values([
        {
          id: 'comp-7',
          name: 'Currency Price',
          url: 'https://currency-price.com',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      await db.insert(scrapes).values([
        {
          id: 'scrape-7',
          competitorId: 'comp-7',
          data: JSON.stringify({
            price: '$99.99',
            features: ['Feature 1', 'Feature 2'],
          }),
          scrapedAt: new Date(),
        },
      ]);

      const response = await request(app).get('/api/market-position');

      expect(response.status).toBe(200);

      const currencyPrice = response.body.find((c: any) => c.id === 'comp-7');
      expect(currencyPrice).toBeDefined();
      expect(currencyPrice.avgPrice).toBe(99.99);
    });
  });
});