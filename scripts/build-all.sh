#!/bin/bash

# Build script for all platforms
# This script builds the application for macOS, Windows, and Linux

set -e

echo "🚀 Building AIFS Commander for all platforms..."

# Check if we're on the right platform for cross-compilation
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "✅ Running on macOS - can build for all platforms"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "✅ Running on Linux - can build for Linux and Windows (with wine)"
else
    echo "❌ Unsupported platform: $OSTYPE"
    echo "   Please run on macOS or Linux for cross-platform builds"
    exit 1
fi

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist-electron
rm -rf dist
rm -rf src/tui/dist

# Build the application
echo "🔨 Building application..."
npm run build:all

# Build distributions
echo "📦 Building distributions..."

# Build for current platform first
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🍎 Building for macOS..."
    npm run dist:mac
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "🐧 Building for Linux..."
    npm run dist:linux
fi

# Build for other platforms
echo "🌍 Building for other platforms..."

if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🪟 Building for Windows..."
    npm run dist:win
    
    echo "🐧 Building for Linux..."
    npm run dist:linux
fi

echo "✅ Build complete!"
echo "📁 Output directory: dist-electron"
echo ""
echo "Generated files:"
ls -la dist-electron/

echo ""
echo "🎉 All distributions built successfully!"

