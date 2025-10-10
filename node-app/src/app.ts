import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { createServer } from 'http';
import config from './config';
import databaseService from './services/database';
import elasticsearchService from './services/elasticsearch';
import websocketService from './services/websocket';
import logger from './services/logger';
import securityMiddleware from './middleware/security';
import validationMiddleware from './middleware/validation';
import metricsMiddleware from './middleware/metrics';
import performanceMiddleware from './middleware/performance';

// Import routes
import indexRoutes from './routes';
import authRoutes from './routes/auth';
import collectionRoutes from './routes/collections';
import documentRoutes from './routes/documents';
import healthRoutes from './routes/health';
import metricsRoutes from './routes/metrics';
import notificationRoutes from './routes/notifications';
import searchRoutes from './routes/search';

class Application {
  private app: express.Application;
  private server: any;
  private port: number;

  constructor() {
    this.app = express();
    this.port = config.port;
    this.server = createServer(this.app);
  }

  async initialize(): Promise<void> {
    try {
      // Initialize services
      await this.initializeServices();
      
      // Setup middleware
      this.setupMiddleware();
      
      // Setup routes
      this.setupRoutes();
      
      // Setup error handling
      this.setupErrorHandling();
      
      // Setup WebSocket
      this.setupWebSocket();
      
      logger.info('Application initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize application', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private async initializeServices(): Promise<void> {
    // Initialize database
    await databaseService.connect();
    logger.info('Database service initialized');

    // Initialize Elasticsearch
    try {
      await elasticsearchService.initialize();
      logger.info('Elasticsearch service initialized');
    } catch (error) {
      logger.warn('Elasticsearch service failed to initialize', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // Continue without Elasticsearch for now
    }
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(securityMiddleware.securityHeaders());
    this.app.use(securityMiddleware.requestId());
    this.app.use(securityMiddleware.corsConfig());
    this.app.use(securityMiddleware.requestSizeLimit());
    this.app.use(securityMiddleware.validateRequest());
    this.app.use(securityMiddleware.sanitizeInput());
    this.app.use(securityMiddleware.securityLogging());

    // Performance middleware
    this.app.use(performanceMiddleware.requestTiming());
    this.app.use(performanceMiddleware.memoryMonitoring());
    this.app.use(performanceMiddleware.databaseMonitoring());

    // Metrics middleware
    this.app.use(metricsMiddleware.httpMetrics());
    this.app.use(metricsMiddleware.memoryMonitoring());

    // CORS
    this.app.use(cors(config.cors));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging
    this.app.use(morgan('combined', {
      stream: {
        write: (message: string) => {
          logger.http(message.trim());
        }
      }
    }));

    // Health check bypass for rate limiting
    this.app.use(securityMiddleware.healthCheckBypass());
  }

  private setupRoutes(): void {
    // API routes
    this.app.use('/api', indexRoutes);
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/collections', collectionRoutes);
    this.app.use('/api', documentRoutes);
    this.app.use('/api/health', healthRoutes);
    this.app.use('/api/metrics', metricsRoutes);
    this.app.use('/api/notifications', notificationRoutes);
    this.app.use('/api/search', searchRoutes);

    // Root route
    this.app.get('/', (req, res) => {
      res.json({
        message: 'Universal Data Stack API',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
        endpoints: {
          auth: '/api/auth',
          collections: '/api/collections',
          documents: '/api/:collection',
          health: '/api/health',
          metrics: '/api/metrics',
          notifications: '/api/notifications',
          search: '/api/search',
          docs: '/api/docs'
        }
      });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not found',
        message: `Route ${req.originalUrl} not found`,
        timestamp: new Date().toISOString()
      });
    });
  }

  private setupErrorHandling(): void {
    // Global error handler
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Unhandled error', {
        error: error.message,
        stack: error.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      // Don't leak error details in production
      const isDevelopment = config.nodeEnv === 'development';
      
      res.status(error.status || 500).json({
        error: 'Internal server error',
        message: isDevelopment ? error.message : 'Something went wrong',
        ...(isDevelopment && { stack: error.stack }),
        timestamp: new Date().toISOString()
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', {
        error: error.message,
        stack: error.stack
      });
      
      // Graceful shutdown
      this.shutdown();
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection', {
        reason: reason instanceof Error ? reason.message : reason,
        stack: reason instanceof Error ? reason.stack : undefined,
        promise: promise.toString()
      });
      
      // Graceful shutdown
      this.shutdown();
    });

    // Handle SIGTERM
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      this.shutdown();
    });

    // Handle SIGINT
    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      this.shutdown();
    });
  }

  private setupWebSocket(): void {
    websocketService.initialize(this.server);
    logger.info('WebSocket service initialized');
  }

  async start(): Promise<void> {
    try {
      await this.initialize();
      
      this.server.listen(this.port, () => {
        logger.info('Server started successfully', {
          port: this.port,
          environment: config.nodeEnv,
          nodeVersion: process.version,
          pid: process.pid
        });
      });
    } catch (error) {
      logger.error('Failed to start server', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    try {
      logger.info('Shutting down server...');
      
      // Close HTTP server
      if (this.server) {
        this.server.close(() => {
          logger.info('HTTP server closed');
        });
      }

      // Close database connections
      await databaseService.disconnect();
      logger.info('Database disconnected');

      // Close other services
      // Add cleanup for other services here

      logger.info('Server shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      process.exit(1);
    }
  }

  getApp(): express.Application {
    return this.app;
  }

  getServer(): any {
    return this.server;
  }
}

export default Application;