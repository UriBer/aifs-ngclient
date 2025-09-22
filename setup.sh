#!/bin/bash

# AIFS Client Setup Script
echo "🚀 Setting up AIFS Client..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v16 or later."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version $NODE_VERSION is too old. Please install Node.js v16 or later."
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Navigate to working directory
cd working-electron-app

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Check if AWS CLI is installed (optional)
if command -v aws &> /dev/null; then
    echo "✅ AWS CLI detected - you can test S3 operations"
    echo "💡 Run 'aws configure' to set up your AWS credentials"
else
    echo "⚠️  AWS CLI not found - S3 operations will require manual credential setup"
fi

echo ""
echo "🎉 Setup complete! To start the application:"
echo "   cd working-electron-app"
echo "   npm start"
echo ""
echo "📖 See README.md for detailed instructions and troubleshooting"
