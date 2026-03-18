import { Router, Request, Response, NextFunction } from 'express';
import { getBadgeData, getCardData, getTimelineData } from '../services/widget.js';

const router = Router();

// Simple in-memory rate limiter for embed API
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100;

function checkRateLimit(apiKey: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(apiKey);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(apiKey, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  
  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  record.count++;
  return true;
}

// CORS middleware for embed endpoints
router.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Accept');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

/**
 * GET /api/v1/embed/badge
 * Get embeddable badge widgets for competitors
 * Query params:
 * - apiKey: API key (required)
 * - competitors: comma-separated list of competitor IDs
 * - theme: 'light' or 'dark' (default: 'light')
 * - size: 'small', 'medium', or 'large' (default: 'medium')
 */
router.get('/badge', async (req: Request, res: Response) => {
  try {
    const { apiKey, competitors, theme = 'light', size = 'medium' } = req.query;
    
    // Validate required parameters
    if (!apiKey) {
      return res.status(400).json({ error: 'apiKey is required' });
    }
    
    if (!competitors) {
      return res.status(400).json({ error: 'competitors parameter is required' });
    }
    
    // Check rate limit
    if (!checkRateLimit(apiKey as string)) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }
    
    const competitorIds = (competitors as string).split(',').map(id => id.trim());
    const widgets = [];
    
    for (const competitorId of competitorIds) {
      const badgeData = await getBadgeData(competitorId);
      if (badgeData) {
        widgets.push({
          ...badgeData,
          theme,
          size,
        });
      }
    }
    
    // Return HTML if requested
    if (req.headers.accept?.includes('text/html')) {
      const html = renderBadgeHTML(widgets, theme as string, size as string);
      return res.send(html);
    }
    
    // Default to JSON
    res.json({ widgets });
  } catch (error) {
    console.error('Error in embed/badge:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/embed/timeline
 * Get embeddable timeline widgets for competitors
 * Query params:
 * - apiKey: API key (required)
 * - competitors: comma-separated list of competitor IDs
 * - limit: number of changes to show (default: 5)
 * - theme: 'light' or 'dark' (default: 'light')
 */
router.get('/timeline', async (req: Request, res: Response) => {
  try {
    const { apiKey, competitors, limit = '5', theme = 'light' } = req.query;
    
    // Validate required parameters
    if (!apiKey) {
      return res.status(400).json({ error: 'apiKey is required' });
    }
    
    if (!competitors) {
      return res.status(400).json({ error: 'competitors parameter is required' });
    }
    
    // Check rate limit
    if (!checkRateLimit(apiKey as string)) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }
    
    const competitorIds = (competitors as string).split(',').map(id => id.trim());
    const limitNum = parseInt(limit as string) || 5;
    const widgets = [];
    
    for (const competitorId of competitorIds) {
      const timelineData = await getTimelineData(competitorId, limitNum);
      if (timelineData) {
        widgets.push({
          ...timelineData,
          theme,
        });
      }
    }
    
    // Return HTML if requested
    if (req.headers.accept?.includes('text/html')) {
      const html = renderTimelineHTML(widgets, theme as string);
      return res.send(html);
    }
    
    // Default to JSON
    res.json({ widgets });
  } catch (error) {
    console.error('Error in embed/timeline:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/embed/comparison
 * Get embeddable comparison card widgets for competitors
 * Query params:
 * - apiKey: API key (required)
 * - competitors: comma-separated list of competitor IDs
 * - theme: 'light' or 'dark' (default: 'light')
 */
router.get('/comparison', async (req: Request, res: Response) => {
  try {
    const { apiKey, competitors, theme = 'light' } = req.query;
    
    // Validate required parameters
    if (!apiKey) {
      return res.status(400).json({ error: 'apiKey is required' });
    }
    
    if (!competitors) {
      return res.status(400).json({ error: 'competitors parameter is required' });
    }
    
    // Check rate limit
    if (!checkRateLimit(apiKey as string)) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }
    
    const competitorIds = (competitors as string).split(',').map(id => id.trim());
    const widgets = [];
    
    for (const competitorId of competitorIds) {
      const cardData = await getCardData(competitorId);
      if (cardData) {
        widgets.push({
          ...cardData,
          theme,
        });
      }
    }
    
    // Return HTML if requested
    if (req.headers.accept?.includes('text/html')) {
      const html = renderComparisonHTML(widgets, theme as string);
      return res.send(html);
    }
    
    // Default to JSON
    res.json({ widgets });
  } catch (error) {
    console.error('Error in embed/comparison:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Render badge widgets as HTML
 */
function renderBadgeHTML(widgets: any[], theme: string, size: string): string {
  const sizeStyles = {
    small: 'padding: 8px; font-size: 12px;',
    medium: 'padding: 12px; font-size: 14px;',
    large: 'padding: 16px; font-size: 16px;',
  };
  
  const themeStyles = theme === 'dark' 
    ? 'background: #1a1a1a; color: #fff; border: 1px solid #333;'
    : 'background: #fff; color: #333; border: 1px solid #ddd;';
  
  const badges = widgets.map(widget => {
    const priceChangeColor = widget.priceChange === 'increase' 
      ? '#dc2626' 
      : widget.priceChange === 'decrease' 
        ? '#16a34a' 
        : '#666';
    
    const priceChangeText = widget.priceChangePercent 
      ? `${widget.priceChange === 'increase' ? '↑' : '↓'} ${widget.priceChangePercent}%`
      : '';
    
    return `
      <div class="competitor-monitor-badge theme-${theme}" style="${themeStyles} ${sizeStyles[size as keyof typeof sizeStyles]} border-radius: 8px; margin-bottom: 8px;">
        <div style="font-weight: bold; margin-bottom: 4px;">${widget.competitorName}</div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>${widget.currentPrice || 'N/A'}</span>
          ${priceChangeText ? `<span style="color: ${priceChangeColor}; font-weight: bold;">${priceChangeText}</span>` : ''}
        </div>
      </div>
    `;
  }).join('');
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; }
      </style>
    </head>
    <body>
      ${badges}
      <div style="text-align: center; font-size: 11px; color: #999; margin-top: 8px;">
        Powered by Competitor Monitor
      </div>
    </body>
    </html>
  `;
}

/**
 * Render timeline widgets as HTML
 */
function renderTimelineHTML(widgets: any[], theme: string): string {
  const themeStyles = theme === 'dark' 
    ? 'background: #1a1a1a; color: #fff; border: 1px solid #333;'
    : 'background: #fff; color: #333; border: 1px solid #ddd;';
  
  const timelines = widgets.map(widget => {
    const changes = widget.changes.map((change: any) => {
      const date = new Date(change.date).toLocaleDateString();
      return `
        <div style="padding: 12px 0; border-bottom: 1px solid ${theme === 'dark' ? '#333' : '#eee'};">
          <div style="font-size: 11px; color: #999; margin-bottom: 4px;">${date}</div>
          <div style="font-size: 14px;">${change.narrative}</div>
        </div>
      `;
    }).join('');
    
    return `
      <div class="competitor-monitor-timeline" style="${themeStyles} padding: 12px; border-radius: 8px; margin-bottom: 8px;">
        <div style="font-weight: bold; margin-bottom: 12px; font-size: 16px;">${widget.competitorName}</div>
        <div class="timeline">${changes}</div>
      </div>
    `;
  }).join('');
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; }
      </style>
    </head>
    <body>
      ${timelines}
      <div style="text-align: center; font-size: 11px; color: #999; margin-top: 8px;">
        Powered by <a href="https://competitor-monitor.example.com" target="_blank" style="color: #666; text-decoration: none;">Competitor Monitor</a>
      </div>
    </body>
    </html>
  `;
}

/**
 * Render comparison card widgets as HTML
 */
function renderComparisonHTML(widgets: any[], theme: string): string {
  const themeStyles = theme === 'dark' 
    ? 'background: #1a1a1a; color: #fff; border: 1px solid #333;'
    : 'background: #fff; color: #333; border: 1px solid #ddd;';
  
  const cards = widgets.map(widget => {
    const features = widget.features.map((f: any) => {
      const competitorIcon = f.competitor ? '✓' : '✗';
      const oursIcon = f.ours ? '✓' : '✗';
      const competitorColor = f.competitor ? '#16a34a' : '#dc2626';
      const oursColor = f.ours ? '#16a34a' : '#dc2626';
      
      return `
        <tr style="border-bottom: 1px solid ${theme === 'dark' ? '#333' : '#eee'};">
          <td style="padding: 8px;">${f.feature}</td>
          <td style="padding: 8px; text-align: center; color: ${competitorColor};">${competitorIcon}</td>
          <td style="padding: 8px; text-align: center; color: ${oursColor};">${oursIcon}</td>
        </tr>
      `;
    }).join('');
    
    return `
      <div class="competitor-monitor-comparison" style="${themeStyles} padding: 16px; border-radius: 8px; margin-bottom: 8px;">
        <div style="font-weight: bold; margin-bottom: 12px; font-size: 18px;">${widget.competitorName}</div>
        <div style="margin-bottom: 16px; font-size: 14px; color: #666;">${widget.summary}</div>
        ${widget.pricing?.competitor ? `
          <div style="margin-bottom: 16px; padding: 12px; background: ${theme === 'dark' ? '#2a2a2a' : '#f5f5f5'}; border-radius: 4px;">
            <strong>Pricing:</strong> ${widget.pricing.competitor}
          </div>
        ` : ''}
        ${features ? `
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="border-bottom: 2px solid ${theme === 'dark' ? '#444' : '#ddd'};">
                <th style="padding: 8px; text-align: left;">Feature</th>
                <th style="padding: 8px; text-align: center;">Competitor</th>
                <th style="padding: 8px; text-align: center;">Us</th>
              </tr>
            </thead>
            <tbody>
              ${features}
            </tbody>
          </table>
        ` : ''}
      </div>
    `;
  }).join('');
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; }
      </style>
    </head>
    <body>
      ${cards}
      <div style="text-align: center; font-size: 11px; color: #999; margin-top: 8px;">
        Powered by <a href="https://competitor-monitor.example.com" target="_blank" style="color: #666; text-decoration: none;">Competitor Monitor</a>
      </div>
    </body>
    </html>
  `;
}

export default router;
