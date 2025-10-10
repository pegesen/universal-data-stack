import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import logger from '../services/logger';
import { AuthenticatedRequest } from '../types/auth';

export class ValidationMiddleware {
  // Generic validation error handler
  handleValidationErrors() {
    return (req: Request, res: Response, next: NextFunction) => {
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => ({
          field: error.param,
          message: error.msg,
          value: error.value
        }));

        logger.warn('Validation failed', {
          ip: req.ip,
          url: req.originalUrl,
          method: req.method,
          errors: errorMessages
        });

        return res.status(400).json({
          error: 'Validation failed',
          message: 'Invalid request data',
          details: errorMessages
        });
      }

      next();
    };
  }

  // Auth validation rules
  validateRegister() {
    return [
      body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required'),
      body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
      body('firstName')
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('First name is required and must be between 1 and 50 characters'),
      body('lastName')
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Last name is required and must be between 1 and 50 characters'),
      body('role')
        .optional()
        .isIn(['admin', 'user', 'readonly'])
        .withMessage('Role must be admin, user, or readonly'),
      this.handleValidationErrors()
    ];
  }

  validateLogin() {
    return [
      body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required'),
      body('password')
        .notEmpty()
        .withMessage('Password is required'),
      this.handleValidationErrors()
    ];
  }

  validateChangePassword() {
    return [
      body('currentPassword')
        .notEmpty()
        .withMessage('Current password is required'),
      body('newPassword')
        .isLength({ min: 8 })
        .withMessage('New password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/)
        .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
      this.handleValidationErrors()
    ];
  }

  validateForgotPassword() {
    return [
      body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required'),
      this.handleValidationErrors()
    ];
  }

  validateResetPassword() {
    return [
      body('token')
        .notEmpty()
        .withMessage('Reset token is required'),
      body('newPassword')
        .isLength({ min: 8 })
        .withMessage('New password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/)
        .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
      this.handleValidationErrors()
    ];
  }

  // Document validation rules
  validateCreateDocument() {
    return [
      body('data')
        .isObject()
        .withMessage('Document data must be an object')
        .custom((value) => {
          if (Object.keys(value).length === 0) {
            throw new Error('Document data cannot be empty');
          }
          return true;
        }),
      this.handleValidationErrors()
    ];
  }

  validateUpdateDocument() {
    return [
      body('data')
        .isObject()
        .withMessage('Document data must be an object')
        .custom((value) => {
          if (Object.keys(value).length === 0) {
            throw new Error('Document data cannot be empty');
          }
          return true;
        }),
      this.handleValidationErrors()
    ];
  }

  // Collection validation rules
  validateCollectionName() {
    return [
      param('collection')
        .matches(/^[a-zA-Z][a-zA-Z0-9_]*$/)
        .withMessage('Collection name must start with a letter and contain only letters, numbers, and underscores')
        .isLength({ min: 1, max: 64 })
        .withMessage('Collection name must be between 1 and 64 characters'),
      this.handleValidationErrors()
    ];
  }

  // Document ID validation
  validateDocumentId() {
    return [
      param('id')
        .matches(/^[0-9a-fA-F]{24}$/)
        .withMessage('Invalid document ID format'),
      this.handleValidationErrors()
    ];
  }

  // Search validation rules
  validateSearch() {
    return [
      body('query')
        .optional()
        .isString()
        .trim()
        .isLength({ min: 1, max: 500 })
        .withMessage('Search query must be a string between 1 and 500 characters'),
      body('collection')
        .optional()
        .matches(/^[a-zA-Z][a-zA-Z0-9_]*$/)
        .withMessage('Collection name must start with a letter and contain only letters, numbers, and underscores'),
      body('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
      body('size')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Size must be between 1 and 100'),
      body('sort')
        .optional()
        .isArray()
        .withMessage('Sort must be an array'),
      body('sort.*.field')
        .optional()
        .isString()
        .withMessage('Sort field must be a string'),
      body('sort.*.order')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('Sort order must be asc or desc'),
      this.handleValidationErrors()
    ];
  }

  // Notification validation rules
  validateNotificationId() {
    return [
      param('notificationId')
        .matches(/^[0-9a-fA-F]{24}$/)
        .withMessage('Invalid notification ID format'),
      this.handleValidationErrors()
    ];
  }

  // Pagination validation
  validatePagination() {
    return [
      query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
      query('offset')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Offset must be a non-negative integer'),
      this.handleValidationErrors()
    ];
  }

  // User ID validation
  validateUserId() {
    return [
      param('userId')
        .matches(/^[0-9a-fA-F]{24}$/)
        .withMessage('Invalid user ID format'),
      this.handleValidationErrors()
    ];
  }

  // JSON validation
  validateJSON() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (req.get('content-type')?.includes('application/json')) {
        try {
          // Express already parses JSON, but we can validate it's valid
          if (req.body && typeof req.body === 'object') {
            next();
          } else {
            throw new Error('Invalid JSON');
          }
        } catch (error) {
          logger.warn('Invalid JSON received', {
            ip: req.ip,
            url: req.originalUrl,
            error: error instanceof Error ? error.message : 'Unknown error'
          });

          return res.status(400).json({
            error: 'Invalid JSON',
            message: 'Request body must be valid JSON'
          });
        }
      } else {
        next();
      }
    };
  }

  // File upload validation
  validateFileUpload(options: {
    maxSize?: number;
    allowedTypes?: string[];
    maxFiles?: number;
  } = {}) {
    const {
      maxSize = 10 * 1024 * 1024, // 10MB
      allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
      maxFiles = 5
    } = options;

    return (req: Request, res: Response, next: NextFunction) => {
      // This would typically work with multer or similar file upload middleware
      // For now, we'll just validate the request headers
      const contentLength = parseInt(req.get('content-length') || '0');
      
      if (contentLength > maxSize) {
        return res.status(413).json({
          error: 'File too large',
          message: `File size exceeds maximum allowed size of ${maxSize} bytes`
        });
      }

      next();
    };
  }

  // Custom validation for specific fields
  validateField(fieldName: string, rules: any[]) {
    return [
      body(fieldName).custom(...rules),
      this.handleValidationErrors()
    ];
  }

  // Sanitize input
  sanitizeInput() {
    return (req: Request, res: Response, next: NextFunction) => {
      const sanitize = (obj: any): any => {
        if (typeof obj === 'string') {
          // Remove potentially dangerous characters
          return obj
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '');
        }
        
        if (Array.isArray(obj)) {
          return obj.map(sanitize);
        }
        
        if (obj && typeof obj === 'object') {
          const sanitized: any = {};
          for (const [key, value] of Object.entries(obj)) {
            // Skip dangerous keys
            if (!['__proto__', 'constructor', 'prototype'].includes(key)) {
              sanitized[key] = sanitize(value);
            }
          }
          return sanitized;
        }
        
        return obj;
      };

      if (req.body) {
        req.body = sanitize(req.body);
      }

      if (req.query) {
        req.query = sanitize(req.query);
      }

      next();
    };
  }

  // Validate MongoDB ObjectId
  validateObjectId(fieldName: string) {
    return [
      param(fieldName)
        .matches(/^[0-9a-fA-F]{24}$/)
        .withMessage(`Invalid ${fieldName} format`),
      this.handleValidationErrors()
    ];
  }

  // Validate email format
  validateEmail(fieldName: string = 'email') {
    return [
      body(fieldName)
        .isEmail()
        .normalizeEmail()
        .withMessage(`Valid ${fieldName} is required`),
      this.handleValidationErrors()
    ];
  }

  // Validate URL format
  validateURL(fieldName: string) {
    return [
      body(fieldName)
        .isURL()
        .withMessage(`Valid ${fieldName} URL is required`),
      this.handleValidationErrors()
    ];
  }

  // Validate date format
  validateDate(fieldName: string) {
    return [
      body(fieldName)
        .isISO8601()
        .withMessage(`Valid ${fieldName} date is required (ISO 8601 format)`),
      this.handleValidationErrors()
    ];
  }

  // Validate enum values
  validateEnum(fieldName: string, allowedValues: string[]) {
    return [
      body(fieldName)
        .isIn(allowedValues)
        .withMessage(`${fieldName} must be one of: ${allowedValues.join(', ')}`),
      this.handleValidationErrors()
    ];
  }

  // Validate array length
  validateArrayLength(fieldName: string, min: number = 0, max: number = Infinity) {
    return [
      body(fieldName)
        .isArray({ min, max })
        .withMessage(`${fieldName} must be an array with ${min} to ${max} items`),
      this.handleValidationErrors()
    ];
  }

  // Validate string length
  validateStringLength(fieldName: string, min: number = 0, max: number = Infinity) {
    return [
      body(fieldName)
        .isLength({ min, max })
        .withMessage(`${fieldName} must be between ${min} and ${max} characters`),
      this.handleValidationErrors()
    ];
  }
}

export default new ValidationMiddleware();