const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const morgan = require('morgan');
const logger = require('./logger');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Logging
app.use(morgan('combined'));

// CORS Configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: process.env.CORS_CREDENTIALS === 'true' || true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset']
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// MongoDB Connection
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://admin:password123@localhost:27017/universal_data?authSource=admin';
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      ssl: process.env.MONGODB_SSL === 'true',
      authSource: process.env.MONGODB_AUTH_SOURCE || 'admin',
      retryWrites: true,
      w: 'majority'
    };
    
    await mongoose.connect(mongoUri, options);
    logger.info('✅ MongoDB connected successfully');
  } catch (error) {
    logger.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Input validation and sanitization
const validateCollectionName = (name) => {
  if (!name || typeof name !== 'string') {
    throw new Error('Collection name is required and must be a string');
  }
  
  // MongoDB collection name validation
  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error('Collection name must start with a letter and contain only letters, numbers, and underscores');
  }
  
  if (name.length > 64) {
    throw new Error('Collection name must be 64 characters or less');
  }
  
  return name.toLowerCase();
};

const sanitizeInput = (data) => {
  if (typeof data !== 'object' || data === null) {
    return data;
  }
  
  // Remove potentially dangerous fields
  const dangerousFields = ['__proto__', 'constructor', 'prototype'];
  const sanitized = { ...data };
  
  dangerousFields.forEach(field => {
    delete sanitized[field];
  });
  
  return sanitized;
};

// Dynamic Collection Handler
const getCollectionModel = (collectionName) => {
  const validatedName = validateCollectionName(collectionName);
  
  // Check if model already exists
  if (mongoose.models[validatedName]) {
    return mongoose.models[validatedName];
  }
  
  // Create new dynamic schema
  const schema = new mongoose.Schema({}, { 
    strict: false, 
    timestamps: true,
    collection: validatedName 
  });
  
  return mongoose.model(validatedName, schema);
};

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Universal Data Stack API',
    version: '1.0.0',
    endpoints: {
      'GET /api/:collection': 'Get all documents from collection',
      'POST /api/:collection': 'Create new document in collection',
      'GET /api/:collection/:id': 'Get document by ID',
      'PUT /api/:collection/:id': 'Update document by ID',
      'DELETE /api/:collection/:id': 'Delete document by ID',
      'GET /api/collections': 'List all collections'
    }
  });
});

// List all collections
app.get('/api/collections', async (req, res) => {
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(col => col.name).filter(name => !name.startsWith('system.'));
    res.json({ collections: collectionNames });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all documents from collection
app.get('/api/:collection', async (req, res) => {
  try {
    const { collection } = req.params;
    const { page = 1, limit = 100, sort = '_id', order = 'desc' } = req.query;
    
    // Validate pagination parameters
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(1000, Math.max(1, parseInt(limit)));
    const sortOrder = order === 'desc' ? -1 : 1;
    
    const Model = getCollectionModel(collection);
    const skip = (pageNum - 1) * limitNum;
    
    logger.info(`Fetching documents from collection: ${collection}`, {
      page: pageNum,
      limit: limitNum,
      sort,
      order
    });
    
    const documents = await Model
      .find({})
      .sort({ [sort]: sortOrder })
      .skip(skip)
      .limit(limitNum)
      .lean();
    
    const total = await Model.countDocuments();
    
    res.json({
      data: documents,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    logger.error('Error fetching documents:', {
      collection: req.params.collection,
      error: error.message,
      query: req.query
    });
    res.status(500).json({ error: error.message });
  }
});

// Create new document
app.post('/api/:collection', async (req, res) => {
  try {
    const { collection } = req.params;
    const data = sanitizeInput(req.body);
    
    if (!data || Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'Document data is required' });
    }
    
    logger.info(`Creating document in collection: ${collection}`, {
      collection,
      dataKeys: Object.keys(data)
    });
    
    const Model = getCollectionModel(collection);
    const document = new Model(data);
    const savedDocument = await document.save();
    
    logger.info(`Document created successfully`, {
      collection,
      documentId: savedDocument._id
    });
    
    res.status(201).json(savedDocument);
  } catch (error) {
    logger.error('Error creating document:', {
      collection: req.params.collection,
      error: error.message,
      stack: error.stack
    });
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.message,
        field: error.path
      });
    }
    res.status(500).json({ error: error.message });
  }
});

// Get document by ID
app.get('/api/:collection/:id', async (req, res) => {
  try {
    const { collection, id } = req.params;
    const Model = getCollectionModel(collection);
    
    const document = await Model.findById(id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    res.json(document);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update document by ID
app.put('/api/:collection/:id', async (req, res) => {
  try {
    const { collection, id } = req.params;
    const data = sanitizeInput(req.body);
    
    if (!data || Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'Update data is required' });
    }
    
    const Model = getCollectionModel(collection);
    const document = await Model.findByIdAndUpdate(
      id, 
      data, 
      { new: true, runValidators: true }
    );
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    res.json(document);
  } catch (error) {
    logger.error('Error updating document:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: 'Validation error', details: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// Delete document by ID
app.delete('/api/:collection/:id', async (req, res) => {
  try {
    const { collection, id } = req.params;
    const Model = getCollectionModel(collection);
    
    const document = await Model.findByIdAndDelete(id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    res.json({ message: 'Document deleted successfully', id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled Error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(500).json({ 
    error: 'Internal server error',
    message: isDevelopment ? error.message : 'Something went wrong',
    ...(isDevelopment && { stack: error.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
const startServer = async () => {
  await connectDB();
  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`🚀 Server running on port ${PORT}`);
    logger.info(`📊 API available at http://localhost:${PORT}`);
    logger.info(`🏥 Health check at http://localhost:${PORT}/health`);
  });
};

startServer().catch(logger.error);
