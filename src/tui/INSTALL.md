# AIFS Commander TUI Installation Guide

## Quick Start

### 1. Prerequisites

- **Node.js 18.0.0 or higher**
  - Download from [nodejs.org](https://nodejs.org/)
  - Verify installation: `node --version`

- **Terminal with at least 80x20 characters**
  - Linux: Most terminals work (gnome-terminal, konsole, xterm, etc.)
  - macOS: Terminal.app, iTerm2
  - Windows: PowerShell, Command Prompt, Windows Terminal

### 2. Installation

```bash
# Navigate to the TUI directory
cd src/tui

# Run the setup script
./setup.sh

# Or manually install dependencies
npm install
```

### 3. Start the Application

```bash
# Start the TUI
npm start

# Or directly
node index.js
```

## Manual Installation

If the setup script doesn't work:

### 1. Install Dependencies

```bash
npm install blessed blessed-contrib chalk commander inquirer ora table yargs
```

### 2. Create Configuration Directory

```bash
mkdir -p ~/.aifs-commander
```

### 3. Create Initial Configuration

```bash
cat > ~/.aifs-commander/tui-config.json << 'EOF'
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
      "defaultPath": "~"
    }
  }
}
EOF
```

### 4. Test Installation

```bash
# Test basic requirements
npm run test-tui

# Run demo
npm run demo
```

## Platform-Specific Notes

### Linux

- **Ubuntu/Debian**: `sudo apt install nodejs npm`
- **CentOS/RHEL**: `sudo yum install nodejs npm`
- **Arch**: `sudo pacman -S nodejs npm`
- **Terminal**: Most terminals work, but gnome-terminal and konsole are recommended

### macOS

- **Homebrew**: `brew install node`
- **Terminal**: Terminal.app works, but iTerm2 is recommended for better experience
- **Xcode**: May need Xcode command line tools: `xcode-select --install`

### Windows

- **Node.js**: Download from [nodejs.org](https://nodejs.org/)
- **Terminal**: Windows Terminal is recommended over Command Prompt
- **PowerShell**: Use PowerShell for better experience
- **WSL**: Windows Subsystem for Linux works well

## Troubleshooting

### Common Issues

#### 1. "Terminal too small" Error

**Problem**: Terminal size is less than 80x20 characters

**Solution**: Resize your terminal window to at least 80x20 characters

#### 2. "Not running in a terminal" Error

**Problem**: Running in a non-terminal environment

**Solution**: Run the application in a proper terminal emulator

#### 3. Node.js Version Too Old

**Problem**: Node.js version is less than 18.0.0

**Solution**: Upgrade Node.js to version 18.0.0 or higher

#### 4. Dependencies Not Found

**Problem**: `blessed` or other dependencies not found

**Solution**: Run `npm install` to install dependencies

#### 5. Permission Denied

**Problem**: Cannot create configuration directory

**Solution**: Check write permissions for home directory

### Debug Mode

Run with debug logging:

```bash
NODE_ENV=development npm start
```

### Log Files

Check log files for errors:

```bash
# View log file
cat ~/.aifs-commander/tui.log

# View recent logs
tail -f ~/.aifs-commander/tui.log
```

### Configuration Issues

If configuration is corrupted:

```bash
# Remove corrupted configuration
rm ~/.aifs-commander/tui-config.json

# Restart to create new configuration
npm start
```

## Development

### Building from Source

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run in development mode
npm run dev
```

### Testing

```bash
# Run tests
npm test

# Test TUI requirements
npm run test-tui
```

## Support

If you encounter issues:

1. Check the log file: `~/.aifs-commander/tui.log`
2. Verify terminal size: at least 80x20 characters
3. Check Node.js version: `node --version`
4. Test basic functionality: `npm run test-tui`

## Uninstallation

To remove the TUI:

```bash
# Remove configuration
rm -rf ~/.aifs-commander

# Remove dependencies (if not shared)
cd src/tui
npm uninstall
```
