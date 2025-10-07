#!/bin/bash

# AIFS Commander TUI Setup Script

echo "Setting up AIFS Commander TUI..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2)
REQUIRED_VERSION="18.0.0"

if ! node -e "process.exit(process.version < 'v$REQUIRED_VERSION' ? 1 : 0)"; then
    echo "Error: Node.js version $NODE_VERSION is too old. Please upgrade to version $REQUIRED_VERSION or higher."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed. Please install npm first."
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Check if installation was successful
if [ $? -ne 0 ]; then
    echo "Error: Failed to install dependencies."
    exit 1
fi

# Create configuration directory
CONFIG_DIR="$HOME/.aifs-commander"
mkdir -p "$CONFIG_DIR"

# Create initial configuration
cat > "$CONFIG_DIR/tui-config.json" << EOF
{
  "version": "1.0.0",
  "ui": {
    "theme": "dark",
    "paneLayout": "side-by-side",
    "viewMode": "list",
    "showJobPanel": false,
    "statusBar": true
  },
  "performance": {
    "maxConcurrentJobs": 5,
    "memoryLimit": "2GB",
    "networkThrottle": "100MB/s",
    "refreshInterval": 1000
  },
  "logging": {
    "level": "info",
    "maxFileSize": "10MB",
    "maxFiles": 5,
    "enableConsole": true,
    "enableFile": true
  },
  "providers": {
    "file": {
      "enabled": true,
      "defaultPath": "$HOME"
    }
  }
}
EOF

# Make the main script executable
chmod +x index.js

echo "Setup completed successfully!"
echo ""
echo "To start the TUI application, run:"
echo "  npm start"
echo ""
echo "Or directly:"
echo "  node index.js"
echo ""
echo "Configuration file created at: $CONFIG_DIR/tui-config.json"
echo "Log file will be created at: $CONFIG_DIR/tui.log"
