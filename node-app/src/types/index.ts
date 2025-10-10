import { Document } from 'mongoose';

// Base Document Interface
export interface BaseDocument extends Document {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
}

// API Response Types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  pagination?: PaginationInfo;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// Collection Types
export interface CollectionResponse {
  data: BaseDocument[];
  pagination: PaginationInfo;
}

export interface CollectionListResponse {
  collections: string[];
}

// Document Types
export interface DocumentCreateRequest {
  [key: string]: any;
}

export interface DocumentUpdateRequest {
  [key: string]: any;
}

// Query Parameters
export interface QueryParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

// Error Types
export interface ApiError {
  error: string;
  message: string;
  field?: string;
  details?: string;
  stack?: string;
}

// Health Check Types
export interface HealthCheckResponse {
  status: 'OK' | 'ERROR';
  timestamp: string;
  mongodb: 'connected' | 'disconnected';
  uptime?: number;
  memory?: NodeJS.MemoryUsage;
}

// Configuration Types
export interface AppConfig {
  port: number;
  nodeEnv: string;
  mongodb: {
    uri: string;
    options: {
      useNewUrlParser: boolean;
      useUnifiedTopology: boolean;
      ssl: boolean;
      authSource: string;
      retryWrites: boolean;
      w: string;
    };
  };
  cors: {
    origin: string | string[];
    credentials: boolean;
    methods: string[];
    allowedHeaders: string[];
    exposedHeaders: string[];
  };
  rateLimit: {
    windowMs: number;
    max: number;
  };
  security: {
    helmet: {
      contentSecurityPolicy: any;
      hsts: {
        maxAge: number;
        includeSubDomains: boolean;
        preload: boolean;
      };
    };
  };
}

// Logger Types
export interface LogContext {
  [key: string]: any;
}

export interface LogEntry {
  level: 'error' | 'warn' | 'info' | 'http' | 'debug';
  message: string;
  context?: LogContext;
  timestamp?: string;
}

// Validation Types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface SanitizedInput {
  [key: string]: any;
}

// Collection Model Types
export interface CollectionModel {
  find(filter?: any): any;
  findById(id: string): any;
  findByIdAndUpdate(id: string, update: any, options?: any): any;
  findByIdAndDelete(id: string): any;
  create(data: any): any;
  countDocuments(filter?: any): Promise<number>;
  save(): Promise<BaseDocument>;
}

// Express Request Extensions
export interface AuthenticatedRequest extends Express.Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

// Service Types
export interface DatabaseService {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getConnectionStatus(): 'connected' | 'disconnected';
}

export interface CollectionService {
  listCollections(): Promise<string[]>;
  getCollectionModel(name: string): CollectionModel;
  validateCollectionName(name: string): ValidationResult;
}

export interface DocumentService {
  createDocument(collection: string, data: DocumentCreateRequest): Promise<BaseDocument>;
  getDocument(collection: string, id: string): Promise<BaseDocument | null>;
  updateDocument(collection: string, id: string, data: DocumentUpdateRequest): Promise<BaseDocument | null>;
  deleteDocument(collection: string, id: string): Promise<boolean>;
  listDocuments(collection: string, params: QueryParams): Promise<CollectionResponse>;
}