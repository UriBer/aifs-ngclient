#!/bin/bash

# Build script for macOS
set -e

echo "🍎 Building AIFS Commander for macOS..."

# Clean and build
rm -rf dist-electron
npm run build:all

# Build macOS distribution
echo "📦 Creating macOS distribution..."
npm run dist:mac

echo "✅ macOS build complete!"
echo "📁 Output: dist-electron/"
ls -la dist-electron/*.dmg dist-electron/*.zip 2>/dev/null || echo "No DMG/ZIP files found"

