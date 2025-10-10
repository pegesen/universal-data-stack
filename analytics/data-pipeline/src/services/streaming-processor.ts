import { Kafka, Consumer, Producer } from 'kafkajs';
import { DataProcessor, ProcessorConfig, ProcessorStats } from '../types/pipeline';
import logger from './logger';
import { TransformationEngine } from './transformation-engine';
import { DataQualityEngine } from './data-quality-engine';

export class StreamingProcessor {
  private kafka: Kafka;
  private consumers: Map<string, Consumer> = new Map();
  private producers: Map<string, Producer> = new Map();
  private processors: Map<string, DataProcessor> = new Map();
  private transformationEngine: TransformationEngine;
  private dataQualityEngine: DataQualityEngine;
  private isRunning: boolean = false;

  constructor(kafkaConfig: {
    clientId: string;
    brokers: string[];
  }) {
    this.kafka = new Kafka(kafkaConfig);
    this.transformationEngine = new TransformationEngine();
    this.dataQualityEngine = new DataQualityEngine();
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Streaming processor is already running');
      return;
    }

    try {
      this.isRunning = true;
      logger.info('Starting streaming processor');
    } catch (error) {
      logger.error('Failed to start streaming processor', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('Streaming processor is not running');
      return;
    }

    try {
      // Stop all consumers
      for (const [processorId, consumer] of this.consumers) {
        await consumer.disconnect();
        logger.info('Consumer disconnected', { processorId });
      }

      // Stop all producers
      for (const [processorId, producer] of this.producers) {
        await producer.disconnect();
        logger.info('Producer disconnected', { processorId });
      }

      this.consumers.clear();
      this.producers.clear();
      this.isRunning = false;

      logger.info('Streaming processor stopped');
    } catch (error) {
      logger.error('Failed to stop streaming processor', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async createProcessor(processor: DataProcessor): Promise<void> {
    try {
      logger.info('Creating streaming processor', {
        processorId: processor.id,
        processorName: processor.name,
        type: processor.type
      });

      // Create consumer for input
      const consumer = this.kafka.consumer({
        groupId: `processor-${processor.id}`,
        sessionTimeout: 30000,
        heartbeatInterval: 3000,
        maxBytesPerPartition: 1048576,
        minBytes: 1,
        maxWaitTimeInMs: 5000
      });

      await consumer.connect();
      await consumer.subscribe({
        topic: processor.config.input.source.config.topic!,
        fromBeginning: false
      });

      // Create producer for output
      const producer = this.kafka.producer({
        maxInFlightRequests: 1,
        idempotent: true,
        transactionTimeout: 30000
      });

      await producer.connect();

      // Store references
      this.consumers.set(processor.id, consumer);
      this.producers.set(processor.id, producer);
      this.processors.set(processor.id, processor);

      // Start processing
      await this.startProcessing(processor.id);

      logger.info('Streaming processor created successfully', {
        processorId: processor.id
      });

    } catch (error) {
      logger.error('Failed to create streaming processor', {
        processorId: processor.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private async startProcessing(processorId: string): Promise<void> {
    const processor = this.processors.get(processorId);
    const consumer = this.consumers.get(processorId);
    const producer = this.producers.get(processorId);

    if (!processor || !consumer || !producer) {
      throw new Error(`Processor ${processorId} not found`);
    }

    const stats: ProcessorStats = {
      totalProcessed: 0,
      totalErrors: 0,
      throughput: 0,
      latency: 0,
      memoryUsage: 0,
      cpuUsage: 0
    };

    let lastProcessedTime = Date.now();
    let processedInWindow = 0;
    const windowSize = 60000; // 1 minute

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const startTime = Date.now();
          
          // Parse message
          const data = JSON.parse(message.value?.toString() || '{}');
          
          // Apply transformations
          let processedData = [data];
          for (const transformation of processor.config.processing.transformations || []) {
            processedData = await this.transformationEngine.apply(processedData, transformation);
          }

          // Validate data quality
          const qualityReport = await this.dataQualityEngine.validateBatch(
            processedData,
            processor.config.output.destination.schema
          );

          if (qualityReport.qualityScore < 0.8) {
            logger.warn('Data quality below threshold in streaming processor', {
              processorId,
              qualityScore: qualityReport.qualityScore
            });
          }

          // Send to output topic
          await producer.send({
            topic: processor.config.output.destination.config.topic!,
            messages: processedData.map(item => ({
              key: item.id || Math.random().toString(36),
              value: JSON.stringify(item),
              timestamp: Date.now().toString()
            }))
          });

          // Update stats
          const processingTime = Date.now() - startTime;
          stats.totalProcessed++;
          stats.latency = (stats.latency + processingTime) / 2;
          
          processedInWindow++;
          const now = Date.now();
          if (now - lastProcessedTime >= windowSize) {
            stats.throughput = (processedInWindow * 1000) / (now - lastProcessedTime);
            processedInWindow = 0;
            lastProcessedTime = now;
          }

          logger.debug('Message processed successfully', {
            processorId,
            topic,
            partition,
            processingTime,
            totalProcessed: stats.totalProcessed
          });

        } catch (error) {
          stats.totalErrors++;
          
          logger.error('Message processing failed', {
            processorId,
            topic,
            partition,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
          });

          // Handle error based on processor configuration
          if (processor.config.processing.errorHandling === 'stop') {
            throw error;
          }
        }
      }
    });
  }

  async stopProcessor(processorId: string): Promise<void> {
    try {
      const consumer = this.consumers.get(processorId);
      const producer = this.producers.get(processorId);

      if (consumer) {
        await consumer.disconnect();
        this.consumers.delete(processorId);
      }

      if (producer) {
        await producer.disconnect();
        this.producers.delete(processorId);
      }

      this.processors.delete(processorId);

      logger.info('Streaming processor stopped', { processorId });
    } catch (error) {
      logger.error('Failed to stop streaming processor', {
        processorId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async getProcessorStats(processorId: string): Promise<ProcessorStats | null> {
    const processor = this.processors.get(processorId);
    if (!processor) {
      return null;
    }

    // This would typically fetch real-time stats from monitoring
    return {
      totalProcessed: 0,
      totalErrors: 0,
      throughput: 0,
      latency: 0,
      memoryUsage: 0,
      cpuUsage: 0
    };
  }

  async getProcessorStatus(processorId: string): Promise<'running' | 'stopped' | 'error' | null> {
    const processor = this.processors.get(processorId);
    if (!processor) {
      return null;
    }

    return processor.status;
  }

  async listProcessors(): Promise<DataProcessor[]> {
    return Array.from(this.processors.values());
  }

  async updateProcessor(processorId: string, updates: Partial<DataProcessor>): Promise<void> {
    const processor = this.processors.get(processorId);
    if (!processor) {
      throw new Error(`Processor ${processorId} not found`);
    }

    // Stop current processor
    await this.stopProcessor(processorId);

    // Update processor
    const updatedProcessor = { ...processor, ...updates };
    this.processors.set(processorId, updatedProcessor);

    // Restart processor
    await this.createProcessor(updatedProcessor);

    logger.info('Streaming processor updated', { processorId });
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      const admin = this.kafka.admin();
      await admin.connect();
      
      const metadata = await admin.describeCluster();
      await admin.disconnect();

      return {
        status: 'healthy',
        details: {
          brokers: metadata.brokers.length,
          clusterId: metadata.clusterId,
          activeProcessors: this.processors.size,
          isRunning: this.isRunning
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          isRunning: this.isRunning
        }
      };
    }
  }
}