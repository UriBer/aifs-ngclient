#!/bin/bash

# AIFS Commander TUI Publishing Script
echo "🚀 AIFS Commander TUI Publishing Script"

# Navigate to TUI package directory
cd packages/aifs-commander-tui

echo "📦 Preparing TUI package for publishing..."

# Test the package locally
echo "🧪 Testing package locally..."
if node bin/aifs-tui --version > /dev/null 2>&1; then
    echo "✅ Version command works"
else
    echo "❌ Error: Version command failed"
    exit 1
fi

# Check npm login status
echo "🔐 Checking npm login status..."
if npm whoami > /dev/null 2>&1; then
    echo "✅ Logged in as: $(npm whoami)"
else
    echo "❌ Not logged in to npm"
    echo "💡 Run 'npm login' to authenticate"
    exit 1
fi

# Validate package
echo "📋 Validating package..."
if npm pack --dry-run > /dev/null 2>&1; then
    echo "✅ Package validation passed"
else
    echo "❌ Error: Package validation failed"
    exit 1
fi

echo "🚀 Publishing to npm..."
npm publish
echo "✅ Package published successfully!"