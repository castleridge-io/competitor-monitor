import { Router } from 'express';
import type { Router as RouterType } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase, saveDatabase } from '../db/index.js';
import type { Competitor, SelectorConfig } from '../models/index.js';

const router: RouterType = Router();

// List all competitors
router.get('/', async (_req, res) => {
  const db = await getDatabase();
  const result = db.exec(`
    SELECT id, name, url, selectors, created_at, updated_at 
    FROM competitors 
    ORDER BY created_at DESC
  `);
  
  const competitors = result[0]?.values.map(row => ({
    id: row[0],
    name: row[1],
    url: row[2],
    selectors: row[3] ? JSON.parse(row[3] as string) : null,
    createdAt: row[4],
    updatedAt: row[5],
  })) || [];
  
  res.json(competitors);
});

// Get single competitor
router.get('/:id', async (req, res) => {
  const db = await getDatabase();
  const result = db.exec(`
    SELECT id, name, url, selectors, created_at, updated_at 
    FROM competitors 
    WHERE id = ?
  `, [req.params.id]);
  
  if (!result[0] || result[0].values.length === 0) {
    return res.status(404).json({ error: 'Competitor not found' });
  }
  
  const row = result[0].values[0];
  const competitor = {
    id: row[0],
    name: row[1],
    url: row[2],
    selectors: row[3] ? JSON.parse(row[3] as string) : null,
    createdAt: row[4],
    updatedAt: row[5],
  };
  
  res.json(competitor);
});

// Add competitor
router.post('/', async (req, res) => {
  const { name, url, selectors }: { name: string; url: string; selectors?: SelectorConfig } = req.body;
  
  if (!name || !url) {
    return res.status(400).json({ error: 'name and url are required' });
  }
  
  const db = await getDatabase();
  const id = uuidv4();
  const now = new Date().toISOString();
  
  db.run(`
    INSERT INTO competitors (id, name, url, selectors, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [id, name, url, selectors ? JSON.stringify(selectors) : null, now, now]);
  
  saveDatabase();
  
  res.status(201).json({ id, name, url, selectors, createdAt: now, updatedAt: now });
});

// Update competitor
router.patch('/:id', async (req, res) => {
  const { name, url, selectors }: { name?: string; url?: string; selectors?: SelectorConfig } = req.body;
  const db = await getDatabase();
  
  const now = new Date().toISOString();
  
  if (name) {
    db.run('UPDATE competitors SET name = ?, updated_at = ? WHERE id = ?', [name, now, req.params.id]);
  }
  if (url) {
    db.run('UPDATE competitors SET url = ?, updated_at = ? WHERE id = ?', [url, now, req.params.id]);
  }
  if (selectors) {
    db.run('UPDATE competitors SET selectors = ?, updated_at = ? WHERE id = ?', [JSON.stringify(selectors), now, req.params.id]);
  }
  
  saveDatabase();
  
  const result = db.exec('SELECT * FROM competitors WHERE id = ?', [req.params.id]);
  if (!result[0] || result[0].values.length === 0) {
    return res.status(404).json({ error: 'Competitor not found' });
  }
  
  const row = result[0].values[0];
  res.json({
    id: row[0],
    name: row[1],
    url: row[2],
    selectors: row[3] ? JSON.parse(row[3] as string) : null,
    createdAt: row[4],
    updatedAt: row[5],
  });
});

// Delete competitor
router.delete('/:id', async (req, res) => {
  const db = await getDatabase();
  const result = db.exec('SELECT id FROM competitors WHERE id = ?', [req.params.id]);
  
  if (!result[0] || result[0].values.length === 0) {
    return res.status(404).json({ error: 'Competitor not found' });
  }
  
  db.run('DELETE FROM competitors WHERE id = ?', [req.params.id]);
  saveDatabase();
  
  res.status(204).send();
});

export default router;
