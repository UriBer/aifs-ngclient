# AIFS Commander TUI

A powerful Terminal User Interface for AIFS Commander - a cross-cloud file manager that supports local filesystems, AWS S3, Google Cloud Storage, Azure Blob Storage, and AIFS (AI-centric File System).

## Features

- **Dual-pane file browser** - Norton Commander-style interface
- **Cross-cloud support** - Local, S3, GCS, Azure, and AIFS storage
- **File operations** - Copy, move, delete, create directories
- **Provider configuration** - Easy setup for cloud storage providers
- **State persistence** - Remembers your last directories and selections
- **Keyboard shortcuts** - Efficient navigation and operations
- **Progress tracking** - Real-time status updates for operations

## Installation

### Global Installation
```bash
npm install -g aifs-commander-tui
```

### Local Installation
```bash
npm install aifs-commander-tui
```

## Usage

### Command Line Interface
```bash
# Start the TUI
aifs-tui

# Show help
aifs-tui --help

# Use custom configuration
aifs-tui --config ./my-config.json

# Show version
aifs-tui --version
```

### Programmatic Usage
```typescript
import { TuiApplication } from 'aifs-commander-tui';

const app = new TuiApplication({
  configPath: './config.json'
});

app.start().catch(console.error);
```

## Configuration

The TUI can be configured through a JSON file or environment variables:

```json
{
  "providers": {
    "aws": {
      "enabled": true,
      "region": "us-west-2"
    },
    "gcp": {
      "enabled": true,
      "projectId": "my-project"
    },
    "azure": {
      "enabled": true,
      "accountName": "mystorageaccount"
    },
    "aifs": {
      "enabled": true,
      "endpoint": "localhost:50052"
    }
  },
  "ui": {
    "theme": "dark",
    "showHiddenFiles": false
  }
}
```

## Keyboard Shortcuts

### Navigation
- `Tab` - Switch between panes
- `↑/↓` - Navigate files
- `Enter` - Open file/directory
- `Backspace` - Go to parent directory

### File Operations
- `F5` - Copy selected files
- `F6` - Move selected files
- `F8` - Delete selected files
- `F7` - Create new directory
- `Insert` - Select/deselect files

### Configuration
- `F9` - Open configuration menu
- `Ctrl+Q` - Quit application

## Provider Setup

### AWS S3
1. Configure AWS credentials via AWS CLI or environment variables
2. Enable S3 provider in configuration
3. Select S3 bucket in the file browser

### Google Cloud Storage
1. Configure GCP credentials via `gcloud auth application-default login`
2. Enable GCS provider in configuration
3. Select GCS bucket in the file browser

### Azure Blob Storage
1. Configure Azure credentials via Azure CLI
2. Enable Azure provider in configuration
3. Select Azure container in the file browser

### AIFS
1. Set AIFS endpoint in configuration
2. Provide authentication token if required
3. Connect to AIFS namespace in the file browser

## Development

### Building from Source
```bash
git clone https://github.com/aifs-ngclient/aifs-commander-tui.git
cd aifs-commander-tui
npm install
npm run build
```

### Running in Development
```bash
npm run dev
```

## API Reference

### TuiApplication

Main application class for the TUI.

```typescript
class TuiApplication {
  constructor(options?: {
    configPath?: string;
    theme?: 'light' | 'dark';
    showHiddenFiles?: boolean;
  });
  
  start(): Promise<void>;
  stop(): Promise<void>;
  getState(): ApplicationState;
  setState(state: ApplicationState): void;
}
```

### Configuration

```typescript
interface TuiConfig {
  providers: {
    aws?: AwsConfig;
    gcp?: GcpConfig;
    azure?: AzureConfig;
    aifs?: AifsConfig;
  };
  ui: {
    theme: 'light' | 'dark';
    showHiddenFiles: boolean;
  };
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

- GitHub Issues: https://github.com/aifs-ngclient/aifs-commander-tui/issues
- Documentation: https://github.com/aifs-ngclient/aifs-commander-tui#readme
- Email: team@aifs.dev
