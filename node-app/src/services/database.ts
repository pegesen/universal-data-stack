import mongoose from 'mongoose';
import config from '../config';
import logger from './logger';
import { DatabaseService } from '../types';

export class DatabaseService implements DatabaseService {
  private connection: mongoose.Connection | null = null;

  async connect(): Promise<void> {
    try {
      await mongoose.connect(config.mongodb.uri, config.mongodb.options);
      this.connection = mongoose.connection;
      
      logger.info('✅ MongoDB connected successfully', {
        host: this.connection.host,
        port: this.connection.port,
        name: this.connection.name
      });
    } catch (error) {
      logger.error('❌ MongoDB connection error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.connection) {
        await mongoose.connection.close();
        this.connection = null;
        logger.info('MongoDB connection closed');
      }
    } catch (error) {
      logger.error('Error closing MongoDB connection', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  getConnectionStatus(): 'connected' | 'disconnected' {
    return mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  }

  // Health check for database
  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      if (this.connection) {
        await this.connection.db.admin().ping();
        return {
          status: 'healthy',
          details: {
            host: this.connection.host,
            port: this.connection.port,
            name: this.connection.name,
            readyState: this.connection.readyState
          }
        };
      } else {
        return {
          status: 'unhealthy',
          details: { error: 'No active connection' }
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  // Get database statistics
  async getStats(): Promise<any> {
    try {
      if (this.connection) {
        return await this.connection.db.stats();
      }
      return null;
    } catch (error) {
      logger.error('Error getting database stats', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }
}

export default new DatabaseService();