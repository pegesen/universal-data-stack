import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import helmet from 'helmet';
import logger from '../services/logger';
import { AuthenticatedRequest } from '../types/auth';

export class SecurityMiddleware {
  // Enhanced rate limiting with different limits for different endpoints
  createRateLimit(options: {
    windowMs?: number;
    max?: number;
    message?: string;
    standardHeaders?: boolean;
    legacyHeaders?: boolean;
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
    keyGenerator?: (req: Request) => string;
  } = {}) {
    const {
      windowMs = 15 * 60 * 1000, // 15 minutes
      max = 100,
      message = 'Too many requests from this IP, please try again later.',
      standardHeaders = true,
      legacyHeaders = false,
      skipSuccessfulRequests = false,
      skipFailedRequests = false,
      keyGenerator = (req: Request) => req.ip || 'unknown'
    } = options;

    return rateLimit({
      windowMs,
      max,
      message: {
        error: 'Rate limit exceeded',
        message,
        retryAfter: Math.ceil(windowMs / 1000)
      },
      standardHeaders,
      legacyHeaders,
      skipSuccessfulRequests,
      skipFailedRequests,
      keyGenerator,
      handler: (req: Request, res: Response) => {
        logger.warn('Rate limit exceeded', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          url: req.originalUrl,
          method: req.method,
          limit: max,
          windowMs
        });

        res.status(429).json({
          error: 'Rate limit exceeded',
          message,
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }
    });
  }

  // API rate limiting (stricter)
  apiRateLimit() {
    return this.createRateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // 100 requests per 15 minutes
      message: 'Too many API requests, please try again later.'
    });
  }

  // Auth rate limiting (very strict)
  authRateLimit() {
    return this.createRateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 auth attempts per 15 minutes
      message: 'Too many authentication attempts, please try again later.',
      keyGenerator: (req: Request) => {
        // Use email if available, otherwise IP
        const email = req.body?.email;
        return email ? `auth:${email}` : `auth:${req.ip}`;
      }
    });
  }

  // Search rate limiting (moderate)
  searchRateLimit() {
    return this.createRateLimit({
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 30, // 30 searches per minute
      message: 'Too many search requests, please slow down.'
    });
  }

  // Upload rate limiting
  uploadRateLimit() {
    return this.createRateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 10, // 10 uploads per hour
      message: 'Too many upload requests, please try again later.'
    });
  }

  // Admin rate limiting (more lenient)
  adminRateLimit() {
    return this.createRateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 200, // 200 requests per 15 minutes
      message: 'Too many admin requests, please try again later.'
    });
  }

  // Slow down middleware
  createSlowDown(options: {
    windowMs?: number;
    delayAfter?: number;
    delayMs?: number;
    maxDelayMs?: number;
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
  } = {}) {
    const {
      windowMs = 15 * 60 * 1000, // 15 minutes
      delayAfter = 50, // Start delaying after 50 requests
      delayMs = 500, // Add 500ms delay per request
      maxDelayMs = 20000, // Max delay of 20 seconds
      skipSuccessfulRequests = false,
      skipFailedRequests = false
    } = options;

    return slowDown({
      windowMs,
      delayAfter,
      delayMs,
      maxDelayMs,
      skipSuccessfulRequests,
      skipFailedRequests,
      onLimitReached: (req: Request) => {
        logger.warn('Slow down limit reached', {
          ip: req.ip,
          url: req.originalUrl,
          method: req.method
        });
      }
    });
  }

  // Enhanced security headers
  securityHeaders() {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          connectSrc: ["'self'", "ws:", "wss:"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
          workerSrc: ["'self'", "blob:"],
          childSrc: ["'self'", "blob:"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          manifestSrc: ["'self'"]
        },
        reportOnly: false
      },
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: { policy: "same-origin" },
      crossOriginResourcePolicy: { policy: "cross-origin" },
      dnsPrefetchControl: true,
      frameguard: { action: 'deny' },
      hidePoweredBy: true,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      },
      ieNoOpen: true,
      noSniff: true,
      originAgentCluster: true,
      permittedCrossDomainPolicies: false,
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      xssFilter: true
    });
  }

  // Request size limiting
  requestSizeLimit() {
    return (req: Request, res: Response, next: NextFunction) => {
      const contentLength = parseInt(req.get('content-length') || '0');
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (contentLength > maxSize) {
        logger.warn('Request too large', {
          ip: req.ip,
          contentLength,
          maxSize,
          url: req.originalUrl
        });

        return res.status(413).json({
          error: 'Request too large',
          message: 'Request size exceeds maximum allowed size'
        });
      }

      next();
    };
  }

  // IP whitelist/blacklist
  ipFilter(whitelist?: string[], blacklist?: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

      // Check blacklist first
      if (blacklist && blacklist.includes(clientIP)) {
        logger.warn('Blocked IP (blacklist)', {
          ip: clientIP,
          url: req.originalUrl,
          userAgent: req.get('User-Agent')
        });

        return res.status(403).json({
          error: 'Access denied',
          message: 'Your IP address is not allowed'
        });
      }

      // Check whitelist if provided
      if (whitelist && !whitelist.includes(clientIP)) {
        logger.warn('Blocked IP (not whitelisted)', {
          ip: clientIP,
          url: req.originalUrl,
          userAgent: req.get('User-Agent')
        });

        return res.status(403).json({
          error: 'Access denied',
          message: 'Your IP address is not whitelisted'
        });
      }

      next();
    };
  }

  // User agent filtering
  userAgentFilter(blockedPatterns: RegExp[] = []) {
    return (req: Request, res: Response, next: NextFunction) => {
      const userAgent = req.get('User-Agent') || '';

      for (const pattern of blockedPatterns) {
        if (pattern.test(userAgent)) {
          logger.warn('Blocked user agent', {
            ip: req.ip,
            userAgent,
            url: req.originalUrl,
            pattern: pattern.toString()
          });

          return res.status(403).json({
            error: 'Access denied',
            message: 'User agent not allowed'
          });
        }
      }

      next();
    };
  }

  // Request validation
  validateRequest() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Check for suspicious patterns
      const suspiciousPatterns = [
        /\.\./, // Directory traversal
        /<script/i, // XSS attempts
        /union.*select/i, // SQL injection
        /javascript:/i, // JavaScript injection
        /on\w+\s*=/i // Event handlers
      ];

      const checkString = (str: string, path: string) => {
        for (const pattern of suspiciousPatterns) {
          if (pattern.test(str)) {
            logger.warn('Suspicious request detected', {
              ip: req.ip,
              pattern: pattern.toString(),
              path,
              value: str.substring(0, 100),
              url: req.originalUrl,
              method: req.method
            });

            return true;
          }
        }
        return false;
      };

      // Check URL parameters
      for (const [key, value] of Object.entries(req.query)) {
        if (typeof value === 'string' && checkString(value, `query.${key}`)) {
          return res.status(400).json({
            error: 'Invalid request',
            message: 'Suspicious content detected in request'
          });
        }
      }

      // Check body parameters
      if (req.body && typeof req.body === 'object') {
        const checkObject = (obj: any, path: string) => {
          for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string' && checkString(value, `${path}.${key}`)) {
              return true;
            }
            if (typeof value === 'object' && value !== null) {
              if (checkObject(value, `${path}.${key}`)) {
                return true;
              }
            }
          }
          return false;
        };

        if (checkObject(req.body, 'body')) {
          return res.status(400).json({
            error: 'Invalid request',
            message: 'Suspicious content detected in request body'
          });
        }
      }

      next();
    };
  }

  // Security logging
  securityLogging() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();

      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;

        // Log security-relevant events
        if (statusCode >= 400) {
          logger.warn('Security event', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            url: req.originalUrl,
            method: req.method,
            statusCode,
            duration,
            referer: req.get('Referer'),
            xForwardedFor: req.get('X-Forwarded-For'),
            xRealIp: req.get('X-Real-IP')
          });
        }

        // Log successful auth events
        if (req.originalUrl.includes('/auth/login') && statusCode === 200) {
          logger.info('Successful login', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            email: req.body?.email
          });
        }

        // Log failed auth events
        if (req.originalUrl.includes('/auth/login') && statusCode === 401) {
          logger.warn('Failed login attempt', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            email: req.body?.email
          });
        }
      });

      next();
    };
  }

  // CORS configuration
  corsConfig() {
    return (req: Request, res: Response, next: NextFunction) => {
      const origin = req.get('Origin');
      const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:8080'];

      if (origin && allowedOrigins.includes(origin)) {
        res.set('Access-Control-Allow-Origin', origin);
      }

      res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
      res.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Request-ID');
      res.set('Access-Control-Allow-Credentials', 'true');
      res.set('Access-Control-Max-Age', '86400'); // 24 hours

      if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
      }

      next();
    };
  }

  // Request ID middleware
  requestId() {
    return (req: Request, res: Response, next: NextFunction) => {
      const requestId = req.get('X-Request-ID') || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      req.headers['x-request-id'] = requestId;
      res.set('X-Request-ID', requestId);
      next();
    };
  }

  // Health check bypass
  healthCheckBypass() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (req.originalUrl === '/health' || req.originalUrl === '/api/health') {
        return next();
      }
      next();
    };
  }
}

export default new SecurityMiddleware();