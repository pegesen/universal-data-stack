import { Request, Response, NextFunction } from 'express';
import metricsService from '../services/metrics';
import logger from '../services/logger';

export class MetricsMiddleware {
  // HTTP request metrics middleware
  httpMetrics() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const method = req.method;
      const route = this.getRoutePattern(req);

      // Override res.end to capture metrics
      const originalEnd = res.end;
      res.end = (chunk?: any, encoding?: any) => {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;

        // Record metrics
        metricsService.recordHttpRequest(method, route, statusCode, duration);

        // Log slow requests
        if (duration > 5000) { // > 5 seconds
          logger.warn('Slow request detected', {
            method,
            route,
            duration: `${duration}ms`,
            statusCode,
            url: req.originalUrl
          });
        }

        // Call original res.end
        originalEnd.call(res, chunk, encoding);
      };

      next();
    };
  }

  // Database operation metrics middleware
  databaseMetrics(operation: string, collection: string) {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();

      // Override res.json to capture database metrics
      const originalJson = res.json;
      res.json = (body: any) => {
        const duration = Date.now() - startTime;
        const status = res.statusCode < 400 ? 'success' : 'error';

        // Record database metrics
        metricsService.recordDatabaseOperation(operation, collection, status, duration);

        // Log slow database operations
        if (duration > 1000) { // > 1 second
          logger.warn('Slow database operation detected', {
            operation,
            collection,
            duration: `${duration}ms`,
            statusCode: res.statusCode
          });
        }

        // Call original res.json
        originalJson.call(res, body);
      };

      next();
    };
  }

  // Cache operation metrics
  recordCacheOperation(operation: 'get' | 'set' | 'del', status: 'hit' | 'miss' | 'error'): void {
    metricsService.recordCacheOperation(operation, status);
  }

  // Memory usage monitoring
  memoryMonitoring() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Update memory metrics
      metricsService.updateMemoryUsage();

      // Check for memory leaks
      const memoryUsage = process.memoryUsage();
      const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;

      if (heapUsedMB > 200) { // Alert if heap usage > 200MB
        logger.warn('High memory usage detected', {
          heapUsed: `${Math.round(heapUsedMB)}MB`,
          url: req.originalUrl,
          method: req.method
        });
      }

      next();
    };
  }

  // Metrics endpoint
  metricsEndpoint() {
    return async (req: Request, res: Response) => {
      try {
        const metrics = await metricsService.getMetrics();
        res.set('Content-Type', 'text/plain');
        res.send(metrics);
      } catch (error) {
        logger.error('Error getting metrics', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({
          error: 'Failed to get metrics',
          message: 'Internal server error'
        });
      }
    };
  }

  // Health metrics endpoint
  healthMetricsEndpoint() {
    return async (req: Request, res: Response) => {
      try {
        const healthMetrics = await metricsService.getHealthMetrics();
        res.json(healthMetrics);
      } catch (error) {
        logger.error('Error getting health metrics', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({
          error: 'Failed to get health metrics',
          message: 'Internal server error'
        });
      }
    };
  }

  // Get route pattern for metrics
  private getRoutePattern(req: Request): string {
    // Convert dynamic routes to patterns
    let route = req.route?.path || req.path;
    
    // Replace parameter placeholders with generic names
    route = route.replace(/:\w+/g, ':param');
    
    // Replace ObjectId patterns
    route = route.replace(/\/[0-9a-fA-F]{24}/g, '/:id');
    
    return route;
  }

  // Error metrics
  recordError(error: Error, context: any): void {
    logger.error('Application error', {
      error: error.message,
      stack: error.stack,
      context
    });

    // Record error metrics
    metricsService.recordHttpRequest('ERROR', 'unknown', 500, 0);
  }

  // Performance monitoring
  performanceMonitoring() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = process.hrtime.bigint();
      
      // Override res.end to capture performance metrics
      const originalEnd = res.end;
      res.end = (chunk?: any, encoding?: any) => {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds

        // Log performance metrics
        logger.debug('Request performance', {
          method: req.method,
          url: req.originalUrl,
          duration: `${duration.toFixed(2)}ms`,
          statusCode: res.statusCode,
          memoryUsage: {
            rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
            heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
          }
        });

        // Call original res.end
        originalEnd.call(res, chunk, encoding);
      };

      next();
    };
  }
}

export default new MetricsMiddleware();