import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from '../config/swagger';

const router = Router();

// Swagger documentation
router.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Universal Data Stack API Documentation'
}));

// API information endpoint
router.get('/', (req, res) => {
  res.json({
    message: 'Universal Data Stack API',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: {
      'GET /api/collections': 'Get all collections',
      'GET /api/:collection': 'Get all documents from collection',
      'POST /api/:collection': 'Create new document in collection',
      'GET /api/:collection/:id': 'Get document by ID',
      'PUT /api/:collection/:id': 'Update document by ID',
      'DELETE /api/:collection/:id': 'Delete document by ID',
      'GET /api/health': 'Health check',
      'GET /api/docs': 'API documentation'
    }
  });
});

export default router;