import { ETLProcess, Transformation, ETLStats, ETLError, DataSource } from '../types/pipeline';
import logger from './logger';
import { DataSourceConnector } from './data-source-connector';
import { TransformationEngine } from './transformation-engine';
import { DataQualityEngine } from './data-quality-engine';

export class ETLProcessor {
  private dataSourceConnector: DataSourceConnector;
  private transformationEngine: TransformationEngine;
  private dataQualityEngine: DataQualityEngine;
  private runningProcesses: Map<string, boolean> = new Map();

  constructor() {
    this.dataSourceConnector = new DataSourceConnector();
    this.transformationEngine = new TransformationEngine();
    this.dataQualityEngine = new DataQualityEngine();
  }

  async executeETL(process: ETLProcess): Promise<ETLStats> {
    const processId = process.id;
    
    if (this.runningProcesses.get(processId)) {
      throw new Error(`ETL process ${processId} is already running`);
    }

    this.runningProcesses.set(processId, true);
    
    try {
      logger.info('Starting ETL process', {
        processId,
        processName: process.name,
        source: process.source.name,
        destination: process.destination.name
      });

      const startTime = Date.now();
      const stats: ETLStats = {
        totalRecords: 0,
        processedRecords: 0,
        failedRecords: 0,
        successRate: 0,
        averageProcessingTime: 0,
        errors: []
      };

      // Connect to source
      const sourceConnection = await this.dataSourceConnector.connect(process.source);
      
      // Connect to destination
      const destinationConnection = await this.dataSourceConnector.connect(process.destination);

      try {
        // Get total record count
        stats.totalRecords = await this.dataSourceConnector.getRecordCount(sourceConnection, process.source);

        // Process data in batches
        const batchSize = process.config.batchSize;
        let offset = 0;
        let processedInBatch = 0;

        while (offset < stats.totalRecords) {
          try {
            // Fetch batch from source
            const batch = await this.dataSourceConnector.fetchBatch(
              sourceConnection,
              process.source,
              offset,
              batchSize
            );

            if (batch.length === 0) {
              break;
            }

            // Apply transformations
            const transformedBatch = await this.applyTransformations(batch, process.transformations);

            // Validate data quality
            const qualityReport = await this.dataQualityEngine.validateBatch(
              transformedBatch,
              process.destination.schema
            );

            if (qualityReport.qualityScore < 0.8) {
              logger.warn('Data quality below threshold', {
                processId,
                qualityScore: qualityReport.qualityScore,
                batchSize: batch.length
              });
            }

            // Write to destination
            await this.dataSourceConnector.writeBatch(
              destinationConnection,
              process.destination,
              transformedBatch
            );

            stats.processedRecords += batch.length;
            processedInBatch = batch.length;

            offset += batchSize;

            logger.debug('Batch processed successfully', {
              processId,
              batchSize: batch.length,
              totalProcessed: stats.processedRecords,
              progress: Math.round((stats.processedRecords / stats.totalRecords) * 100)
            });

          } catch (batchError) {
            logger.error('Batch processing failed', {
              processId,
              offset,
              batchSize,
              error: batchError instanceof Error ? batchError.message : 'Unknown error'
            });

            stats.failedRecords += processedInBatch;
            stats.errors.push({
              id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              timestamp: new Date(),
              error: batchError instanceof Error ? batchError.message : 'Unknown error',
              stack: batchError instanceof Error ? batchError.stack : undefined,
              context: { offset, batchSize }
            });

            if (process.config.errorHandling === 'stop') {
              throw batchError;
            }
          }
        }

        // Calculate final stats
        const endTime = Date.now();
        const totalTime = endTime - startTime;
        
        stats.successRate = stats.totalRecords > 0 ? (stats.processedRecords / stats.totalRecords) * 100 : 0;
        stats.averageProcessingTime = stats.processedRecords > 0 ? totalTime / stats.processedRecords : 0;
        stats.lastProcessingTime = totalTime;

        logger.info('ETL process completed', {
          processId,
          totalRecords: stats.totalRecords,
          processedRecords: stats.processedRecords,
          failedRecords: stats.failedRecords,
          successRate: stats.successRate,
          totalTime,
          averageProcessingTime: stats.averageProcessingTime
        });

        return stats;

      } finally {
        // Close connections
        await this.dataSourceConnector.disconnect(sourceConnection);
        await this.dataSourceConnector.disconnect(destinationConnection);
      }

    } catch (error) {
      logger.error('ETL process failed', {
        processId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      throw error;
    } finally {
      this.runningProcesses.set(processId, false);
    }
  }

  private async applyTransformations(data: any[], transformations: Transformation[]): Promise<any[]> {
    let result = data;

    for (const transformation of transformations) {
      if (!transformation.enabled) {
        continue;
      }

      try {
        result = await this.transformationEngine.apply(result, transformation);
        
        logger.debug('Transformation applied', {
          transformationId: transformation.id,
          transformationName: transformation.name,
          inputRecords: data.length,
          outputRecords: result.length
        });
      } catch (error) {
        logger.error('Transformation failed', {
          transformationId: transformation.id,
          transformationName: transformation.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
      }
    }

    return result;
  }

  async scheduleETL(process: ETLProcess): Promise<void> {
    if (!process.schedule) {
      throw new Error('ETL process must have a schedule to be scheduled');
    }

    logger.info('Scheduling ETL process', {
      processId: process.id,
      scheduleType: process.schedule.type,
      scheduleExpression: process.schedule.expression
    });

    // Implementation would depend on the scheduling system (e.g., cron, queue, etc.)
    // This is a placeholder for the actual scheduling logic
  }

  async stopETL(processId: string): Promise<void> {
    if (this.runningProcesses.get(processId)) {
      this.runningProcesses.set(processId, false);
      logger.info('ETL process stopped', { processId });
    } else {
      logger.warn('ETL process not running', { processId });
    }
  }

  isRunning(processId: string): boolean {
    return this.runningProcesses.get(processId) || false;
  }

  getRunningProcesses(): string[] {
    return Array.from(this.runningProcesses.entries())
      .filter(([_, isRunning]) => isRunning)
      .map(([processId, _]) => processId);
  }

  async getETLStats(processId: string): Promise<ETLStats | null> {
    // This would typically fetch from a database or cache
    // For now, return a placeholder
    return {
      totalRecords: 0,
      processedRecords: 0,
      failedRecords: 0,
      successRate: 0,
      averageProcessingTime: 0,
      errors: []
    };
  }

  async validateETLProcess(process: ETLProcess): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Validate source connection
    try {
      await this.dataSourceConnector.validateConnection(process.source);
    } catch (error) {
      errors.push(`Source connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Validate destination connection
    try {
      await this.dataSourceConnector.validateConnection(process.destination);
    } catch (error) {
      errors.push(`Destination connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Validate transformations
    for (const transformation of process.transformations) {
      try {
        await this.transformationEngine.validate(transformation);
      } catch (error) {
        errors.push(`Transformation ${transformation.name} validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Validate schedule
    if (process.schedule) {
      if (process.schedule.type === 'cron' && !process.schedule.expression) {
        errors.push('Cron schedule requires an expression');
      }
      if (process.schedule.type === 'interval' && !process.schedule.interval) {
        errors.push('Interval schedule requires an interval value');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}