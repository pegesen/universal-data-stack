import { Document } from 'mongoose';

// Elasticsearch Types
export interface ElasticsearchConfig {
  node: string;
  auth?: {
    username: string;
    password: string;
  };
  ssl?: {
    rejectUnauthorized: boolean;
  };
  maxRetries: number;
  requestTimeout: number;
  pingTimeout: number;
}

// Search Query Types
export interface SearchQuery {
  query: string;
  collection?: string;
  filters?: SearchFilters;
  sort?: SearchSort[];
  pagination?: SearchPagination;
  facets?: SearchFacets;
  highlight?: SearchHighlight;
}

export interface SearchFilters {
  dateRange?: {
    field: string;
    from?: string;
    to?: string;
  };
  fieldFilters?: {
    [field: string]: string | string[] | number | number[] | boolean;
  };
  rangeFilters?: {
    [field: string]: {
      gte?: number;
      lte?: number;
      gt?: number;
      lt?: number;
    };
  };
  existsFilters?: string[];
  missingFilters?: string[];
}

export interface SearchSort {
  field: string;
  order: 'asc' | 'desc';
}

export interface SearchPagination {
  page: number;
  size: number;
}

export interface SearchFacets {
  fields: string[];
  size?: number;
  minDocCount?: number;
}

export interface SearchHighlight {
  fields: {
    [field: string]: {
      fragment_size?: number;
      number_of_fragments?: number;
      pre_tags?: string[];
      post_tags?: string[];
    };
  };
  require_field_match?: boolean;
}

// Search Result Types
export interface SearchResult<T = any> {
  hits: SearchHit<T>[];
  total: {
    value: number;
    relation: 'eq' | 'gte';
  };
  maxScore: number;
  aggregations?: SearchAggregations;
  suggestions?: SearchSuggestions;
  took: number;
  timed_out: boolean;
}

export interface SearchHit<T = any> {
  _index: string;
  _id: string;
  _score: number;
  _source: T;
  highlight?: {
    [field: string]: string[];
  };
  sort?: any[];
}

export interface SearchAggregations {
  [key: string]: {
    buckets: Array<{
      key: string | number;
      doc_count: number;
    }>;
  };
}

export interface SearchSuggestions {
  [key: string]: Array<{
    text: string;
    score: number;
    contexts?: {
      [key: string]: string[];
    };
  }>;
}

// Index Management Types
export interface IndexMapping {
  properties: {
    [field: string]: {
      type: string;
      analyzer?: string;
      search_analyzer?: string;
      fields?: {
        [key: string]: {
          type: string;
          analyzer?: string;
        };
      };
      format?: string;
      index?: boolean;
      store?: boolean;
    };
  };
  dynamic_templates?: Array<{
    [templateName: string]: {
      match: string;
      mapping: any;
    };
  }>;
}

export interface IndexSettings {
  number_of_shards: number;
  number_of_replicas: number;
  analysis: {
    analyzer: {
      [name: string]: {
        type: string;
        tokenizer?: string;
        filter?: string[];
        char_filter?: string[];
      };
    };
    filter: {
      [name: string]: {
        type: string;
        [key: string]: any;
      };
    };
    tokenizer: {
      [name: string]: {
        type: string;
        [key: string]: any;
      };
    };
  };
}

// Document Indexing Types
export interface IndexableDocument extends Document {
  _id: string;
  collection: string;
  data: any;
  metadata: DocumentMetadata;
  searchableText: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentMetadata {
  collection: string;
  documentId: string;
  userId: string;
  userRole: string;
  tags: string[];
  categories: string[];
  customFields: {
    [key: string]: any;
  };
}

// Search Service Types
export interface SearchService {
  // Index Management
  createIndex(indexName: string, mapping?: IndexMapping, settings?: IndexSettings): Promise<boolean>;
  deleteIndex(indexName: string): Promise<boolean>;
  indexExists(indexName: string): Promise<boolean>;
  getIndexMapping(indexName: string): Promise<IndexMapping>;
  updateIndexMapping(indexName: string, mapping: IndexMapping): Promise<boolean>;
  
  // Document Operations
  indexDocument(indexName: string, document: IndexableDocument): Promise<boolean>;
  bulkIndexDocuments(indexName: string, documents: IndexableDocument[]): Promise<boolean>;
  updateDocument(indexName: string, documentId: string, document: Partial<IndexableDocument>): Promise<boolean>;
  deleteDocument(indexName: string, documentId: string): Promise<boolean>;
  getDocument(indexName: string, documentId: string): Promise<IndexableDocument | null>;
  
  // Search Operations
  search<T = any>(indexName: string, query: SearchQuery): Promise<SearchResult<T>>;
  searchAllCollections(query: SearchQuery): Promise<SearchResult>;
  suggest(indexName: string, field: string, text: string, size?: number): Promise<SearchSuggestions>;
  autocomplete(indexName: string, field: string, text: string, size?: number): Promise<string[]>;
  
  // Analytics
  getSearchStats(): Promise<SearchStats>;
  getPopularSearches(limit?: number): Promise<Array<{ query: string; count: number }>>;
  getSearchSuggestions(query: string, limit?: number): Promise<string[]>;
}

// Search Analytics Types
export interface SearchStats {
  totalDocuments: number;
  totalSearches: number;
  averageResponseTime: number;
  topQueries: Array<{ query: string; count: number }>;
  searchVolumeByDay: Array<{ date: string; count: number }>;
  errorRate: number;
}

// Search Controller Types
export interface SearchController {
  search(req: any, res: any): Promise<void>;
  suggest(req: any, res: any): Promise<void>;
  autocomplete(req: any, res: any): Promise<void>;
  getStats(req: any, res: any): Promise<void>;
  reindexCollection(req: any, res: any): Promise<void>;
  reindexAll(req: any, res: any): Promise<void>;
}

// Search Middleware Types
export interface SearchMiddleware {
  validateSearchQuery(): (req: any, res: any, next: any) => void;
  logSearchQuery(): (req: any, res: any, next: any) => void;
  rateLimitSearch(): (req: any, res: any, next: any) => void;
}

// Search Configuration
export interface SearchConfig {
  elasticsearch: ElasticsearchConfig;
  defaultIndexSettings: IndexSettings;
  defaultMapping: IndexMapping;
  searchTimeout: number;
  maxSearchSize: number;
  enableAnalytics: boolean;
  enableSuggestions: boolean;
  enableAutocomplete: boolean;
}

// Search Error Types
export interface SearchError {
  code: string;
  message: string;
  details?: any;
}

export enum SearchErrorCode {
  INDEX_NOT_FOUND = 'INDEX_NOT_FOUND',
  DOCUMENT_NOT_FOUND = 'DOCUMENT_NOT_FOUND',
  INVALID_QUERY = 'INVALID_QUERY',
  SEARCH_TIMEOUT = 'SEARCH_TIMEOUT',
  ELASTICSEARCH_ERROR = 'ELASTICSEARCH_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED'
}

// Search Result Processing
export interface SearchResultProcessor<T = any> {
  processHits(hits: SearchHit<T>[]): any[];
  processAggregations(aggregations: SearchAggregations): any;
  processSuggestions(suggestions: SearchSuggestions): any;
  formatResponse(result: SearchResult<T>): any;
}

// Search Caching
export interface SearchCache {
  get(key: string): Promise<SearchResult | null>;
  set(key: string, result: SearchResult, ttl?: number): Promise<boolean>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<boolean>;
  generateKey(query: SearchQuery): string;
}