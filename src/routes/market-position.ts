import { Router } from 'express';
import type { Router as RouterType } from 'express';
import { getDb } from '../db/index.js';
import { competitors, scrapes } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';

const router: RouterType = Router();

/**
 * Parse price from various formats
 */
function parsePrice(price: unknown): number {
  if (typeof price === 'number') {
    return price;
  }
  
  if (typeof price === 'string') {
    // Remove currency symbols and parse
    const cleaned = price.replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  
  return 0;
}

/**
 * Parse feature count from various formats
 */
function parseFeatureCount(features: unknown): number {
  if (Array.isArray(features)) {
    return features.length;
  }
  
  if (typeof features === 'string') {
    // If it's a comma-separated string, split and count
    const parts = features.split(',').map(s => s.trim()).filter(s => s.length > 0);
    return parts.length > 0 ? parts.length : 1;
  }
  
  return 0;
}

/**
 * Normalize a value to 0-100 scale
 */
function normalize(value: number, min: number, max: number): number {
  if (max === min) {
    return 50; // If all values are the same, put in middle
  }
  return Math.round(((value - min) / (max - min)) * 100);
}

/**
 * Determine quadrant based on median split
 */
function getQuadrant(
  price: number,
  featureCount: number,
  medianPrice: number,
  medianFeatures: number
): 'Budget' | 'Premium' | 'Value' | 'Enterprise' {
  const isHighPrice = price >= medianPrice;
  const isHighFeatures = featureCount >= medianFeatures;
  
  if (!isHighPrice && !isHighFeatures) {
    return 'Budget';     // Low price, low features
  } else if (isHighPrice && !isHighFeatures) {
    return 'Premium';    // High price, low features
  } else if (!isHighPrice && isHighFeatures) {
    return 'Value';      // Low price, high features
  } else {
    return 'Enterprise'; // High price, high features
  }
}

// Get market position data for all competitors
router.get('/', async (req, res) => {
  try {
    const db = getDb();

    // Get all competitors
    const allCompetitors = await db.select().from(competitors);

    if (allCompetitors.length === 0) {
      return res.json([]);
    }

    // Get latest scrape data for each competitor
    const competitorData: Array<{
      id: string;
      name: string;
      avgPrice: number;
      featureCount: number;
    }> = [];

    for (const competitor of allCompetitors) {
      // Get the latest scrape for this competitor
      const latestScrapes = await db
        .select()
        .from(scrapes)
        .where(eq(scrapes.competitorId, competitor.id))
        .orderBy(desc(scrapes.scrapedAt))
        .limit(1);

      let avgPrice = 0;
      let featureCount = 0;

      if (latestScrapes.length > 0) {
        const data = JSON.parse(latestScrapes[0].data);
        avgPrice = parsePrice(data.price);
        featureCount = parseFeatureCount(data.features);
      }

      competitorData.push({
        id: competitor.id,
        name: competitor.name,
        avgPrice,
        featureCount,
      });
    }

    // Calculate min/max for normalization
    const prices = competitorData.map(c => c.avgPrice);
    const featureCounts = competitorData.map(c => c.featureCount);
    
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const minFeatures = Math.min(...featureCounts);
    const maxFeatures = Math.max(...featureCounts);

    // Calculate medians for quadrant split
    const sortedPrices = [...prices].sort((a, b) => a - b);
    const sortedFeatures = [...featureCounts].sort((a, b) => a - b);
    const medianPrice = sortedPrices.length % 2 === 0
      ? (sortedPrices[sortedPrices.length / 2 - 1] + sortedPrices[sortedPrices.length / 2]) / 2
      : sortedPrices[Math.floor(sortedPrices.length / 2)];
    const medianFeatures = sortedFeatures.length % 2 === 0
      ? (sortedFeatures[sortedFeatures.length / 2 - 1] + sortedFeatures[sortedFeatures.length / 2]) / 2
      : sortedFeatures[Math.floor(sortedFeatures.length / 2)];

    // Build response with normalized coordinates
    const result = competitorData.map(c => {
      const x = normalize(c.avgPrice, minPrice, maxPrice);
      const y = normalize(c.featureCount, minFeatures, maxFeatures);
      
      return {
        id: c.id,
        name: c.name,
        x,
        y,
        quadrant: getQuadrant(c.avgPrice, c.featureCount, medianPrice, medianFeatures),
        avgPrice: c.avgPrice,
        featureCount: c.featureCount,
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching market position:', error);
    res.status(500).json({
      error: 'Failed to fetch market position',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
