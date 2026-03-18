import { Router } from 'express';
import type { Router as RouterType } from 'express';
import { getDb } from '../db/index.js';
import { competitors, scrapes, changeNarratives } from '../db/schema.js';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';

const router: RouterType = Router();

/**
 * Detect what type of change occurred between two data points
 */
function detectEventType(
  previousData: Record<string, unknown> | null,
  currentData: Record<string, unknown>
): string {
  if (!previousData) {
    return 'initial_scrape';
  }

  // Check for price change
  if (previousData.price !== currentData.price) {
    return 'price_change';
  }

  // Check for feature changes
  const prevFeatures = Array.isArray(previousData.features) ? previousData.features : [];
  const currFeatures = Array.isArray(currentData.features) ? currentData.features : [];
  
  if (JSON.stringify(prevFeatures) !== JSON.stringify(currFeatures)) {
    return 'feature_change';
  }

  return 'data_update';
}

/**
 * Build timeline events from scrapes and narratives
 */
async function buildTimelineEvents(options: {
  competitorId?: string;
  startDate?: Date;
  endDate?: Date;
  eventType?: string;
  page: number;
  pageSize: number;
}) {
  const db = getDb();
  const { competitorId, startDate, endDate, eventType, page, pageSize } = options;

  // Build base query for scrapes with narratives
  let query = db
    .select({
      id: scrapes.id,
      competitorId: scrapes.competitorId,
      data: scrapes.data,
      createdAt: scrapes.scrapedAt,
      competitorName: competitors.name,
      narrative: changeNarratives.narrative,
    })
    .from(scrapes)
    .innerJoin(competitors, eq(scrapes.competitorId, competitors.id))
    .leftJoin(
      changeNarratives,
      and(
        eq(scrapes.competitorId, changeNarratives.competitorId),
        sql`DATE(${scrapes.scrapedAt}) = DATE(${changeNarratives.createdAt})`
      )
    );

  // Apply filters
  const conditions = [];
  
  if (competitorId) {
    conditions.push(eq(scrapes.competitorId, competitorId));
  }
  
  if (startDate) {
    conditions.push(gte(scrapes.scrapedAt, startDate));
  }
  
  if (endDate) {
    conditions.push(lte(scrapes.scrapedAt, endDate));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  // Order by date descending
  query = query.orderBy(desc(scrapes.scrapedAt)) as any;

  // Execute query
  const results = await query;

  // Process results and detect event types
  const events = [];
  const competitorScrapeHistory: Map<string, Record<string, unknown> | null> = new Map();

  for (const result of results) {
    const data = JSON.parse(result.data);
    const previousData = competitorScrapeHistory.get(result.competitorId) || null;
    const detectedEventType = detectEventType(previousData, data);

    // Filter by event type if specified
    if (eventType && detectedEventType !== eventType) {
      competitorScrapeHistory.set(result.competitorId, data);
      continue;
    }

    events.push({
      id: result.id,
      competitorId: result.competitorId,
      competitorName: result.competitorName,
      eventType: detectedEventType,
      data,
      narrative: result.narrative || 'No changes detected. Monitoring continues.',
      createdAt: result.createdAt,
    });

    competitorScrapeHistory.set(result.competitorId, data);
  }

  // Calculate pagination
  const total = events.length;
  const offset = (page - 1) * pageSize;
  const paginatedEvents = events.slice(offset, offset + pageSize);

  return {
    events: paginatedEvents,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// Get all timeline events
router.get('/', async (req, res) => {
  try {
    const {
      competitorId,
      startDate,
      endDate,
      eventType,
      page = '1',
      pageSize = '20',
    } = req.query;

    // Parse pagination
    const pageNum = parseInt(page as string, 10);
    const pageSizeNum = parseInt(pageSize as string, 10);

    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({ error: 'Invalid page number' });
    }

    if (isNaN(pageSizeNum) || pageSizeNum < 1 || pageSizeNum > 100) {
      return res.status(400).json({ error: 'Invalid page size (must be 1-100)' });
    }

    // Parse dates
    let start: Date | undefined;
    let end: Date | undefined;

    if (startDate) {
      start = new Date(startDate as string);
      if (isNaN(start.getTime())) {
        return res.status(400).json({ error: 'Invalid startDate format' });
      }
    }

    if (endDate) {
      end = new Date(endDate as string);
      if (isNaN(end.getTime())) {
        return res.status(400).json({ error: 'Invalid endDate format' });
      }
      // Include the entire end day
      end.setHours(23, 59, 59, 999);
    }

    // Build and return timeline events
    const result = await buildTimelineEvents({
      competitorId: competitorId as string,
      startDate: start,
      endDate: end,
      eventType: eventType as string,
      page: pageNum,
      pageSize: pageSizeNum,
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching timeline:', error);
    res.status(500).json({
      error: 'Failed to fetch timeline',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get a specific timeline event
router.get('/:id', async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;

    // Get the scrape
    const scrapeResult = await db
      .select({
        id: scrapes.id,
        competitorId: scrapes.competitorId,
        data: scrapes.data,
        createdAt: scrapes.scrapedAt,
        competitorName: competitors.name,
      })
      .from(scrapes)
      .innerJoin(competitors, eq(scrapes.competitorId, competitors.id))
      .where(eq(scrapes.id, id))
      .limit(1);

    if (scrapeResult.length === 0) {
      return res.status(404).json({ error: 'Timeline event not found' });
    }

    const scrape = scrapeResult[0];
    const data = JSON.parse(scrape.data);

    // Get the previous scrape to detect event type
    const previousScrapeResult = await db
      .select()
      .from(scrapes)
      .where(and(
        eq(scrapes.competitorId, scrape.competitorId),
        lte(scrapes.scrapedAt, scrape.createdAt)
      ))
      .orderBy(desc(scrapes.scrapedAt))
      .limit(2);

    const previousData = previousScrapeResult.length > 1 
      ? JSON.parse(previousScrapeResult[1].data)
      : null;

    const eventType = detectEventType(previousData, data);

    // Get narrative for this date
    const scrapeDate = new Date(scrape.createdAt);
    const scrapeDateStart = new Date(scrapeDate);
    scrapeDateStart.setHours(0, 0, 0, 0);
    const scrapeDateEnd = new Date(scrapeDate);
    scrapeDateEnd.setHours(23, 59, 59, 999);

    const narrativeResult = await db
      .select()
      .from(changeNarratives)
      .where(
        and(
          eq(changeNarratives.competitorId, scrape.competitorId),
          gte(changeNarratives.createdAt, scrapeDateStart),
          lte(changeNarratives.createdAt, scrapeDateEnd)
        )
      )
      .limit(1);

    const narrative = narrativeResult.length > 0
      ? narrativeResult[0].narrative
      : 'No changes detected. Monitoring continues.';

    res.json({
      id: scrape.id,
      competitorId: scrape.competitorId,
      competitorName: scrape.competitorName,
      eventType,
      data,
      narrative,
      createdAt: scrape.createdAt,
    });
  } catch (error) {
    console.error('Error fetching timeline event:', error);
    res.status(500).json({
      error: 'Failed to fetch timeline event',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
