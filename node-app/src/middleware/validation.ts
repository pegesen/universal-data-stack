import mongoose from 'mongoose';
import { ValidationResult, SanitizedInput, QueryParams } from '../types';

export class ValidationService {
  // Validate MongoDB ObjectId
  static validateObjectId(id: string): ValidationResult {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return {
        isValid: false,
        errors: ['Invalid document ID format']
      };
    }
    return { isValid: true, errors: [] };
  }

  // Validate pagination parameters
  static validatePagination(page?: number, limit?: number): ValidationResult {
    const errors: string[] = [];
    
    if (page !== undefined) {
      const pageNum = parseInt(page.toString());
      if (isNaN(pageNum) || pageNum < 1) {
        errors.push('Page must be a positive integer');
      }
    }
    
    if (limit !== undefined) {
      const limitNum = parseInt(limit.toString());
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
        errors.push('Limit must be between 1 and 1000');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validate sort parameters
  static validateSort(sort?: string, order?: string): ValidationResult {
    const errors: string[] = [];
    const validOrders = ['asc', 'desc', '1', '-1'];
    
    if (order && !validOrders.includes(order.toLowerCase())) {
      errors.push('Order must be "asc", "desc", "1", or "-1"');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validate collection name
  static validateCollectionName(name: string): ValidationResult {
    const errors: string[] = [];
    
    if (!name || typeof name !== 'string') {
      errors.push('Collection name is required and must be a string');
      return { isValid: false, errors };
    }
    
    // MongoDB collection name validation
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name)) {
      errors.push('Collection name must start with a letter and contain only letters, numbers, and underscores');
    }
    
    if (name.length > 64) {
      errors.push('Collection name must be 64 characters or less');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Sanitize input data
  static sanitizeInput(data: any): SanitizedInput {
    if (typeof data !== 'object' || data === null) {
      return data;
    }
    
    // Remove potentially dangerous fields
    const dangerousFields = ['__proto__', 'constructor', 'prototype', 'toString', 'valueOf'];
    const sanitized = { ...data };
    
    dangerousFields.forEach(field => {
      delete sanitized[field];
    });
    
    // Recursively sanitize nested objects
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeInput(sanitized[key]);
      }
    });
    
    return sanitized;
  }

  // Validate query parameters
  static validateQueryParams(params: QueryParams): ValidationResult {
    const errors: string[] = [];
    
    // Validate pagination
    const paginationResult = this.validatePagination(params.page, params.limit);
    errors.push(...paginationResult.errors);
    
    // Validate sort
    const sortResult = this.validateSort(params.sort, params.order);
    errors.push(...sortResult.errors);
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validate document data
  static validateDocumentData(data: any): ValidationResult {
    const errors: string[] = [];
    
    if (!data || typeof data !== 'object') {
      errors.push('Document data must be a valid object');
    } else if (Object.keys(data).length === 0) {
      errors.push('Document data cannot be empty');
    }
    
    // Check for dangerous properties
    const dangerousProps = ['__proto__', 'constructor', 'prototype'];
    for (const prop of dangerousProps) {
      if (prop in data) {
        errors.push(`Property '${prop}' is not allowed`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default ValidationService;