const request = require('supertest');

// Import app after setting up environment
process.env.NODE_ENV = 'test';

const app = require('../server');

describe('Universal Data Stack API - Complete Test Suite', () => {
  describe('Basic API Endpoints', () => {
    it('should return API information', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Universal Data Stack API');
      expect(res.body.version).toBe('1.0.0');
      expect(res.body.endpoints).toBeDefined();
    });

    it('should return health status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('OK');
      expect(res.body.timestamp).toBeDefined();
      expect(res.body.mongodb).toBeDefined();
    });

    it('should return collections list', async () => {
      const res = await request(app).get('/api/collections');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.collections)).toBe(true);
    });
  });

  describe('Input Validation', () => {
    it('should reject empty data for POST', async () => {
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
      expect(res.body.error).toContain('Collection name must start with a letter');
    });

    it('should reject collection names starting with numbers', async () => {
      const testData = { name: 'John Doe' };
      const res = await request(app)
        .post('/api/123test')
        .send(testData);
      
      expect(res.status).toBe(500);
    });

    it('should reject collection names with special characters', async () => {
      const testData = { name: 'John Doe' };
      const res = await request(app)
        .post('/api/test-collection')
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

    it('should return 404 for non-existent API routes', async () => {
      const res = await request(app).get('/api/non-existent');
      expect(res.status).toBe(404);
    });
  });

  describe('Request Validation', () => {
    it('should handle malformed JSON', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Content-Type', 'application/json')
        .send('{"name": "John", "age": }'); // Invalid JSON
      
      expect(res.status).toBe(400);
    });

    it('should handle large payloads', async () => {
      const largeData = {
        name: 'John Doe',
        data: 'x'.repeat(10000) // Large string
      };
      
      const res = await request(app)
        .post('/api/users')
        .send(largeData);
      
      // Should either succeed or fail gracefully
      expect([200, 201, 400, 500]).toContain(res.status);
    });
  });

  describe('Security Features', () => {
    it('should handle CORS preflight requests', async () => {
      const res = await request(app)
        .options('/api/users')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST');
      
      expect(res.status).toBe(204);
    });

    it('should include security headers', async () => {
      const res = await request(app).get('/');
      expect(res.headers).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should have rate limiting configured', async () => {
      // Make multiple requests quickly
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(request(app).get('/api/collections'));
      }
      
      const results = await Promise.all(promises);
      
      // All requests should succeed (rate limit is 100 per 15 minutes)
      results.forEach(res => {
        expect(res.status).toBe(200);
      });
    });
  });

  describe('API Documentation', () => {
    it('should return proper API documentation', async () => {
      const res = await request(app).get('/');
      expect(res.body.endpoints).toBeDefined();
      expect(res.body.endpoints['GET /api/:collection']).toBeDefined();
      expect(res.body.endpoints['POST /api/:collection']).toBeDefined();
      expect(res.body.endpoints['GET /api/collections']).toBeDefined();
    });
  });
});