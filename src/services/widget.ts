import { getDb } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, desc, and, sql } from 'drizzle-orm';

export interface BadgeData {
  competitorId: string;
  competitorName: string;
  currentPrice: string | null;
  previousPrice: string | null;
  priceChange: 'increase' | 'decrease' | 'none' | null;
  priceChangePercent: number | null;
  lastUpdated: Date;
}

export interface CardData {
  competitorId: string;
  competitorName: string;
  title: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  pricing: {
    competitor: string;
    ours?: string;
    difference?: string;
    analysis?: string;
  };
  features: Array<{
    feature: string;
    competitor: boolean;
    ours: boolean;
  }>;
  winStrategies: string[];
}

export interface TimelineChange {
  id: string;
  narrative: string;
  date: Date;
}

export interface TimelineData {
  competitorId: string;
  competitorName: string;
  changes: TimelineChange[];
}

/**
 * Get badge data for a competitor showing price change information
 */
export async function getBadgeData(competitorId: string): Promise<BadgeData | null> {
  const db = getDb();
  
  // Get competitor
  const competitor = await db.query.competitors.findFirst({
    where: eq(schema.competitors.id, competitorId),
  });

  if (!competitor || !competitor.id) {
    return null;
  }

  // Get scrapes ordered by timestamp (most recent first)
  const scrapes = await db.query.scrapes.findMany({
    where: eq(schema.scrapes.competitorId, competitorId),
    orderBy: [desc(schema.scrapes.scrapedAt)],
    limit: 2,
  });

  let currentPrice: string | null = null;
  let previousPrice: string | null = null;
  let priceChange: 'increase' | 'decrease' | 'none' | null = null;
  let priceChangePercent: number | null = null;
  let lastUpdated: Date = new Date();  // Default to current date

  if (scrapes.length > 0) {
    const latestScrape = scrapes[0];
    // Parse the JSON data field
    const scrapeData = typeof latestScrape.data === 'string' ? JSON.parse(latestScrape.data) : latestScrape.data;
    currentPrice = scrapeData?.price || null;
    lastUpdated = latestScrape.scrapedAt;  // Use the scrape's timestamp

    if (scrapes.length > 1 && currentPrice) {
      const previousScrape = scrapes[1];
      const previousScrapeData = typeof previousScrape.data === 'string' ? JSON.parse(previousScrape.data) : previousScrape.data;
      previousPrice = previousScrapeData?.price || null;

      if (previousPrice && currentPrice !== previousPrice) {
        // Extract numeric values for comparison
        const currentNum = extractPriceNumber(currentPrice);
        const previousNum = extractPriceNumber(previousPrice);

        if (currentNum !== null && previousNum !== null && previousNum > 0) {
          const changeAmount = currentNum - previousNum;
          // Calculate absolute percentage change
          const absChangePercent = Math.abs((changeAmount / previousNum) * 100);
          priceChangePercent = Math.round(absChangePercent * 10) / 10; // Round to 1 decimal

          if (changeAmount > 0) {
            priceChange = 'increase';
          } else if (changeAmount < 0) {
            priceChange = 'decrease';
          } else {
            priceChange = 'none';
            priceChangePercent = 0;
          }
        } else {
          // Can't calculate percentage, just determine direction
          if (currentPrice > previousPrice) {
            priceChange = 'increase';
          } else if (currentPrice < previousPrice) {
            priceChange = 'decrease';
          } else {
            priceChange = 'none';
          }
        }
      } else if (previousPrice && currentPrice === previousPrice) {
        priceChange = 'none';
        priceChangePercent = 0;
      }
    }
  }

  return {
    competitorId: competitor.id,
    competitorName: competitor.name,
    currentPrice,
    previousPrice,
    priceChange,
    priceChangePercent,
    lastUpdated,
  };
}

/**
 * Get card data for a competitor showing feature comparison
 */
export async function getCardData(competitorId: string): Promise<CardData | null> {
  const db = getDb();
  
  // Get competitor
  const competitor = await db.query.competitors.findFirst({
    where: eq(schema.competitors.id, competitorId),
  });

  if (!competitor || !competitor.id) {
    return null;
  }

  // Try to get the most recent battlecard
  const battlecard = await db.query.battlecards.findFirst({
    where: eq(schema.battlecards.competitorId, competitorId),
    orderBy: [desc(schema.battlecards.updatedAt)],
  });

  if (battlecard) {
    // Parse JSON fields from battlecard
    const strengths = typeof battlecard.strengths === 'string' ? JSON.parse(battlecard.strengths) : battlecard.strengths;
    const weaknesses = typeof battlecard.weaknesses === 'string' ? JSON.parse(battlecard.weaknesses) : battlecard.weaknesses;
    const pricing = typeof battlecard.pricing === 'string' ? JSON.parse(battlecard.pricing) : battlecard.pricing;
    const features = typeof battlecard.features === 'string' ? JSON.parse(battlecard.features) : battlecard.features;
    const winStrategies = typeof battlecard.winStrategies === 'string' ? JSON.parse(battlecard.winStrategies) : battlecard.winStrategies;

    return {
      competitorId: competitor.id,
      competitorName: competitor.name,
      title: battlecard.title,
      summary: battlecard.summary,
      strengths: strengths || [],
      weaknesses: weaknesses || [],
      pricing: pricing || { competitor: '' },
      features: features || [],
      winStrategies: winStrategies || [],
    };
  }

  // Fallback to scrape data
  const latestScrape = await db.query.scrapes.findFirst({
    where: eq(schema.scrapes.competitorId, competitorId),
    orderBy: [desc(schema.scrapes.scrapedAt)],
  });

  let features = [];
  let price = '';
  if (latestScrape) {
    const scrapeData = typeof latestScrape.data === 'string' ? JSON.parse(latestScrape.data) : latestScrape.data;
    const scrapeFeatures = scrapeData?.features || [];
    features = Array.isArray(scrapeFeatures) 
      ? scrapeFeatures.map(f => ({ feature: f.toString(), competitor: true, ours: false }))
      : [];
    
    // Extract price from the latest scrape data
    price = scrapeData?.price || '';
  }

  return {
    competitorId: competitor.id,
    competitorName: competitor.name,
    title: `Battlecard: ${competitor.name}`,
    summary: competitor.description || '',
    strengths: [],
    weaknesses: [],
    pricing: {
      competitor: price,
    },
    features,
    winStrategies: [],
  };
}

/**
 * Get timeline data for a contributor showing recent changes
 */
export async function getTimelineData(competitorId: string, limit: number = 5): Promise<TimelineData | null> {
  const db = getDb();
  
  // Get competitor
  const competitor = await db.query.competitors.findFirst({
    where: eq(schema.competitors.id, competitorId),
  });

  if (!competitor || !competitor.id) {
    return null;
  }

  // Get recent narratives ordered by newest first (reverse chronological)
  const narratives = await db.query.changeNarratives.findMany({
    where: eq(schema.changeNarratives.competitorId, competitorId),
    orderBy: [desc(schema.changeNarratives.createdAt)],
    limit,
  });

  const changes: TimelineChange[] = narratives.map(narrative => ({
    id: narrative.id,
    narrative: narrative.narrative,
    date: narrative.createdAt,
  }));

  return {
    competitorId: competitor.id,
    competitorName: competitor.name,
    changes,
  };
}

/**
 * Extract numeric price value from price string
 * Handles formats like "$99/month", "€49", "Free", etc.
 */
function extractPriceNumber(priceStr: string): number | null {
  if (!priceStr || priceStr.toLowerCase().includes('free')) {
    return 0;
  }

  // Remove non-numeric characters except decimal point
  const cleaned = priceStr.replace(/[^\d.]/g, '');
  if (!cleaned) {
    return null;
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}