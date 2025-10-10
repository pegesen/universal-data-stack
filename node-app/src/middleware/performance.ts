import { Request, Response, NextFunction } from 'express';
import logger from '../services/logger';

export interface PerformanceMetrics {
  requestId: string;
  method: string;
  url: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  statusCode?: number;
  memoryUsage?: NodeJS.MemoryUsage;
  userAgent?: string;
  ip?: string;
}

export class PerformanceMiddleware {
  private metrics: Map<string, PerformanceMetrics> = new Map();

  // Request timing middleware
  requestTiming() {
    return (req: Request, res: Response, next: NextFunction) => {
      const requestId = this.generateRequestId();
      const startTime = Date.now();
      const memoryUsage = process.memoryUsage();

      // Store request metrics
      const metrics: PerformanceMetrics = {
        requestId,
        method: req.method,
        url: req.originalUrl,
        startTime,
        memoryUsage,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      };

      this.metrics.set(requestId, metrics);

      // Add request ID to response headers
      res.set('X-Request-ID', requestId);

      // Override res.end to capture response metrics
      const originalEnd = res.end;
      res.end = (chunk?: any, encoding?: any) => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        // Update metrics
        const updatedMetrics = this.metrics.get(requestId);
        if (updatedMetrics) {
          updatedMetrics.endTime = endTime;
          updatedMetrics.duration = duration;
          updatedMetrics.statusCode = res.statusCode;

          // Log performance metrics
          this.logPerformanceMetrics(updatedMetrics);

          // Clean up
          this.metrics.delete(requestId);
        }

        // Call original res.end
        originalEnd.call(res, chunk, encoding);
      };

      next();
    };
  }

  // Memory usage monitoring
  memoryMonitoring() {
    return (req: Request, res: Response, next: NextFunction) => {
      const memoryUsage = process.memoryUsage();
      
      // Log memory usage if it's high
      const memoryUsageMB = {
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024)
      };

      if (memoryUsageMB.heapUsed > 100) { // Log if heap usage > 100MB
        logger.warn('High memory usage detected', {
          memoryUsage: memoryUsageMB,
          url: req.originalUrl,
          method: req.method
        });
      }

      next();
    };
  }

  // Database query monitoring
  databaseMonitoring() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const originalJson = res.json;

      res.json = (body: any) => {
        const duration = Date.now() - startTime;
        
        // Log slow database operations
        if (duration > 1000) { // Log if > 1 second
          logger.warn('Slow database operation detected', {
            url: req.originalUrl,
            method: req.method,
            duration: `${duration}ms`,
            statusCode: res.statusCode
          });
        }

        // Log database performance metrics
        logger.debug('Database operation completed', {
          url: req.originalUrl,
          method: req.method,
          duration: `${duration}ms`,
          statusCode: res.statusCode
        });

        originalJson.call(res, body);
      };

      next();
    };
  }

  // Rate limiting based on performance
  adaptiveRateLimit() {
    const requestCounts = new Map<string, { count: number; windowStart: number }>();
    const WINDOW_SIZE = 60000; // 1 minute
    const MAX_REQUESTS = 100;

    return (req: Request, res: Response, next: NextFunction) => {
      const clientId = req.ip || 'unknown';
      const now = Date.now();
      
      // Get or create client data
      let clientData = requestCounts.get(clientId);
      if (!clientData || now - clientData.windowStart > WINDOW_SIZE) {
        clientData = { count: 0, windowStart: now };
        requestCounts.set(clientId, clientData);
      }

      clientData.count++;

      // Check if client exceeded rate limit
      if (clientData.count > MAX_REQUESTS) {
        logger.warn('Rate limit exceeded', {
          clientId,
          count: clientData.count,
          windowStart: clientData.windowStart
        });

        return res.status(429).json({
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil((WINDOW_SIZE - (now - clientData.windowStart)) / 1000)
        });
      }

      next();
    };
  }

  // Performance metrics endpoint
  getMetrics() {
    return (req: Request, res: Response) => {
      const activeRequests = this.metrics.size;
      const memoryUsage = process.memoryUsage();
      const uptime = process.uptime();

      const metrics = {
        server: {
          uptime: `${Math.round(uptime)}s`,
          memory: {
            rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
            heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
            external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
          },
          activeRequests
        },
        requests: Array.from(this.metrics.values()).map(metric => ({
          requestId: metric.requestId,
          method: metric.method,
          url: metric.url,
          duration: metric.duration ? `${metric.duration}ms` : 'pending',
          statusCode: metric.statusCode
        }))
      };

      res.json(metrics);
    };
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private logPerformanceMetrics(metrics: PerformanceMetrics): void {
    const logLevel = this.getLogLevel(metrics);
    
    logger[logLevel]('Request completed', {
      requestId: metrics.requestId,
      method: metrics.method,
      url: metrics.url,
      duration: `${metrics.duration}ms`,
      statusCode: metrics.statusCode,
      memoryUsage: metrics.memoryUsage ? {
        rss: Math.round(metrics.memoryUsage.rss / 1024 / 1024),
        heapUsed: Math.round(metrics.memoryUsage.heapUsed / 1024 / 1024)
      } : undefined
    });
  }

  private getLogLevel(metrics: PerformanceMetrics): 'debug' | 'info' | 'warn' | 'error' {
    if (!metrics.duration || !metrics.statusCode) return 'debug';
    
    if (metrics.statusCode >= 500) return 'error';
    if (metrics.statusCode >= 400) return 'warn';
    if (metrics.duration > 5000) return 'warn'; // > 5 seconds
    if (metrics.duration > 1000) return 'info'; // > 1 second
    
    return 'debug';
  }

  // Cleanup old metrics
  cleanup() {
    const now = Date.now();
    const maxAge = 300000; // 5 minutes

    for (const [requestId, metrics] of this.metrics.entries()) {
      if (now - metrics.startTime > maxAge) {
        this.metrics.delete(requestId);
      }
    }
  }
}

export default new PerformanceMiddleware();