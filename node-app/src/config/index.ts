import { AppConfig } from '../types';

const config: AppConfig = {
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://admin:password123@localhost:27017/universal_data?authSource=admin',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      ssl: process.env.MONGODB_SSL === 'true',
      authSource: process.env.MONGODB_AUTH_SOURCE || 'admin',
      retryWrites: true,
      w: 'majority'
    }
  },
  
  cors: {
    origin: process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:8080',
    credentials: process.env.CORS_CREDENTIALS === 'true' || true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset']
  },
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100')
  },
  
  security: {
    helmet: {
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
        maxAge: parseInt(process.env.HELMET_HSTS_MAX_AGE || '31536000'),
        includeSubDomains: true,
        preload: true
      }
    }
  }
};

export default config;