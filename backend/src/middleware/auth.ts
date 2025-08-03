import { Request, Response, NextFunction } from 'express';
import { supabase } from '@/services/supabase';
import { logger } from '@/utils/logger';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        name?: string;
        subscription_tier?: string;
      };
    }
  }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      logger.warn('Invalid authentication token:', error?.message);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Get user profile from our users table
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, email, name, subscription_tier, is_active')
      .eq('id', user.id)
      .single();

    if (profileError) {
      // If user doesn't exist in our users table, create them
      if (profileError.code === 'PGRST116') {
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email,
            name: user.user_metadata?.name || user.email?.split('@')[0],
          })
          .select()
          .single();

        if (createError) {
          logger.error('Failed to create user profile:', createError);
          return res.status(500).json({ error: 'Failed to create user profile' });
        }

        req.user = {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          subscription_tier: newUser.subscription_tier,
        };
      } else {
        logger.error('Failed to get user profile:', profileError);
        return res.status(500).json({ error: 'Failed to get user profile' });
      }
    } else {
      // Check if user is active
      if (!userProfile.is_active) {
        return res.status(403).json({ error: 'Account is deactivated' });
      }

      req.user = {
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.name,
        subscription_tier: userProfile.subscription_tier,
      };
    }

    next();
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Optional auth middleware - doesn't fail if no token provided
export const optionalAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without user
    }

    const token = authHeader.substring(7);

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (!error && user) {
      const { data: userProfile } = await supabase
        .from('users')
        .select('id, email, name, subscription_tier, is_active')
        .eq('id', user.id)
        .single();

      if (userProfile && userProfile.is_active) {
        req.user = {
          id: userProfile.id,
          email: userProfile.email,
          name: userProfile.name,
          subscription_tier: userProfile.subscription_tier,
        };
      }
    }

    next();
  } catch (error) {
    logger.error('Optional auth middleware error:', error);
    next(); // Continue without user
  }
};

// Admin middleware - requires admin role
export const adminMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user has admin role (you can implement this based on your needs)
    const { data: adminUser, error } = await supabase
      .from('users')
      .select('settings')
      .eq('id', req.user.id)
      .single();

    if (error || !adminUser?.settings?.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (error) {
    logger.error('Admin middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Rate limiting by user
export const userRateLimiter = (maxRequests: number, windowMs: number) => {
  const userRequests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    
    if (!userId) {
      return next(); // Skip rate limiting for unauthenticated requests
    }

    const now = Date.now();
    const userLimit = userRequests.get(userId);

    if (!userLimit || now > userLimit.resetTime) {
      // Reset or initialize user limit
      userRequests.set(userId, {
        count: 1,
        resetTime: now + windowMs,
      });
      return next();
    }

    if (userLimit.count >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((userLimit.resetTime - now) / 1000),
      });
    }

    userLimit.count++;
    next();
  };
};