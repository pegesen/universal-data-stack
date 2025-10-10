import { Request, Response } from 'express';
import { CollectionService } from '../services/CollectionService';
import logger from '../services/logger';
import { CollectionListResponse } from '../types';

export class CollectionController {
  private collectionService: CollectionService;

  constructor() {
    this.collectionService = new CollectionService();
  }

  async listCollections(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Fetching collections list');
      
      const collections = await this.collectionService.listCollections();
      
      const response: CollectionListResponse = {
        collections
      };
      
      logger.info('Collections list retrieved successfully', {
        count: collections.length
      });
      
      res.json(response);
    } catch (error) {
      logger.error('Error fetching collections', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch collections'
      });
    }
  }
}