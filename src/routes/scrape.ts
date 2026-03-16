import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/index.js';
import { scrapeCompetitor } from '../services/scraper.js';
import { generateReport } from '../services/reporter.js';

const router = Router();

// Trigger scrape for a competitor
router.post('/:competitorId', async (req, res) => {
  const { competitorId } = req.params;
  const db = getDatabase();
  
  // Get competitor
  const competitor = db.prepare('SELECT * FROM competitors WHERE id = ?').get(competitorId);
  if (!competitor) {
    return res.status(404).json({ error: 'Competitor not found' });
  }
  
  try {
    // Run scraper
    const scrapeData = await scrapeCompetitor(competitor);
    
    // Store scrape
    const scrapeId = uuidv4();
    db.prepare(`
      INSERT INTO scrapes (id, competitor_id, data)
      VALUES (?, ?, ?)
    `).run(scrapeId, competitorId, JSON.stringify(scrapeData));
    
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
router.get('/:competitorId', (req, res) => {
  const { competitorId } = req.params;
  const db = getDatabase();
  
  const scrapes = db.prepare(`
    SELECT id, competitor_id, data, scraped_at
    FROM scrapes
    WHERE competitor_id = ?
    ORDER BY scraped_at DESC
    LIMIT 10
  `).all(competitorId);
  
  res.json(scrapes);
});

export default router;
