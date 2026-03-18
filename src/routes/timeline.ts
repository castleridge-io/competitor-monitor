import { Router } from 'express';
import type { Router as RouterType } from 'express';
import { getDb } from '../db/index.js';
import { competitors, scrapes, changeNarratives } from '../db/schema.js';
import { eq, and, gte, lte, desc, inArray } from 'drizzle-orm';

const router: RouterType = Router();

export interface TimelineEvent {
  id: string;
  competitorId: string;
  competitorName: string;
  competitorUrl: string;
  type: 'price_change' | 'feature_change' | 'availability_change' | 'new_scrape' | 'other';
  title: string;
  description: string;
  narrative: string;
  previousData: Record<string, unknown> | null;
  currentData: Record<string, unknown>;
  changeDetails: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
  scrapedAt: Date;
}

// Get timeline events
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const { competitorId, startDate, endDate, type, limit = '100' } = req.query;

    // Calculate date range (default to last 30 days)
    let start: Date;
    let end: Date = new Date();

    if (startDate && endDate) {
      start = new Date(startDate as string);
      end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
    } else {
      const daysDefault = 30;
      start = new Date();
      start.setDate(start.getDate() - daysDefault);
      start.setHours(0, 0, 0, 0);
    }

    // Build base query for scrapes
    let scrapesQuery = db
      .select({
        id: scrapes.id,
        competitorId: scrapes.competitorId,
        data: scrapes.data,
        scrapedAt: scrapes.scrapedAt,
        competitorName: competitors.name,
        competitorUrl: competitors.url,
      })
      .from(scrapes)
      .innerJoin(competitors, eq(scrapes.competitorId, competitors.id))
      .where(and(
        gte(scrapes.scrapedAt, start),
        lte(scrapes.scrapedAt, end)
      ))
      .orderBy(desc(scrapes.scrapedAt));

    // Filter by competitor if provided
    if (competitorId) {
      const ids = (competitorId as string).split(',').map(id => id.trim());
      scrapesQuery = db
        .select({
          id: scrapes.id,
          competitorId: scrapes.competitorId,
          data: scrapes.data,
          scrapedAt: scrapes.scrapedAt,
          competitorName: competitors.name,
          competitorUrl: competitors.url,
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

    const scrapesResult = await scrapesQuery.limit(parseInt(limit as string));

    // Get narratives for these competitors
    const competitorIds = [...new Set(scrapesResult.map(s => s.competitorId))];
    const narrativesResult = competitorIds.length > 0
      ? await db
          .select()
          .from(changeNarratives)
          .where(inArray(changeNarratives.competitorId, competitorIds))
          .orderBy(desc(changeNarratives.createdAt))
      : [];

    // Create a map of narratives by competitor
    const narrativesByCompetitor = new Map<string, typeof narrativesResult>();
    for (const narrative of narrativesResult) {
      const existing = narrativesByCompetitor.get(narrative.competitorId) || [];
      existing.push(narrative);
      narrativesByCompetitor.set(narrative.competitorId, existing);
    }

    // Get previous scrapes to compare changes
    const events: TimelineEvent[] = [];
    
    // Group scrapes by competitor to detect changes
    const scrapesByCompetitor = new Map<string, typeof scrapesResult>();
    for (const scrape of scrapesResult) {
      const existing = scrapesByCompetitor.get(scrape.competitorId) || [];
      existing.push(scrape);
      scrapesByCompetitor.set(scrape.competitorId, existing);
    }

    // Process each scrape to create events
    for (const scrape of scrapesResult) {
      const currentData = JSON.parse(scrape.data);
      const competitorScrapes = scrapesByCompetitor.get(scrape.competitorId) || [];
      
      // Find previous scrape (scrapes are ordered by date desc)
      const scrapeIndex = competitorScrapes.findIndex(s => s.id === scrape.id);
      const previousScrape = scrapeIndex < competitorScrapes.length - 1
        ? competitorScrapes[scrapeIndex + 1]
        : null;

      const previousData = previousScrape ? JSON.parse(previousScrape.data) : null;

      // Detect changes
      const changeDetails = detectChanges(previousData, currentData);
      
      // Find relevant narrative (within 1 day of scrape)
      const narratives = narrativesByCompetitor.get(scrape.competitorId) || [];
      const scrapeTime = new Date(scrape.scrapedAt).getTime();
      const relevantNarrative = narratives.find(n => {
        const narrativeTime = new Date(n.createdAt).getTime();
        return Math.abs(narrativeTime - scrapeTime) < 24 * 60 * 60 * 1000; // 1 day window
      });

      // Determine event type
      const eventType = determineEventType(changeDetails, previousData === null);
      
      // Filter by type if specified
      if (type && type !== 'all' && eventType !== type) {
        continue;
      }

      // Create event
      const event: TimelineEvent = {
        id: scrape.id,
        competitorId: scrape.competitorId,
        competitorName: scrape.competitorName,
        competitorUrl: scrape.competitorUrl,
        type: eventType,
        title: generateEventTitle(eventType, scrape.competitorName, changeDetails),
        description: generateEventDescription(eventType, changeDetails),
        narrative: relevantNarrative?.narrative || generateDefaultNarrative(eventType, scrape.competitorName, changeDetails),
        previousData,
        currentData,
        changeDetails,
        scrapedAt: scrape.scrapedAt,
      };

      events.push(event);
    }

    res.json(events);
  } catch (error) {
    console.error('Error fetching timeline:', error);
    res.status(500).json({
      error: 'Failed to fetch timeline',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Detect changes between two data objects
 */
function detectChanges(
  previousData: Record<string, unknown> | null,
  currentData: Record<string, unknown>
): TimelineEvent['changeDetails'] {
  if (!previousData) {
    // First scrape - treat all fields as new
    return Object.entries(currentData)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([field, value]) => ({
        field,
        oldValue: null,
        newValue: value,
      }));
  }

  const changes: TimelineEvent['changeDetails'] = [];
  
  // Check all keys in both objects
  const allKeys = new Set([...Object.keys(previousData), ...Object.keys(currentData)]);
  
  for (const key of allKeys) {
    const oldValue = previousData[key];
    const newValue = currentData[key];
    
    // Skip if both are undefined/null
    if (oldValue === undefined && newValue === undefined) continue;
    if (oldValue === null && newValue === null) continue;
    
    // Skip scrapedAt field
    if (key === 'scrapedAt') continue;
    
    // Check for actual change
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({
        field: key,
        oldValue,
        newValue,
      });
    }
  }
  
  return changes;
}

/**
 * Determine the type of event based on changes
 */
function determineEventType(
  changes: TimelineEvent['changeDetails'],
  isFirstScrape: boolean
): TimelineEvent['type'] {
  if (isFirstScrape) {
    return 'new_scrape';
  }

  const changeFields = changes.map(c => c.field.toLowerCase());
  
  if (changeFields.some(f => f.includes('price'))) {
    return 'price_change';
  }
  
  if (changeFields.some(f => f.includes('feature'))) {
    return 'feature_change';
  }
  
  if (changeFields.some(f => f.includes('avail'))) {
    return 'availability_change';
  }
  
  return 'other';
}

/**
 * Generate a title for the event
 */
function generateEventTitle(
  type: TimelineEvent['type'],
  competitorName: string,
  changes: TimelineEvent['changeDetails']
): string {
  switch (type) {
    case 'new_scrape':
      return `${competitorName} added to monitoring`;
    case 'price_change': {
      const priceChange = changes.find(c => c.field.toLowerCase().includes('price'));
      if (priceChange) {
        const direction = typeof priceChange.newValue === 'number' && typeof priceChange.oldValue === 'number'
          ? priceChange.newValue > priceChange.oldValue ? 'increased' : 'decreased'
          : 'changed';
        return `${competitorName} price ${direction}`;
      }
      return `${competitorName} pricing updated`;
    }
    case 'feature_change':
      return `${competitorName} features updated`;
    case 'availability_change':
      return `${competitorName} availability changed`;
    default:
      return `${competitorName} data updated`;
  }
}

/**
 * Generate a description for the event
 */
function generateEventDescription(
  type: TimelineEvent['type'],
  changes: TimelineEvent['changeDetails']
): string {
  if (changes.length === 0) {
    return 'No significant changes detected';
  }

  const descriptions: string[] = [];
  
  for (const change of changes.slice(0, 3)) { // Limit to 3 changes
    if (change.oldValue === null) {
      descriptions.push(`${change.field}: ${formatValue(change.newValue)}`);
    } else {
      descriptions.push(`${change.field}: ${formatValue(change.oldValue)} → ${formatValue(change.newValue)}`);
    }
  }
  
  if (changes.length > 3) {
    descriptions.push(`+${changes.length - 3} more changes`);
  }
  
  return descriptions.join(', ');
}

/**
 * Generate a default narrative when no AI narrative is available
 */
function generateDefaultNarrative(
  type: TimelineEvent['type'],
  competitorName: string,
  changes: TimelineEvent['changeDetails']
): string {
  if (changes.length === 0) {
    return `${competitorName} data was scraped with no significant changes detected.`;
  }

  const changeTypes = changes.map(c => c.field);
  
  switch (type) {
    case 'new_scrape':
      return `${competitorName} has been added to monitoring. Initial data captured for ${changeTypes.join(', ')}.`;
    case 'price_change': {
      const priceChange = changes.find(c => c.field.toLowerCase().includes('price'));
      if (priceChange && typeof priceChange.newValue === 'number' && typeof priceChange.oldValue === 'number') {
        const diff = priceChange.newValue - priceChange.oldValue;
        const percent = Math.round((Math.abs(diff) / priceChange.oldValue) * 100);
        const direction = diff > 0 ? 'increased' : 'decreased';
        return `${competitorName} price ${direction} by ${percent}% (${priceChange.oldValue} → ${priceChange.newValue}). Monitor for competitive positioning changes.`;
      }
      return `${competitorName} pricing has been updated. Review for competitive implications.`;
    }
    case 'feature_change':
      return `${competitorName} features have changed: ${changes.map(c => c.field).join(', ')}. Consider updating your competitive analysis.`;
    case 'availability_change':
      return `${competitorName} availability status changed. This may indicate inventory or supply chain updates.`;
    default:
      return `${competitorName} data updated: ${changes.map(c => c.field).join(', ')}.`;
  }
}

/**
 * Format a value for display
 */
function formatValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'object') return JSON.stringify(value).slice(0, 50);
  return String(value);
}

export default router;
