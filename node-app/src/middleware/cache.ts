import { Request, Response, NextFunction } from 'express';
import cacheService from '../services/cache';
import logger from '../services/logger';

export interface CacheMiddlewareOptions {
  ttl?: number;
  prefix?: string;
  skipCache?: (req: Request) => boolean;
  keyGenerator?: (req: Request) => string;
}

export class CacheMiddleware {
  private cacheService = cacheService;

  // Generic cache middleware
  cache(options: CacheMiddlewareOptions = {}) {
    const {
      ttl = 300, // 5 minutes default
      prefix = 'api',
      skipCache = () => false,
      keyGenerator = (req: Request) => `${req.method}:${req.originalUrl}`
    } = options;

    return async (req: Request, res: Response, next: NextFunction) => {
      // Skip cache if condition is met
      if (skipCache(req)) {
        return next();
      }

      const cacheKey = keyGenerator(req);
      
      try {
        // Try to get from cache
        const cached = await this.cacheService.get(cacheKey, { ttl, prefix });
        if (cached) {
          logger.debug('Cache hit', { 
            key: cacheKey,
            method: req.method,
            url: req.originalUrl
          });
          return res.json(cached);
        }
      } catch (error) {
        logger.warn('Cache get error in middleware', { 
          error: error instanceof Error ? error.message : 'Unknown error',
          key: cacheKey
        });
      }

      // Store original res.json
      const originalJson = res.json;
      res.json = (body: any) => {
        // Cache the response asynchronously
        this.cacheService.set(cacheKey, body, { ttl, prefix }).catch(error => {
          logger.warn('Failed to cache response', { 
            error: error instanceof Error ? error.message : 'Unknown error',
            key: cacheKey
          });
        });
        
        // Call original res.json
        originalJson.call(res, body);
      };

      next();
    };
  }

  // Cache for collections list
  collectionsCache() {
    return this.cache({
      ttl: 600, // 10 minutes
      prefix: 'collections',
      keyGenerator: () => 'list'
    });
  }

  // Cache for documents list
  documentsCache() {
    return this.cache({
      ttl: 300, // 5 minutes
      prefix: 'documents',
      keyGenerator: (req: Request) => {
        const { collection } = req.params;
        const { page = 1, limit = 100, sort = '_id', order = 'desc' } = req.query;
        return `${collection}:${page}:${limit}:${sort}:${order}`;
      }
    });
  }

  // Cache for single document
  documentCache() {
    return this.cache({
      ttl: 600, // 10 minutes
      prefix: 'document',
      keyGenerator: (req: Request) => {
        const { collection, id } = req.params;
        return `${collection}:${id}`;
      }
    });
  }

  // Invalidate cache for collection
  async invalidateCollection(collection: string): Promise<void> {
    try {
      await this.cacheService.invalidatePattern(`documents:${collection}:*`);
      await this.cacheService.invalidatePattern(`document:${collection}:*`);
      logger.info('Cache invalidated for collection', { collection });
    } catch (error) {
      logger.error('Failed to invalidate collection cache', {
        collection,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Invalidate cache for specific document
  async invalidateDocument(collection: string, id: string): Promise<void> {
    try {
      await this.cacheService.del(`document:${collection}:${id}`);
      await this.cacheService.invalidatePattern(`documents:${collection}:*`);
      logger.info('Cache invalidated for document', { collection, id });
    } catch (error) {
      logger.error('Failed to invalidate document cache', {
        collection,
        id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Invalidate all caches
  async invalidateAll(): Promise<void> {
    try {
      await this.cacheService.flush();
      logger.info('All caches invalidated');
    } catch (error) {
      logger.error('Failed to invalidate all caches', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export default new CacheMiddleware();