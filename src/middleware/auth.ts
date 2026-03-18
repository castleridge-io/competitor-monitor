import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { getDb } from '../db/index.js';
import { apiKeys } from '../db/schema.js';
import { eq, and, isNull } from 'drizzle-orm';

/**
 * Authentication middleware for API key validation
 * Extracts API key from X-API-Key header and validates against database
 * 
 * Sets req.user and req.apiKey on successful authentication
 */
export async function authenticateApiKey(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      res.status(401).json({ error: 'API key is required' });
      return;
    }

    // Validate API key format
    if (!apiKey.startsWith('cm_live_') || apiKey.length !== 72) {
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }

    const db = getDb();

    // Get all API keys (including revoked) to check against
    // In production, you'd want to cache this or use a more efficient lookup
    const allKeys = await db.select()
      .from(apiKeys);

    // Find matching key by comparing hash
    let matchedKey = null;
    for (const key of allKeys) {
      const isValid = await bcrypt.compare(apiKey, key.keyHash);
      if (isValid) {
        matchedKey = key;
        break;
      }
    }

    if (!matchedKey) {
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }

    // Check if key is revoked
    if (matchedKey.revokedAt) {
      res.status(401).json({ error: 'API key has been revoked' });
      return;
    }

    // Update last_used_at
    await db.update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, matchedKey.id));

    // Attach user and API key info to request
    (req as any).user = { id: matchedKey.userId };
    (req as any).apiKey = { id: matchedKey.id, name: matchedKey.name };

    next();
  } catch (error) {
    next(error);
  }
}
