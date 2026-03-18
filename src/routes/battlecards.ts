import { Router } from 'express';
import type { Router as RouterType } from 'express';
import { getDb } from '../db/index.js';
import { competitors } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import {
  generateBattlecard,
  getBattlecard,
  getAllBattlecards,
  getBattlecardsForCompetitor,
  updateBattlecard,
  deleteBattlecard,
  type BattlecardData,
} from '../services/battlecard-generator.js';

const router: RouterType = Router();

// List all battlecards
router.get('/', async (_req, res) => {
  try {
    const db = getDb();
    const battlecards = await getAllBattlecards();

    // Get competitor names
    const competitorIds = [...new Set(battlecards.map(b => b.competitorId))];
    const competitorResults = competitorIds.length > 0
      ? await db.select().from(competitors)
      : [];

    // Create a map of competitor IDs to names
    const competitorNames = new Map(
      competitorResults.map(c => [c.id, c.name])
    );

    // Add competitor names to response
    const result = battlecards.map(battlecard => ({
      ...battlecard,
      competitorName: competitorNames.get(battlecard.competitorId) || 'Unknown',
    }));

    res.json(result);
  } catch (error) {
    console.error('Error listing battlecards:', error);
    res.status(500).json({ error: 'Failed to list battlecards' });
  }
});

// Get battlecards for a specific competitor
router.get('/competitor/:competitorId', async (req, res) => {
  try {
    const { competitorId } = req.params;

    // Verify competitor exists
    const db = getDb();
    const competitorResult = await db
      .select()
      .from(competitors)
      .where(eq(competitors.id, competitorId));

    if (competitorResult.length === 0) {
      return res.status(404).json({ error: 'Competitor not found' });
    }

    const battlecards = await getBattlecardsForCompetitor(competitorId);
    res.json(battlecards.map(b => ({
      ...b,
      competitorName: competitorResult[0].name,
    })));
  } catch (error) {
    console.error('Error getting battlecards for competitor:', error);
    res.status(500).json({ error: 'Failed to get battlecards' });
  }
});

// Get specific battlecard
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const battlecard = await getBattlecard(id);

    if (!battlecard) {
      return res.status(404).json({ error: 'Battlecard not found' });
    }

    // Get competitor name
    const db = getDb();
    const competitorResult = await db
      .select()
      .from(competitors)
      .where(eq(competitors.id, battlecard.competitorId));

    res.json({
      ...battlecard,
      competitorName: competitorResult.length > 0 ? competitorResult[0].name : 'Unknown',
    });
  } catch (error) {
    console.error('Error getting battlecard:', error);
    res.status(500).json({ error: 'Failed to get battlecard' });
  }
});

// Generate new battlecard
router.post('/generate', async (req, res) => {
  try {
    const { competitorId } = req.body;

    if (!competitorId) {
      return res.status(400).json({ error: 'competitorId is required' });
    }

    // Verify competitor exists
    const db = getDb();
    const competitorResult = await db
      .select()
      .from(competitors)
      .where(eq(competitors.id, competitorId));

    if (competitorResult.length === 0) {
      return res.status(404).json({ error: 'Competitor not found' });
    }

    // Check if battlecard already exists for this competitor
    const existingBattlecards = await getBattlecardsForCompetitor(competitorId);
    if (existingBattlecards.length > 0) {
      // Return existing battlecard (most recent)
      return res.json({
        ...existingBattlecards[0],
        competitorName: competitorResult[0].name,
        generated: false,
      });
    }

    // Generate new battlecard
    const battlecard = await generateBattlecard({ competitorId });

    res.json({
      ...battlecard,
      competitorName: competitorResult[0].name,
      generated: true,
    });
  } catch (error) {
    console.error('Error generating battlecard:', error);
    res.status(500).json({ 
      error: 'Failed to generate battlecard',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Update battlecard (manual edits)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates: Partial<BattlecardData> = req.body;

    // Validate at least one field is provided
    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No update data provided' });
    }

    const updated = await updateBattlecard(id, updates);

    if (!updated) {
      return res.status(404).json({ error: 'Battlecard not found' });
    }

    // Get competitor name
    const db = getDb();
    const competitorResult = await db
      .select()
      .from(competitors)
      .where(eq(competitors.id, updated.competitorId));

    res.json({
      ...updated,
      competitorName: competitorResult.length > 0 ? competitorResult[0].name : 'Unknown',
    });
  } catch (error) {
    console.error('Error updating battlecard:', error);
    res.status(500).json({ error: 'Failed to update battlecard' });
  }
});

// Delete battlecard
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await deleteBattlecard(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Battlecard not found' });
    }

    res.json({ message: 'Battlecard deleted successfully' });
  } catch (error) {
    console.error('Error deleting battlecard:', error);
    res.status(500).json({ error: 'Failed to delete battlecard' });
  }
});

export default router;
