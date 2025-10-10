import { Router } from 'express';
import { CollectionController } from '../controllers/CollectionController';

const router = Router();
const collectionController = new CollectionController();

/**
 * @swagger
 * /api/collections:
 *   get:
 *     summary: Get all collections
 *     description: Retrieve a list of all available collections in the database
 *     tags: [Collections]
 *     responses:
 *       200:
 *         description: List of collections retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CollectionListResponse'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/', collectionController.listCollections.bind(collectionController));

export default router;