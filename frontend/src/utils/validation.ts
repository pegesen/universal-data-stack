import { ValidationResult } from '../types';

export class ValidationService {
  // Validate JSON input
  static validateJson(jsonString: string): ValidationResult {
    const errors: string[] = [];

    if (!jsonString.trim()) {
      errors.push('JSON input cannot be empty');
      return { isValid: false, errors };
    }

    try {
      const parsed = JSON.parse(jsonString);

      // Basic validation
      if (typeof parsed !== 'object' || parsed === null) {
        errors.push('JSON must be an object');
      }

      // Check for dangerous properties
      const dangerousProps = ['__proto__', 'constructor', 'prototype'];
      for (const prop of dangerousProps) {
        if (prop in parsed) {
          errors.push(`Property '${prop}' is not allowed`);
        }
      }

      return {
        isValid: errors.length === 0,
        errors
      };
    } catch (err) {
      if (err instanceof SyntaxError) {
        errors.push('Invalid JSON format');
      } else {
        errors.push('JSON validation error');
      }
      return { isValid: false, errors };
    }
  }

  // Validate collection name
  static validateCollectionName(name: string): ValidationResult {
    const errors: string[] = [];

    if (!name || typeof name !== 'string') {
      errors.push('Collection name is required and must be a string');
    } else {
      if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name)) {
        errors.push('Collection name must start with a letter and contain only letters, numbers, and underscores');
      }
      if (name.length > 64) {
        errors.push('Collection name must be 64 characters or less');
      }
    }

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

  // Sanitize input data
  static sanitizeInput(data: any): any {
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

  // Format error messages
  static formatErrors(errors: string[]): string {
    if (errors.length === 0) return '';
    if (errors.length === 1) return errors[0];
    return errors.join('; ');
  }
}

export default ValidationService;