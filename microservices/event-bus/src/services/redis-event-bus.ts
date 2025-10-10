import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import logger from './logger';
import { EventBus, EventHandler, DomainEvent, EventBusConfig } from '../types/events';

export class RedisEventBus implements EventBus {
  private redis: Redis;
  private subscribers: Map<string, Set<EventHandler>> = new Map();
  private isRunning: boolean = false;
  private config: EventBusConfig;

  constructor(config: EventBusConfig) {
    this.config = config;
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db || 0,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

    this.setupRedisEventHandlers();
  }

  private setupRedisEventHandlers(): void {
    this.redis.on('connect', () => {
      logger.info('Redis Event Bus connected');
    });

    this.redis.on('error', (error) => {
      logger.error('Redis Event Bus error', {
        error: error.message
      });
    });

    this.redis.on('close', () => {
      logger.warn('Redis Event Bus connection closed');
    });
  }

  async start(): Promise<void> {
    try {
      await this.redis.connect();
      this.isRunning = true;
      
      // Start listening for events
      this.startEventListening();
      
      logger.info('Redis Event Bus started');
    } catch (error) {
      logger.error('Failed to start Redis Event Bus', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      this.isRunning = false;
      await this.redis.disconnect();
      logger.info('Redis Event Bus stopped');
    } catch (error) {
      logger.error('Failed to stop Redis Event Bus', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async publish(event: DomainEvent): Promise<void> {
    try {
      if (!this.isRunning) {
        throw new Error('Event Bus is not running');
      }

      // Ensure event has required fields
      const enrichedEvent = this.enrichEvent(event);
      
      // Serialize event
      const eventData = JSON.stringify(enrichedEvent);
      
      // Publish to Redis channel
      const channel = `events:${event.type}`;
      await this.redis.publish(channel, eventData);
      
      // Also store in event store for persistence
      await this.storeEvent(enrichedEvent);
      
      logger.debug('Event published', {
        eventId: enrichedEvent.id,
        eventType: enrichedEvent.type,
        source: enrichedEvent.source,
        channel
      });
    } catch (error) {
      logger.error('Failed to publish event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        eventType: event.type,
        eventId: event.id
      });
      throw error;
    }
  }

  subscribe(eventType: string, handler: EventHandler): void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    
    this.subscribers.get(eventType)!.add(handler);
    
    logger.info('Event handler subscribed', {
      eventType,
      handlerName: handler.constructor.name
    });
  }

  unsubscribe(eventType: string, handler: EventHandler): void {
    const handlers = this.subscribers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
      
      if (handlers.size === 0) {
        this.subscribers.delete(eventType);
      }
      
      logger.info('Event handler unsubscribed', {
        eventType,
        handlerName: handler.constructor.name
      });
    }
  }

  getSubscribers(eventType: string): EventHandler[] {
    const handlers = this.subscribers.get(eventType);
    return handlers ? Array.from(handlers) : [];
  }

  private enrichEvent(event: DomainEvent): DomainEvent {
    return {
      ...event,
      id: event.id || uuidv4(),
      timestamp: event.timestamp || new Date().toISOString(),
      version: event.version || '1.0.0'
    };
  }

  private async storeEvent(event: DomainEvent): Promise<void> {
    try {
      const eventKey = `event:${event.id}`;
      const eventData = JSON.stringify(event);
      
      // Store event with TTL (7 days)
      await this.redis.setex(eventKey, 7 * 24 * 60 * 60, eventData);
      
      // Add to event stream
      const streamKey = `stream:${event.source}`;
      await this.redis.xadd(streamKey, '*', 'event', eventData);
      
      // Add to event type index
      const typeKey = `events:type:${event.type}`;
      await this.redis.zadd(typeKey, Date.now(), event.id);
      
      // Add to correlation index if exists
      if (event.correlationId) {
        const correlationKey = `events:correlation:${event.correlationId}`;
        await this.redis.zadd(correlationKey, Date.now(), event.id);
      }
      
    } catch (error) {
      logger.error('Failed to store event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        eventId: event.id,
        eventType: event.type
      });
    }
  }

  private startEventListening(): void {
    // Subscribe to all event types
    const eventTypes = Array.from(this.subscribers.keys());
    
    if (eventTypes.length > 0) {
      const channels = eventTypes.map(type => `events:${type}`);
      
      this.redis.subscribe(...channels, (err, count) => {
        if (err) {
          logger.error('Failed to subscribe to event channels', {
            error: err.message,
            channels
          });
        } else {
          logger.info('Subscribed to event channels', {
            channelCount: count,
            channels
          });
        }
      });
    }

    // Handle incoming events
    this.redis.on('message', async (channel, message) => {
      try {
        const event: DomainEvent = JSON.parse(message);
        const eventType = event.type;
        
        // Get handlers for this event type
        const handlers = this.subscribers.get(eventType);
        
        if (handlers && handlers.size > 0) {
          // Process event with all handlers
          const promises = Array.from(handlers).map(handler => 
            this.processEvent(handler, event)
          );
          
          await Promise.allSettled(promises);
        }
        
        logger.debug('Event processed', {
          eventId: event.id,
          eventType: event.type,
          handlerCount: handlers?.size || 0,
          channel
        });
        
      } catch (error) {
        logger.error('Failed to process event', {
          error: error instanceof Error ? error.message : 'Unknown error',
          channel,
          message: message.substring(0, 100) + '...'
        });
      }
    });
  }

  private async processEvent(handler: EventHandler, event: DomainEvent): Promise<void> {
    try {
      const startTime = Date.now();
      
      await handler.handle(event);
      
      const processingTime = Date.now() - startTime;
      
      logger.debug('Event handler completed', {
        eventId: event.id,
        eventType: event.type,
        handlerName: handler.constructor.name,
        processingTime
      });
      
    } catch (error) {
      logger.error('Event handler failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        eventId: event.id,
        eventType: event.type,
        handlerName: handler.constructor.name,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Implement retry logic here if needed
      await this.handleHandlerError(handler, event, error);
    }
  }

  private async handleHandlerError(handler: EventHandler, event: DomainEvent, error: any): Promise<void> {
    try {
      // Store failed event for retry
      const retryKey = `retry:${event.id}:${handler.constructor.name}`;
      const retryData = {
        event,
        handler: handler.constructor.name,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        attempts: 1
      };
      
      await this.redis.setex(retryKey, 3600, JSON.stringify(retryData)); // 1 hour TTL
      
      logger.warn('Event handler error stored for retry', {
        eventId: event.id,
        handlerName: handler.constructor.name,
        retryKey
      });
      
    } catch (retryError) {
      logger.error('Failed to store handler error for retry', {
        error: retryError instanceof Error ? retryError.message : 'Unknown error',
        eventId: event.id,
        handlerName: handler.constructor.name
      });
    }
  }

  // Event querying methods
  async getEvent(eventId: string): Promise<DomainEvent | null> {
    try {
      const eventKey = `event:${eventId}`;
      const eventData = await this.redis.get(eventKey);
      
      if (eventData) {
        return JSON.parse(eventData);
      }
      
      return null;
    } catch (error) {
      logger.error('Failed to get event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        eventId
      });
      return null;
    }
  }

  async getEventsByType(eventType: string, limit: number = 100): Promise<DomainEvent[]> {
    try {
      const typeKey = `events:type:${eventType}`;
      const eventIds = await this.redis.zrevrange(typeKey, 0, limit - 1);
      
      const events: DomainEvent[] = [];
      
      for (const eventId of eventIds) {
        const event = await this.getEvent(eventId);
        if (event) {
          events.push(event);
        }
      }
      
      return events;
    } catch (error) {
      logger.error('Failed to get events by type', {
        error: error instanceof Error ? error.message : 'Unknown error',
        eventType
      });
      return [];
    }
  }

  async getEventsByCorrelationId(correlationId: string): Promise<DomainEvent[]> {
    try {
      const correlationKey = `events:correlation:${correlationId}`;
      const eventIds = await this.redis.zrange(correlationKey, 0, -1);
      
      const events: DomainEvent[] = [];
      
      for (const eventId of eventIds) {
        const event = await this.getEvent(eventId);
        if (event) {
          events.push(event);
        }
      }
      
      return events;
    } catch (error) {
      logger.error('Failed to get events by correlation ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        correlationId
      });
      return [];
    }
  }

  // Health check
  async health(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis Event Bus health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  // Statistics
  async getStats(): Promise<{
    isRunning: boolean;
    subscriberCount: number;
    eventTypes: string[];
    redisConnected: boolean;
  }> {
    const subscriberCount = Array.from(this.subscribers.values())
      .reduce((sum, handlers) => sum + handlers.size, 0);
    
    const eventTypes = Array.from(this.subscribers.keys());
    const redisConnected = await this.health();
    
    return {
      isRunning: this.isRunning,
      subscriberCount,
      eventTypes,
      redisConnected
    };
  }
}