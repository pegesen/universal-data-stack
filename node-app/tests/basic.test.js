const request = require('supertest');

// Import app after setting up environment
process.env.NODE_ENV = 'test';

const app = require('../server');

describe('Universal Data Stack API - Basic Tests', () => {
  describe('GET /', () => {
    it('should return API information', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Universal Data Stack API');
      expect(res.body.version).toBe('1.0.0');
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('OK');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  describe('GET /api/collections', () => {
    it('should return collections list', async () => {
      const res = await request(app).get('/api/collections');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.collections)).toBe(true);
    });
  });

  describe('POST /api/:collection', () => {
    it('should reject empty data', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({});
      
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Document data is required');
    });

    it('should reject invalid collection names', async () => {
      const testData = { name: 'John Doe' };
      const res = await request(app)
        .post('/api/123invalid')
        .send(testData);
      
      expect(res.status).toBe(500);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const res = await request(app).get('/non-existent-route');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Route not found');
    });
  });
});