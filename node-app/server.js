const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security Middleware
app.use(helmet());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Logging
app.use(morgan('combined'));

// CORS Configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// MongoDB Connection
const connectDB = async () => {
  try {
    // Warnung für unsichere Standard-Passwörter
    if (!process.env.MONGODB_URI && !process.env.MONGO_PASSWORD) {
      console.warn('⚠️  WARNUNG: Verwenden Sie ein sicheres Passwort über die Umgebungsvariable MONGO_PASSWORD');
    }
    
    const mongoPassword = process.env.MONGO_PASSWORD || 'CHANGE_ME_IN_PRODUCTION';
    const mongoUri = process.env.MONGODB_URI || `mongodb://admin:${mongoPassword}@localhost:27017/universal_data?authSource=admin`;
    
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
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

// MongoDB ObjectId validation
const validateObjectId = (id) => {
  if (!id || typeof id !== 'string') {
    throw new Error('Document ID is required and must be a string');
  }
  
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid document ID format');
  }
  
  return id;
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
    
    const Model = getCollectionModel(collection);
    const skip = (page - 1) * limit;
    const sortOrder = order === 'desc' ? -1 : 1;
    
    const documents = await Model
      .find({})
      .sort({ [sort]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    const total = await Model.countDocuments();
    
    res.json({
      data: documents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
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
    
    const Model = getCollectionModel(collection);
    const document = new Model(data);
    const savedDocument = await document.save();
    
    res.status(201).json(savedDocument);
  } catch (error) {
    console.error('Error creating document:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: 'Validation error', details: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// Get document by ID
app.get('/api/:collection/:id', async (req, res) => {
  try {
    const { collection, id } = req.params;
    const validatedId = validateObjectId(id);
    const Model = getCollectionModel(collection);
    
    const document = await Model.findById(validatedId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    res.json(document);
  } catch (error) {
    if (error.message.includes('Invalid document ID format') || error.message.includes('Document ID is required')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update document by ID
app.put('/api/:collection/:id', async (req, res) => {
  try {
    const { collection, id } = req.params;
    const validatedId = validateObjectId(id);
    const data = sanitizeInput(req.body);
    
    if (!data || Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'Update data is required' });
    }
    
    const Model = getCollectionModel(collection);
    const document = await Model.findByIdAndUpdate(
      validatedId, 
      data, 
      { new: true, runValidators: true }
    );
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    res.json(document);
  } catch (error) {
    console.error('Error updating document:', error);
    if (error.message.includes('Invalid document ID format') || error.message.includes('Document ID is required')) {
      return res.status(400).json({ error: error.message });
    }
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
    const validatedId = validateObjectId(id);
    const Model = getCollectionModel(collection);
    
    const document = await Model.findByIdAndDelete(validatedId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    res.json({ message: 'Document deleted successfully', id: validatedId });
  } catch (error) {
    if (error.message.includes('Invalid document ID format') || error.message.includes('Document ID is required')) {
      return res.status(400).json({ error: error.message });
    }
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
  console.error('Error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: error.message 
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
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 API available at http://localhost:${PORT}`);
    console.log(`🏥 Health check at http://localhost:${PORT}/health`);
  });
};

startServer().catch(console.error);
