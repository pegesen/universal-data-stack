import Redis from 'ioredis';
import logger from './logger';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
  serialize?: boolean;
}

export class CacheService {
  private redis: Redis;
  private isConnected: boolean = false;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

    this.redis.on('connect', () => {
      this.isConnected = true;
      logger.info('Redis connected successfully');
    });

    this.redis.on('error', (error) => {
      this.isConnected = false;
      logger.error('Redis connection error', { error: error.message });
    });

    this.redis.on('close', () => {
      this.isConnected = false;
      logger.warn('Redis connection closed');
    });
  }

  async connect(): Promise<void> {
    try {
      await this.redis.connect();
    } catch (error) {
      logger.error('Failed to connect to Redis', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.redis.disconnect();
      this.isConnected = false;
      logger.info('Redis disconnected');
    } catch (error) {
      logger.error('Error disconnecting from Redis', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private getKey(key: string, prefix?: string): string {
    const keyPrefix = prefix || 'uds';
    return `${keyPrefix}:${key}`;
  }

  async get<T = any>(key: string, options: CacheOptions = {}): Promise<T | null> {
    if (!this.isConnected) {
      logger.warn('Redis not connected, skipping cache get', { key });
      return null;
    }

    try {
      const fullKey = this.getKey(key, options.prefix);
      const value = await this.redis.get(fullKey);
      
      if (!value) {
        return null;
      }

      if (options.serialize !== false) {
        return JSON.parse(value);
      }

      return value as T;
    } catch (error) {
      logger.error('Cache get error', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  async set<T = any>(key: string, value: T, options: CacheOptions = {}): Promise<boolean> {
    if (!this.isConnected) {
      logger.warn('Redis not connected, skipping cache set', { key });
      return false;
    }

    try {
      const fullKey = this.getKey(key, options.prefix);
      let serializedValue: string;

      if (options.serialize !== false) {
        serializedValue = JSON.stringify(value);
      } else {
        serializedValue = value as string;
      }

      if (options.ttl) {
        await this.redis.setex(fullKey, options.ttl, serializedValue);
      } else {
        await this.redis.set(fullKey, serializedValue);
      }

      logger.debug('Cache set successful', { key, ttl: options.ttl });
      return true;
    } catch (error) {
      logger.error('Cache set error', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  async del(key: string, options: CacheOptions = {}): Promise<boolean> {
    if (!this.isConnected) {
      logger.warn('Redis not connected, skipping cache delete', { key });
      return false;
    }

    try {
      const fullKey = this.getKey(key, options.prefix);
      const result = await this.redis.del(fullKey);
      
      logger.debug('Cache delete successful', { key, deleted: result > 0 });
      return result > 0;
    } catch (error) {
      logger.error('Cache delete error', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  async exists(key: string, options: CacheOptions = {}): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      const fullKey = this.getKey(key, options.prefix);
      const result = await this.redis.exists(fullKey);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  async flush(pattern?: string): Promise<boolean> {
    if (!this.isConnected) {
      logger.warn('Redis not connected, skipping cache flush');
      return false;
    }

    try {
      if (pattern) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
        logger.info('Cache flushed with pattern', { pattern, keysCount: keys.length });
      } else {
        await this.redis.flushdb();
        logger.info('Cache flushed completely');
      }
      return true;
    } catch (error) {
      logger.error('Cache flush error', {
        pattern,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  async getStats(): Promise<any> {
    if (!this.isConnected) {
      return null;
    }

    try {
      const info = await this.redis.info();
      const memory = await this.redis.memory('usage');
      const dbsize = await this.redis.dbsize();

      return {
        connected: this.isConnected,
        memory,
        dbsize,
        info: info.split('\r\n').reduce((acc, line) => {
          const [key, value] = line.split(':');
          if (key && value) {
            acc[key] = value;
          }
          return acc;
        }, {} as any)
      };
    } catch (error) {
      logger.error('Cache stats error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  // Cache middleware for Express routes
  cacheMiddleware(ttl: number = 300, prefix?: string) {
    return async (req: any, res: any, next: any) => {
      const cacheKey = `${req.method}:${req.originalUrl}`;
      
      try {
        const cached = await this.get(cacheKey, { ttl, prefix });
        if (cached) {
          logger.debug('Cache hit', { key: cacheKey });
          return res.json(cached);
        }
      } catch (error) {
        logger.warn('Cache middleware error', { error: error instanceof Error ? error.message : 'Unknown error' });
      }

      // Store original res.json
      const originalJson = res.json;
      res.json = (body: any) => {
        // Cache the response
        this.set(cacheKey, body, { ttl, prefix }).catch(error => {
          logger.warn('Failed to cache response', { error: error instanceof Error ? error.message : 'Unknown error' });
        });
        
        // Call original res.json
        originalJson.call(res, body);
      };

      next();
    };
  }

  // Invalidate cache by pattern
  async invalidatePattern(pattern: string): Promise<boolean> {
    return this.flush(pattern);
  }

  // Health check
  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      if (!this.isConnected) {
        return {
          status: 'unhealthy',
          details: { error: 'Not connected to Redis' }
        };
      }

      await this.redis.ping();
      const stats = await this.getStats();

      return {
        status: 'healthy',
        details: stats
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }
}

export default new CacheService();