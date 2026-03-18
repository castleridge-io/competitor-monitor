import crypto from 'crypto';
import { Router } from 'express';
import type { Router as RouterType } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { getDb } from '../db/index.js';
import { apiKeys, users } from '../db/schema.js';
import { eq, and, isNull } from 'drizzle-orm';

const router: RouterType = Router();
const db = getDb();

/**
 * Generate a new API key with a secure format
 * @returns Raw API key (shown once)
 */
function generateApiKey(): string {
  // Generate 32 random bytes = 64 hex characters
  const randomBytes = crypto.randomBytes(32).toString('hex');
  return `cm_live_${randomBytes}`;
}

/**
 * POST /api/api-keys
 * Create a new API key
 * 
 * @body { userId: string, name: string }
 * @returns { id: string, name: string, key: string, createdAt: Date }
 */
router.post('/', async (req, res, next) => {
  try {
    const { userId, name } = req.body;

    // Validation
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    // Check if user exists
    const user = await db.select().from(users).where(eq(users.id, userId));
    if (user.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate API key
    const rawKey = generateApiKey();
    const keyHash = await bcrypt.hash(rawKey, 10);
    const id = uuidv4();
    const now = new Date();

    // Store in database
    await db.insert(apiKeys).values({
      id,
      userId,
      keyHash,
      name,
      createdAt: now,
      lastUsedAt: null,
      revokedAt: null,
    });

    // Return response (only time raw key is shown)
    res.status(201).json({
      id,
      name,
      key: rawKey,
      createdAt: now.toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/api-keys
 * List user's API keys (without actual keys)
 * 
 * @query { userId: string }
 * @returns { id: string, name: string, createdAt: Date, lastUsedAt: Date | null }[]
 */
router.get('/', async (req, res, next) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Get all active (non-revoked) API keys for user
    const keys = await db.select({
      id: apiKeys.id,
      name: apiKeys.name,
      createdAt: apiKeys.createdAt,
      lastUsedAt: apiKeys.lastUsedAt,
    })
      .from(apiKeys)
      .where(and(
        eq(apiKeys.userId, userId as string),
        isNull(apiKeys.revokedAt)
      ));

    res.json(keys.map(k => ({
      ...k,
      createdAt: k.createdAt?.toISOString(),
      lastUsedAt: k.lastUsedAt?.toISOString() || null,
    })));
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/api-keys/:id
 * Revoke an API key
 * 
 * @param id - API key ID
 * @body { userId: string }
 * @returns { message: string }
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Get API key
    const key = await db.select()
      .from(apiKeys)
      .where(eq(apiKeys.id, id));

    if (key.length === 0) {
      return res.status(404).json({ error: 'API key not found' });
    }

    // Check ownership
    if (key[0].userId !== userId) {
      return res.status(403).json({ error: 'You do not have permission to revoke this API key' });
    }

    // Check if already revoked
    if (key[0].revokedAt) {
      return res.status(400).json({ error: 'API key is already revoked' });
    }

    // Revoke key
    await db.update(apiKeys)
      .set({ revokedAt: new Date() })
      .where(eq(apiKeys.id, id));

    res.json({ message: 'API key revoked successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/api-keys/:id/usage
 * Get usage stats for a specific API key
 * 
 * @param id - API key ID
 * @query { userId: string }
 * @returns { apiKeyId: string, name: string, lastUsedAt: Date | null, createdAt: Date }
 */
router.get('/:id/usage', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Get API key
    const key = await db.select({
      id: apiKeys.id,
      userId: apiKeys.userId,
      name: apiKeys.name,
      lastUsedAt: apiKeys.lastUsedAt,
      createdAt: apiKeys.createdAt,
    })
      .from(apiKeys)
      .where(eq(apiKeys.id, id));

    if (key.length === 0) {
      return res.status(404).json({ error: 'API key not found' });
    }

    // Check ownership
    if (key[0].userId !== userId) {
      return res.status(403).json({ error: 'You do not have permission to access this API key' });
    }

    res.json({
      apiKeyId: key[0].id,
      name: key[0].name,
      lastUsedAt: key[0].lastUsedAt?.toISOString() || null,
      createdAt: key[0].createdAt?.toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/api-keys/usage
 * Get usage stats for all user's API keys
 * 
 * @query { userId: string }
 * @returns { apiKeys: Array<{ id: string, name: string, lastUsedAt: Date | null, createdAt: Date }> }
 */
router.get('/usage', async (req, res, next) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Get all active API keys for user
    const keys = await db.select({
      id: apiKeys.id,
      name: apiKeys.name,
      lastUsedAt: apiKeys.lastUsedAt,
      createdAt: apiKeys.createdAt,
    })
      .from(apiKeys)
      .where(and(
        eq(apiKeys.userId, userId as string),
        isNull(apiKeys.revokedAt)
      ));

    res.json({
      apiKeys: keys.map(k => ({
        id: k.id,
        name: k.name,
        lastUsedAt: k.lastUsedAt?.toISOString() || null,
        createdAt: k.createdAt?.toISOString(),
      })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
