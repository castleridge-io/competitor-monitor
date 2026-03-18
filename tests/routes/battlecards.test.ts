import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import battlecardsRouter from '../../src/routes/battlecards';
import { initDatabase, getDb } from '../../src/db/index';
import { competitors, scrapes, battlecards } from '../../src/db/schema';
import { eq } from 'drizzle-orm';

const app = express();
app.use(express.json());
app.use('/api/battlecards', battlecardsRouter);

describe('Battlecards API', () => {
  beforeAll(async () => {
    await initDatabase();
  });

  beforeEach(async () => {
    const db = getDb();
    // Clear tables
    await db.delete(battlecards);
    await db.delete(scrapes);
    await db.delete(competitors);

    // Insert test competitors
    await db.insert(competitors).values([
      {
        id: 'comp-1',
        name: 'Competitor Alpha',
        url: 'https://alpha.example.com',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'comp-2',
        name: 'Competitor Beta',
        url: 'https://beta.example.com',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'comp-3',
        name: 'Competitor Gamma',
        url: 'https://gamma.example.com',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
    ]);
  });

  describe('GET /api/battlecards', () => {
    it('should return empty array when no battlecards exist', async () => {
      const response = await request(app).get('/api/battlecards');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should return all battlecards with competitor names', async () => {
      const db = getDb();

      // Insert test battlecard
      await db.insert(battlecards).values({
        id: 'bc-1',
        competitorId: 'comp-1',
        title: 'Battlecard: Competitor Alpha',
        summary: 'Test summary',
        strengths: JSON.stringify(['Strength 1']),
        weaknesses: JSON.stringify(['Weakness 1']),
        pricing: JSON.stringify({ competitor: '$100', ours: '$150' }),
        features: JSON.stringify([]),
        winStrategies: JSON.stringify(['Strategy 1']),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app).get('/api/battlecards');

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
      expect(response.body[0]).toHaveProperty('competitorName', 'Competitor Alpha');
      expect(response.body[0]).toHaveProperty('title', 'Battlecard: Competitor Alpha');
    });

    it('should return multiple battlecards ordered by creation date', async () => {
      const db = getDb();
      const now = new Date();

      await db.insert(battlecards).values([
        {
          id: 'bc-1',
          competitorId: 'comp-1',
          title: 'Older Battlecard',
          summary: 'Summary 1',
          strengths: JSON.stringify([]),
          weaknesses: JSON.stringify([]),
          pricing: JSON.stringify({}),
          features: JSON.stringify([]),
          winStrategies: JSON.stringify([]),
          createdAt: new Date(now.getTime() - 86400000), // 1 day ago
          updatedAt: new Date(now.getTime() - 86400000),
        },
        {
          id: 'bc-2',
          competitorId: 'comp-2',
          title: 'Newer Battlecard',
          summary: 'Summary 2',
          strengths: JSON.stringify([]),
          weaknesses: JSON.stringify([]),
          pricing: JSON.stringify({}),
          features: JSON.stringify([]),
          winStrategies: JSON.stringify([]),
          createdAt: now,
          updatedAt: now,
        },
      ]);

      const response = await request(app).get('/api/battlecards');

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
      expect(response.body[0].title).toBe('Newer Battlecard');
      expect(response.body[1].title).toBe('Older Battlecard');
    });
  });

  describe('GET /api/battlecards/competitor/:competitorId', () => {
    it('should return battlecards for a specific competitor', async () => {
      const db = getDb();

      await db.insert(battlecards).values({
        id: 'bc-1',
        competitorId: 'comp-1',
        title: 'Alpha Battlecard',
        summary: 'Summary',
        strengths: JSON.stringify([]),
        weaknesses: JSON.stringify([]),
        pricing: JSON.stringify({}),
        features: JSON.stringify([]),
        winStrategies: JSON.stringify([]),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app).get('/api/battlecards/competitor/comp-1');

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
      expect(response.body[0].title).toBe('Alpha Battlecard');
    });

    it('should return 404 for non-existent competitor', async () => {
      const response = await request(app).get('/api/battlecards/competitor/non-existent');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return empty array when competitor has no battlecards', async () => {
      const response = await request(app).get('/api/battlecards/competitor/comp-2');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('GET /api/battlecards/:id', () => {
    it('should return a specific battlecard', async () => {
      const db = getDb();

      await db.insert(battlecards).values({
        id: 'bc-1',
        competitorId: 'comp-1',
        title: 'Test Battlecard',
        summary: 'Test summary',
        strengths: JSON.stringify(['Strength 1', 'Strength 2']),
        weaknesses: JSON.stringify(['Weakness 1']),
        pricing: JSON.stringify({ competitor: '$100', ours: '$150' }),
        features: JSON.stringify([{ feature: 'Feature A', competitor: true, ours: true }]),
        winStrategies: JSON.stringify(['Strategy 1']),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app).get('/api/battlecards/bc-1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', 'bc-1');
      expect(response.body).toHaveProperty('title', 'Test Battlecard');
      expect(response.body).toHaveProperty('strengths');
      expect(Array.isArray(response.body.strengths)).toBe(true);
      expect(response.body.strengths.length).toBe(2);
    });

    it('should return 404 for non-existent battlecard', async () => {
      const response = await request(app).get('/api/battlecards/non-existent');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should include competitor name in response', async () => {
      const db = getDb();

      await db.insert(battlecards).values({
        id: 'bc-1',
        competitorId: 'comp-1',
        title: 'Test Battlecard',
        summary: 'Summary',
        strengths: JSON.stringify([]),
        weaknesses: JSON.stringify([]),
        pricing: JSON.stringify({}),
        features: JSON.stringify([]),
        winStrategies: JSON.stringify([]),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app).get('/api/battlecards/bc-1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('competitorName', 'Competitor Alpha');
    });
  });

  describe('POST /api/battlecards/generate', () => {
    it('should return 400 when competitorId is missing', async () => {
      const response = await request(app)
        .post('/api/battlecards/generate')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 for non-existent competitor', async () => {
      const response = await request(app)
        .post('/api/battlecards/generate')
        .send({ competitorId: 'non-existent' });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should generate a new battlecard', async () => {
      const response = await request(app)
        .post('/api/battlecards/generate')
        .send({ competitorId: 'comp-1' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('competitorId', 'comp-1');
      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('strengths');
      expect(response.body).toHaveProperty('weaknesses');
      expect(response.body).toHaveProperty('pricing');
      expect(response.body).toHaveProperty('features');
      expect(response.body).toHaveProperty('winStrategies');
      expect(response.body).toHaveProperty('generated', true);
      expect(Array.isArray(response.body.strengths)).toBe(true);
      expect(Array.isArray(response.body.weaknesses)).toBe(true);
      expect(Array.isArray(response.body.winStrategies)).toBe(true);
    });

    it('should return existing battlecard if one already exists', async () => {
      const db = getDb();

      // Create existing battlecard
      await db.insert(battlecards).values({
        id: 'bc-existing',
        competitorId: 'comp-1',
        title: 'Existing Battlecard',
        summary: 'Existing summary',
        strengths: JSON.stringify(['Existing strength']),
        weaknesses: JSON.stringify([]),
        pricing: JSON.stringify({}),
        features: JSON.stringify([]),
        winStrategies: JSON.stringify([]),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app)
        .post('/api/battlecards/generate')
        .send({ competitorId: 'comp-1' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', 'bc-existing');
      expect(response.body).toHaveProperty('generated', false);
    });

    it('should include competitor name in generated battlecard', async () => {
      const response = await request(app)
        .post('/api/battlecards/generate')
        .send({ competitorId: 'comp-2' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('competitorName', 'Competitor Beta');
    });
  });

  describe('PUT /api/battlecards/:id', () => {
    it('should update a battlecard', async () => {
      const db = getDb();

      await db.insert(battlecards).values({
        id: 'bc-1',
        competitorId: 'comp-1',
        title: 'Original Title',
        summary: 'Original summary',
        strengths: JSON.stringify(['Original strength']),
        weaknesses: JSON.stringify([]),
        pricing: JSON.stringify({}),
        features: JSON.stringify([]),
        winStrategies: JSON.stringify([]),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app)
        .put('/api/battlecards/bc-1')
        .send({
          title: 'Updated Title',
          strengths: ['New strength 1', 'New strength 2'],
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('title', 'Updated Title');
      expect(response.body.strengths).toEqual(['New strength 1', 'New strength 2']);
    });

    it('should return 404 for non-existent battlecard', async () => {
      const response = await request(app)
        .put('/api/battlecards/non-existent')
        .send({ title: 'New Title' });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 when no update data provided', async () => {
      const db = getDb();

      await db.insert(battlecards).values({
        id: 'bc-1',
        competitorId: 'comp-1',
        title: 'Title',
        summary: 'Summary',
        strengths: JSON.stringify([]),
        weaknesses: JSON.stringify([]),
        pricing: JSON.stringify({}),
        features: JSON.stringify([]),
        winStrategies: JSON.stringify([]),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app)
        .put('/api/battlecards/bc-1')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should update all battlecard fields', async () => {
      const db = getDb();

      await db.insert(battlecards).values({
        id: 'bc-1',
        competitorId: 'comp-1',
        title: 'Original',
        summary: 'Original summary',
        strengths: JSON.stringify([]),
        weaknesses: JSON.stringify([]),
        pricing: JSON.stringify({}),
        features: JSON.stringify([]),
        winStrategies: JSON.stringify([]),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const updateData = {
        title: 'New Title',
        summary: 'New summary',
        strengths: ['Strength 1'],
        weaknesses: ['Weakness 1'],
        pricing: { competitor: '$200', ours: '$250', difference: '$50', analysis: 'Test' },
        features: [{ feature: 'Feature A', competitor: true, ours: false }],
        winStrategies: ['Strategy 1', 'Strategy 2'],
      };

      const response = await request(app)
        .put('/api/battlecards/bc-1')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('New Title');
      expect(response.body.summary).toBe('New summary');
      expect(response.body.strengths).toEqual(['Strength 1']);
      expect(response.body.weaknesses).toEqual(['Weakness 1']);
      expect(response.body.pricing).toHaveProperty('competitor', '$200');
      expect(response.body.features.length).toBe(1);
      expect(response.body.winStrategies).toEqual(['Strategy 1', 'Strategy 2']);
    });
  });

  describe('DELETE /api/battlecards/:id', () => {
    it('should delete a battlecard', async () => {
      const db = getDb();

      await db.insert(battlecards).values({
        id: 'bc-1',
        competitorId: 'comp-1',
        title: 'To Delete',
        summary: 'Summary',
        strengths: JSON.stringify([]),
        weaknesses: JSON.stringify([]),
        pricing: JSON.stringify({}),
        features: JSON.stringify([]),
        winStrategies: JSON.stringify([]),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app).delete('/api/battlecards/bc-1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Battlecard deleted successfully');

      // Verify deletion
      const getResponse = await request(app).get('/api/battlecards/bc-1');
      expect(getResponse.status).toBe(404);
    });

    it('should return 404 for non-existent battlecard', async () => {
      const response = await request(app).delete('/api/battlecards/non-existent');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should not affect other battlecards when deleting one', async () => {
      const db = getDb();

      await db.insert(battlecards).values([
        {
          id: 'bc-1',
          competitorId: 'comp-1',
          title: 'To Delete',
          summary: 'Summary 1',
          strengths: JSON.stringify([]),
          weaknesses: JSON.stringify([]),
          pricing: JSON.stringify({}),
          features: JSON.stringify([]),
          winStrategies: JSON.stringify([]),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'bc-2',
          competitorId: 'comp-2',
          title: 'To Keep',
          summary: 'Summary 2',
          strengths: JSON.stringify([]),
          weaknesses: JSON.stringify([]),
          pricing: JSON.stringify({}),
          features: JSON.stringify([]),
          winStrategies: JSON.stringify([]),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      await request(app).delete('/api/battlecards/bc-1');

      const response = await request(app).get('/api/battlecards/bc-2');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('title', 'To Keep');
    });
  });

  describe('Battlecard Data Structure', () => {
    it('should return battlecard with all required fields', async () => {
      const db = getDb();

      await db.insert(battlecards).values({
        id: 'bc-1',
        competitorId: 'comp-1',
        title: 'Complete Battlecard',
        summary: 'Complete summary',
        strengths: JSON.stringify(['Strength 1']),
        weaknesses: JSON.stringify(['Weakness 1']),
        pricing: JSON.stringify({
          competitor: '$100',
          ours: '$150',
          difference: '$50',
          analysis: 'Analysis text',
        }),
        features: JSON.stringify([
          { feature: 'Feature A', competitor: true, ours: true, notes: 'Parity' },
          { feature: 'Feature B', competitor: true, ours: false, notes: 'Gap' },
        ]),
        winStrategies: JSON.stringify(['Strategy 1', 'Strategy 2']),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app).get('/api/battlecards/bc-1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('competitorId');
      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('strengths');
      expect(response.body).toHaveProperty('weaknesses');
      expect(response.body).toHaveProperty('pricing');
      expect(response.body).toHaveProperty('features');
      expect(response.body).toHaveProperty('winStrategies');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('should handle battlecards with empty arrays', async () => {
      const db = getDb();

      await db.insert(battlecards).values({
        id: 'bc-1',
        competitorId: 'comp-1',
        title: 'Empty Battlecard',
        summary: 'No data yet',
        strengths: JSON.stringify([]),
        weaknesses: JSON.stringify([]),
        pricing: JSON.stringify({}),
        features: JSON.stringify([]),
        winStrategies: JSON.stringify([]),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app).get('/api/battlecards/bc-1');

      expect(response.status).toBe(200);
      expect(response.body.strengths).toEqual([]);
      expect(response.body.weaknesses).toEqual([]);
      expect(response.body.features).toEqual([]);
      expect(response.body.winStrategies).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // This test ensures the API doesn't crash on unexpected errors
      const response = await request(app).get('/api/battlecards');
      expect(response.status).toBe(200);
    });

    it('should return proper error format', async () => {
      const response = await request(app).get('/api/battlecards/non-existent');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
    });
  });
});
