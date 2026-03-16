import { Router } from 'express';
import type { Router as RouterType } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase, saveDatabase } from '../db/index.js';

const router: RouterType = Router();

// Public report page
router.get('/reports/:id', async (req, res) => {
  const db = await getDatabase();
  const result = db.exec(`
    SELECT id, competitor_id, html_content, created_at
    FROM reports
    WHERE id = ? AND is_public = 1
  `, [req.params.id]);
  
  if (!result[0] || result[0].values.length === 0) {
    return res.status(404).send('<h1>Report not found or not public</h1>');
  }
  
  const row = result[0].values[0];
  res.setHeader('Content-Type', 'text/html');
  res.send(row[3] as string);
});

// Add to waitlist
router.post('/waitlist', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'email is required' });
  }
  
  const db = await getDatabase();
  const id = uuidv4();
  const now = new Date().toISOString();
  
  try {
    db.run(`
      INSERT INTO waitlist (id, email, created_at)
      VALUES (?, ?, ?)
    `, [id, email, now]);
    
    saveDatabase();
    
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
