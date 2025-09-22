#!/bin/bash

# AIFS Client - Git Initialization Script
# This script initializes a git repository and prepares it for the first commit

echo "🚀 Initializing Git repository for AIFS Client..."

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install Git first."
    exit 1
fi

# Check if we're already in a git repository
if [ -d ".git" ]; then
    echo "⚠️  Git repository already exists. Skipping initialization."
else
    # Initialize git repository
    echo "📁 Initializing git repository..."
    git init
fi

# Check git status
echo "📊 Checking git status..."
git status

echo ""
echo "✅ Git repository ready!"
echo ""
echo "🎯 Next steps:"
echo "1. Review the files to be committed: git status"
echo "2. Add all files: git add ."
echo "3. Make initial commit: git commit -m 'Initial commit: Working AIFS Client with secure credential management'"
echo "4. Add remote repository: git remote add origin <your-repo-url>"
echo "5. Push to remote: git push -u origin main"
echo ""
echo "📖 For detailed instructions, see README.md"
echo "🔒 For security information, see SECURITY.md"
