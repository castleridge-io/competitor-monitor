import { Router } from 'express';
import type { Router as RouterType } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/index.js';
import { competitors } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const router: RouterType = Router();

// List all competitors
router.get('/', async (_req, res) => {
  const result = await db.select().from(competitors).orderBy(competitors.createdAt);
  res.json(result);
});

// Get single competitor
router.get('/:id', async (req, res) => {
  const result = await db.select().from(competitors).where(eq(competitors.id, req.params.id));
  
  if (result.length === 0) {
    return res.status(404).json({ error: 'Competitor not found' });
  }
  
  res.json(result[0]);
});

// Add competitor
router.post('/', async (req, res) => {
  const { name, url: competitorUrl, selectors } = req.body;
  
  if (!name || !competitorUrl) {
    return res.status(400).json({ error: 'name and url are required' });
  }
  
  const id = uuidv4();
  const now = new Date();
  
  await db.insert(competitors).values({
    id,
    name,
    url: competitorUrl,
    selectors: selectors ? JSON.stringify(selectors) : null,
    createdAt: now,
    updatedAt: now,
  });
  
  res.status(201).json({ id, name, url: competitorUrl, selectors, createdAt: now, updatedAt: now });
});

// Update competitor
router.patch('/:id', async (req, res) => {
  const { name, url: competitorUrl, selectors } = req.body;
  const now = new Date();
  
  const updateData: Record<string, unknown> = { updatedAt: now };
  
  if (name) updateData.name = name;
  if (competitorUrl) updateData.url = competitorUrl;
  if (selectors) updateData.selectors = JSON.stringify(selectors);
  
  await db.update(competitors)
    .set(updateData)
    .where(eq(competitors.id, req.params.id));
  
  const result = await db.select().from(competitors).where(eq(competitors.id, req.params.id));
  
  if (result.length === 0) {
    return res.status(404).json({ error: 'Competitor not found' });
  }
  
  res.json(result[0]);
});

// Delete competitor
router.delete('/:id', async (req, res) => {
  const result = await db.delete(competitors).where(eq(competitors.id, req.params.id));
  
  res.status(204).send();
});

export default router;
