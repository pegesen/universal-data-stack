import { Router } from 'express';
import { DocumentController } from '../controllers/DocumentController';

const router = Router();
const documentController = new DocumentController();

/**
 * @swagger
 * /api/{collection}:
 *   get:
 *     summary: Get all documents from collection
 *     description: Retrieve all documents from a specific collection with pagination support
 *     tags: [Documents]
 *     parameters:
 *       - $ref: '#/components/parameters/CollectionName'
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Limit'
 *       - $ref: '#/components/parameters/Sort'
 *       - $ref: '#/components/parameters/Order'
 *     responses:
 *       200:
 *         description: Documents retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CollectionResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *   post:
 *     summary: Create new document
 *     description: Create a new document in the specified collection
 *     tags: [Documents]
 *     parameters:
 *       - $ref: '#/components/parameters/CollectionName'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: 'object'
 *             description: Document data (any valid JSON object)
 *             example:
 *               name: "John Doe"
 *               email: "john@example.com"
 *               age: 30
 *     responses:
 *       201:
 *         description: Document created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Document'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/:collection', documentController.listDocuments.bind(documentController));
router.post('/:collection', documentController.createDocument.bind(documentController));

/**
 * @swagger
 * /api/{collection}/{id}:
 *   get:
 *     summary: Get document by ID
 *     description: Retrieve a specific document by its ID
 *     tags: [Documents]
 *     parameters:
 *       - $ref: '#/components/parameters/CollectionName'
 *       - $ref: '#/components/parameters/DocumentId'
 *     responses:
 *       200:
 *         description: Document retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Document'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *   put:
 *     summary: Update document by ID
 *     description: Update a specific document by its ID
 *     tags: [Documents]
 *     parameters:
 *       - $ref: '#/components/parameters/CollectionName'
 *       - $ref: '#/components/parameters/DocumentId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: 'object'
 *             description: Updated document data
 *             example:
 *               name: "John Updated"
 *               email: "john.updated@example.com"
 *     responses:
 *       200:
 *         description: Document updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Document'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *   delete:
 *     summary: Delete document by ID
 *     description: Delete a specific document by its ID
 *     tags: [Documents]
 *     parameters:
 *       - $ref: '#/components/parameters/CollectionName'
 *       - $ref: '#/components/parameters/DocumentId'
 *     responses:
 *       200:
 *         description: Document deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: 'object'
 *               properties:
 *                 message:
 *                   type: 'string'
 *                   example: 'Document deleted successfully'
 *                 id:
 *                   type: 'string'
 *                   example: '507f1f77bcf86cd799439011'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/:collection/:id', documentController.getDocument.bind(documentController));
router.put('/:collection/:id', documentController.updateDocument.bind(documentController));
router.delete('/:collection/:id', documentController.deleteDocument.bind(documentController));

export default router;