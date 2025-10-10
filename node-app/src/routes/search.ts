import { Router } from 'express';
import { SearchController } from '../controllers/SearchController';
import authMiddleware from '../middleware/auth';
import { UserRole } from '../types/auth';

const router = Router();
const searchController = new SearchController();

/**
 * @swagger
 * /api/search:
 *   post:
 *     summary: Search documents
 *     description: Search across all collections with advanced filtering
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *             properties:
 *               query:
 *                 type: string
 *                 description: Search query text
 *                 example: "user management system"
 *               collection:
 *                 type: string
 *                 description: Specific collection to search in
 *                 example: "users"
 *               filters:
 *                 type: object
 *                 properties:
 *                   dateRange:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                         example: "createdAt"
 *                       from:
 *                         type: string
 *                         format: date-time
 *                         example: "2023-01-01T00:00:00Z"
 *                       to:
 *                         type: string
 *                         format: date-time
 *                         example: "2023-12-31T23:59:59Z"
 *                   fieldFilters:
 *                     type: object
 *                     additionalProperties: true
 *                     example:
 *                       status: "active"
 *                       category: ["tech", "business"]
 *                   rangeFilters:
 *                     type: object
 *                     additionalProperties:
 *                       type: object
 *                       properties:
 *                         gte:
 *                           type: number
 *                         lte:
 *                           type: number
 *                         gt:
 *                           type: number
 *                         lt:
 *                           type: number
 *               sort:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     field:
 *                       type: string
 *                     order:
 *                       type: string
 *                       enum: [asc, desc]
 *               page:
 *                 type: integer
 *                 minimum: 1
 *                 default: 1
 *               size:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100
 *                 default: 20
 *               facets:
 *                 type: object
 *                 properties:
 *                   fields:
 *                     type: array
 *                     items:
 *                       type: string
 *                   size:
 *                     type: integer
 *                   minDocCount:
 *                     type: integer
 *               highlight:
 *                 type: object
 *                 properties:
 *                   fields:
 *                     type: object
 *                     additionalProperties:
 *                       type: object
 *                       properties:
 *                         fragment_size:
 *                           type: integer
 *                         number_of_fragments:
 *                           type: integer
 *                         pre_tags:
 *                           type: array
 *                           items:
 *                             type: string
 *                         post_tags:
 *                           type: array
 *                           items:
 *                             type: string
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 query:
 *                   type: string
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _index:
 *                         type: string
 *                       _id:
 *                         type: string
 *                       _score:
 *                         type: number
 *                       _source:
 *                         type: object
 *                       highlight:
 *                         type: object
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 size:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 aggregations:
 *                   type: object
 *                 suggestions:
 *                   type: object
 *                 took:
 *                   type: integer
 *                 timedOut:
 *                   type: boolean
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
router.post('/', authMiddleware.authenticate(), searchController.search.bind(searchController));

/**
 * @swagger
 * /api/search/suggest:
 *   get:
 *     summary: Get search suggestions
 *     description: Get search suggestions based on query
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: q
 *         in: query
 *         required: true
 *         description: Search query
 *         schema:
 *           type: string
 *           example: "user"
 *       - name: field
 *         in: query
 *         description: Field to search in
 *         schema:
 *           type: string
 *           default: searchableText
 *       - name: size
 *         in: query
 *         description: Number of suggestions
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *     responses:
 *       200:
 *         description: Search suggestions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 query:
 *                   type: string
 *                 suggestions:
 *                   type: array
 *                   items:
 *                     type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/suggest', authMiddleware.authenticate(), searchController.suggest.bind(searchController));

/**
 * @swagger
 * /api/search/autocomplete:
 *   get:
 *     summary: Get autocomplete suggestions
 *     description: Get autocomplete suggestions for search input
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: q
 *         in: query
 *         required: true
 *         description: Search query
 *         schema:
 *           type: string
 *           example: "user"
 *       - name: field
 *         in: query
 *         description: Field to search in
 *         schema:
 *           type: string
 *           default: searchableText
 *       - name: size
 *         in: query
 *         description: Number of completions
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *     responses:
 *       200:
 *         description: Autocomplete suggestions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 query:
 *                   type: string
 *                 completions:
 *                   type: array
 *                   items:
 *                     type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/autocomplete', authMiddleware.authenticate(), searchController.autocomplete.bind(searchController));

/**
 * @swagger
 * /api/search/advanced:
 *   post:
 *     summary: Advanced search with filters
 *     description: Perform advanced search with multiple filters and options
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               query:
 *                 type: string
 *                 description: Search query text
 *               collections:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Collections to search in
 *               dateRange:
 *                 type: object
 *                 properties:
 *                   field:
 *                     type: string
 *                   from:
 *                     type: string
 *                     format: date-time
 *                   to:
 *                     type: string
 *                     format: date-time
 *               fieldFilters:
 *                 type: object
 *                 additionalProperties: true
 *               rangeFilters:
 *                 type: object
 *                 additionalProperties:
 *                   type: object
 *                   properties:
 *                     gte:
 *                       type: number
 *                     lte:
 *                       type: number
 *               sort:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     field:
 *                       type: string
 *                     order:
 *                       type: string
 *                       enum: [asc, desc]
 *               page:
 *                 type: integer
 *                 minimum: 1
 *                 default: 1
 *               size:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100
 *                 default: 20
 *               facets:
 *                 type: object
 *                 properties:
 *                   fields:
 *                     type: array
 *                     items:
 *                       type: string
 *               highlight:
 *                 type: object
 *                 properties:
 *                   fields:
 *                     type: object
 *                     additionalProperties:
 *                       type: object
 *     responses:
 *       200:
 *         description: Advanced search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 query:
 *                   type: string
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 size:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 aggregations:
 *                   type: object
 *                 suggestions:
 *                   type: object
 *                 took:
 *                   type: integer
 *                 timedOut:
 *                   type: boolean
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
router.post('/advanced', authMiddleware.authenticate(), searchController.advancedSearch.bind(searchController));

/**
 * @swagger
 * /api/search/collection/{collection}:
 *   post:
 *     summary: Search within specific collection
 *     description: Search documents within a specific collection
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: collection
 *         in: path
 *         required: true
 *         description: Collection name
 *         schema:
 *           type: string
 *           example: "users"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               query:
 *                 type: string
 *                 description: Search query text
 *               filters:
 *                 type: object
 *                 properties:
 *                   dateRange:
 *                     type: object
 *                   fieldFilters:
 *                     type: object
 *                   rangeFilters:
 *                     type: object
 *               sort:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     field:
 *                       type: string
 *                     order:
 *                       type: string
 *                       enum: [asc, desc]
 *               page:
 *                 type: integer
 *                 minimum: 1
 *                 default: 1
 *               size:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100
 *                 default: 20
 *               facets:
 *                 type: object
 *               highlight:
 *                 type: object
 *     responses:
 *       200:
 *         description: Collection search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 collection:
 *                   type: string
 *                 query:
 *                   type: string
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 size:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 aggregations:
 *                   type: object
 *                 suggestions:
 *                   type: object
 *                 took:
 *                   type: integer
 *                 timedOut:
 *                   type: boolean
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
router.post('/collection/:collection', authMiddleware.authenticate(), searchController.searchCollection.bind(searchController));

/**
 * @swagger
 * /api/search/stats:
 *   get:
 *     summary: Get search statistics (Admin only)
 *     description: Get search statistics and analytics
 *     tags: [Search, Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Search statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalDocuments:
 *                   type: integer
 *                 totalSearches:
 *                   type: integer
 *                 averageResponseTime:
 *                   type: number
 *                 topQueries:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       query:
 *                         type: string
 *                       count:
 *                         type: integer
 *                 searchVolumeByDay:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                       count:
 *                         type: integer
 *                 errorRate:
 *                   type: number
 *                 popularSearches:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       query:
 *                         type: string
 *                       count:
 *                         type: integer
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Internal server error
 */
router.get('/stats', 
  authMiddleware.authenticate(), 
  authMiddleware.requireRole(UserRole.ADMIN), 
  searchController.getStats.bind(searchController)
);

/**
 * @swagger
 * /api/search/reindex/{collection}:
 *   post:
 *     summary: Reindex collection (Admin only)
 *     description: Trigger reindexing of a specific collection
 *     tags: [Search, Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: collection
 *         in: path
 *         required: true
 *         description: Collection name to reindex
 *         schema:
 *           type: string
 *           example: "users"
 *     responses:
 *       200:
 *         description: Reindex started
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Collection reindex started
 *                 collection:
 *                   type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Internal server error
 */
router.post('/reindex/:collection', 
  authMiddleware.authenticate(), 
  authMiddleware.requireRole(UserRole.ADMIN), 
  searchController.reindexCollection.bind(searchController)
);

/**
 * @swagger
 * /api/search/reindex:
 *   post:
 *     summary: Reindex all collections (Admin only)
 *     description: Trigger reindexing of all collections
 *     tags: [Search, Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Full reindex started
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Full reindex started
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Internal server error
 */
router.post('/reindex', 
  authMiddleware.authenticate(), 
  authMiddleware.requireRole(UserRole.ADMIN), 
  searchController.reindexAll.bind(searchController)
);

export default router;