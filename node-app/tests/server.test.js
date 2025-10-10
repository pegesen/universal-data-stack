const request = require('supertest');
const mongoose = require('mongoose');

// Import app after setting up environment
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:password123@localhost:27017/test_data?authSource=admin';

const app = require('../server');

describe('Universal Data Stack API', () => {
  beforeAll(async () => {
    // Wait for app to connect to database
    await new Promise((resolve, reject) => {
      if (mongoose.connection.readyState === 1) {
        resolve();
      } else {
        mongoose.connection.once('connected', resolve);
        mongoose.connection.once('error', reject);
        // Timeout after 10 seconds
        setTimeout(() => reject(new Error('Database connection timeout')), 10000);
      }
    });
  });

  afterAll(async () => {
    // Clean up
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db.dropDatabase();
      await mongoose.connection.close();
    }
  });

  beforeEach(async () => {
    // Clean collections before each test
    if (mongoose.connection.readyState === 1) {
      const collections = await mongoose.connection.db.listCollections().toArray();
      for (const collection of collections) {
        if (!collection.name.startsWith('system.')) {
          await mongoose.connection.db.collection(collection.name).deleteMany({});
        }
      }
    }
  });

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
      expect(res.body.mongodb).toBe('connected');
    });
  });

  describe('GET /api/collections', () => {
    it('should return empty collections list initially', async () => {
      const res = await request(app).get('/api/collections');
      expect(res.status).toBe(200);
      expect(res.body.collections).toEqual([]);
    });
  });

  describe('POST /api/:collection', () => {
    it('should create a new document', async () => {
      const testData = { name: 'John Doe', email: 'john@example.com' };
      const res = await request(app)
        .post('/api/users')
        .send(testData);
      
      expect(res.status).toBe(201);
      expect(res.body.name).toBe(testData.name);
      expect(res.body.email).toBe(testData.email);
      expect(res.body._id).toBeDefined();
    });

    it('should reject invalid collection names', async () => {
      const testData = { name: 'John Doe' };
      const res = await request(app)
        .post('/api/123invalid')
        .send(testData);
      
      expect(res.status).toBe(500);
    });

    it('should reject empty data', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({});
      
      expect(res.status).toBe(400);
    });

    it('should sanitize dangerous input', async () => {
      const dangerousData = { 
        name: 'John Doe',
        __proto__: { isAdmin: true },
        constructor: 'malicious'
      };
      const res = await request(app)
        .post('/api/users')
        .send(dangerousData);
      
      expect(res.status).toBe(201);
      expect(res.body.__proto__).toBeUndefined();
      expect(res.body.constructor).toBeUndefined();
    });
  });

  describe('GET /api/:collection', () => {
    beforeEach(async () => {
      // Create test documents
      const testData = [
        { name: 'John Doe', age: 30 },
        { name: 'Jane Smith', age: 25 }
      ];
      
      for (const data of testData) {
        await request(app)
          .post('/api/users')
          .send(data);
      }
    });

    it('should return all documents', async () => {
      const res = await request(app).get('/api/users');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination.total).toBe(2);
    });

    it('should support pagination', async () => {
      const res = await request(app).get('/api/users?page=1&limit=1');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(1);
    });
  });

  describe('GET /api/:collection/:id', () => {
    let documentId;

    beforeEach(async () => {
      const testData = { name: 'John Doe', email: 'john@example.com' };
      const res = await request(app)
        .post('/api/users')
        .send(testData);
      documentId = res.body._id;
    });

    it('should return a specific document', async () => {
      const res = await request(app).get(`/api/users/${documentId}`);
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('John Doe');
    });

    it('should return 404 for non-existent document', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/users/${fakeId}`);
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/:collection/:id', () => {
    let documentId;

    beforeEach(async () => {
      const testData = { name: 'John Doe', email: 'john@example.com' };
      const res = await request(app)
        .post('/api/users')
        .send(testData);
      documentId = res.body._id;
    });

    it('should update a document', async () => {
      const updateData = { name: 'John Updated' };
      const res = await request(app)
        .put(`/api/users/${documentId}`)
        .send(updateData);
      
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('John Updated');
    });

    it('should return 404 for non-existent document', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/api/users/${fakeId}`)
        .send({ name: 'Updated' });
      
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/:collection/:id', () => {
    let documentId;

    beforeEach(async () => {
      const testData = { name: 'John Doe', email: 'john@example.com' };
      const res = await request(app)
        .post('/api/users')
        .send(testData);
      documentId = res.body._id;
    });

    it('should delete a document', async () => {
      const res = await request(app).delete(`/api/users/${documentId}`);
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Document deleted successfully');
    });

    it('should return 404 for non-existent document', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).delete(`/api/users/${fakeId}`);
      expect(res.status).toBe(404);
    });
  });
});