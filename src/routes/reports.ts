import { Router } from 'express';
import { getDatabase } from '../db/index.js';

const router = Router();

// Get report by ID
router.get('/:id', (req, res) => {
  const db = getDatabase();
  const report = db.prepare(`
    SELECT id, competitor_id, scrape_id, html_content, json_data, is_public, created_at
    FROM reports
    WHERE id = ?
  `).get(req.params.id);
  
  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }
  
  res.json(report);
});

// List all reports
router.get('/', (_req, res) => {
  const db = getDatabase();
  const reports = db.prepare(`
    SELECT id, competitor_id, is_public, created_at
    FROM reports
    ORDER BY created_at DESC
  `).all();
  
  res.json(reports);
});

// Make report public/private
router.patch('/:id/public', (req, res) => {
  const { isPublic } = req.body;
  const db = getDatabase();
  
  db.prepare(`
    UPDATE reports SET is_public = ? WHERE id = ?
  `).run(isPublic ? 1 : 0, req.params.id);
  
  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id);
  res.json(report);
});

export default router;
