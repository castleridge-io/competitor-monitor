import { Router } from 'express';
import type { Router as RouterType } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/index.js';
import { competitors, subscriptions } from '../db/schema.js';
import { eq, desc, and } from 'drizzle-orm';

const router: RouterType = Router();
const db = getDb();

// Subscribe to competitor updates
router.post('/', async (req, res) => {
  const { email, competitorId } = req.body;
  
  if (!email || !competitorId) {
    return res.status(400).json({ error: 'email and competitorId are required' });
  }
  
  // Check if competitor exists
  const competitorResult = await db.select().from(competitors).where(eq(competitors.id, competitorId));
  
  if (competitorResult.length === 0) {
    return res.status(404).json({ error: 'Competitor not found' });
  }
  
  const id = uuidv4();
  const now = new Date();
  
  try {
    await db.insert(subscriptions).values({
      id,
      email,
      competitorId,
      createdAt: now,
    });
    
    res.status(201).json({ 
      message: 'Subscribed to competitor updates',
      id,
      email,
      competitorId 
    });
  } catch (error) {
    const errMsg = String(error);
    if (errMsg.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Already subscribed to this competitor' });
    }
    throw error;
  }
});

// Unsubscribe from competitor updates
router.delete('/', async (req, res) => {
  const { email, competitorId } = req.body;
  
  if (!email || !competitorId) {
    return res.status(400).json({ error: 'email and competitorId are required' });
  }
  
  await db.delete(subscriptions)
    .where(and(
      eq(subscriptions.email, email),
      eq(subscriptions.competitorId, competitorId)
    ));
  
  res.status(204).send();
});

// Get subscriptions for an email
router.get('/:email', async (req, res) => {
  const { email } = req.params;
  
  const result = await db.select({
    id: subscriptions.id,
    competitorId: subscriptions.competitorId,
    createdAt: subscriptions.createdAt,
    competitorName: competitors.name,
    competitorUrl: competitors.url,
  }).from(subscriptions)
    .innerJoin(competitors, eq(subscriptions.competitorId, competitors.id))
    .where(eq(subscriptions.email, email))
    .orderBy(desc(subscriptions.createdAt));
  
  res.json(result);
});

export default router;
