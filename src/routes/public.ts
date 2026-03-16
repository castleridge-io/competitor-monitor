import { Router } from 'express';
import type { Router as RouterType } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/index.js';
import { reports, waitlist } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

const router: RouterType = Router();
const db = getDb();

// Public report page
router.get('/reports/:id', async (req, res) => {
  const result = await db.select({
    htmlContent: reports.htmlContent,
  }).from(reports)
    .where(and(
      eq(reports.id, req.params.id),
      eq(reports.isPublic, true)
    ));
  
  if (result.length === 0) {
    return res.status(404).send('<h1>Report not found or not public</h1>');
  }
  
  res.setHeader('Content-Type', 'text/html');
  res.send(result[0].htmlContent);
});

// Add to waitlist
router.post('/waitlist', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'email is required' });
  }
  
  const id = uuidv4();
  const now = new Date();
  
  try {
    await db.insert(waitlist).values({
      id,
      email,
      createdAt: now,
    });
    
    res.status(201).json({ message: 'Added to waitlist', id });
  } catch (error) {
    const errMsg = String(error);
    if (errMsg.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Email already on waitlist' });
    }
    throw error;
  }
});

export default router;
