// Data Pipeline Types
export interface DataSource {
  id: string;
  name: string;
  type: 'mongodb' | 'elasticsearch' | 'kafka' | 'redis' | 'api' | 'file' | 'database';
  config: {
    connectionString?: string;
    host?: string;
    port?: number;
    database?: string;
    collection?: string;
    index?: string;
    topic?: string;
    url?: string;
    filePath?: string;
    credentials?: {
      username: string;
      password: string;
    };
  };
  schema?: DataSchema;
  lastSync?: Date;
  isActive: boolean;
}

export interface DataSchema {
  fields: SchemaField[];
  primaryKey?: string[];
  indexes?: SchemaIndex[];
  constraints?: SchemaConstraint[];
}

export interface SchemaField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array' | 'binary';
  required: boolean;
  nullable: boolean;
  defaultValue?: any;
  validation?: FieldValidation;
  description?: string;
}

export interface SchemaIndex {
  fields: string[];
  unique: boolean;
  sparse: boolean;
  name?: string;
}

export interface SchemaConstraint {
  type: 'foreign_key' | 'check' | 'unique';
  fields: string[];
  reference?: {
    table: string;
    field: string;
  };
  expression?: string;
}

export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  enum?: any[];
  custom?: (value: any) => boolean;
}

// ETL Process Types
export interface ETLProcess {
  id: string;
  name: string;
  description?: string;
  source: DataSource;
  destination: DataSource;
  transformations: Transformation[];
  schedule?: Schedule;
  status: 'active' | 'inactive' | 'error' | 'running';
  lastRun?: Date;
  nextRun?: Date;
  stats: ETLStats;
  config: ETLConfig;
}

export interface Transformation {
  id: string;
  name: string;
  type: 'map' | 'filter' | 'aggregate' | 'join' | 'lookup' | 'custom';
  config: TransformationConfig;
  order: number;
  enabled: boolean;
}

export interface TransformationConfig {
  // Map transformation
  fieldMappings?: { [sourceField: string]: string };
  valueMappings?: { [sourceValue: string]: any };
  defaultValues?: { [field: string]: any };
  
  // Filter transformation
  conditions?: FilterCondition[];
  
  // Aggregate transformation
  groupBy?: string[];
  aggregations?: AggregationConfig[];
  
  // Join transformation
  joinType?: 'inner' | 'left' | 'right' | 'outer';
  joinKey?: string;
  lookupSource?: DataSource;
  
  // Custom transformation
  script?: string;
  function?: string;
}

export interface FilterCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'regex';
  value: any;
  logic?: 'and' | 'or';
}

export interface AggregationConfig {
  field: string;
  operation: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'distinct' | 'first' | 'last';
  alias?: string;
}

export interface Schedule {
  type: 'cron' | 'interval' | 'manual';
  expression?: string; // Cron expression
  interval?: number; // Milliseconds
  timezone?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface ETLStats {
  totalRecords: number;
  processedRecords: number;
  failedRecords: number;
  successRate: number;
  averageProcessingTime: number;
  lastProcessingTime?: number;
  errors: ETLError[];
}

export interface ETLError {
  id: string;
  timestamp: Date;
  recordId?: string;
  error: string;
  stack?: string;
  context?: any;
}

export interface ETLConfig {
  batchSize: number;
  maxRetries: number;
  retryDelay: number;
  timeout: number;
  parallel: boolean;
  maxParallelJobs: number;
  errorHandling: 'stop' | 'continue' | 'retry';
  validation: boolean;
  logging: boolean;
}

// Data Processing Types
export interface DataProcessor {
  id: string;
  name: string;
  type: 'stream' | 'batch' | 'real-time';
  config: ProcessorConfig;
  status: 'running' | 'stopped' | 'error';
  stats: ProcessorStats;
}

export interface ProcessorConfig {
  input: {
    source: DataSource;
    format: 'json' | 'csv' | 'xml' | 'avro' | 'parquet';
    compression?: 'gzip' | 'snappy' | 'lz4';
  };
  output: {
    destination: DataSource;
    format: 'json' | 'csv' | 'xml' | 'avro' | 'parquet';
    compression?: 'gzip' | 'snappy' | 'lz4';
  };
  processing: {
    windowSize?: number;
    windowSlide?: number;
    checkpointing: boolean;
    exactlyOnce: boolean;
  };
}

export interface ProcessorStats {
  totalProcessed: number;
  totalErrors: number;
  throughput: number; // records per second
  latency: number; // average processing time
  memoryUsage: number;
  cpuUsage: number;
  lastProcessed?: Date;
}

// Data Quality Types
export interface DataQualityRule {
  id: string;
  name: string;
  description?: string;
  field: string;
  type: 'completeness' | 'accuracy' | 'consistency' | 'validity' | 'uniqueness' | 'timeliness';
  config: QualityRuleConfig;
  severity: 'error' | 'warning' | 'info';
  enabled: boolean;
}

export interface QualityRuleConfig {
  // Completeness
  required?: boolean;
  
  // Accuracy
  pattern?: string;
  range?: { min: number; max: number };
  enum?: any[];
  
  // Consistency
  referenceField?: string;
  referenceValue?: any;
  
  // Validity
  format?: string;
  length?: { min: number; max: number };
  
  // Uniqueness
  unique?: boolean;
  scope?: string[];
  
  // Timeliness
  maxAge?: number; // milliseconds
  timeField?: string;
}

export interface DataQualityReport {
  id: string;
  timestamp: Date;
  dataset: string;
  totalRecords: number;
  qualityScore: number;
  ruleResults: QualityRuleResult[];
  summary: QualitySummary;
}

export interface QualityRuleResult {
  ruleId: string;
  ruleName: string;
  passed: boolean;
  failedRecords: number;
  errorRate: number;
  errors: QualityError[];
}

export interface QualityError {
  recordId: string;
  field: string;
  value: any;
  expected: any;
  message: string;
}

export interface QualitySummary {
  overallScore: number;
  totalRules: number;
  passedRules: number;
  failedRules: number;
  criticalIssues: number;
  warnings: number;
}

// Data Lineage Types
export interface DataLineage {
  id: string;
  source: DataSource;
  destination: DataSource;
  transformations: Transformation[];
  dependencies: DataLineage[];
  metadata: LineageMetadata;
}

export interface LineageMetadata {
  created: Date;
  updated: Date;
  version: string;
  owner: string;
  tags: string[];
  description?: string;
}

// Monitoring Types
export interface PipelineMonitor {
  id: string;
  name: string;
  type: 'performance' | 'quality' | 'availability' | 'cost';
  config: MonitorConfig;
  alerts: Alert[];
  status: 'active' | 'inactive' | 'error';
}

export interface MonitorConfig {
  metrics: string[];
  thresholds: { [metric: string]: { min?: number; max?: number } };
  evaluationInterval: number;
  alerting: {
    enabled: boolean;
    channels: string[];
    conditions: AlertCondition[];
  };
}

export interface Alert {
  id: string;
  name: string;
  condition: AlertCondition;
  severity: 'critical' | 'warning' | 'info';
  channels: string[];
  enabled: boolean;
  lastTriggered?: Date;
}

export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne';
  value: number;
  duration: number; // seconds
}

// Data Catalog Types
export interface DataCatalog {
  id: string;
  name: string;
  description?: string;
  type: 'table' | 'view' | 'stream' | 'file';
  schema: DataSchema;
  metadata: CatalogMetadata;
  lineage: DataLineage[];
  quality: DataQualityReport[];
  usage: UsageStats[];
}

export interface CatalogMetadata {
  owner: string;
  created: Date;
  updated: Date;
  version: string;
  tags: string[];
  description?: string;
  documentation?: string;
  sampleData?: any[];
}

export interface UsageStats {
  date: Date;
  queries: number;
  users: number;
  dataVolume: number;
  responseTime: number;
}