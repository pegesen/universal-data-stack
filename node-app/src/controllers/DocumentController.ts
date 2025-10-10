import { Request, Response } from 'express';
import { DocumentService } from '../services/DocumentService';
import { ValidationService } from '../middleware/validation';
import logger from '../services/logger';
import { CollectionResponse, Document, QueryParams } from '../types';

export class DocumentController {
  private documentService: DocumentService;

  constructor() {
    this.documentService = new DocumentService();
  }

  async listDocuments(req: Request, res: Response): Promise<void> {
    try {
      const { collection } = req.params;
      const { page = 1, limit = 100, sort = '_id', order = 'desc' } = req.query;

      // Validate collection name
      const collectionValidation = ValidationService.validateCollectionName(collection);
      if (!collectionValidation.isValid) {
        res.status(400).json({
          error: 'Validation error',
          message: ValidationService.formatErrors(collectionValidation.errors)
        });
        return;
      }

      // Validate query parameters
      const queryParams: QueryParams = {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        sort: sort as string,
        order: order as 'asc' | 'desc'
      };

      const queryValidation = ValidationService.validateQueryParams(queryParams);
      if (!queryValidation.isValid) {
        res.status(400).json({
          error: 'Validation error',
          message: ValidationService.formatErrors(queryValidation.errors)
        });
        return;
      }

      logger.info('Fetching documents from collection', {
        collection,
        page: queryParams.page,
        limit: queryParams.limit,
        sort: queryParams.sort,
        order: queryParams.order
      });

      const response: CollectionResponse = await this.documentService.listDocuments(collection, queryParams);

      logger.info('Documents retrieved successfully', {
        collection,
        count: response.data.length,
        total: response.pagination.total
      });

      res.json(response);
    } catch (error) {
      logger.error('Error fetching documents', {
        collection: req.params.collection,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch documents'
      });
    }
  }

  async createDocument(req: Request, res: Response): Promise<void> {
    try {
      const { collection } = req.params;
      const data = req.body;

      // Validate collection name
      const collectionValidation = ValidationService.validateCollectionName(collection);
      if (!collectionValidation.isValid) {
        res.status(400).json({
          error: 'Validation error',
          message: ValidationService.formatErrors(collectionValidation.errors)
        });
        return;
      }

      // Validate document data
      const dataValidation = ValidationService.validateDocumentData(data);
      if (!dataValidation.isValid) {
        res.status(400).json({
          error: 'Validation error',
          message: ValidationService.formatErrors(dataValidation.errors)
        });
        return;
      }

      // Sanitize input
      const sanitizedData = ValidationService.sanitizeInput(data);

      logger.info('Creating document in collection', {
        collection,
        dataKeys: Object.keys(sanitizedData)
      });

      const document: Document = await this.documentService.createDocument(collection, sanitizedData);

      logger.info('Document created successfully', {
        collection,
        documentId: document._id
      });

      res.status(201).json(document);
    } catch (error) {
      logger.error('Error creating document', {
        collection: req.params.collection,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to create document'
      });
    }
  }

  async getDocument(req: Request, res: Response): Promise<void> {
    try {
      const { collection, id } = req.params;

      // Validate collection name
      const collectionValidation = ValidationService.validateCollectionName(collection);
      if (!collectionValidation.isValid) {
        res.status(400).json({
          error: 'Validation error',
          message: ValidationService.formatErrors(collectionValidation.errors)
        });
        return;
      }

      // Validate document ID
      const idValidation = ValidationService.validateObjectId(id);
      if (!idValidation.isValid) {
        res.status(400).json({
          error: 'Validation error',
          message: ValidationService.formatErrors(idValidation.errors)
        });
        return;
      }

      logger.info('Fetching document by ID', {
        collection,
        documentId: id
      });

      const document: Document | null = await this.documentService.getDocument(collection, id);

      if (!document) {
        res.status(404).json({
          error: 'Not found',
          message: 'Document not found'
        });
        return;
      }

      logger.info('Document retrieved successfully', {
        collection,
        documentId: id
      });

      res.json(document);
    } catch (error) {
      logger.error('Error fetching document', {
        collection: req.params.collection,
        documentId: req.params.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch document'
      });
    }
  }

  async updateDocument(req: Request, res: Response): Promise<void> {
    try {
      const { collection, id } = req.params;
      const data = req.body;

      // Validate collection name
      const collectionValidation = ValidationService.validateCollectionName(collection);
      if (!collectionValidation.isValid) {
        res.status(400).json({
          error: 'Validation error',
          message: ValidationService.formatErrors(collectionValidation.errors)
        });
        return;
      }

      // Validate document ID
      const idValidation = ValidationService.validateObjectId(id);
      if (!idValidation.isValid) {
        res.status(400).json({
          error: 'Validation error',
          message: ValidationService.formatErrors(idValidation.errors)
        });
        return;
      }

      // Validate document data
      const dataValidation = ValidationService.validateDocumentData(data);
      if (!dataValidation.isValid) {
        res.status(400).json({
          error: 'Validation error',
          message: ValidationService.formatErrors(dataValidation.errors)
        });
        return;
      }

      // Sanitize input
      const sanitizedData = ValidationService.sanitizeInput(data);

      logger.info('Updating document', {
        collection,
        documentId: id,
        dataKeys: Object.keys(sanitizedData)
      });

      const document: Document | null = await this.documentService.updateDocument(collection, id, sanitizedData);

      if (!document) {
        res.status(404).json({
          error: 'Not found',
          message: 'Document not found'
        });
        return;
      }

      logger.info('Document updated successfully', {
        collection,
        documentId: id
      });

      res.json(document);
    } catch (error) {
      logger.error('Error updating document', {
        collection: req.params.collection,
        documentId: req.params.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to update document'
      });
    }
  }

  async deleteDocument(req: Request, res: Response): Promise<void> {
    try {
      const { collection, id } = req.params;

      // Validate collection name
      const collectionValidation = ValidationService.validateCollectionName(collection);
      if (!collectionValidation.isValid) {
        res.status(400).json({
          error: 'Validation error',
          message: ValidationService.formatErrors(collectionValidation.errors)
        });
        return;
      }

      // Validate document ID
      const idValidation = ValidationService.validateObjectId(id);
      if (!idValidation.isValid) {
        res.status(400).json({
          error: 'Validation error',
          message: ValidationService.formatErrors(idValidation.errors)
        });
        return;
      }

      logger.info('Deleting document', {
        collection,
        documentId: id
      });

      const deleted = await this.documentService.deleteDocument(collection, id);

      if (!deleted) {
        res.status(404).json({
          error: 'Not found',
          message: 'Document not found'
        });
        return;
      }

      logger.info('Document deleted successfully', {
        collection,
        documentId: id
      });

      res.json({
        message: 'Document deleted successfully',
        id
      });
    } catch (error) {
      logger.error('Error deleting document', {
        collection: req.params.collection,
        documentId: req.params.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to delete document'
      });
    }
  }
}