import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import trendsRouter from '../../src/routes/trends';
import { initDatabase, getDb } from '../../src/db/index';
import { competitors, scrapes } from '../../src/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

const app = express();
app.use(express.json());
app.use('/api/trends', trendsRouter);

describe('Trends API', () => {
  beforeAll(async () => {
    await initDatabase();
  });

  beforeEach(async () => {
    const db = getDb();
    // Clear tables
    await db.delete(scrapes);
    await db.delete(competitors);

    // Insert test competitors
    await db.insert(competitors).values([
      {
        id: 'comp-1',
        name: 'Competitor 1',
        url: 'https://example1.com',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'comp-2',
        name: 'Competitor 2',
        url: 'https://example2.com',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
    ]);

    // Insert test scrapes with different dates
    const now = new Date();
    const scrapesData = [];

    // Create scrapes for last 100 days
    for (let i = 0; i < 100; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);

      scrapesData.push({
        id: `scrape-1-${i}`,
        competitorId: 'comp-1',
        data: JSON.stringify({ price: 100 + i, title: `Product ${i}` }),
        scrapedAt: date,
      });

      scrapesData.push({
        id: `scrape-2-${i}`,
        competitorId: 'comp-2',
        data: JSON.stringify({ price: 200 + i, title: `Product ${i}` }),
        scrapedAt: date,
      });
    }

    await db.insert(scrapes).values(scrapesData);
  });

  describe('GET /api/trends/historical', () => {
    it('should return historical data for all competitors', async () => {
      const response = await request(app)
        .get('/api/trends/historical')
        .query({ days: 7 });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Should have data for both competitors
      const competitorIds = new Set(response.body.map((s: any) => s.competitorId));
      expect(competitorIds.has('comp-1')).toBe(true);
      expect(competitorIds.has('comp-2')).toBe(true);
    });

    it('should filter by specific competitor IDs', async () => {
      const response = await request(app)
        .get('/api/trends/historical')
        .query({ competitorIds: 'comp-1', days: 30 });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      // Should only have data for comp-1
      const competitorIds = new Set(response.body.map((s: any) => s.competitorId));
      expect(competitorIds.size).toBe(1);
      expect(competitorIds.has('comp-1')).toBe(true);
    });

    it('should filter by multiple competitor IDs', async () => {
      const response = await request(app)
        .get('/api/trends/historical')
        .query({ competitorIds: 'comp-1,comp-2', days: 7 });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      const competitorIds = new Set(response.body.map((s: any) => s.competitorId));
      expect(competitorIds.size).toBe(2);
    });

    it('should filter by date range using days parameter', async () => {
      const response = await request(app)
        .get('/api/trends/historical')
        .query({ days: 7 });

      expect(response.status).toBe(200);

      const now = new Date();
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      // Add tolerance for time-of-day differences (up to 1 day)
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 1);

      // All returned scrapes should be within the last 7 days (with tolerance)
      response.body.forEach((scrape: any) => {
        const scrapedAt = new Date(scrape.scrapedAt);
        expect(scrapedAt.getTime()).toBeGreaterThanOrEqual(sevenDaysAgo.getTime());
      });
    });

    it('should filter by custom date range', async () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 14);

      const response = await request(app)
        .get('/api/trends/historical')
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        });

      expect(response.status).toBe(200);

      // Adjust for time-of-day differences
      const adjustedStartDate = new Date(startDate);
      adjustedStartDate.setDate(adjustedStartDate.getDate() - 1);

      // All returned scrapes should be within the date range (with tolerance)
      response.body.forEach((scrape: any) => {
        const scrapedAt = new Date(scrape.scrapedAt);
        expect(scrapedAt.getTime()).toBeGreaterThanOrEqual(adjustedStartDate.getTime());
        expect(scrapedAt.getTime()).toBeLessThanOrEqual(endDate.getTime() + 86400000); // +1 day
      });
    });

    it('should include competitor name in response', async () => {
      const response = await request(app)
        .get('/api/trends/historical')
        .query({ days: 7 });

      expect(response.status).toBe(200);

      response.body.forEach((scrape: any) => {
        expect(scrape).toHaveProperty('competitorName');
        expect(['Competitor 1', 'Competitor 2']).toContain(scrape.competitorName);
      });
    });

    it('should return parsed data field', async () => {
      const response = await request(app)
        .get('/api/trends/historical')
        .query({ days: 7 });

      expect(response.status).toBe(200);

      response.body.forEach((scrape: any) => {
        expect(scrape).toHaveProperty('data');
        expect(typeof scrape.data).toBe('object');
        expect(scrape.data).toHaveProperty('price');
      });
    });

    it('should default to 30 days when no date parameters provided', async () => {
      const response = await request(app)
        .get('/api/trends/historical');

      expect(response.status).toBe(200);

      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      // Add tolerance for time-of-day differences (up to 1 day)
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 1);

      // Should only return scrapes from last 30 days (with tolerance)
      response.body.forEach((scrape: any) => {
        const scrapedAt = new Date(scrape.scrapedAt);
        expect(scrapedAt.getTime()).toBeGreaterThanOrEqual(thirtyDaysAgo.getTime());
      });
    });

    it('should handle empty results gracefully', async () => {
      const db = getDb();
      await db.delete(scrapes);

      const response = await request(app)
        .get('/api/trends/historical')
        .query({ days: 7 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should handle non-existent competitor IDs', async () => {
      const response = await request(app)
        .get('/api/trends/historical')
        .query({ competitorIds: 'non-existent-id', days: 7 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });
});