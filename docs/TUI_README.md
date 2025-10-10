# AIFS Commander TUI

Terminal User Interface for AIFS Commander - A cross-platform file manager with support for multiple storage providers.

## Features

- **Dual-pane interface** - Navigate files in two panes simultaneously
- **Cross-platform support** - Works on Linux, macOS, and Windows
- **Multiple providers** - File system, S3, GCS, Azure, and more
- **Job management** - Monitor and manage background operations
- **Keyboard navigation** - Full keyboard support for efficient navigation
- **Configuration management** - Encrypted configuration storage
- **Comprehensive logging** - Detailed logging with rotation

## Installation

### Prerequisites

- Node.js 18.0.0 or higher
- npm (comes with Node.js)
- Terminal with at least 80x20 characters

### Setup

1. Navigate to the TUI directory:
   ```bash
   cd src/tui
   ```

2. Run the setup script:
   ```bash
   ./setup.sh
   ```

3. Build the TypeScript code:
   ```bash
   npm run build
   ```

4. Start the application:
   ```bash
   npm start
   ```

## Usage

### Navigation

- **Tab** - Switch between left and right panes
- **↑/↓** - Navigate file list
- **Enter** - Open directory or file
- **Backspace** - Go to parent directory
- **Home/End** - Go to first/last item
- **Page Up/Down** - Navigate by pages

### File Operations

- **F5** - Copy selected files
- **F6** - Move selected files
- **F7** - Create new directory
- **F8** - Delete selected files
- **F9** - Rename file/directory

### System Functions

- **F1** - Show help
- **F2** - Configuration
- **F3** - Toggle job panel
- **F10** - Quit application

### Job Management

- **Ctrl+J** - Show job manager
- **C** - Cancel selected job
- **R** - Retry failed job
- **Escape** - Hide job panel

## Configuration

Configuration is stored in `~/.aifs-commander/tui-config.json` and is encrypted for security.

### Key Configuration Options

```json
{
  "ui": {
    "theme": "dark",
    "paneLayout": "side-by-side",
    "viewMode": "list"
  },
  "performance": {
    "maxConcurrentJobs": 5,
    "memoryLimit": "2GB",
    "networkThrottle": "100MB/s"
  },
  "logging": {
    "level": "info",
    "maxFileSize": "10MB",
    "maxFiles": 5
  }
}
```

## Logging

Logs are written to `~/.aifs-commander/tui.log` with automatic rotation.

### Log Levels

- **ERROR** - Critical errors
- **WARN** - Warning conditions
- **INFO** - General information
- **DEBUG** - Detailed debugging
- **TRACE** - Very detailed information

## Development

### Project Structure

```
src/tui/
├── src/                 # TypeScript source files
│   ├── index.ts         # Main application entry point
│   ├── TuiApplication.ts # Main application class
│   └── types.ts         # Type definitions
├── dist/                # Compiled JavaScript output
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
└── setup.sh            # Setup script
```

### Building

```bash
npm run build
```

### Development Mode

```bash
npm run dev
```

### Testing

```bash
npm test
```

## Architecture

The TUI is built with TypeScript and includes:

- **TuiApplication** - Main application controller with full type safety
- **types.ts** - TypeScript interfaces and type definitions
- **blessed** - Terminal UI library for cross-platform support

## Supported Providers

### Phase 1 (Current)
- **File System** - Local file system access

### Future Phases
- **S3** - Amazon S3 storage
- **GCS** - Google Cloud Storage
- **Azure** - Azure Blob Storage
- **AIFS** - AI-Native File System
- **Databases** - BigQuery, Redshift, Synapse, etc.

## Troubleshooting

### Terminal Size Issues

If you see "Terminal too small" error:
- Resize your terminal to at least 80x20 characters
- Use a terminal emulator that supports resizing

### Configuration Issues

If configuration is corrupted:
1. Delete `~/.aifs-commander/tui-config.json`
2. Restart the application to create a new configuration

### Log Issues

If logging is not working:
1. Check write permissions for `~/.aifs-commander/` directory
2. Verify disk space is available
3. Check log level in configuration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
