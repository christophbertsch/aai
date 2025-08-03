import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class RateLimiter {
  private store: RateLimitStore = {};
  private windowMs: number;
  private maxRequests: number;
  private message: string;
  private skipSuccessfulRequests: boolean;
  private skipFailedRequests: boolean;

  constructor(options: {
    windowMs?: number;
    maxRequests?: number;
    message?: string;
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
  } = {}) {
    this.windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes
    this.maxRequests = options.maxRequests || 100;
    this.message = options.message || 'Too many requests, please try again later';
    this.skipSuccessfulRequests = options.skipSuccessfulRequests || false;
    this.skipFailedRequests = options.skipFailedRequests || false;
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const key = this.generateKey(req);
      const now = Date.now();

      // Clean up expired entries
      this.cleanup(now);

      // Get or create rate limit entry
      let entry = this.store[key];
      if (!entry || now > entry.resetTime) {
        entry = {
          count: 0,
          resetTime: now + this.windowMs,
        };
        this.store[key] = entry;
      }

      // Check if limit exceeded
      if (entry.count >= this.maxRequests) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
        
        logger.warn('Rate limit exceeded:', {
          key,
          count: entry.count,
          maxRequests: this.maxRequests,
          retryAfter,
          path: req.path,
          method: req.method,
          ip: req.ip,
          userId: req.user?.id,
        });

        res.set({
          'X-RateLimit-Limit': this.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.ceil(entry.resetTime / 1000).toString(),
          'Retry-After': retryAfter.toString(),
        });

        return res.status(429).json({
          error: this.message,
          retryAfter,
        });
      }

      // Increment counter
      entry.count++;

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': this.maxRequests.toString(),
        'X-RateLimit-Remaining': Math.max(0, this.maxRequests - entry.count).toString(),
        'X-RateLimit-Reset': Math.ceil(entry.resetTime / 1000).toString(),
      });

      // Handle response to potentially skip counting
      if (this.skipSuccessfulRequests || this.skipFailedRequests) {
        const originalSend = res.send;
        res.send = function(body) {
          const statusCode = res.statusCode;
          
          if (
            (this.skipSuccessfulRequests && statusCode < 400) ||
            (this.skipFailedRequests && statusCode >= 400)
          ) {
            entry.count--;
          }
          
          return originalSend.call(this, body);
        }.bind(this);
      }

      next();
    };
  }

  private generateKey(req: Request): string {
    // Use user ID if authenticated, otherwise use IP
    if (req.user?.id) {
      return `user:${req.user.id}`;
    }
    
    // Get real IP address (considering proxies)
    const ip = req.ip || 
               req.connection.remoteAddress || 
               req.socket.remoteAddress ||
               (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
               'unknown';
    
    return `ip:${ip}`;
  }

  private cleanup(now: number) {
    // Remove expired entries every 5 minutes
    if (!this.lastCleanup || now - this.lastCleanup > 5 * 60 * 1000) {
      for (const key in this.store) {
        if (this.store[key].resetTime < now) {
          delete this.store[key];
        }
      }
      this.lastCleanup = now;
    }
  }

  private lastCleanup = 0;

  // Reset rate limit for a specific key
  reset(key: string) {
    delete this.store[key];
  }

  // Get current count for a key
  getCount(key: string): number {
    const entry = this.store[key];
    if (!entry || Date.now() > entry.resetTime) {
      return 0;
    }
    return entry.count;
  }
}

// Default rate limiter
export const rateLimiter = new RateLimiter({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later',
}).middleware();

// Strict rate limiter for sensitive endpoints
export const strictRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10,
  message: 'Too many requests for this endpoint, please try again later',
}).middleware();

// Upload rate limiter
export const uploadRateLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 50,
  message: 'Too many uploads, please try again later',
  skipFailedRequests: true, // Don't count failed uploads
}).middleware();

// AI query rate limiter
export const aiRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,
  message: 'Too many AI queries, please wait before making more requests',
}).middleware();

// Create custom rate limiter
export const createRateLimiter = (options: {
  windowMs?: number;
  maxRequests?: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}) => {
  return new RateLimiter(options).middleware();
};