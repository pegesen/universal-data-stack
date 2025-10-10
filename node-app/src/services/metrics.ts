import client from 'prom-client';
import logger from './logger';

// Create a Registry
const register = new client.Registry();

// Add default metrics
client.collectDefaultMetrics({ register });

// Custom metrics
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

export const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

export const httpRequestErrors = new client.Counter({
  name: 'http_request_errors_total',
  help: 'Total number of HTTP request errors',
  labelNames: ['method', 'route', 'error_type']
});

export const databaseOperations = new client.Counter({
  name: 'database_operations_total',
  help: 'Total number of database operations',
  labelNames: ['operation', 'collection', 'status']
});

export const databaseOperationDuration = new client.Histogram({
  name: 'database_operation_duration_seconds',
  help: 'Duration of database operations in seconds',
  labelNames: ['operation', 'collection'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 3, 5]
});

export const cacheOperations = new client.Counter({
  name: 'cache_operations_total',
  help: 'Total number of cache operations',
  labelNames: ['operation', 'status']
});

export const cacheHitRate = new client.Gauge({
  name: 'cache_hit_rate',
  help: 'Cache hit rate percentage'
});

export const activeConnections = new client.Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
});

export const memoryUsage = new client.Gauge({
  name: 'memory_usage_bytes',
  help: 'Memory usage in bytes',
  labelNames: ['type']
});

export const collectionDocumentCount = new client.Gauge({
  name: 'collection_document_count',
  help: 'Number of documents in collections',
  labelNames: ['collection']
});

// Register custom metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(httpRequestErrors);
register.registerMetric(databaseOperations);
register.registerMetric(databaseOperationDuration);
register.registerMetric(cacheOperations);
register.registerMetric(cacheHitRate);
register.registerMetric(activeConnections);
register.registerMetric(memoryUsage);
register.registerMetric(collectionDocumentCount);

export class MetricsService {
  private cacheHits = 0;
  private cacheMisses = 0;

  // HTTP request metrics
  recordHttpRequest(method: string, route: string, statusCode: number, duration: number): void {
    const labels = { method, route, status_code: statusCode.toString() };
    
    httpRequestDuration.observe(labels, duration / 1000);
    httpRequestTotal.inc(labels);

    if (statusCode >= 400) {
      httpRequestErrors.inc({
        method,
        route,
        error_type: statusCode >= 500 ? 'server_error' : 'client_error'
      });
    }
  }

  // Database operation metrics
  recordDatabaseOperation(operation: string, collection: string, status: 'success' | 'error', duration?: number): void {
    const labels = { operation, collection, status };
    
    databaseOperations.inc(labels);
    
    if (duration !== undefined) {
      databaseOperationDuration.observe({ operation, collection }, duration / 1000);
    }
  }

  // Cache operation metrics
  recordCacheOperation(operation: 'get' | 'set' | 'del', status: 'hit' | 'miss' | 'error'): void {
    cacheOperations.inc({ operation, status });

    if (operation === 'get') {
      if (status === 'hit') {
        this.cacheHits++;
      } else if (status === 'miss') {
        this.cacheMisses++;
      }
      this.updateCacheHitRate();
    }
  }

  // Update cache hit rate
  private updateCacheHitRate(): void {
    const total = this.cacheHits + this.cacheMisses;
    if (total > 0) {
      const hitRate = (this.cacheHits / total) * 100;
      cacheHitRate.set(hitRate);
    }
  }

  // Update memory usage
  updateMemoryUsage(): void {
    const usage = process.memoryUsage();
    
    memoryUsage.set({ type: 'rss' }, usage.rss);
    memoryUsage.set({ type: 'heapTotal' }, usage.heapTotal);
    memoryUsage.set({ type: 'heapUsed' }, usage.heapUsed);
    memoryUsage.set({ type: 'external' }, usage.external);
  }

  // Update active connections
  updateActiveConnections(count: number): void {
    activeConnections.set(count);
  }

  // Update collection document count
  updateCollectionDocumentCount(collection: string, count: number): void {
    collectionDocumentCount.set({ collection }, count);
  }

  // Get metrics in Prometheus format
  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  // Get metrics as JSON
  async getMetricsAsJson(): Promise<any> {
    const metrics = await register.getMetricsAsJSON();
    return metrics;
  }

  // Reset metrics
  resetMetrics(): void {
    this.cacheHits = 0;
    this.cacheMisses = 0;
    
    // Reset all counters and gauges
    httpRequestTotal.reset();
    httpRequestErrors.reset();
    databaseOperations.reset();
    cacheOperations.reset();
    cacheHitRate.set(0);
    activeConnections.set(0);
    memoryUsage.reset();
    collectionDocumentCount.reset();
  }

  // Health check metrics
  async getHealthMetrics(): Promise<any> {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    return {
      uptime: Math.round(uptime),
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024)
      },
      cache: {
        hits: this.cacheHits,
        misses: this.cacheMisses,
        hitRate: this.cacheHits + this.cacheMisses > 0 
          ? (this.cacheHits / (this.cacheHits + this.cacheMisses)) * 100 
          : 0
      }
    };
  }

  // Start periodic metrics updates
  startPeriodicUpdates(): void {
    // Update memory usage every 30 seconds
    setInterval(() => {
      this.updateMemoryUsage();
    }, 30000);

    // Log metrics every 5 minutes
    setInterval(() => {
      this.logMetrics();
    }, 300000);
  }

  // Log current metrics
  private async logMetrics(): Promise<void> {
    try {
      const healthMetrics = await this.getHealthMetrics();
      
      logger.info('System metrics', {
        uptime: `${healthMetrics.uptime}s`,
        memory: healthMetrics.memory,
        cache: healthMetrics.cache
      });
    } catch (error) {
      logger.error('Error logging metrics', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export default new MetricsService();