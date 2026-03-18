import { Router } from 'express';
import type { Router as RouterType } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/index.js';
import { competitors } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { isValidUrl, sanitizeString } from '../middleware/validation.js';
import {
  analyzeCompetitorWebsite,
  generateGapReport,
  runGapAnalysis,
  CloneResult,
} from '../services/competitor-cloner.js';

const router: RouterType = Router();
const db = getDb();

// In-memory store for clone history (can be moved to DB if needed)
interface CloneHistoryEntry {
  id: string;
  url: string;
  name: string;
  features: string[];
  techStack: string[];
  pricing: string | null;
  clonedAt: Date;
}

const cloneHistory: CloneHistoryEntry[] = [];

/**
 * POST /api/clone
 * Analyze a competitor URL and return detected features + gap analysis.
 */
router.post('/', async (req, res) => {
  try {
    const { url, userFeatures } = req.body;

    // Validate URL
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    if (!isValidUrl(url)) {
      return res.status(400).json({ error: 'Invalid URL format. Must be a valid http or https URL' });
    }

    // Analyze competitor website
    const cloneResult: CloneResult = await analyzeCompetitorWebsite(url);

    // Prepare response
    const response: Record<string, unknown> = {
      detectedFeatures: {
        name: cloneResult.name,
        url: cloneResult.url,
        features: cloneResult.features,
        techStack: cloneResult.techStack,
        pricing: cloneResult.pricing,
        metadata: cloneResult.metadata,
        scrapedAt: cloneResult.scrapedAt,
      },
    };

    // Generate gap analysis if user features provided
    if (userFeatures && Array.isArray(userFeatures) && userFeatures.length > 0) {
      const gapReport = generateGapReport(cloneResult.features, userFeatures);
      
      // Also run AI-powered gap analysis if available
      try {
        const aiAnalysis = await runGapAnalysis(
          cloneResult.name,
          cloneResult.features,
          userFeatures
        );
        response.gapAnalysis = {
          ...gapReport,
          aiRecommendations: aiAnalysis.recommendations,
          analysisId: aiAnalysis.id,
        };
      } catch {
        // Fall back to basic gap report if AI analysis fails
        response.gapAnalysis = gapReport;
      }
    }

    // Add to history
    cloneHistory.push({
      id: uuidv4(),
      url: cloneResult.url,
      name: cloneResult.name,
      features: cloneResult.features,
      techStack: cloneResult.techStack,
      pricing: cloneResult.pricing,
      clonedAt: new Date(),
    });

    // Keep only last 100 entries
    if (cloneHistory.length > 100) {
      cloneHistory.splice(0, cloneHistory.length - 100);
    }

    res.json(response);
  } catch (error) {
    console.error('Clone analysis error:', error);
    res.status(500).json({
      error: 'Failed to analyze competitor',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/clone/add-to-tracking
 * Add a detected competitor to the tracking list.
 */
router.post('/add-to-tracking', async (req, res) => {
  try {
    const { name, url, features, selectors } = req.body;

    // Validate required fields
    if (!name || !url) {
      return res.status(400).json({ error: 'name and url are required' });
    }

    // Validate URL format
    if (!isValidUrl(url)) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    const id = uuidv4();
    const now = new Date();
    const sanitizedName = sanitizeString(name, 200);

    await db.insert(competitors).values({
      id,
      name: sanitizedName,
      url,
      selectors: selectors ? JSON.stringify(selectors) : null,
      createdAt: now,
      updatedAt: now,
    });

    res.status(201).json({
      id,
      name: sanitizedName,
      url,
      features,
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    console.error('Add to tracking error:', error);
    res.status(500).json({
      error: 'Failed to add competitor to tracking',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/clone/history
 * Get cloning history.
 */
router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const recentHistory = cloneHistory
      .sort((a, b) => b.clonedAt.getTime() - a.clonedAt.getTime())
      .slice(0, limit);

    res.json(recentHistory);
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      error: 'Failed to retrieve history',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/clone/quick-scan
 * Perform a quick scan of a competitor URL (lightweight version).
 */
router.post('/quick-scan', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    if (!isValidUrl(url)) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Quick analysis (same as full analysis, but we return less data)
    const cloneResult: CloneResult = await analyzeCompetitorWebsite(url);

    res.json({
      summary: {
        name: cloneResult.name,
        url: cloneResult.url,
        featureCount: cloneResult.features.length,
        techStackCount: cloneResult.techStack.length,
        hasPricing: cloneResult.pricing !== null,
      },
      features: cloneResult.features.slice(0, 10), // Top 10 features
      techStack: cloneResult.techStack,
      pricing: cloneResult.pricing,
    });
  } catch (error) {
    console.error('Quick scan error:', error);
    res.status(500).json({
      error: 'Failed to scan competitor',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
