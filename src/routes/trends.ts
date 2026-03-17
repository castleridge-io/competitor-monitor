import { Router } from 'express';
import type { Router as RouterType } from 'express';
import { getDb } from '../db/index.js';
import { competitors, scrapes } from '../db/schema.js';
import { eq, and, gte, lte, desc, inArray } from 'drizzle-orm';

const router: RouterType = Router();

// Get historical trends data
router.get('/historical', async (req, res) => {
  try {
    const db = getDb();
    const { competitorIds, startDate, endDate, days } = req.query;

    // Calculate date range
    let start: Date;
    let end: Date = new Date();

    if (startDate && endDate) {
      // Use custom date range
      start = new Date(startDate as string);
      end = new Date(endDate as string);
      // Include the entire end day
      end.setHours(23, 59, 59, 999);
    } else {
      // Use days parameter (default to 30)
      const daysCount = days ? parseInt(days as string) : 30;
      start = new Date();
      start.setDate(start.getDate() - daysCount);
      // Set to beginning of the day
      start.setHours(0, 0, 0, 0);
    }

    // Build query
    let query = db
      .select({
        id: scrapes.id,
        competitorId: scrapes.competitorId,
        data: scrapes.data,
        scrapedAt: scrapes.scrapedAt,
        competitorName: competitors.name,
      })
      .from(scrapes)
      .innerJoin(competitors, eq(scrapes.competitorId, competitors.id))
      .where(and(
        gte(scrapes.scrapedAt, start),
        lte(scrapes.scrapedAt, end)
      ))
      .orderBy(desc(scrapes.scrapedAt));

    // Filter by competitor IDs if provided
    if (competitorIds) {
      const ids = (competitorIds as string).split(',').map(id => id.trim());
      query = db
        .select({
          id: scrapes.id,
          competitorId: scrapes.competitorId,
          data: scrapes.data,
          scrapedAt: scrapes.scrapedAt,
          competitorName: competitors.name,
        })
        .from(scrapes)
        .innerJoin(competitors, eq(scrapes.competitorId, competitors.id))
        .where(and(
          inArray(scrapes.competitorId, ids),
          gte(scrapes.scrapedAt, start),
          lte(scrapes.scrapedAt, end)
        ))
        .orderBy(desc(scrapes.scrapedAt)) as any;
    }

    const result = await query;

    // Parse data field
    const parsedResult = result.map(s => ({
      id: s.id,
      competitorId: s.competitorId,
      competitorName: s.competitorName,
      data: JSON.parse(s.data),
      scrapedAt: s.scrapedAt,
    }));

    res.json(parsedResult);
  } catch (error) {
    console.error('Error fetching historical trends:', error);
    res.status(500).json({
      error: 'Failed to fetch historical trends',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;