import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';

// Rate limiter configuration
const RATE_LIMIT_WINDOW = 60; // 60 seconds (1 minute)
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || '100', 10);

// Create rate limiter instance
const rateLimiterInstance = new RateLimiterMemory({
  points: RATE_LIMIT_MAX, // Number of requests
  duration: RATE_LIMIT_WINDOW, // Per duration in seconds
});

/**
 * Rate limiting middleware for API requests
 * Limits per API key (identified by X-API-Key header)
 * 
 * Adds rate limit headers to response:
 * - X-RateLimit-Limit: Maximum requests per window
 * - X-RateLimit-Remaining: Remaining requests in current window
 * - X-RateLimit-Reset: Unix timestamp when the window resets
 */
export async function rateLimiterMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Only rate limit requests with API key
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      // No API key - skip rate limiting
      next();
      return;
    }

    // Use API key as rate limit key
    const key = `api_key:${apiKey}`;

    // Check rate limit
    const result = await rateLimiterInstance.consume(key);

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX);
    res.setHeader('X-RateLimit-Remaining', result.remainingPoints);
    res.setHeader('X-RateLimit-Reset', Math.floor(Date.now() / 1000) + result.msBeforeNext / 1000);

    next();
  } catch (error: any) {
    // Rate limit exceeded - error is RateLimiterRes object
    if (error && typeof error.msBeforeNext === 'number') {
      // Rate limit exceeded
      const retryAfter = Math.ceil(error.msBeforeNext / 1000);
      
      res.setHeader('Retry-After', retryAfter);
      res.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset', Math.floor(Date.now() / 1000) + retryAfter);

      res.status(429).json({
        error: 'Too many requests',
        retryAfter,
      });
      return;
    }

    next(error);
  }
}

// Export with consistent naming
export const rateLimiter = rateLimiterMiddleware;
