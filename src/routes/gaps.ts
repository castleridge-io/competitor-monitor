import { Router } from 'express';
import type { Router as RouterType } from 'express';
import { getDb } from '../db/index.js';
import { competitors, scrapes } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import {
  analyzeFeatureGaps,
  saveGapAnalysis,
  getGapAnalysis,
  getAllGapAnalyses,
  FeatureGapInput,
} from '../services/feature-gap-analyzer.js';

const router: RouterType = Router();

// Analyze feature gaps for a competitor
router.post('/analyze', async (req, res) => {
  try {
    const db = getDb();
    const { competitorId, userFeatures } = req.body;

    if (!competitorId) {
      return res.status(400).json({ error: 'competitorId is required' });
    }

    if (!Array.isArray(userFeatures)) {
      return res.status(400).json({ error: 'userFeatures must be an array' });
    }

    // Verify competitor exists
    const competitorResult = await db
      .select()
      .from(competitors)
      .where(eq(competitors.id, competitorId));

    if (competitorResult.length === 0) {
      return res.status(404).json({ error: 'Competitor not found' });
    }

    const competitor = competitorResult[0];

    // Get competitor features from most recent scrape
    const scrapeResult = await db
      .select()
      .from(scrapes)
      .where(eq(scrapes.competitorId, competitorId))
      .orderBy(desc(scrapes.scrapedAt))
      .limit(1);

    let competitorFeatures: string[] = [];

    if (scrapeResult.length > 0) {
      const scrapeData = JSON.parse(scrapeResult[0].data);
      if (Array.isArray(scrapeData.features)) {
        competitorFeatures = scrapeData.features.filter(
          (f: unknown): f is string => typeof f === 'string'
        );
      }
    }

    // Analyze gaps
    const input: FeatureGapInput = {
      competitorId,
      competitorName: competitor.name,
      competitorFeatures,
      userFeatures,
    };

    const analysis = await analyzeFeatureGaps(input);

    // Save to database
    await saveGapAnalysis({
      competitorId,
      missingFeatures: analysis.missingFeatures,
      recommendations: analysis.recommendations,
    });

    res.json(analysis);
  } catch (error) {
    console.error('Error analyzing feature gaps:', error);
    res.status(500).json({ error: 'Failed to analyze feature gaps' });
  }
});

// Get gap analysis for a specific competitor
router.get('/:competitorId', async (req, res) => {
  try {
    const db = getDb();
    const { competitorId } = req.params;

    // Verify competitor exists
    const competitorResult = await db
      .select()
      .from(competitors)
      .where(eq(competitors.id, competitorId));

    if (competitorResult.length === 0) {
      return res.status(404).json({ error: 'Competitor not found' });
    }

    const analysis = await getGapAnalysis(competitorId);

    if (!analysis) {
      return res.status(404).json({ error: 'No gap analysis found for this competitor' });
    }

    // Add competitor name to response
    res.json({
      ...analysis,
      competitorName: competitorResult[0].name,
    });
  } catch (error) {
    console.error('Error getting gap analysis:', error);
    res.status(500).json({ error: 'Failed to get gap analysis' });
  }
});

// List all gap analyses
router.get('/', async (_req, res) => {
  try {
    const db = getDb();
    const analyses = await getAllGapAnalyses();

    // Get competitor names
    const competitorIds = [...new Set(analyses.map(a => a.competitorId))];
    const competitorResults = competitorIds.length > 0 
      ? await db.select().from(competitors)
      : [];

    // Create a map of competitor IDs to names
    const competitorNames = new Map(
      competitorResults.map(c => [c.id, c.name])
    );

    // Add competitor names to response
    const result = analyses.map(analysis => ({
      ...analysis,
      competitorName: competitorNames.get(analysis.competitorId) || 'Unknown',
    }));

    res.json(result);
  } catch (error) {
    console.error('Error listing gap analyses:', error);
    res.status(500).json({ error: 'Failed to list gap analyses' });
  }
});

export default router;
