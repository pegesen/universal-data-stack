import { Client } from '@elastic/elasticsearch';
import logger from './logger';
import { 
  SearchService, 
  ElasticsearchConfig, 
  SearchQuery, 
  SearchResult, 
  IndexableDocument, 
  IndexMapping, 
  IndexSettings,
  SearchStats,
  SearchErrorCode
} from '../types/search';

export class ElasticsearchService implements SearchService {
  private client: Client;
  private config: ElasticsearchConfig;

  constructor() {
    this.config = {
      node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
      auth: process.env.ELASTICSEARCH_USERNAME && process.env.ELASTICSEARCH_PASSWORD ? {
        username: process.env.ELASTICSEARCH_USERNAME,
        password: process.env.ELASTICSEARCH_PASSWORD
      } : undefined,
      ssl: process.env.ELASTICSEARCH_SSL === 'true' ? {
        rejectUnauthorized: false
      } : undefined,
      maxRetries: 3,
      requestTimeout: 30000,
      pingTimeout: 3000
    };

    this.client = new Client(this.config);
  }

  async initialize(): Promise<void> {
    try {
      // Test connection
      await this.client.ping();
      logger.info('Elasticsearch connected successfully', {
        node: this.config.node
      });

      // Create default indices if they don't exist
      await this.createDefaultIndices();
    } catch (error) {
      logger.error('Failed to initialize Elasticsearch', {
        error: error instanceof Error ? error.message : 'Unknown error',
        node: this.config.node
      });
      throw error;
    }
  }

  private async createDefaultIndices(): Promise<void> {
    const indices = ['documents', 'collections', 'users'];
    
    for (const indexName of indices) {
      if (!(await this.indexExists(indexName))) {
        await this.createIndex(indexName);
        logger.info('Created default index', { indexName });
      }
    }
  }

  // Index Management
  async createIndex(indexName: string, mapping?: IndexMapping, settings?: IndexSettings): Promise<boolean> {
    try {
      const defaultMapping: IndexMapping = {
        properties: {
          collection: {
            type: 'keyword'
          },
          documentId: {
            type: 'keyword'
          },
          data: {
            type: 'object',
            dynamic: true
          },
          searchableText: {
            type: 'text',
            analyzer: 'standard'
          },
          metadata: {
            type: 'object',
            properties: {
              collection: { type: 'keyword' },
              documentId: { type: 'keyword' },
              userId: { type: 'keyword' },
              userRole: { type: 'keyword' },
              tags: { type: 'keyword' },
              categories: { type: 'keyword' },
              customFields: { type: 'object', dynamic: true }
            }
          },
          createdAt: {
            type: 'date'
          },
          updatedAt: {
            type: 'date'
          }
        },
        dynamic_templates: [
          {
            string_fields: {
              match: '*',
              match_mapping_type: 'string',
              mapping: {
                type: 'text',
                fields: {
                  keyword: {
                    type: 'keyword',
                    ignore_above: 256
                  }
                }
              }
            }
          }
        ]
      };

      const defaultSettings: IndexSettings = {
        number_of_shards: 1,
        number_of_replicas: 0,
        analysis: {
          analyzer: {
            custom_text_analyzer: {
              type: 'custom',
              tokenizer: 'standard',
              filter: ['lowercase', 'stop', 'snowball']
            }
          },
          filter: {
            snowball: {
              type: 'snowball',
              language: 'English'
            }
          },
          tokenizer: {
            standard: {
              type: 'standard'
            }
          }
        }
      };

      const finalMapping = mapping || defaultMapping;
      const finalSettings = settings || defaultSettings;

      await this.client.indices.create({
        index: indexName,
        body: {
          settings: finalSettings,
          mappings: finalMapping
        }
      });

      logger.info('Index created successfully', { indexName });
      return true;
    } catch (error) {
      logger.error('Failed to create index', {
        error: error instanceof Error ? error.message : 'Unknown error',
        indexName
      });
      return false;
    }
  }

  async deleteIndex(indexName: string): Promise<boolean> {
    try {
      await this.client.indices.delete({ index: indexName });
      logger.info('Index deleted successfully', { indexName });
      return true;
    } catch (error) {
      logger.error('Failed to delete index', {
        error: error instanceof Error ? error.message : 'Unknown error',
        indexName
      });
      return false;
    }
  }

  async indexExists(indexName: string): Promise<boolean> {
    try {
      const response = await this.client.indices.exists({ index: indexName });
      return response.body;
    } catch (error) {
      logger.error('Failed to check if index exists', {
        error: error instanceof Error ? error.message : 'Unknown error',
        indexName
      });
      return false;
    }
  }

  async getIndexMapping(indexName: string): Promise<IndexMapping> {
    try {
      const response = await this.client.indices.getMapping({ index: indexName });
      return response.body[indexName].mappings;
    } catch (error) {
      logger.error('Failed to get index mapping', {
        error: error instanceof Error ? error.message : 'Unknown error',
        indexName
      });
      throw error;
    }
  }

  async updateIndexMapping(indexName: string, mapping: IndexMapping): Promise<boolean> {
    try {
      await this.client.indices.putMapping({
        index: indexName,
        body: mapping
      });
      logger.info('Index mapping updated successfully', { indexName });
      return true;
    } catch (error) {
      logger.error('Failed to update index mapping', {
        error: error instanceof Error ? error.message : 'Unknown error',
        indexName
      });
      return false;
    }
  }

  // Document Operations
  async indexDocument(indexName: string, document: IndexableDocument): Promise<boolean> {
    try {
      await this.client.index({
        index: indexName,
        id: document._id,
        body: document
      });
      return true;
    } catch (error) {
      logger.error('Failed to index document', {
        error: error instanceof Error ? error.message : 'Unknown error',
        indexName,
        documentId: document._id
      });
      return false;
    }
  }

  async bulkIndexDocuments(indexName: string, documents: IndexableDocument[]): Promise<boolean> {
    try {
      const body = documents.flatMap(doc => [
        { index: { _index: indexName, _id: doc._id } },
        doc
      ]);

      const response = await this.client.bulk({ body });
      
      if (response.body.errors) {
        logger.warn('Some documents failed to index in bulk operation', {
          indexName,
          totalDocuments: documents.length,
          errors: response.body.items.filter((item: any) => item.index.error)
        });
      }

      return true;
    } catch (error) {
      logger.error('Failed to bulk index documents', {
        error: error instanceof Error ? error.message : 'Unknown error',
        indexName,
        documentCount: documents.length
      });
      return false;
    }
  }

  async updateDocument(indexName: string, documentId: string, document: Partial<IndexableDocument>): Promise<boolean> {
    try {
      await this.client.update({
        index: indexName,
        id: documentId,
        body: {
          doc: document
        }
      });
      return true;
    } catch (error) {
      logger.error('Failed to update document', {
        error: error instanceof Error ? error.message : 'Unknown error',
        indexName,
        documentId
      });
      return false;
    }
  }

  async deleteDocument(indexName: string, documentId: string): Promise<boolean> {
    try {
      await this.client.delete({
        index: indexName,
        id: documentId
      });
      return true;
    } catch (error) {
      logger.error('Failed to delete document', {
        error: error instanceof Error ? error.message : 'Unknown error',
        indexName,
        documentId
      });
      return false;
    }
  }

  async getDocument(indexName: string, documentId: string): Promise<IndexableDocument | null> {
    try {
      const response = await this.client.get({
        index: indexName,
        id: documentId
      });
      return response.body._source;
    } catch (error) {
      if (error instanceof Error && error.message.includes('not_found')) {
        return null;
      }
      logger.error('Failed to get document', {
        error: error instanceof Error ? error.message : 'Unknown error',
        indexName,
        documentId
      });
      throw error;
    }
  }

  // Search Operations
  async search<T = any>(indexName: string, query: SearchQuery): Promise<SearchResult<T>> {
    try {
      const searchBody = this.buildSearchQuery(query);
      
      const response = await this.client.search({
        index: indexName,
        body: searchBody
      });

      return this.processSearchResponse(response.body);
    } catch (error) {
      logger.error('Search failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        indexName,
        query: query.query
      });
      throw error;
    }
  }

  async searchAllCollections(query: SearchQuery): Promise<SearchResult> {
    try {
      const searchBody = this.buildSearchQuery(query);
      
      const response = await this.client.search({
        index: 'documents',
        body: searchBody
      });

      return this.processSearchResponse(response.body);
    } catch (error) {
      logger.error('Search all collections failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query: query.query
      });
      throw error;
    }
  }

  async suggest(indexName: string, field: string, text: string, size: number = 10): Promise<any> {
    try {
      const response = await this.client.search({
        index: indexName,
        body: {
          suggest: {
            text,
            completion: {
              field: `${field}.suggest`,
              size
            }
          }
        }
      });

      return response.body.suggest;
    } catch (error) {
      logger.error('Suggestion failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        indexName,
        field,
        text
      });
      throw error;
    }
  }

  async autocomplete(indexName: string, field: string, text: string, size: number = 10): Promise<string[]> {
    try {
      const response = await this.client.search({
        index: indexName,
        body: {
          suggest: {
            text,
            completion: {
              field: `${field}.suggest`,
              size
            }
          }
        }
      });

      const suggestions = response.body.suggest.completion[0].options;
      return suggestions.map((suggestion: any) => suggestion.text);
    } catch (error) {
      logger.error('Autocomplete failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        indexName,
        field,
        text
      });
      throw error;
    }
  }

  // Analytics
  async getSearchStats(): Promise<SearchStats> {
    try {
      // This would typically come from a separate analytics system
      // For now, return basic stats
      return {
        totalDocuments: 0,
        totalSearches: 0,
        averageResponseTime: 0,
        topQueries: [],
        searchVolumeByDay: [],
        errorRate: 0
      };
    } catch (error) {
      logger.error('Failed to get search stats', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async getPopularSearches(limit: number = 10): Promise<Array<{ query: string; count: number }>> {
    try {
      // This would typically come from a separate analytics system
      return [];
    } catch (error) {
      logger.error('Failed to get popular searches', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async getSearchSuggestions(query: string, limit: number = 10): Promise<string[]> {
    try {
      const response = await this.client.search({
        index: 'documents',
        body: {
          suggest: {
            text: query,
            completion: {
              field: 'searchableText.suggest',
              size: limit
            }
          }
        }
      });

      const suggestions = response.body.suggest.completion[0].options;
      return suggestions.map((suggestion: any) => suggestion.text);
    } catch (error) {
      logger.error('Failed to get search suggestions', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query
      });
      throw error;
    }
  }

  // Helper Methods
  private buildSearchQuery(query: SearchQuery): any {
    const searchBody: any = {
      query: {
        bool: {
          must: []
        }
      }
    };

    // Main query
    if (query.query) {
      searchBody.query.bool.must.push({
        multi_match: {
          query: query.query,
          fields: ['searchableText^2', 'data.*', 'metadata.tags', 'metadata.categories'],
          type: 'best_fields',
          fuzziness: 'AUTO'
        }
      });
    } else {
      searchBody.query.bool.must.push({ match_all: {} });
    }

    // Collection filter
    if (query.collection) {
      searchBody.query.bool.filter = searchBody.query.bool.filter || [];
      searchBody.query.bool.filter.push({
        term: { 'metadata.collection': query.collection }
      });
    }

    // Additional filters
    if (query.filters) {
      searchBody.query.bool.filter = searchBody.query.bool.filter || [];
      
      // Date range filters
      if (query.filters.dateRange) {
        const dateFilter: any = {
          range: {
            [query.filters.dateRange.field]: {}
          }
        };
        
        if (query.filters.dateRange.from) {
          dateFilter.range[query.filters.dateRange.field].gte = query.filters.dateRange.from;
        }
        if (query.filters.dateRange.to) {
          dateFilter.range[query.filters.dateRange.field].lte = query.filters.dateRange.to;
        }
        
        searchBody.query.bool.filter.push(dateFilter);
      }

      // Field filters
      if (query.filters.fieldFilters) {
        Object.entries(query.filters.fieldFilters).forEach(([field, value]) => {
          if (Array.isArray(value)) {
            searchBody.query.bool.filter.push({
              terms: { [`data.${field}`]: value }
            });
          } else {
            searchBody.query.bool.filter.push({
              term: { [`data.${field}`]: value }
            });
          }
        });
      }

      // Range filters
      if (query.filters.rangeFilters) {
        Object.entries(query.filters.rangeFilters).forEach(([field, range]) => {
          searchBody.query.bool.filter.push({
            range: {
              [`data.${field}`]: range
            }
          });
        });
      }
    }

    // Sorting
    if (query.sort && query.sort.length > 0) {
      searchBody.sort = query.sort.map(sort => ({
        [sort.field]: { order: sort.order }
      }));
    } else {
      searchBody.sort = [{ _score: { order: 'desc' } }];
    }

    // Pagination
    if (query.pagination) {
      searchBody.from = (query.pagination.page - 1) * query.pagination.size;
      searchBody.size = query.pagination.size;
    } else {
      searchBody.size = 20; // Default size
    }

    // Highlighting
    if (query.highlight) {
      searchBody.highlight = query.highlight;
    }

    // Aggregations
    if (query.facets) {
      searchBody.aggs = {};
      query.facets.fields.forEach(field => {
        searchBody.aggs[field] = {
          terms: {
            field: `data.${field}.keyword`,
            size: query.facets?.size || 10,
            min_doc_count: query.facets?.minDocCount || 1
          }
        };
      });
    }

    return searchBody;
  }

  private processSearchResponse(response: any): SearchResult {
    return {
      hits: response.hits.hits.map((hit: any) => ({
        _index: hit._index,
        _id: hit._id,
        _score: hit._score,
        _source: hit._source,
        highlight: hit.highlight,
        sort: hit.sort
      })),
      total: response.hits.total,
      maxScore: response.hits.max_score,
      aggregations: response.aggregations,
      suggestions: response.suggest,
      took: response.took,
      timed_out: response.timed_out
    };
  }
}

export default new ElasticsearchService();