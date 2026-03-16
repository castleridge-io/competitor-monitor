import { Router } from 'express';
import type { Router as RouterType } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase, saveDatabase } from '../db/index.js';

const router: RouterType = Router();

// Subscribe to competitor updates
router.post('/', async (req, res) => {
  const { email, competitorId } = req.body;
  
  if (!email || !competitorId) {
    return res.status(400).json({ error: 'email and competitorId are required' });
  }
  
  const db = await getDatabase();
  
  // Check if competitor exists
  const competitorResult = db.exec('SELECT id FROM competitors WHERE id = ?', [competitorId]);
  if (!competitorResult[0] || competitorResult[0].values.length === 0) {
    return res.status(404).json({ error: 'Competitor not found' });
  }
  
  const id = uuidv4();
  const now = new Date().toISOString();
  
  try {
    db.run(`
      INSERT INTO competitor_subscriptions (id, email, competitor_id, created_at)
      VALUES (?, ?, ?, ?)
    `, [id, email, competitorId, now]);
    
    saveDatabase();
    
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
  
  const db = await getDatabase();
  
  db.run(`
    DELETE FROM competitor_subscriptions 
    WHERE email = ? AND competitor_id = ?
  `, [email, competitorId]);
  
  saveDatabase();
  
  res.status(204).send();
});

// Get subscriptions for an email
router.get('/:email', async (req, res) => {
  const { email } = req.params;
  const db = await getDatabase();
  
  const result = db.exec(`
    SELECT cs.id, cs.competitor_id, cs.created_at, c.name, c.url
    FROM competitor_subscriptions cs
    JOIN competitors c ON cs.competitor_id = c.id
    WHERE cs.email = ?
    ORDER BY cs.created_at DESC
  `, [email]);
  
  const subscriptions = result[0]?.values.map(row => ({
    id: row[0],
    competitorId: row[1],
    createdAt: row[2],
    competitorName: row[3],
    competitorUrl: row[4],
  })) || [];
  
  res.json(subscriptions);
});

export default router;
