const mongoose = require('mongoose');

// Validate MongoDB ObjectId
const validateObjectId = (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid document ID format');
  }
  return true;
};

// Validate pagination parameters
const validatePagination = (page, limit) => {
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  
  if (isNaN(pageNum) || pageNum < 1) {
    throw new Error('Page must be a positive integer');
  }
  
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
    throw new Error('Limit must be between 1 and 1000');
  }
  
  return { page: pageNum, limit: limitNum };
};

// Validate sort parameters
const validateSort = (sort, order) => {
  const validOrders = ['asc', 'desc', '1', '-1'];
  const orderValue = order?.toLowerCase();
  
  if (orderValue && !validOrders.includes(orderValue)) {
    throw new Error('Order must be "asc", "desc", "1", or "-1"');
  }
  
  return {
    sort: sort || '_id',
    order: orderValue === 'asc' || orderValue === '1' ? 1 : -1
  };
};

// Sanitize input data
const sanitizeInput = (data) => {
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
      sanitized[key] = sanitizeInput(sanitized[key]);
    }
  });
  
  return sanitized;
};

module.exports = {
  validateObjectId,
  validatePagination,
  validateSort,
  sanitizeInput
};