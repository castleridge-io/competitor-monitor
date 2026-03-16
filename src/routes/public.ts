import { Router } from 'express';
import { getDatabase } from '../db/index.js';

const router = Router();

// Public report page
router.get('/reports/:id', (req, res) => {
  const db = getDatabase();
  const report = db.prepare(`
    SELECT id, competitor_id, html_content, created_at
    FROM reports
    WHERE id = ? AND is_public = 1
  `).get(req.params.id) as { html_content: string } | undefined;
  
  if (!report) {
    return res.status(404).send('<h1>Report not found or not public</h1>');
  }
  
  res.setHeader('Content-Type', 'text/html');
  res.send(report.html_content);
});

// Add to waitlist
router.post('/waitlist', (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'email is required' });
  }
  
  const db = getDatabase();
  
  try {
    const { v4: uuidv4 } = await import('uuid');
    const id = uuidv4();
    
    db.prepare(`
      INSERT INTO waitlist (id, email)
      VALUES (?, ?)
    `).run(id, email);
    
    res.status(201).json({ message: 'Added to waitlist', id });
  } catch (error) {
    if ((error as { code?: string }).code === 'SQLITE_CONSTRAINT') {
      return res.status(409).json({ error: 'Email already on waitlist' });
    }
    throw error;
  }
});

export default router;
