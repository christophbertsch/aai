import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { logger } from '@/utils/logger';

export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }));

      logger.warn('Request validation failed:', {
        path: req.path,
        method: req.method,
        errors: errorDetails,
        userId: req.user?.id,
      });

      return res.status(400).json({
        error: 'Validation failed',
        details: errorDetails,
      });
    }

    // Replace req.body with validated and sanitized data
    req.body = value;
    next();
  };
};

export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }));

      logger.warn('Query validation failed:', {
        path: req.path,
        method: req.method,
        errors: errorDetails,
        userId: req.user?.id,
      });

      return res.status(400).json({
        error: 'Query validation failed',
        details: errorDetails,
      });
    }

    req.query = value;
    next();
  };
};

export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }));

      logger.warn('Params validation failed:', {
        path: req.path,
        method: req.method,
        errors: errorDetails,
        userId: req.user?.id,
      });

      return res.status(400).json({
        error: 'Parameter validation failed',
        details: errorDetails,
      });
    }

    req.params = value;
    next();
  };
};

// Common validation schemas
export const commonSchemas = {
  uuid: Joi.string().uuid().required(),
  paginationQuery: Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(20),
    offset: Joi.number().integer().min(0).default(0),
    sort: Joi.string().valid('created_at', 'updated_at', 'name').default('created_at'),
    order: Joi.string().valid('asc', 'desc').default('desc'),
  }),
  personalityProfile: Joi.object({
    extraversion: Joi.number().min(0).max(1).required(),
    agreeableness: Joi.number().min(0).max(1).required(),
    conscientiousness: Joi.number().min(0).max(1).required(),
    neuroticism: Joi.number().min(0).max(1).required(),
    openness: Joi.number().min(0).max(1).required(),
  }),
};