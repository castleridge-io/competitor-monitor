import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import timelineRouter from '../../src/routes/timeline';
import { initDatabase, getDb } from '../../src/db/index';
import { competitors, scrapes, changeNarratives } from '../../src/db/schema';

const app = express();
app.use(express.json());
app.use('/api/timeline', timelineRouter);

describe('Timeline API', () => {
  beforeAll(async () => {
    await initDatabase();
  });

  beforeEach(async () => {
    const db = getDb();
    // Clear tables
    await db.delete(changeNarratives);
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

    // Insert test scrapes and narratives
    const now = new Date();
    
    // Create scrapes with changes
    await db.insert(scrapes).values([
      {
        id: 'scrape-1',
        competitorId: 'comp-1',
        data: JSON.stringify({ price: '$100', features: ['Basic'] }),
        scrapedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
      {
        id: 'scrape-2',
        competitorId: 'comp-1',
        data: JSON.stringify({ price: '$90', features: ['Basic', 'Advanced'] }),
        scrapedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      },
      {
        id: 'scrape-3',
        competitorId: 'comp-2',
        data: JSON.stringify({ price: '$200', features: ['Pro'] }),
        scrapedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      },
    ]);

    // Insert narratives
    await db.insert(changeNarratives).values([
      {
        id: 'narrative-1',
        competitorId: 'comp-1',
        narrative: 'Price dropped from $100 to $90 (10% reduction). This could indicate pricing pressure.',
        createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'narrative-2',
        competitorId: 'comp-1',
        narrative: 'Competitor 1 has been added to monitoring. Initial data captured.',
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'narrative-3',
        competitorId: 'comp-2',
        narrative: 'Competitor 2 has been added to monitoring. Initial data captured.',
        createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      },
    ]);
  });

  describe('GET /api/timeline', () => {
    it('should return all timeline events', async () => {
      const response = await request(app).get('/api/timeline');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.events)).toBe(true);
      expect(response.body.events.length).toBeGreaterThan(0);
    });

    it('should include pagination metadata', async () => {
      const response = await request(app).get('/api/timeline');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('pageSize');
    });

    it('should filter by competitor ID', async () => {
      const response = await request(app)
        .get('/api/timeline')
        .query({ competitorId: 'comp-1' });

      expect(response.status).toBe(200);
      response.body.events.forEach((event: any) => {
        expect(event.competitorId).toBe('comp-1');
      });
    });

    it('should filter by date range', async () => {
      const now = new Date();
      const startDate = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
      const endDate = new Date(now.getTime() - 0.5 * 24 * 60 * 60 * 1000); // 12 hours ago

      const response = await request(app)
        .get('/api/timeline')
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        });

      expect(response.status).toBe(200);
      
      // All events should be within the date range
      response.body.events.forEach((event: any) => {
        const eventDate = new Date(event.createdAt);
        expect(eventDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
        expect(eventDate.getTime()).toBeLessThanOrEqual(endDate.getTime());
      });
    });

    it('should include competitor name in response', async () => {
      const response = await request(app).get('/api/timeline');

      expect(response.status).toBe(200);
      response.body.events.forEach((event: any) => {
        expect(event).toHaveProperty('competitorName');
        expect(['Competitor 1', 'Competitor 2']).toContain(event.competitorName);
      });
    });

    it('should include AI narrative for each event', async () => {
      const response = await request(app).get('/api/timeline');

      expect(response.status).toBe(200);
      response.body.events.forEach((event: any) => {
        expect(event).toHaveProperty('narrative');
        expect(typeof event.narrative).toBe('string');
      });
    });

    it('should include event type', async () => {
      const response = await request(app).get('/api/timeline');

      expect(response.status).toBe(200);
      response.body.events.forEach((event: any) => {
        expect(event).toHaveProperty('eventType');
        expect(['price_change', 'feature_change', 'initial_scrape', 'data_update']).toContain(event.eventType);
      });
    });

    it('should support pagination with page and pageSize params', async () => {
      const response = await request(app)
        .get('/api/timeline')
        .query({ page: 1, pageSize: 2 });

      expect(response.status).toBe(200);
      expect(response.body.events.length).toBeLessThanOrEqual(2);
      expect(response.body.page).toBe(1);
      expect(response.body.pageSize).toBe(2);
    });

    it('should order events by date descending (most recent first)', async () => {
      const response = await request(app).get('/api/timeline');

      expect(response.status).toBe(200);
      const events = response.body.events;
      
      for (let i = 0; i < events.length - 1; i++) {
        const currentDate = new Date(events[i].createdAt);
        const nextDate = new Date(events[i + 1].createdAt);
        expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime());
      }
    });

    it('should handle empty results gracefully', async () => {
      const db = getDb();
      await db.delete(changeNarratives);
      await db.delete(scrapes);

      const response = await request(app).get('/api/timeline');

      expect(response.status).toBe(200);
      expect(response.body.events).toEqual([]);
      expect(response.body.total).toBe(0);
    });
  });

  describe('GET /api/timeline/:id', () => {
    it('should return a specific timeline event', async () => {
      // First get all events to find an ID
      const allResponse = await request(app).get('/api/timeline');
      const eventId = allResponse.body.events[0].id;

      const response = await request(app).get(`/api/timeline/${eventId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', eventId);
      expect(response.body).toHaveProperty('competitorId');
      expect(response.body).toHaveProperty('competitorName');
      expect(response.body).toHaveProperty('narrative');
      expect(response.body).toHaveProperty('eventType');
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('createdAt');
    });

    it('should return 404 for non-existent event', async () => {
      const response = await request(app).get('/api/timeline/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should include full scrape data for the event', async () => {
      // First get all events to find an ID
      const allResponse = await request(app).get('/api/timeline');
      const eventId = allResponse.body.events[0].id;

      const response = await request(app).get(`/api/timeline/${eventId}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('price');
    });
  });
});
