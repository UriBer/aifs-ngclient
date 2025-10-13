#!/bin/bash

# Build script for Windows
set -e

echo "🪟 Building AIFS Commander for Windows..."

# Clean and build
rm -rf dist-electron
npm run build:all

# Build Windows distribution
echo "📦 Creating Windows distribution..."
npm run dist:win

echo "✅ Windows build complete!"
echo "📁 Output: dist-electron/"
ls -la dist-electron/*.exe dist-electron/*.zip 2>/dev/null || echo "No EXE/ZIP files found"

