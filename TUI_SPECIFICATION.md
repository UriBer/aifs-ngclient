# AIFS Commander TUI - Complete Specification

**Version:** 1.0.0  
**Last Updated:** October 14, 2025

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [User Interface](#user-interface)
4. [Cloud Providers](#cloud-providers)
5. [Keyboard Shortcuts](#keyboard-shortcuts)
6. [File Operations](#file-operations)
7. [Configuration Management](#configuration-management)
8. [Security Features](#security-features)
9. [CLI Integration](#cli-integration)
10. [Error Handling](#error-handling)
11. [Installation & Usage](#installation--usage)

---

## Overview

AIFS Commander TUI is a dual-pane file manager for the terminal that provides seamless access to multiple cloud storage providers and local file systems. Inspired by Norton Commander, it offers an intuitive interface for managing files across different storage backends.

### Key Features

- **Dual-Pane Interface**: Norton Commander-style layout with two independent file browser panes
- **Multi-Cloud Support**: AWS S3, Google Cloud Storage, Azure Blob Storage, AIFS, and local file system
- **Encrypted Configuration**: AES-256-CBC encryption for all stored credentials
- **CLI Integration**: Auto-configuration from AWS CLI, GCP CLI, and Azure CLI
- **Real-time Operations**: Copy, move, delete files across different cloud providers
- **Resizable Panes**: Adjustable divider between panes
- **Overlay Mode**: Toggle between full-screen and transparent terminal view
- **State Persistence**: Saves current location and selections between sessions

---

## System Architecture

### Core Components

#### 1. **TuiApplication** (`src/tui/src/TuiApplication.ts`)
Main application class managing the UI and user interactions.

- Screen rendering using blessed.js
- Dual-pane file browser
- Keyboard event handling
- Provider switching
- State management

#### 2. **ProviderManager** (`src/tui/src/ProviderManager.ts`)
Manages different storage providers and their operations.

- URI routing (file://, s3://, gcs://, az://, aifs://)
- Provider-specific list operations
- File operations (copy, move, delete, mkdir)
- Cloud SDK integration

#### 3. **ConfigManager** (`src/tui/src/ConfigManager.ts`)
Handles configuration storage and encryption.

- AES-256-CBC encryption for credentials
- JSON configuration storage
- Provider configuration management
- Secure key management

#### 4. **ConfigUI** (`src/tui/src/ConfigUI.ts`)
Configuration interface for managing provider settings.

- Provider credential configuration
- Connection testing
- Settings management
- CLI credential detection

#### 5. **StateManager** (`src/tui/src/StateManager.ts`)
Persists UI state between sessions.

- Current directory tracking
- Selected items preservation
- Navigation history

#### 6. **CliCredentialManager** (`src/tui/src/CliCredentialManager.ts`)
Loads credentials from cloud provider CLI tools.

- AWS CLI (`~/.aws/credentials`, `~/.aws/config`)
- GCP CLI (`~/.config/gcloud/`)
- Azure CLI (`~/.azure/`)

---

## User Interface

### Layout

```
┌────────────────────────────────────────────────────────────────────┐
│ AIFS Commander TUI                                                 │
├─────────────────────────────────┬──────────────────────────────────┤
│ Left Pane                       │ Right Pane                       │
│ ┌─────────────────────────────┐ │ ┌────────────────────────────┐  │
│ │ .. (parent directory)       │ │ │ .. (parent directory)      │  │
│ │ 📁 folder1/                 │ │ │ 📁 folder2/                │  │
│ │ 📁 folder2/                 │ │ │ 📄 file1.txt               │  │
│ │ 📄 file.txt                 │ │ │ 📄 file2.txt               │  │
│ └─────────────────────────────┘ │ └────────────────────────────┘  │
├─────────────────────────────────┴──────────────────────────────────┤
│ Status: Local File System | DIR /Users/user | Press F1 for help    │
└────────────────────────────────────────────────────────────────────┘
```

### Visual Elements

#### Pane Styles
- **Active Pane**: Bold blue border, white background, black text
- **Inactive Pane**: Dark gray border, white background, black text
- **Selected Item**: Blue background, white text
- **Multi-selected Items**: Checkmark (✓) prefix

#### Icons
- 📁 Directory
- 📄 File
- ✓ Selected item
- ✗ Error indicator
- ✅ Success indicator

#### Status Bar
- Current provider
- Current directory
- Operation status
- Help hint
- Overlay mode indicator

---

## Cloud Providers

### Supported Providers

#### 1. **Local File System**
- **Scheme**: `file://`
- **Description**: Local file system access
- **Credentials**: None required
- **Features**: Full read/write access to local files

#### 2. **Amazon S3**
- **Scheme**: `s3://`
- **Description**: Amazon Simple Storage Service
- **Credentials**: Access Key ID, Secret Access Key, Region
- **Features**: 
  - List buckets
  - Navigate bucket contents
  - Copy/move/delete objects
  - Directory operations with prefixes
- **CLI Integration**: AWS CLI auto-configuration
- **Configuration**:
  ```json
  {
    "accessKeyId": "AKIA...",
    "secretAccessKey": "...",
    "region": "us-east-1",
    "bucket": "optional-default-bucket"
  }
  ```

#### 3. **Google Cloud Storage**
- **Scheme**: `gcs://`
- **Description**: Google Cloud Storage
- **Credentials**: Project ID, Key Filename
- **Features**: 
  - List buckets
  - Navigate bucket contents
  - Copy/move/delete objects
  - Permission-aware error handling
- **CLI Integration**: GCP CLI auto-configuration
- **Configuration**:
  ```json
  {
    "projectId": "my-project",
    "keyFilename": "/path/to/key.json",
    "bucket": "optional-default-bucket"
  }
  ```

#### 4. **Azure Blob Storage**
- **Scheme**: `az://`
- **Description**: Microsoft Azure Blob Storage
- **Credentials**: Connection String OR Account Name/Key
- **Features**: 
  - List containers
  - Navigate container contents
  - Copy/move/delete blobs
- **CLI Integration**: Azure CLI auto-configuration
- **Configuration**:
  ```json
  {
    "connectionString": "DefaultEndpointsProtocol=https;...",
    "accountName": "myaccount",
    "accountKey": "...",
    "containerName": "optional-default-container"
  }
  ```

#### 5. **AIFS (AI-centric File System)**
- **Scheme**: `aifs://`
- **Description**: AI-Native File System with gRPC API
- **Credentials**: Endpoint, Auth Token
- **Features**: 
  - Custom file system operations
  - AI-enhanced metadata
  - gRPC-based communication
- **Configuration**:
  ```json
  {
    "endpoint": "localhost:50052",
    "authToken": "optional-token"
  }
  ```

### Provider URI Scheme

Each provider uses a specific URI scheme for navigation:

```
file:///Users/username/Documents
s3://bucket-name/folder/file.txt
gcs://bucket-name/folder/file.txt
az://container-name/folder/file.txt
aifs://directory/folder/file.txt
```

---

## Keyboard Shortcuts

### Navigation

| Key | Action |
|-----|--------|
| `Tab` | Switch between left and right panes |
| `↑` / `↓` | Navigate file list |
| `Enter` | Open directory or file with default application |
| `Click` | Open directory or file with default application |
| `Backspace` | Go to parent directory |
| `Space` | Toggle file selection (multi-select) |

### File Operations

| Key | Action |
|-----|--------|
| `F5` | Copy selected files to other pane |
| `F6` | Move selected files to other pane |
| `F7` | Create new directory |
| `F8` | Delete selected files |

### Provider Management

| Key | Action |
|-----|--------|
| `P` | Switch provider for current pane |
| `F9` | Open configuration panel |

### Pane Resizing

| Key | Action |
|-----|--------|
| `Ctrl+←` | Move divider left (shrink left pane) |
| `Ctrl+→` | Move divider right (shrink right pane) |
| `Ctrl+R` | Reset divider to center (50/50) |

### System

| Key | Action |
|-----|--------|
| `F1` | Show help screen |
| `F10` | Quit application |
| `F12` | Toggle overlay mode (show/hide terminal content) |
| `Ctrl+C` | Quit application |

### Configuration Panel

| Key | Action |
|-----|--------|
| `E` | Enable/Disable provider |
| `C` | Configure credentials |
| `R` | Rename provider |
| `S` | Configure settings |
| `T` | Test connection |
| `D` | Delete configuration |
| `A` | Auto-configure from CLI |
| `ESC` | Close configuration panel |

---

## File Operations

### Copy (F5)

**Behavior**:
- Copies selected file(s) from active pane to inactive pane's current directory
- Supports cross-provider copying (e.g., local to S3)
- Recursive directory copying
- Shows progress in status bar

**Supported**:
- ✅ File → File
- ✅ Directory → Directory (recursive)
- ✅ Local → Cloud
- ✅ Cloud → Local
- ✅ Cloud → Cloud

### Move (F6)

**Behavior**:
- Moves selected file(s) from active pane to inactive pane's current directory
- Deletes source after successful copy
- Supports cross-provider moves
- Recursive directory moves

**Supported**:
- ✅ File → File
- ✅ Directory → Directory (recursive)
- ✅ Local → Cloud
- ✅ Cloud → Local
- ✅ Cloud → Cloud

### Delete (F8)

**Behavior**:
- Deletes selected file(s) or directory
- Prompts for confirmation
- Recursive directory deletion
- Shows progress in status bar

**Supported**:
- ✅ Local files/directories
- ✅ Cloud objects/prefixes
- ✅ Recursive deletion

### Create Directory (F7)

**Behavior**:
- Prompts for directory name
- Creates directory in active pane's current location
- Updates pane automatically

**Supported**:
- ✅ Local file system
- ✅ Cloud providers (as prefixes)

### Open File (Enter)

**Behavior**:
- Directories: Navigate into directory
- Files: Open with system default application (local files only)
- Uses `open` (macOS), `xdg-open` (Linux), `start` (Windows)

---

## Configuration Management

### Configuration Storage

**Location**: `~/.aifs-commander/config.json.enc`

**Encryption**: AES-256-CBC with scrypt-derived key

**Key Storage**: `~/.aifs-commander/key` (mode 0600, restricted to owner)

### Configuration Structure

```json
{
  "providers": [
    {
      "id": "unique-id",
      "name": "Provider Name",
      "scheme": "s3|gcs|az|aifs|file",
      "enabled": true,
      "credentials": {
        // Provider-specific credentials
      },
      "settings": {
        // Provider-specific settings
      }
    }
  ],
  "lastUpdated": 1697328000000,
  "version": "1.0.0"
}
```

### Configuration UI

**Access**: Press `F9` to open configuration panel

**Features**:
- List all providers with status indicators
- Configure credentials securely
- Test connections before enabling
- Delete configurations
- Auto-configure from CLI credentials
- Credential masking (shows *****)

**Provider Status Indicators**:
- ✅ Enabled and configured
- ❌ Disabled or not configured
- ✓ CLI credentials available
- ✗ No CLI credentials found

---

## Security Features

### Encryption

**Algorithm**: AES-256-CBC

**Key Derivation**: scrypt with salt
- N: 2^14 (16384)
- r: 8
- p: 1
- Key length: 32 bytes

**Storage**:
- Encrypted config: `~/.aifs-commander/config.json.enc`
- Encryption key: `~/.aifs-commander/key` (0600 permissions)

### Credential Protection

1. **In-Memory**: Credentials loaded only when needed
2. **Display**: Masked with ***** in UI
3. **Storage**: Always encrypted at rest
4. **Transmission**: Direct SDK usage (HTTPS/TLS)

### File Permissions

```
~/.aifs-commander/          # drwx------ (700)
~/.aifs-commander/key       # -rw------- (600)
~/.aifs-commander/config.json.enc  # -rw-r--r-- (644)
```

---

## CLI Integration

### Auto-Configuration

**Command**: `aifs-tui --auto-configure-cli`

**Environment Variable**: `AUTO_CONFIGURE_CLI=1`

**Behavior**:
- Scans for AWS CLI credentials (`~/.aws/credentials`, `~/.aws/config`)
- Scans for GCP CLI credentials (`~/.config/gcloud/`)
- Scans for Azure CLI credentials (`~/.azure/`)
- Creates or updates provider configurations
- Enables providers with valid credentials

### AWS CLI Integration

**Files Scanned**:
- `~/.aws/credentials` → Access keys
- `~/.aws/config` → Regions and settings

**Extracted**:
- Access Key ID
- Secret Access Key
- Region (default: us-east-1)

### GCP CLI Integration

**Files Scanned**:
- `~/.config/gcloud/configurations/config_default`
- `~/.config/gcloud/application_default_credentials.json`

**Extracted**:
- Project ID
- Key filename/credentials

### Azure CLI Integration

**Files Scanned**:
- `~/.azure/azureProfile.json`
- `~/.azure/clouds.config`

**Extracted**:
- Subscription ID
- Tenant ID
- Account information

---

## Error Handling

### Provider Errors

**S3 Errors**:
- Invalid credentials → Show error message
- Permission denied → Show access error
- Bucket not found → Show bucket error
- Network timeout → Show network error

**GCS Errors**:
- Permission denied (403) → Show "Insufficient GCP permissions" with guidance
- Invalid project → Show project error
- Bucket access denied → Show bucket permission error

**Azure Errors**:
- Connection string invalid → Show configuration error
- Container not found → Show container error
- Network issues → Show network error

**AIFS Errors**:
- Endpoint unreachable → Show connection error
- Auth token invalid → Show authentication error
- Protocol errors → Show protocol error

### Graceful Degradation

1. **Provider Unavailable**: Continue with other providers
2. **Permission Denied**: Show error, allow retry
3. **Network Errors**: Display error message, retry option
4. **Invalid Configuration**: Disable provider, show config UI

### Error Display

- **Status Bar**: Temporary error messages (3 seconds)
- **Error Color**: Red text on blue background (readable)
- **Help Text**: Actionable guidance in errors
- **Logging**: Console debug logs for troubleshooting

---

## Installation & Usage

### Installation

```bash
# Install from npm
npm install -g @aifs/commander-tui

# Or run locally
npm install
npm run build
npm start
```

### Command Line Options

```bash
# Show help
aifs-tui --help

# Show version
aifs-tui --version

# Use custom configuration
aifs-tui --config /path/to/config.json

# Auto-configure from CLI
aifs-tui --auto-configure-cli

# Force TUI mode (non-terminal)
FORCE_TUI=1 aifs-tui
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `AUTO_CONFIGURE_CLI` | Auto-configure providers from CLI (1 to enable) |
| `FORCE_TUI` | Force TUI mode in non-terminal environments (1 to enable) |

### Examples

```bash
# Start with default settings
aifs-tui

# Start and auto-configure from AWS/GCP/Azure CLI
aifs-tui --auto-configure-cli

# Use custom configuration file
aifs-tui --config ./my-config.json

# Force TUI mode for debugging
FORCE_TUI=1 aifs-tui
```

---

## State Persistence

### Saved State

**Location**: `~/.aifs-commander/state.json`

**Contents**:
```json
{
  "leftUri": "s3://my-bucket/",
  "rightUri": "/Users/username/Documents",
  "leftSelected": 3,
  "rightSelected": 0,
  "dividerPosition": 50,
  "lastUpdated": 1697328000000
}
```

**Behavior**:
- Saves on every navigation
- Restores on startup
- Preserves pane positions
- Maintains selection indices

---

## Overlay Mode

### Feature Description

Toggle between normal mode and overlay mode to view terminal content behind the TUI.

### States

1. **Normal Mode** (Default):
   - Solid background covers terminal
   - TUI fully visible
   - Terminal content hidden

2. **Overlay Mode** (F12):
   - Transparent background
   - TUI visible over terminal
   - Terminal content visible behind

### Use Cases

- Viewing terminal logs while using TUI
- Debugging with terminal output visible
- Multi-tasking with terminal commands

### Toggle

- Press `F12` to toggle
- Status bar shows current mode
- Help text updated with F12 instruction

---

## Advanced Features

### Directory Navigation History

- **Back Navigation**: Backspace returns to parent
- **History Stack**: Per-pane navigation history
- **Position Memory**: Remembers cursor position in directories

### File Selection

- **Single Select**: Click or Enter on item
- **Multi-Select**: Space to toggle selection
- **Visual Indicator**: ✓ prefix for selected items
- **Cross-Pane**: Independent selection per pane

### Filename Display

- **Truncation**: Long names truncated with `...`
- **Dynamic**: Adapts to pane width
- **Encoding**: Handles URL-encoded and Unicode filenames
- **Icons**: Directory (📁) and File (📄) icons

### Pane Resizing

- **Adjustable Divider**: Ctrl+← / Ctrl+→
- **Percentage-Based**: Stored as percentage of screen width
- **Reset**: Ctrl+R resets to 50/50
- **Persistent**: Saved in state.json

---

## Technical Requirements

### Dependencies

```json
{
  "blessed": "^0.1.81",
  "@aws-sdk/client-s3": "^3.x",
  "@google-cloud/storage": "^7.x",
  "@azure/storage-blob": "^12.x",
  "@grpc/grpc-js": "^1.x",
  "@grpc/proto-loader": "^0.7.x"
}
```

### Platform Support

- **macOS**: ✅ Full support
- **Linux**: ✅ Full support
- **Windows**: ⚠️ Limited (terminal limitations)

### Node.js Version

- **Minimum**: Node.js 18.x
- **Recommended**: Node.js 20.x or later

### Terminal Requirements

- **Terminal Emulator**: xterm-compatible
- **Colors**: 256-color support recommended
- **Unicode**: UTF-8 support required
- **Dimensions**: Minimum 80x24, recommended 120x30+

---

## Troubleshooting

### Common Issues

**Q: TUI shows black screen or doesn't render**
- Ensure terminal supports 256 colors
- Check terminal size (minimum 80x24)
- Try `FORCE_TUI=1 aifs-tui`

**Q: AWS/GCP credentials not detected**
- Verify CLI is installed and configured
- Check `~/.aws/credentials` or `~/.config/gcloud/`
- Run with `--auto-configure-cli` flag

**Q: Permission errors with GCP**
- Verify service account permissions
- Check IAM roles (storage.buckets.list)
- Review project settings

**Q: Files don't open with default application**
- Only works for local files
- Ensure default application is configured
- Check file permissions

---

## Future Enhancements

### Planned Features

- [ ] File preview pane
- [ ] Bulk operations with progress bars
- [ ] Bookmark management
- [ ] File search functionality
- [ ] Transfer queue management
- [ ] Compressed file support
- [ ] Remote editing
- [ ] Diff viewer
- [ ] File versioning (S3/GCS)
- [ ] CloudFront/CDN integration

---

## License

MIT License - See LICENSE file for details

## Support

- **GitHub**: https://github.com/aifs-ngclient/aifs-commander
- **Issues**: https://github.com/aifs-ngclient/aifs-commander/issues
- **Documentation**: https://github.com/aifs-ngclient/aifs-commander/wiki

---

*Last Updated: October 14, 2025*

