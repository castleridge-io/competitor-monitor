import { Router } from 'express';
import type { Router as RouterType } from 'express';
import { db } from '../db/index.js';
import { reports } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';

const router: RouterType = Router();

// Get report by ID
router.get('/:id', async (req, res) => {
  const result = await db.select().from(reports).where(eq(reports.id, req.params.id));
  
  if (result.length === 0) {
    return res.status(404).json({ error: 'Report not found' });
  }
  
  const report = result[0];
  res.json({
    id: report.id,
    competitorId: report.competitorId,
    scrapeId: report.scrapeId,
    htmlContent: report.htmlContent,
    jsonData: JSON.parse(report.jsonData),
    isPublic: report.isPublic,
    createdAt: report.createdAt,
  });
});

// List all reports
router.get('/', async (_req, res) => {
  const result = await db.select({
    id: reports.id,
    competitorId: reports.competitorId,
    isPublic: reports.isPublic,
    createdAt: reports.createdAt,
  }).from(reports).orderBy(desc(reports.createdAt));
  
  res.json(result);
});

// Make report public/private
router.patch('/:id/public', async (req, res) => {
  const { isPublic } = req.body;
  
  await db.update(reports)
    .set({ isPublic })
    .where(eq(reports.id, req.params.id));
  
  const result = await db.select().from(reports).where(eq(reports.id, req.params.id));
  
  if (result.length === 0) {
    return res.status(404).json({ error: 'Report not found' });
  }
  
  const report = result[0];
  res.json({
    id: report.id,
    competitorId: report.competitorId,
    scrapeId: report.scrapeId,
    htmlContent: report.htmlContent,
    jsonData: JSON.parse(report.jsonData),
    isPublic: report.isPublic,
    createdAt: report.createdAt,
  });
});

export default router;
