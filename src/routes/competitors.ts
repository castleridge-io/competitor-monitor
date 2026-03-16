import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/index.js';
import type { Competitor, SelectorConfig } from '../models/index.js';

const router = Router();

// List all competitors
router.get('/', (_req, res) => {
  const db = getDatabase();
  const competitors = db.prepare(`
    SELECT id, name, url, selectors, created_at, updated_at 
    FROM competitors 
    ORDER BY created_at DESC
  `).all() as Competitor[];
  
  res.json(competitors);
});

// Get single competitor
router.get('/:id', (req, res) => {
  const db = getDatabase();
  const competitor = db.prepare(`
    SELECT id, name, url, selectors, created_at, updated_at 
    FROM competitors 
    WHERE id = ?
  `).get(req.params.id) as Competitor | undefined;
  
  if (!competitor) {
    return res.status(404).json({ error: 'Competitor not found' });
  }
  
  res.json(competitor);
});

// Add competitor
router.post('/', (req, res) => {
  const { name, url, selectors }: { name: string; url: string; selectors?: SelectorConfig } = req.body;
  
  if (!name || !url) {
    return res.status(400).json({ error: 'name and url are required' });
  }
  
  const db = getDatabase();
  const id = uuidv4();
  
  const stmt = db.prepare(`
    INSERT INTO competitors (id, name, url, selectors)
    VALUES (?, ?, ?, ?)
  `);
  
  stmt.run(id, name, url, selectors ? JSON.stringify(selectors) : null);
  
  const competitor = db.prepare('SELECT * FROM competitors WHERE id = ?').get(id);
  res.status(201).json(competitor);
});

// Update competitor
router.patch('/:id', (req, res) => {
  const { name, url, selectors }: { name?: string; url?: string; selectors?: SelectorConfig } = req.body;
  const db = getDatabase();
  
  const updates: string[] = [];
  const values: (string | null)[] = [];
  
  if (name) {
    updates.push('name = ?');
    values.push(name);
  }
  if (url) {
    updates.push('url = ?');
    values.push(url);
  }
  if (selectors) {
    updates.push('selectors = ?');
    values.push(JSON.stringify(selectors));
  }
  
  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }
  
  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(req.params.id);
  
  const stmt = db.prepare(`UPDATE competitors SET ${updates.join(', ')} WHERE id = ?`);
  stmt.run(...values);
  
  const competitor = db.prepare('SELECT * FROM competitors WHERE id = ?').get(req.params.id);
  res.json(competitor);
});

// Delete competitor
router.delete('/:id', (req, res) => {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM competitors WHERE id = ?').run(req.params.id);
  
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Competitor not found' });
  }
  
  res.status(204).send();
});

export default router;
