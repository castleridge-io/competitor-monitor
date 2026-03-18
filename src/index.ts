import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { initDatabase } from './db/index.js';

config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database and start server
async function start() {
  await initDatabase();

  // Import routes AFTER database is initialized
  const { default: competitorsRouter } = await import('./routes/competitors.js');
  const { default: scrapeRouter } = await import('./routes/scrape.js');
  const { default: reportsRouter } = await import('./routes/reports.js');
  const { default: subscriptionsRouter } = await import('./routes/subscriptions.js');
  const { default: publicRouter } = await import('./routes/public.js');
  const { default: settingsRouter } = await import('./routes/settings.js');
  const { default: trendsRouter } = await import('./routes/trends.js');
  const { default: gapsRouter } = await import('./routes/gaps.js');
  const { default: timelineRouter } = await import('./routes/timeline.js');
  const { default: billingRouter } = await import('./routes/billing.js');
  const { default: apiKeysRouter } = await import('./routes/api-keys.js');
  const { default: publicApiRouter } = await import('./routes/public-api.js');
  const { default: docsRouter } = await import('./routes/api-docs.js');
  const { default: widgetsRouter } = await import('./routes/widgets.js');
  const { default: embedRouter } = await import('./routes/embed.js');
  const { default: cloneRouter } = await import('./routes/clone.js');
  const { default: marketPositionRouter } = await import('./routes/market-position.js');
  const { default: videosRouter } = await import('./routes/videos.js');
  const { authenticateApiKey } = await import('./middleware/auth.js');
  const { rateLimiter } = await import('./middleware/rate-limiter.js');

  // Routes
  app.use('/api/competitors', competitorsRouter);
  app.use('/api/scrape', scrapeRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/subscriptions', subscriptionsRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/trends', trendsRouter);
  app.use('/api/gaps', gapsRouter);
  app.use('/api/billing', billingRouter);
  app.use('/api/clone', cloneRouter);
  app.use('/api/market-position', marketPositionRouter);
  app.use('/api/videos', videosRouter);
  app.use('/public', publicRouter);
  app.use('/api/v1/widgets', widgetsRouter);
  app.use('/api/v1/embed', embedRouter);

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
