import { Request, Response } from 'express';
import elasticsearchService from '../services/elasticsearch';
import logger from '../services/logger';
import { AuthenticatedRequest } from '../types/auth';
import { SearchQuery, SearchErrorCode } from '../types/search';

export class SearchController {
  async search(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'User must be authenticated'
        });
        return;
      }

      const {
        query,
        collection,
        filters,
        sort,
        page = 1,
        size = 20,
        facets,
        highlight
      } = req.body;

      // Validate search parameters
      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        res.status(400).json({
          error: 'Validation error',
          message: 'Search query is required and must be a non-empty string'
        });
        return;
      }

      if (size < 1 || size > 100) {
        res.status(400).json({
          error: 'Validation error',
          message: 'Size must be between 1 and 100'
        });
        return;
      }

      if (page < 1) {
        res.status(400).json({
          error: 'Validation error',
          message: 'Page must be greater than 0'
        });
        return;
      }

      const searchQuery: SearchQuery = {
        query: query.trim(),
        collection,
        filters,
        sort,
        pagination: {
          page: parseInt(page),
          size: parseInt(size)
        },
        facets,
        highlight
      };

      logger.info('Search request', {
        userId: user.id,
        query: searchQuery.query,
        collection: searchQuery.collection,
        page: searchQuery.pagination?.page,
        size: searchQuery.pagination?.size
      });

      const result = await elasticsearchService.searchAllCollections(searchQuery);

      logger.info('Search completed', {
        userId: user.id,
        query: searchQuery.query,
        totalHits: result.total.value,
        took: result.took
      });

      res.json({
        query: searchQuery.query,
        results: result.hits,
        total: result.total.value,
        page: searchQuery.pagination?.page || 1,
        size: searchQuery.pagination?.size || 20,
        totalPages: Math.ceil(result.total.value / (searchQuery.pagination?.size || 20)),
        aggregations: result.aggregations,
        suggestions: result.suggestions,
        took: result.took,
        timedOut: result.timed_out
      });
    } catch (error) {
      logger.error('Search failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
        query: req.body.query
      });

      res.status(500).json({
        error: 'Search failed',
        message: 'Internal server error'
      });
    }
  }

  async suggest(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'User must be authenticated'
        });
        return;
      }

      const { q: query, field = 'searchableText', size = 10 } = req.query;

      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        res.status(400).json({
          error: 'Validation error',
          message: 'Query parameter is required'
        });
        return;
      }

      const suggestions = await elasticsearchService.getSearchSuggestions(
        query.trim(),
        parseInt(size as string)
      );

      res.json({
        query: query.trim(),
        suggestions
      });
    } catch (error) {
      logger.error('Suggestion failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
        query: req.query.q
      });

      res.status(500).json({
        error: 'Suggestion failed',
        message: 'Internal server error'
      });
    }
  }

  async autocomplete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'User must be authenticated'
        });
        return;
      }

      const { q: query, field = 'searchableText', size = 10 } = req.query;

      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        res.status(400).json({
          error: 'Validation error',
          message: 'Query parameter is required'
        });
        return;
      }

      const completions = await elasticsearchService.autocomplete(
        'documents',
        field as string,
        query.trim(),
        parseInt(size as string)
      );

      res.json({
        query: query.trim(),
        completions
      });
    } catch (error) {
      logger.error('Autocomplete failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
        query: req.query.q
      });

      res.status(500).json({
        error: 'Autocomplete failed',
        message: 'Internal server error'
      });
    }
  }

  async getStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'User must be authenticated'
        });
        return;
      }

      // Check if user is admin
      if (user.role !== 'admin') {
        res.status(403).json({
          error: 'Permission denied',
          message: 'Admin access required'
        });
        return;
      }

      const stats = await elasticsearchService.getSearchStats();
      const popularSearches = await elasticsearchService.getPopularSearches(10);

      res.json({
        ...stats,
        popularSearches
      });
    } catch (error) {
      logger.error('Failed to get search stats', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id
      });

      res.status(500).json({
        error: 'Failed to get search stats',
        message: 'Internal server error'
      });
    }
  }

  async reindexCollection(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'User must be authenticated'
        });
        return;
      }

      // Check if user is admin
      if (user.role !== 'admin') {
        res.status(403).json({
          error: 'Permission denied',
          message: 'Admin access required'
        });
        return;
      }

      const { collection } = req.params;
      if (!collection) {
        res.status(400).json({
          error: 'Validation error',
          message: 'Collection name is required'
        });
        return;
      }

      // This would typically trigger a background job to reindex the collection
      // For now, we'll just return a success message
      logger.info('Collection reindex requested', {
        userId: user.id,
        collection
      });

      res.json({
        message: 'Collection reindex started',
        collection
      });
    } catch (error) {
      logger.error('Failed to reindex collection', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
        collection: req.params.collection
      });

      res.status(500).json({
        error: 'Failed to reindex collection',
        message: 'Internal server error'
      });
    }
  }

  async reindexAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'User must be authenticated'
        });
        return;
      }

      // Check if user is admin
      if (user.role !== 'admin') {
        res.status(403).json({
          error: 'Permission denied',
          message: 'Admin access required'
        });
        return;
      }

      // This would typically trigger a background job to reindex all collections
      // For now, we'll just return a success message
      logger.info('Full reindex requested', {
        userId: user.id
      });

      res.json({
        message: 'Full reindex started'
      });
    } catch (error) {
      logger.error('Failed to reindex all', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id
      });

      res.status(500).json({
        error: 'Failed to reindex all',
        message: 'Internal server error'
      });
    }
  }

  // Advanced search with filters
  async advancedSearch(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'User must be authenticated'
        });
        return;
      }

      const {
        query,
        collections,
        dateRange,
        fieldFilters,
        rangeFilters,
        sort,
        page = 1,
        size = 20,
        facets,
        highlight
      } = req.body;

      const searchQuery: SearchQuery = {
        query: query || '',
        collection: collections?.[0], // For now, search in first collection
        filters: {
          dateRange,
          fieldFilters,
          rangeFilters
        },
        sort,
        pagination: {
          page: parseInt(page),
          size: parseInt(size)
        },
        facets,
        highlight
      };

      logger.info('Advanced search request', {
        userId: user.id,
        query: searchQuery.query,
        collections,
        filters: searchQuery.filters
      });

      const result = await elasticsearchService.searchAllCollections(searchQuery);

      res.json({
        query: searchQuery.query,
        results: result.hits,
        total: result.total.value,
        page: searchQuery.pagination?.page || 1,
        size: searchQuery.pagination?.size || 20,
        totalPages: Math.ceil(result.total.value / (searchQuery.pagination?.size || 20)),
        aggregations: result.aggregations,
        suggestions: result.suggestions,
        took: result.took,
        timedOut: result.timed_out
      });
    } catch (error) {
      logger.error('Advanced search failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id
      });

      res.status(500).json({
        error: 'Advanced search failed',
        message: 'Internal server error'
      });
    }
  }

  // Search within specific collection
  async searchCollection(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'User must be authenticated'
        });
        return;
      }

      const { collection } = req.params;
      const {
        query,
        filters,
        sort,
        page = 1,
        size = 20,
        facets,
        highlight
      } = req.body;

      const searchQuery: SearchQuery = {
        query: query || '',
        collection,
        filters,
        sort,
        pagination: {
          page: parseInt(page),
          size: parseInt(size)
        },
        facets,
        highlight
      };

      logger.info('Collection search request', {
        userId: user.id,
        collection,
        query: searchQuery.query
      });

      const result = await elasticsearchService.search('documents', searchQuery);

      res.json({
        collection,
        query: searchQuery.query,
        results: result.hits,
        total: result.total.value,
        page: searchQuery.pagination?.page || 1,
        size: searchQuery.pagination?.size || 20,
        totalPages: Math.ceil(result.total.value / (searchQuery.pagination?.size || 20)),
        aggregations: result.aggregations,
        suggestions: result.suggestions,
        took: result.took,
        timedOut: result.timed_out
      });
    } catch (error) {
      logger.error('Collection search failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
        collection: req.params.collection
      });

      res.status(500).json({
        error: 'Collection search failed',
        message: 'Internal server error'
      });
    }
  }
}