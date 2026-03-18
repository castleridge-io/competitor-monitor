import { Router } from 'express';
import type { Router as RouterType } from 'express';
import { getDb } from '../db/index.js';
import { competitors, reports } from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { authenticateApiKey } from '../middleware/auth.js';
import { rateLimiter } from '../middleware/rate-limiter.js';

const router: RouterType = Router();
const db = getDb();

/**
 * @openapi
 * /v1/public/competitors:
 *   get:
 *     summary: List all competitors
 *     description: Retrieve a paginated list of all competitors in the system
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Maximum number of competitors to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of competitors to skip
 *     responses:
 *       200:
 *         description: Successful response with list of competitors
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 competitors:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Competitor'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 *       401:
 *         description: Unauthorized - Invalid or missing API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * GET /api/v1/public/competitors
 * List all competitors
 * 
 * @query { limit?: number, offset?: number }
 * @requires API key authentication
 * @returns { competitors: Competitor[], pagination: { total: number, limit: number, offset: number } }
 */
router.get('/competitors', authenticateApiKey, rateLimiter, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string || '20', 10);
    const offset = parseInt(req.query.offset as string || '0', 10);

    // Get competitors with pagination
    const allCompetitors = await db.select({
      id: competitors.id,
      name: competitors.name,
      url: competitors.url,
      createdAt: competitors.createdAt,
    })
      .from(competitors)
      .orderBy(desc(competitors.createdAt));

    // Apply pagination
    const paginatedCompetitors = allCompetitors.slice(offset, offset + limit);

    res.json({
      competitors: paginatedCompetitors.map(c => ({
        id: c.id,
        name: c.name,
        url: c.url,
        createdAt: c.createdAt?.toISOString(),
      })),
      pagination: {
        total: allCompetitors.length,
        limit,
        offset,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /v1/public/competitors/{id}:
 *   get:
 *     summary: Get a competitor by ID
 *     description: Retrieve a specific competitor's details
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Competitor ID
 *     responses:
 *       200:
 *         description: Successful response with competitor details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Competitor'
 *       401:
 *         description: Unauthorized - Invalid or missing API key
 *       404:
 *         description: Competitor not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Rate limit exceeded
 */
/**
 * GET /api/v1/public/competitors/:id
 * Get a specific competitor
 * 
 * @param id - Competitor ID
 * @requires API key authentication
 * @returns Competitor
 */
router.get('/competitors/:id', authenticateApiKey, rateLimiter, async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.select({
      id: competitors.id,
      name: competitors.name,
      url: competitors.url,
      createdAt: competitors.createdAt,
    })
      .from(competitors)
      .where(eq(competitors.id, id));

    if (result.length === 0) {
      return res.status(404).json({ error: 'Competitor not found' });
    }

    res.json({
      ...result[0],
      createdAt: result[0].createdAt?.toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /v1/public/reports/{id}:
 *   get:
 *     summary: Get a public report by ID
 *     description: Retrieve a specific public report's data (only public reports are accessible)
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Report ID
 *     responses:
 *       200:
 *         description: Successful response with report data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Report'
 *       401:
 *         description: Unauthorized - Invalid or missing API key
 *       404:
 *         description: Report not found or not public
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Rate limit exceeded
 */
/**
 * GET /api/v1/public/reports/:id
 * Get a public report
 * 
 * @param id - Report ID
 * @requires API key authentication
 * @returns Report (JSON data only, no HTML)
 */
router.get('/reports/:id', authenticateApiKey, rateLimiter, async (req, res, next) => {
  try {
    const { id } = req.params;

    // First check if report exists at all
    const anyReport = await db.select({
      id: reports.id,
      isPublic: reports.isPublic,
    })
      .from(reports)
      .where(eq(reports.id, id));

    if (anyReport.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Then check if it's public
    if (!anyReport[0].isPublic) {
      return res.status(404).json({ error: 'Report not found or not public' });
    }

    // Get full report data
    const result = await db.select({
      id: reports.id,
      competitorId: reports.competitorId,
      jsonData: reports.jsonData,
      createdAt: reports.createdAt,
    })
      .from(reports)
      .where(eq(reports.id, id));

    // Parse JSON data
    let jsonData;
    try {
      jsonData = JSON.parse(result[0].jsonData || '{}');
    } catch {
      jsonData = {};
    }

    res.json({
      id: result[0].id,
      competitorId: result[0].competitorId,
      jsonData,
      createdAt: result[0].createdAt?.toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
