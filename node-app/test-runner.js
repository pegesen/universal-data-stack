#!/usr/bin/env node

// Simple test runner to check if tests work
const { execSync } = require('child_process');
const path = require('path');

console.log('🧪 Running Backend Tests...\n');

try {
  // Set environment variables
  process.env.NODE_ENV = 'test';
  process.env.MONGODB_URI = 'mongodb://admin:password123@localhost:27017/test_data?authSource=admin';
  
  // Run jest directly
  const result = execSync('npx jest tests/server.test.js --verbose', {
    cwd: path.join(__dirname),
    stdio: 'inherit',
    env: { ...process.env }
  });
  
  console.log('\n✅ All tests passed!');
} catch (error) {
  console.error('\n❌ Tests failed:', error.message);
  process.exit(1);
}