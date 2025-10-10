import mongoose from 'mongoose';
import logger from './logger';

export interface IndexDefinition {
  fields: Record<string, 1 | -1>;
  options?: {
    unique?: boolean;
    sparse?: boolean;
    background?: boolean;
    name?: string;
    partialFilterExpression?: any;
    expireAfterSeconds?: number;
  };
}

export class DatabaseOptimizer {
  private connection: mongoose.Connection;

  constructor() {
    this.connection = mongoose.connection;
  }

  // Create indexes for common query patterns
  async createCommonIndexes(): Promise<void> {
    try {
      logger.info('Creating common database indexes');

      // Get all collections
      const collections = await this.connection.db.listCollections().toArray();
      
      for (const collection of collections) {
        const collectionName = collection.name;
        
        // Skip system collections
        if (collectionName.startsWith('system.')) {
          continue;
        }

        await this.createCollectionIndexes(collectionName);
      }

      logger.info('Common indexes created successfully');
    } catch (error) {
      logger.error('Error creating common indexes', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // Create indexes for a specific collection
  async createCollectionIndexes(collectionName: string): Promise<void> {
    try {
      const collection = this.connection.db.collection(collectionName);
      
      // Get existing indexes
      const existingIndexes = await collection.indexes();
      const existingIndexNames = existingIndexes.map(index => index.name);

      // Define common indexes
      const commonIndexes: IndexDefinition[] = [
        // Timestamp indexes for sorting
        {
          fields: { createdAt: -1 },
          options: { name: 'createdAt_desc', background: true }
        },
        {
          fields: { updatedAt: -1 },
          options: { name: 'updatedAt_desc', background: true }
        },
        // Compound index for common queries
        {
          fields: { createdAt: -1, updatedAt: -1 },
          options: { name: 'createdAt_updatedAt', background: true }
        }
      ];

      // Create indexes that don't exist
      for (const indexDef of commonIndexes) {
        const indexName = indexDef.options?.name || this.generateIndexName(indexDef.fields);
        
        if (!existingIndexNames.includes(indexName)) {
          try {
            await collection.createIndex(indexDef.fields, indexDef.options);
            logger.info('Index created', {
              collection: collectionName,
              index: indexName,
              fields: indexDef.fields
            });
          } catch (indexError) {
            logger.warn('Failed to create index', {
              collection: collectionName,
              index: indexName,
              error: indexError instanceof Error ? indexError.message : 'Unknown error'
            });
          }
        }
      }

      // Analyze collection and create specific indexes
      await this.analyzeAndCreateSpecificIndexes(collectionName);

    } catch (error) {
      logger.error('Error creating collection indexes', {
        collection: collectionName,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Analyze collection data and create specific indexes
  private async analyzeAndCreateSpecificIndexes(collectionName: string): Promise<void> {
    try {
      const collection = this.connection.db.collection(collectionName);
      
      // Sample documents to analyze field patterns
      const sampleDocs = await collection.aggregate([
        { $sample: { size: 100 } }
      ]).toArray();

      if (sampleDocs.length === 0) {
        return;
      }

      // Analyze field frequency and types
      const fieldAnalysis = this.analyzeFields(sampleDocs);
      
      // Create indexes for frequently used fields
      for (const [field, analysis] of fieldAnalysis.entries()) {
        if (analysis.frequency > 0.5 && analysis.isIndexable) { // Used in >50% of documents
          await this.createFieldIndex(collectionName, field, analysis);
        }
      }

    } catch (error) {
      logger.warn('Error analyzing collection for specific indexes', {
        collection: collectionName,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Analyze field usage patterns
  private analyzeFields(documents: any[]): Map<string, FieldAnalysis> {
    const fieldAnalysis = new Map<string, FieldAnalysis>();

    for (const doc of documents) {
      this.analyzeDocument(doc, fieldAnalysis);
    }

    // Calculate frequencies
    for (const [field, analysis] of fieldAnalysis.entries()) {
      analysis.frequency = analysis.count / documents.length;
    }

    return fieldAnalysis;
  }

  // Analyze a single document
  private analyzeDocument(doc: any, fieldAnalysis: Map<string, FieldAnalysis>, prefix = ''): void {
    for (const [key, value] of Object.entries(doc)) {
      if (key.startsWith('_')) continue; // Skip MongoDB internal fields

      const fieldName = prefix ? `${prefix}.${key}` : key;
      
      if (!fieldAnalysis.has(fieldName)) {
        fieldAnalysis.set(fieldName, {
          count: 0,
          frequency: 0,
          types: new Set(),
          isIndexable: true,
          isUnique: true,
          values: new Set()
        });
      }

      const analysis = fieldAnalysis.get(fieldName)!;
      analysis.count++;
      analysis.types.add(typeof value);
      analysis.values.add(value);

      // Check if field is indexable
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        analysis.isIndexable = false; // Don't index nested objects
        this.analyzeDocument(value, fieldAnalysis, fieldName);
      } else if (Array.isArray(value)) {
        analysis.isIndexable = false; // Don't index arrays directly
      } else if (typeof value === 'string' && value.length > 100) {
        analysis.isIndexable = false; // Don't index very long strings
      }

      // Check uniqueness
      if (analysis.values.size < analysis.count) {
        analysis.isUnique = false;
      }
    }
  }

  // Create index for a specific field
  private async createFieldIndex(collectionName: string, field: string, analysis: FieldAnalysis): Promise<void> {
    try {
      const collection = this.connection.db.collection(collectionName);
      
      const indexOptions: any = {
        background: true,
        name: `${field}_index`
      };

      // Add unique constraint if field appears to be unique
      if (analysis.isUnique && analysis.frequency === 1) {
        indexOptions.unique = true;
        indexOptions.sparse = true;
      }

      // Add partial filter for sparse fields
      if (analysis.frequency < 1) {
        indexOptions.sparse = true;
      }

      await collection.createIndex({ [field]: 1 }, indexOptions);
      
      logger.info('Field index created', {
        collection: collectionName,
        field,
        unique: indexOptions.unique,
        sparse: indexOptions.sparse
      });

    } catch (error) {
      logger.warn('Failed to create field index', {
        collection: collectionName,
        field,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Generate index name from fields
  private generateIndexName(fields: Record<string, 1 | -1>): string {
    return Object.entries(fields)
      .map(([field, direction]) => `${field}_${direction === 1 ? 'asc' : 'desc'}`)
      .join('_');
  }

  // Get index statistics
  async getIndexStats(collectionName: string): Promise<any> {
    try {
      const collection = this.connection.db.collection(collectionName);
      const stats = await collection.aggregate([
        { $indexStats: {} }
      ]).toArray();

      return stats;
    } catch (error) {
      logger.error('Error getting index stats', {
        collection: collectionName,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  // Optimize collection
  async optimizeCollection(collectionName: string): Promise<void> {
    try {
      logger.info('Optimizing collection', { collection: collectionName });

      // Create indexes
      await this.createCollectionIndexes(collectionName);

      // Compact collection (if supported)
      try {
        await this.connection.db.command({ compact: collectionName });
        logger.info('Collection compacted', { collection: collectionName });
      } catch (compactError) {
        logger.warn('Collection compaction not supported or failed', {
          collection: collectionName,
          error: compactError instanceof Error ? compactError.message : 'Unknown error'
        });
      }

      logger.info('Collection optimization completed', { collection: collectionName });
    } catch (error) {
      logger.error('Error optimizing collection', {
        collection: collectionName,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // Get database performance metrics
  async getPerformanceMetrics(): Promise<any> {
    try {
      const stats = await this.connection.db.stats();
      const serverStatus = await this.connection.db.admin().serverStatus();
      
      return {
        database: {
          collections: stats.collections,
          dataSize: stats.dataSize,
          indexSize: stats.indexSize,
          totalSize: stats.totalSize,
          avgObjSize: stats.avgObjSize,
          storageSize: stats.storageSize
        },
        server: {
          uptime: serverStatus.uptime,
          connections: serverStatus.connections,
          memory: serverStatus.mem,
          operations: serverStatus.opcounters
        }
      };
    } catch (error) {
      logger.error('Error getting performance metrics', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }
}

interface FieldAnalysis {
  count: number;
  frequency: number;
  types: Set<string>;
  isIndexable: boolean;
  isUnique: boolean;
  values: Set<any>;
}

export default new DatabaseOptimizer();