import { Router, Request, Response } from 'express';
import {
  getTelegramSettings,
  updateTelegramSettings,
} from '../services/telegram.js';

const router = Router();

/**
 * GET /api/settings/telegram
 * Get current Telegram settings
 */
router.get('/telegram', async (_req: Request, res: Response) => {
  try {
    const settings = await getTelegramSettings();
    res.json(settings);
  } catch (error) {
    console.error('Error getting telegram settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/settings/telegram
 * Update Telegram settings
 */
router.patch('/telegram', async (req: Request, res: Response) => {
  try {
    const { chatId, enabled } = req.body;

    // Validate inputs
    if (enabled !== undefined && typeof enabled !== 'boolean') {
      res.status(400).json({ error: 'enabled must be a boolean' });
      return;
    }

    if (chatId !== undefined && chatId !== null && typeof chatId !== 'string') {
      res.status(400).json({ error: 'chatId must be a string' });
      return;
    }

    const updateData: { chatId?: string | null; enabled?: boolean } = {};

    if (chatId !== undefined) {
      updateData.chatId = chatId;
    }

    if (enabled !== undefined) {
      updateData.enabled = enabled;
    }

    const settings = await updateTelegramSettings(updateData);
    res.json(settings);
  } catch (error) {
    console.error('Error updating telegram settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;