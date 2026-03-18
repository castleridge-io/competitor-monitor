import { Router } from 'express';
import { getBadgeData, getCardData, getTimelineData } from '../services/widget.js';

const router = Router();

/**
 * GET /api/v1/widgets/:competitorId/badge
 * Get badge data for a competitor
 */
router.get('/:competitorId/badge', async (req, res) => {
  try {
    const { competitorId } = req.params;
    const badgeData = await getBadgeData(competitorId);
    
    if (!badgeData) {
      return res.status(404).json({ error: 'Competitor not found' });
    }
    
    res.json(badgeData);
  } catch (error) {
    console.error('Error fetching badge data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/widgets/:competitorId/card
 * Get card data for a competitor
 */
router.get('/:competitorId/card', async (req, res) => {
  try {
    const { competitorId } = req.params;
    const cardData = await getCardData(competitorId);
    
    if (!cardData) {
      return res.status(404).json({ error: 'Competitor not found' });
    }
    
    res.json(cardData);
  } catch (error) {
    console.error('Error fetching card data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/widgets/:competitorId/timeline
 * Get timeline data for a competitor
 */
router.get('/:competitorId/timeline', async (req, res) => {
  try {
    const { competitorId } = req.params;
    const limit = parseInt(req.query.limit as string) || 5;
    const timelineData = await getTimelineData(competitorId, limit);
    
    if (!timelineData) {
      return res.status(404).json({ error: 'Competitor not found' });
    }
    
    res.json(timelineData);
  } catch (error) {
    console.error('Error fetching timeline data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;