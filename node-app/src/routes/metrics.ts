import { Router } from 'express';
import metricsService from '../services/metrics';
import metricsMiddleware from '../middleware/metrics';
import logger from '../services/logger';

const router = Router();

/**
 * @swagger
 * /api/metrics:
 *   get:
 *     summary: Get Prometheus metrics
 *     description: Retrieve application metrics in Prometheus format
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: Metrics in Prometheus format
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: |
 *                 # HELP http_requests_total Total number of HTTP requests
 *                 # TYPE http_requests_total counter
 *                 http_requests_total{method="GET",route="/api/health",status_code="200"} 42
 *       500:
 *         description: Internal server error
 */
router.get('/', metricsMiddleware.metricsEndpoint());

/**
 * @swagger
 * /api/metrics/health:
 *   get:
 *     summary: Get health metrics
 *     description: Retrieve application health metrics in JSON format
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: Health metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 uptime:
 *                   type: number
 *                   description: Server uptime in seconds
 *                 memory:
 *                   type: object
 *                   properties:
 *                     rss:
 *                       type: number
 *                       description: Resident Set Size in MB
 *                     heapTotal:
 *                       type: number
 *                       description: Total heap size in MB
 *                     heapUsed:
 *                       type: number
 *                       description: Used heap size in MB
 *                     external:
 *                       type: number
 *                       description: External memory in MB
 *                 cache:
 *                   type: object
 *                   properties:
 *                     hits:
 *                       type: number
 *                       description: Cache hits
 *                     misses:
 *                       type: number
 *                       description: Cache misses
 *                     hitRate:
 *                       type: number
 *                       description: Cache hit rate percentage
 *       500:
 *         description: Internal server error
 */
router.get('/health', metricsMiddleware.healthMetricsEndpoint());

/**
 * @swagger
 * /api/metrics/reset:
 *   post:
 *     summary: Reset metrics
 *     description: Reset all application metrics
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: Metrics reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Metrics reset successfully"
 *       500:
 *         description: Internal server error
 */
router.post('/reset', (req, res) => {
  try {
    metricsService.resetMetrics();
    logger.info('Metrics reset requested');
    res.json({ message: 'Metrics reset successfully' });
  } catch (error) {
    logger.error('Error resetting metrics', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({
      error: 'Failed to reset metrics',
      message: 'Internal server error'
    });
  }
});

export default router;