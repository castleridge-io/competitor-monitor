import { Router } from 'express';
import type { Router as RouterType } from 'express';
import { getDatabase, saveDatabase } from '../db/index.js';

const router: RouterType = Router();

// Get report by ID
router.get('/:id', async (req, res) => {
  const db = await getDatabase();
  const result = db.exec(`
    SELECT id, competitor_id, scrape_id, html_content, json_data, is_public, created_at
    FROM reports
    WHERE id = ?
  `, [req.params.id]);
  
  if (!result[0] || result[0].values.length === 0) {
    return res.status(404).json({ error: 'Report not found' });
  }
  
  const row = result[0].values[0];
  res.json({
    id: row[0],
    competitorId: row[1],
    scrapeId: row[2],
    htmlContent: row[3],
    jsonData: JSON.parse(row[4] as string),
    isPublic: row[5] === 1,
    createdAt: row[6],
  });
});

// List all reports
router.get('/', async (_req, res) => {
  const db = await getDatabase();
  const result = db.exec(`
    SELECT id, competitor_id, is_public, created_at
    FROM reports
    ORDER BY created_at DESC
  `);
  
  const reports = result[0]?.values.map(row => ({
    id: row[0],
    competitorId: row[1],
    isPublic: row[2] === 1,
    createdAt: row[3],
  })) || [];
  
  res.json(reports);
});

// Make report public/private
router.patch('/:id/public', async (req, res) => {
  const { isPublic } = req.body;
  const db = await getDatabase();
  
  db.run(`UPDATE reports SET is_public = ? WHERE id = ?`, [isPublic ? 1 : 0, req.params.id]);
  saveDatabase();
  
  const result = db.exec('SELECT * FROM reports WHERE id = ?', [req.params.id]);
  if (!result[0] || result[0].values.length === 0) {
    return res.status(404).json({ error: 'Report not found' });
  }
  
  const row = result[0].values[0];
  res.json({
    id: row[0],
    competitorId: row[1],
    scrapeId: row[2],
    htmlContent: row[3],
    jsonData: JSON.parse(row[4] as string),
    isPublic: row[5] === 1,
    createdAt: row[6],
  });
});

export default router;
