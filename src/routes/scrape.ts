import { Router } from 'express';
import type { Router as RouterType } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase, saveDatabase } from '../db/index.js';
import { scrapeCompetitor } from '../services/scraper.js';
import { generateReport } from '../services/reporter.js';
import type { Competitor, ScrapeData } from '../models/index.js';

const router: RouterType = Router();

// Trigger scrape for a competitor
router.post('/:competitorId', async (req, res) => {
  const { competitorId } = req.params;
  const db = await getDatabase();
  
  // Get competitor
  const result = db.exec('SELECT * FROM competitors WHERE id = ?', [competitorId]);
  if (!result[0] || result[0].values.length === 0) {
    return res.status(404).json({ error: 'Competitor not found' });
  }
  
  const row = result[0].values[0];
  const competitor: Competitor = {
    id: row[0] as string,
    name: row[1] as string,
    url: row[2] as string,
    selectors: row[3] ? JSON.parse(row[3] as string) : undefined,
    createdAt: new Date(row[4] as string),
    updatedAt: new Date(row[5] as string),
  };
  
  try {
    // Run scraper
    const scrapeData = await scrapeCompetitor(competitor) as unknown as ScrapeData;
    
    // Store scrape
    const scrapeId = uuidv4();
    const now = new Date().toISOString();
    db.run(`
      INSERT INTO scrapes (id, competitor_id, data, scraped_at)
      VALUES (?, ?, ?, ?)
    `, [scrapeId, competitorId, JSON.stringify(scrapeData), now]);
    
    // Generate report
    const report = await generateReport(competitorId, scrapeId, scrapeData);
    
    saveDatabase();
    
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
  const db = await getDatabase();
  
  const result = db.exec(`
    SELECT id, competitor_id, data, scraped_at
    FROM scrapes
    WHERE competitor_id = ?
    ORDER BY scraped_at DESC
    LIMIT 10
  `, [competitorId]);
  
  const scrapes = result[0]?.values.map(row => ({
    id: row[0],
    competitorId: row[1],
    data: JSON.parse(row[2] as string),
    scrapedAt: row[3],
  })) || [];
  
  res.json(scrapes);
});

export default router;
