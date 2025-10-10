// Event Types
export interface BaseEvent {
  id: string;
  type: string;
  version: string;
  timestamp: string;
  source: string;
  correlationId?: string;
  causationId?: string;
  metadata?: {
    [key: string]: any;
  };
}

// Domain Events
export interface UserCreatedEvent extends BaseEvent {
  type: 'user.created';
  data: {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

export interface UserUpdatedEvent extends BaseEvent {
  type: 'user.updated';
  data: {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    changes: string[];
  };
}

export interface UserDeletedEvent extends BaseEvent {
  type: 'user.deleted';
  data: {
    userId: string;
    email: string;
  };
}

export interface DocumentCreatedEvent extends BaseEvent {
  type: 'document.created';
  data: {
    documentId: string;
    collection: string;
    data: any;
    userId: string;
  };
}

export interface DocumentUpdatedEvent extends BaseEvent {
  type: 'document.updated';
  data: {
    documentId: string;
    collection: string;
    data: any;
    userId: string;
    changes: string[];
  };
}

export interface DocumentDeletedEvent extends BaseEvent {
  type: 'document.deleted';
  data: {
    documentId: string;
    collection: string;
    userId: string;
  };
}

export interface CollectionCreatedEvent extends BaseEvent {
  type: 'collection.created';
  data: {
    collectionName: string;
    userId: string;
  };
}

export interface CollectionDeletedEvent extends BaseEvent {
  type: 'collection.deleted';
  data: {
    collectionName: string;
    userId: string;
  };
}

export interface SearchPerformedEvent extends BaseEvent {
  type: 'search.performed';
  data: {
    query: string;
    collection?: string;
    userId: string;
    resultsCount: number;
    responseTime: number;
  };
}

export interface NotificationSentEvent extends BaseEvent {
  type: 'notification.sent';
  data: {
    notificationId: string;
    userId: string;
    type: string;
    title: string;
    message: string;
  };
}

export interface SystemHealthEvent extends BaseEvent {
  type: 'system.health';
  data: {
    service: string;
    status: 'healthy' | 'unhealthy';
    metrics: {
      [key: string]: any;
    };
  };
}

// Union type for all events
export type DomainEvent = 
  | UserCreatedEvent
  | UserUpdatedEvent
  | UserDeletedEvent
  | DocumentCreatedEvent
  | DocumentUpdatedEvent
  | DocumentDeletedEvent
  | CollectionCreatedEvent
  | CollectionDeletedEvent
  | SearchPerformedEvent
  | NotificationSentEvent
  | SystemHealthEvent;

// Event Handler Types
export interface EventHandler<T extends BaseEvent = DomainEvent> {
  handle(event: T): Promise<void>;
  canHandle(eventType: string): boolean;
  getEventTypes(): string[];
}

// Event Bus Types
export interface EventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe(eventType: string, handler: EventHandler): void;
  unsubscribe(eventType: string, handler: EventHandler): void;
  getSubscribers(eventType: string): EventHandler[];
  start(): Promise<void>;
  stop(): Promise<void>;
}

// Message Queue Types
export interface MessageQueue {
  publish(topic: string, message: any): Promise<void>;
  subscribe(topic: string, handler: (message: any) => Promise<void>): void;
  unsubscribe(topic: string, handler: (message: any) => Promise<void>): void;
  start(): Promise<void>;
  stop(): Promise<void>;
}

// Event Store Types
export interface EventStore {
  append(streamId: string, events: DomainEvent[]): Promise<void>;
  getEvents(streamId: string, fromVersion?: number): Promise<DomainEvent[]>;
  getEventsByType(eventType: string, fromTimestamp?: string): Promise<DomainEvent[]>;
  getEventsByCorrelationId(correlationId: string): Promise<DomainEvent[]>;
}

// Event Sourcing Types
export interface AggregateRoot {
  id: string;
  version: number;
  uncommittedEvents: DomainEvent[];
  markEventsAsCommitted(): void;
  loadFromHistory(events: DomainEvent[]): void;
}

// Event Replay Types
export interface EventReplay {
  replayEvents(fromTimestamp: string, toTimestamp?: string): Promise<void>;
  replayEventsByType(eventType: string, fromTimestamp: string, toTimestamp?: string): Promise<void>;
  replayEventsByStream(streamId: string, fromVersion: number, toVersion?: number): Promise<void>;
}

// Event Validation Types
export interface EventValidator {
  validate(event: DomainEvent): boolean;
  getValidationErrors(event: DomainEvent): string[];
}

// Event Serialization Types
export interface EventSerializer {
  serialize(event: DomainEvent): string;
  deserialize(data: string): DomainEvent;
  canSerialize(eventType: string): boolean;
}

// Event Metrics Types
export interface EventMetrics {
  totalEvents: number;
  eventsByType: { [eventType: string]: number };
  eventsBySource: { [source: string]: number };
  averageProcessingTime: number;
  errorRate: number;
  lastEventTime: string;
}

// Event Bus Configuration
export interface EventBusConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  rabbitmq?: {
    url: string;
    exchange: string;
  };
  kafka?: {
    brokers: string[];
    clientId: string;
    groupId: string;
  };
  retry: {
    maxAttempts: number;
    delay: number;
    backoffMultiplier: number;
  };
  deadLetter: {
    enabled: boolean;
    maxRetries: number;
    ttl: number;
  };
}

// Event Processing Types
export interface EventProcessor {
  process(event: DomainEvent): Promise<void>;
  canProcess(eventType: string): boolean;
  getProcessingTime(eventType: string): number;
  getErrorRate(): number;
}

// Event Filtering Types
export interface EventFilter {
  matches(event: DomainEvent): boolean;
  getFilterCriteria(): any;
}

// Event Routing Types
export interface EventRouter {
  route(event: DomainEvent): string[];
  addRoute(eventType: string, destination: string): void;
  removeRoute(eventType: string, destination: string): void;
  getRoutes(): { [eventType: string]: string[] };
}

// Event Persistence Types
export interface EventPersistence {
  save(event: DomainEvent): Promise<void>;
  load(eventId: string): Promise<DomainEvent | null>;
  loadByStream(streamId: string, fromVersion?: number, toVersion?: number): Promise<DomainEvent[]>;
  loadByType(eventType: string, fromTimestamp?: string, toTimestamp?: string): Promise<DomainEvent[]>;
  delete(eventId: string): Promise<void>;
  cleanup(beforeTimestamp: string): Promise<number>;
}