import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import gapsRouter from '../../src/routes/gaps';
import { initDatabase, getDb } from '../../src/db/index';
import { competitors, scrapes, featureGaps } from '../../src/db/schema';
import { eq } from 'drizzle-orm';

const app = express();
app.use(express.json());
app.use('/api/gaps', gapsRouter);

describe('Gaps API', () => {
  beforeAll(async () => {
    await initDatabase();
  });

  beforeEach(async () => {
    const db = getDb();
    // Clear tables
    await db.delete(featureGaps);
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
  });

  describe('POST /api/gaps/analyze', () => {
    it('should analyze feature gaps and return results', async () => {
      const response = await request(app)
        .post('/api/gaps/analyze')
        .send({
          competitorId: 'comp-1',
          userFeatures: ['Feature A', 'Feature B'],
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('competitorId', 'comp-1');
      expect(response.body).toHaveProperty('missingFeatures');
      expect(response.body).toHaveProperty('recommendations');
    });

    it('should return 400 when competitorId is missing', async () => {
      const response = await request(app)
        .post('/api/gaps/analyze')
        .send({
          userFeatures: ['Feature A'],
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 when competitor does not exist', async () => {
      const response = await request(app)
        .post('/api/gaps/analyze')
        .send({
          competitorId: 'non-existent',
          userFeatures: ['Feature A'],
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should use scrape data for competitor features when available', async () => {
      const db = getDb();

      // Add scrape data with features
      await db.insert(scrapes).values({
        id: 'scrape-1',
        competitorId: 'comp-1',
        data: JSON.stringify({
          features: ['Feature A', 'Feature B', 'Feature C'],
        }),
        scrapedAt: new Date(),
      });

      const response = await request(app)
        .post('/api/gaps/analyze')
        .send({
          competitorId: 'comp-1',
          userFeatures: ['Feature A', 'Feature B'],
        });

      expect(response.status).toBe(200);
      expect(response.body.missingFeatures).toContain('Feature C');
    });

    it('should save analysis to database', async () => {
      const response = await request(app)
        .post('/api/gaps/analyze')
        .send({
          competitorId: 'comp-1',
          userFeatures: ['Feature A'],
        });

      expect(response.status).toBe(200);

      const db = getDb();
      const saved = await db.select()
        .from(featureGaps)
        .where(eq(featureGaps.competitorId, 'comp-1'));

      expect(saved.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/gaps/:competitorId', () => {
    it('should return gap analysis for competitor', async () => {
      const db = getDb();

      // Create gap analysis
      await db.insert(featureGaps).values({
        id: 'gap-1',
        competitorId: 'comp-1',
        missingFeatures: JSON.stringify(['Feature X']),
        recommendations: 'Consider adding this feature.',
        createdAt: new Date(),
      });

      const response = await request(app)
        .get('/api/gaps/comp-1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('competitorId', 'comp-1');
      expect(response.body.missingFeatures).toEqual(['Feature X']);
    });

    it('should return 404 when no gap analysis exists', async () => {
      const response = await request(app)
        .get('/api/gaps/comp-2');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 for non-existent competitor', async () => {
      const response = await request(app)
        .get('/api/gaps/non-existent');

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/gaps', () => {
    it('should return all gap analyses', async () => {
      const db = getDb();

      await db.insert(featureGaps).values([
        {
          id: 'gap-1',
          competitorId: 'comp-1',
          missingFeatures: ['Feature 1'],
          recommendations: 'Rec 1',
          createdAt: new Date(),
        },
        {
          id: 'gap-2',
          competitorId: 'comp-2',
          missingFeatures: ['Feature 2'],
          recommendations: 'Rec 2',
          createdAt: new Date(),
        },
      ]);

      const response = await request(app)
        .get('/api/gaps');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
    });

    it('should return empty array when no gap analyses exist', async () => {
      const response = await request(app)
        .get('/api/gaps');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should include competitor name in response', async () => {
      const db = getDb();

      await db.insert(featureGaps).values({
        id: 'gap-1',
        competitorId: 'comp-1',
        missingFeatures: ['Feature 1'],
        recommendations: 'Rec 1',
        createdAt: new Date(),
      });

      const response = await request(app)
        .get('/api/gaps');

      expect(response.status).toBe(200);
      expect(response.body[0]).toHaveProperty('competitorName', 'Competitor 1');
    });
  });
});
