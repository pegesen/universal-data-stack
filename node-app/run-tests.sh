#!/bin/bash

echo "🧪 Backend Test Runner"
echo "======================"

# Set environment variables
export NODE_ENV=test
export MONGODB_URI="mongodb://admin:password123@localhost:27017/test_data?authSource=admin"

echo "📋 Environment:"
echo "  NODE_ENV: $NODE_ENV"
echo "  MONGODB_URI: $MONGODB_URI"
echo ""

# Check if MongoDB is running
echo "🔍 Checking MongoDB connection..."
if ! nc -z localhost 27017 2>/dev/null; then
    echo "❌ MongoDB is not running on localhost:27017"
    echo "   Please start MongoDB first:"
    echo "   docker-compose up mongo -d"
    exit 1
fi
echo "✅ MongoDB is running"
echo ""

# Run tests
echo "🚀 Running tests..."
npx jest tests/server.test.js --verbose --detectOpenHandles --forceExit

echo ""
echo "✅ Test execution completed!"