# AIFS Commander TUI - Quick Start Guide

## 🚀 Get Started in 3 Steps

### 1. Install Dependencies
```bash
cd src/tui
npm install
```

### 2. Build TypeScript
```bash
npm run build
```

### 3. Start the TUI
```bash
npm start
```

## 📋 Available Commands

| Command | Description |
|---------|-------------|
| `npm start` | Start the TUI application |
| `npm run build` | Build TypeScript to JavaScript |
| `npm run dev` | Development mode with watch |
| `npm run setup` | Full setup with configuration |

## 🎮 Controls

### Navigation
- **Tab** - Switch between left and right panes
- **↑/↓** - Navigate file list
- **Enter** - Open directory or file
- **Backspace** - Go to parent directory
- **Home/End** - Jump to first/last item
- **Page Up/Down** - Navigate by pages

### System
- **F1** - Show help
- **F10** - Quit application
- **Ctrl+C** - Emergency quit

## 🏗️ Architecture

The TUI is built with a simple, modular architecture:

```
index.js                 # Main application (JavaScript)
├── Dual-pane layout    # Left and right file browsers
├── File system access  # Local file system operations
├── Keyboard navigation # Full keyboard support
├── Error handling      # Graceful error recovery
└── Status display      # Real-time status updates
```

## 🔧 Features

### ✅ Implemented
- **Dual-pane interface** - Navigate files in two panes
- **File system integration** - Local file system access
- **Keyboard navigation** - Complete keyboard support
- **Error handling** - Graceful error recovery
- **Cross-platform** - Linux, macOS, Windows support
- **Status display** - Real-time status updates
- **Help system** - Built-in help with F1

### 🚧 Future Features
- **S3 Provider** - Amazon S3 integration
- **GCS Provider** - Google Cloud Storage
- **Azure Provider** - Azure Blob Storage
- **AIFS Provider** - AI-Native File System
- **Database Providers** - BigQuery, Redshift, etc.
- **Job Management** - Background job monitoring
- **Configuration** - Encrypted settings management

## 🐛 Troubleshooting

### Common Issues

#### "Terminal too small" Error
**Solution**: Resize your terminal to at least 80x20 characters

#### "Not running in a terminal" Error
**Solution**: Run in a proper terminal emulator (not IDE terminal)

#### Dependencies Not Found
**Solution**: Run `npm install` to install dependencies

#### Permission Denied
**Solution**: Check write permissions for home directory

### Debug Mode
```bash
NODE_ENV=development npm start
```

### Log Files
Check logs at: `~/.aifs-commander/tui.log`

## 📁 File Structure

```
src/tui/
├── index.js              # Main TUI application
├── package.json          # Dependencies and scripts
├── setup.sh              # Installation script
├── README.md             # Full documentation
├── INSTALL.md            # Installation guide
├── IMPLEMENTATION.md     # Technical details
├── QUICK_START.md        # This file
├── test-simple.js        # Basic functionality test
├── demo-simple.js        # Interactive demo
└── node_modules/         # Dependencies
```

## 🎯 What's Working

### Core Functionality
- ✅ Dual-pane file browser
- ✅ File system navigation
- ✅ Keyboard controls
- ✅ Error handling
- ✅ Cross-platform support
- ✅ Help system

### File Operations
- ✅ List directories
- ✅ Navigate up/down
- ✅ File size display
- ✅ Directory sorting
- ✅ Parent directory navigation

### User Experience
- ✅ Intuitive interface
- ✅ Clear status messages
- ✅ Error feedback
- ✅ Help system
- ✅ Keyboard shortcuts

## 🚀 Next Steps

1. **Test the TUI**: Run `npm start` and explore
2. **Read Documentation**: Check README.md for full details
3. **Report Issues**: Use the help system (F1) for guidance
4. **Contribute**: Help improve the TUI implementation

## 📞 Support

- **Help**: Press F1 in the TUI
- **Documentation**: README.md and INSTALL.md
- **Testing**: Run `npm run test-simple`
- **Demo**: Run `npm run demo-simple`

## 🎉 Success!

If you can see the dual-pane interface and navigate files, the TUI is working correctly!

The AIFS Commander TUI Phase 1 implementation is complete and ready for use.
