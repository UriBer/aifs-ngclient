# AIFS Commander

A cross-cloud object management client with AIFS support, featuring both a modern Electron GUI and a powerful Terminal User Interface (TUI).

## 🚀 Features

### Cross-Cloud Storage Support
- **Local File System**: Native file operations
- **AWS S3**: Full S3 bucket management
- **Google Cloud Storage**: GCS bucket operations
- **Azure Blob Storage**: Azure storage management
- **AIFS**: AI-centric file system with gRPC API

### Dual Interface
- **Electron GUI**: Modern desktop application with React/TypeScript
- **Terminal UI**: Command-line interface for power users and servers

### Key Capabilities
- **Dual-Pane File Manager**: Norton Commander-style interface
- **Cross-Cloud Operations**: Copy, move, delete across different storage providers
- **Provider Configuration**: Easy setup for cloud storage credentials
- **State Persistence**: Remembers your last locations and selections
- **Job Management**: Background operations with progress tracking
- **CLI Integration**: Auto-detects AWS, GCP, and Azure CLI credentials

## 📦 Installation

### Option 1: Pre-built Distributions

Download the latest release for your platform:

- **macOS**: `AIFS Commander.dmg` (Intel & ARM64)
- **Windows**: `AIFS Commander Setup.exe` (x64)
- **Linux**: `aifs-commander.deb` (x64)

### Option 2: NPM Package (TUI Only) - Coming Soon

The Terminal User Interface will be available as a global npm package:

```bash
# When published:
npm install -g aifs-commander-tui
aifs-tui --help
```

**Note**: The npm package is ready for publishing but not yet published.

### Option 3: Build from Source

```bash
# Clone the repository
git clone https://github.com/UriBer/aifs-ngclient.git
cd aifs-ngclient

# Install dependencies
npm install

# Build the application
npm run build:all

# Start the Electron app
npm start

# Or run the TUI
npm run build:tui
cd src/tui && npm start
```

## 🖥️ Usage

### Electron GUI

Launch the desktop application:

```bash
npm start
```

**Keyboard Shortcuts:**
- `Tab`: Switch between panes
- `F5`: Refresh current pane
- `F6`: Move files
- `F7`: Create directory
- `F8`: Delete files
- `F9`: Configuration
- `F10`: Exit

### Terminal UI

Launch the command-line interface:

```bash
aifs-tui
```

**Navigation:**
- `↑/↓`: Navigate files
- `Enter`: Open file/enter directory
- `Tab`: Switch panes
- `F5`: Copy
- `F6`: Move
- `F7`: Create directory
- `F8`: Delete
- `F9`: Configuration
- `F10`: Exit

## ⚙️ Configuration

### Provider Setup

1. **AWS S3**:
   - Use AWS CLI: `aws configure`
   - Or configure manually in the app

2. **Google Cloud Storage**:
   - Use GCP CLI: `gcloud auth application-default login`
   - Or provide service account key

3. **Azure Blob Storage**:
   - Use Azure CLI: `az login`
   - Or provide connection string

4. **AIFS**:
   - Configure gRPC endpoint and credentials

### Configuration Files

- **Electron**: Settings stored in user data directory
- **TUI**: `~/.aifs-commander/config.json`

## 🛠️ Development

### Project Structure

```
aifs-commander/
├── src/
│   ├── main/                 # Electron main process
│   │   ├── providers/        # Storage provider implementations
│   │   └── proto/           # AIFS gRPC definitions
│   ├── renderer/            # Electron renderer process (React)
│   └── tui/                 # Terminal User Interface
├── packages/
│   └── aifs-commander-tui/   # NPM package for TUI
└── dist-electron/           # Built Electron distributions
```

### Build Commands

```bash
# Development
npm run dev                  # Start development mode
npm run dev:main            # Watch main process
npm run dev:renderer        # Watch renderer process

# Building
npm run build               # Build Electron app
npm run build:tui           # Build TUI package
npm run build:all           # Build everything

# Distribution
npm run dist:mac            # Build macOS distribution
npm run dist:win            # Build Windows distribution
npm run dist:linux          # Build Linux distribution
npm run dist:all            # Build all platforms
```

### TUI Package Development

The TUI is also available as a standalone npm package:

```bash
cd packages/aifs-commander-tui
npm install
npm run build
npm test
```

## 📚 API Reference

### Programmatic Usage

```typescript
import { TuiApplication } from 'aifs-commander-tui';

// Initialize TUI application
const app = new TuiApplication({
  configPath: './config.json'
});

// Start the application
app.start().catch(console.error);
```

### Provider Interface

```typescript
interface IObjectStore {
  listObjects(uri: string): Promise<ObjectInfo[]>;
  copyObject(src: string, dest: string): Promise<void>;
  moveObject(src: string, dest: string): Promise<void>;
  deleteObject(uri: string): Promise<void>;
  // ... more methods
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Setup

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run linting
npm run lint

# Build for development
npm run dev
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Repository**: [https://github.com/UriBer/aifs-ngclient](https://github.com/UriBer/aifs-ngclient)
- **TUI Package**: [https://www.npmjs.com/package/aifs-commander-tui](https://www.npmjs.com/package/aifs-commander-tui) (when published)
- **Issues**: [https://github.com/UriBer/aifs-ngclient/issues](https://github.com/UriBer/aifs-ngclient/issues)
- **Documentation**: [https://github.com/UriBer/aifs-ngclient#readme](https://github.com/UriBer/aifs-ngclient#readme)

## 🙏 Acknowledgments

- Built with [Electron](https://electronjs.org/)
- TUI powered by [blessed](https://github.com/chjj/blessed)
- Cross-platform builds with [electron-builder](https://www.electron.build/)
- TypeScript for type safety
- React for the modern GUI

---

**AIFS Commander** - Manage your files across any cloud, anywhere, anytime.
