import { Request, Response } from 'express';
import databaseService from '../services/database';
import logger from '../services/logger';
import { HealthCheckResponse } from '../types';

export class HealthController {
  async check(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      
      // Check database connection
      const dbStatus = databaseService.getConnectionStatus();
      const dbHealth = await databaseService.healthCheck();
      
      const responseTime = Date.now() - startTime;
      
      const response: HealthCheckResponse = {
        status: dbStatus === 'connected' ? 'OK' : 'ERROR',
        timestamp: new Date().toISOString(),
        mongodb: dbStatus,
        uptime: process.uptime(),
        memory: process.memoryUsage()
      };

      logger.info('Health check performed', {
        status: response.status,
        mongodb: response.mongodb,
        responseTime: `${responseTime}ms`,
        uptime: response.uptime
      });

      const statusCode = response.status === 'OK' ? 200 : 503;
      res.status(statusCode).json(response);
    } catch (error) {
      logger.error('Health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      const response: HealthCheckResponse = {
        status: 'ERROR',
        timestamp: new Date().toISOString(),
        mongodb: 'disconnected'
      };

      res.status(503).json(response);
    }
  }
}