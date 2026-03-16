import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { initDatabase } from './db/index.js';
import competitorsRouter from './routes/competitors.js';
import scrapeRouter from './routes/scrape.js';
import reportsRouter from './routes/reports.js';
import publicRouter from './routes/public.js';

config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database and start server
async function start() {
  await initDatabase();
  
  // Routes
  app.use('/api/competitors', competitorsRouter);
  app.use('/api/scrape', scrapeRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/public', publicRouter);

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  });

  app.listen(PORT, () => {
    console.log(`🚀 Competitor Monitor API running on port ${PORT}`);
    console.log(`📊 Health: http://localhost:${PORT}/health`);
  });
}

start().catch(console.error);
