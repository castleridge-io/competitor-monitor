import { Router } from 'express';
import type { Router as RouterType } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/index.js';
import { competitors, scrapes } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { scrapeCompetitor, type ScraperInput } from '../services/scraper.js';
import { generateReport, type ScrapeData } from '../services/reporter.js';

const router: RouterType = Router();

// Trigger scrape for a competitor
router.post('/:competitorId', async (req, res) => {
  const { competitorId } = req.params;
  
  // Get competitor
  const competitorResult = await db.select().from(competitors).where(eq(competitors.id, competitorId));
  
  if (competitorResult.length === 0) {
    return res.status(404).json({ error: 'Competitor not found' });
  }
  
  const competitor = competitorResult[0];
  
  try {
    // Build scraper input
    const scraperInput: ScraperInput = {
      id: competitor.id,
      name: competitor.name,
      url: competitor.url,
      selectors: competitor.selectors ? JSON.parse(competitor.selectors) : undefined,
    };
    
    // Run scraper
    const scrapeData = await scrapeCompetitor(scraperInput) as ScrapeData;
    
    // Store scrape
    const scrapeId = uuidv4();
    const now = new Date();
    
    await db.insert(scrapes).values({
      id: scrapeId,
      competitorId,
      data: JSON.stringify(scrapeData),
      scrapedAt: now,
    });
    
    // Generate report
    const report = await generateReport(competitorId, scrapeId, scrapeData);
    
    res.json({
      scrapeId,
      reportId: report.id,
      data: scrapeData,
      reportUrl: `/public/reports/${report.id}`
    });
  } catch (error) {
    console.error('Scrape error:', error);
    res.status(500).json({ 
      error: 'Scrape failed', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Get scrape history for competitor
router.get('/:competitorId', async (req, res) => {
  const { competitorId } = req.params;
  
  const result = await db.select()
    .from(scrapes)
    .where(eq(scrapes.competitorId, competitorId))
    .orderBy(desc(scrapes.scrapedAt))
    .limit(10);
  
  const scrapesList = result.map(s => ({
    id: s.id,
    competitorId: s.competitorId,
    data: JSON.parse(s.data),
    scrapedAt: s.scrapedAt,
  }));
  
  res.json(scrapesList);
});

export default router;
