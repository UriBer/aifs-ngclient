#!/bin/bash

# Build script for Linux
set -e

echo "🐧 Building AIFS Commander for Linux..."

# Clean and build
rm -rf dist-electron
npm run build:all

# Build Linux distribution
echo "📦 Creating Linux distribution..."
npm run dist:linux

echo "✅ Linux build complete!"
echo "📁 Output: dist-electron/"
ls -la dist-electron/*.AppImage dist-electron/*.deb dist-electron/*.rpm 2>/dev/null || echo "No Linux packages found"

