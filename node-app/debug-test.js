// Debug test runner
const { execSync } = require('child_process');
const path = require('path');

console.log('🔍 Debug Test Runner');
console.log('==================');

// Set environment
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://admin:password123@localhost:27017/test_data?authSource=admin';

console.log('Environment:');
console.log('  NODE_ENV:', process.env.NODE_ENV);
console.log('  MONGODB_URI:', process.env.MONGODB_URI);
console.log('');

try {
  console.log('🧪 Running Jest...');
  const result = execSync('npx jest tests/server.test.js --verbose --no-cache --detectOpenHandles --forceExit', {
    cwd: path.join(__dirname),
    stdio: 'pipe',
    timeout: 30000
  });
  
  console.log('✅ Test Output:');
  console.log(result.toString());
} catch (error) {
  console.log('❌ Test Error:');
  console.log('Exit Code:', error.status);
  console.log('Error Message:', error.message);
  if (error.stdout) {
    console.log('STDOUT:', error.stdout.toString());
  }
  if (error.stderr) {
    console.log('STDERR:', error.stderr.toString());
  }
}