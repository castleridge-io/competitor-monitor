import { Request, Response, NextFunction } from 'express';
import { getDb } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { SubscriptionTier, PRICING_PLANS } from '../routes/billing.js';

const db = getDb();

// Tier hierarchy for comparison
const TIER_HIERARCHY: Record<SubscriptionTier, number> = {
  free: 0,
  pro: 1,
  enterprise: 2,
};

export interface BillingRequest extends Request {
  user?: {
    id: string;
    email: string;
    tier: SubscriptionTier;
    features: typeof PRICING_PLANS[SubscriptionTier]['features'];
  };
}

// Middleware to require a minimum subscription tier
export function requireTier(minimumTier: SubscriptionTier) {
  return async (req: BillingRequest, res: Response, next: NextFunction) => {
    const email = req.headers['x-user-email'] as string;

    if (!email) {
      return res.status(401).json({ error: 'User email required in x-user-email header' });
    }

    try {
      const user = await db.select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (user.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const userTier = user[0].subscriptionTier as SubscriptionTier;
      const tierLevel = TIER_HIERARCHY[userTier];
      const requiredLevel = TIER_HIERARCHY[minimumTier];

      if (tierLevel < requiredLevel) {
        return res.status(403).json({
          error: 'Subscription tier too low',
          required: minimumTier,
          current: userTier,
        });
      }

      // Attach user info to request
      req.user = {
        id: user[0].id,
        email: user[0].email,
        tier: userTier,
        features: PRICING_PLANS[userTier].features,
      };

      next();
    } catch (error) {
      console.error('Billing middleware error:', error);
      res.status(500).json({ error: 'Failed to verify subscription tier' });
    }
  };
}

// Middleware to check feature access
export function requireFeature(feature: keyof typeof PRICING_PLANS['pro']['features']) {
  return async (req: BillingRequest, res: Response, next: NextFunction) => {
    const email = req.headers['x-user-email'] as string;

    if (!email) {
      return res.status(401).json({ error: 'User email required in x-user-email header' });
    }

    try {
      const user = await db.select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (user.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const userTier = user[0].subscriptionTier as SubscriptionTier;
      const features = PRICING_PLANS[userTier].features;
      const hasAccess = features[feature];

      if (!hasAccess) {
        return res.status(403).json({
          error: 'Feature not available in your plan',
          feature,
          currentTier: userTier,
        });
      }

      // Attach user info to request
      req.user = {
        id: user[0].id,
        email: user[0].email,
        tier: userTier,
        features,
      };

      next();
    } catch (error) {
      console.error('Feature access middleware error:', error);
      res.status(500).json({ error: 'Failed to verify feature access' });
    }
  };
}

// Middleware to check competitor limit
export function checkCompetitorLimit() {
  return async (req: BillingRequest, res: Response, next: NextFunction) => {
    const email = req.headers['x-user-email'] as string;

    if (!email) {
      return res.status(401).json({ error: 'User email required in x-user-email header' });
    }

    try {
      const user = await db.select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (user.length === 0) {
        // For users without account, default to free tier limits
        req.user = {
          id: '',
          email,
          tier: 'free',
          features: PRICING_PLANS.free.features,
        };
        return next();
      }

      const userTier = user[0].subscriptionTier as SubscriptionTier;
      const features = PRICING_PLANS[userTier].features;

      // Attach user info to request
      req.user = {
        id: user[0].id,
        email: user[0].email,
        tier: userTier,
        features,
      };

      next();
    } catch (error) {
      console.error('Competitor limit middleware error:', error);
      res.status(500).json({ error: 'Failed to check competitor limit' });
    }
  };
}

// Helper function to get tier limits
export function getTierLimits(tier: SubscriptionTier) {
  return PRICING_PLANS[tier].features;
}