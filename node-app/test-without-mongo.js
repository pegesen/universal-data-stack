#!/usr/bin/env node

// Test runner that works without MongoDB
const { execSync } = require('child_process');
const path = require('path');

console.log('🧪 Running Tests (MongoDB Optional)');
console.log('===================================');

// Set environment
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://admin:password123@localhost:27017/test_data?authSource=admin';

console.log('Environment:');
console.log('  NODE_ENV:', process.env.NODE_ENV);
console.log('  MONGODB_URI:', process.env.MONGODB_URI);
console.log('');

try {
  console.log('🚀 Starting Jest...');
  
  // Run jest with shorter timeout and better error handling
  const result = execSync('npx jest tests/server.test.js --verbose --no-cache --detectOpenHandles --forceExit --maxWorkers=1', {
    cwd: path.join(__dirname),
    stdio: 'inherit',
    timeout: 15000,
    env: { ...process.env }
  });
  
  console.log('\n✅ All tests completed successfully!');
} catch (error) {
  console.log('\n❌ Test execution failed:');
  console.log('Exit Code:', error.status);
  console.log('Error:', error.message);
  
  if (error.status === 124) {
    console.log('\n💡 This appears to be a timeout. The tests may be waiting for MongoDB.');
    console.log('   Try starting MongoDB first: docker-compose up mongo -d');
  }
  
  process.exit(1);
}