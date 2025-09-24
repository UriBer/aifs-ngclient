# AIFS Client (Commander)

A cross-cloud object management client that provides a unified interface for working with files across different storage providers, including local file system, cloud storage (S3, GCS, Azure), and the AI-Native File System (AIFS).

## 🚀 Quick Start

The application is now working with Electron Forge! 

**📖 For detailed setup instructions, see [GETTING_STARTED.md](GETTING_STARTED.md)**  
**🔒 For security details, see [SECURITY.md](SECURITY.md)**  
**🎯 For Norton Commander UI details, see [NORTON_COMMANDER_UI.md](NORTON_COMMANDER_UI.md)**

### Prerequisites

- Node.js (v16 or later)
- npm or yarn
- AWS CLI (for S3 testing) - optional

### Installation & Setup

**Option 1: Automated Setup**
```bash
./setup.sh
cd working-electron-app
npm start
```

**Option 2: Manual Setup**
```bash
cd working-electron-app
npm install
npm start
```

That's it! The application should launch with a clean interface ready for testing.

## 🎯 Current Status

✅ **Working Features:**

**🎯 Core File Management:**
- **Norton Commander UI** - Classic dual-pane file manager interface with authentic blue theme
- **Cross-Cloud Support** - Local file system, AWS S3, Google Cloud Storage
- **File Viewing** - Double-click files to open with system default application
- **Cloud File Downloads** - Automatic download of cloud files to temp folder (~/.aifs-temp)
- **Progress Tracking** - Visual progress bars for downloads, copies, and long operations
- **Drag & Drop** - Drag files between panes (hold Shift to move instead of copy)
- **Resizable Panes** - Drag divider to resize left/right panes dynamically

**⌨️ Navigation & Selection:**
- **Smart Pane Switching** - Focus management with history tracking per pane
- **Multiple Selection** - Ctrl+Click, Shift+Click, Space bar, and Ctrl+A selection
- **Keyboard Navigation** - Complete keyboard-driven interface with Escape key support
- **File Filters** - Filter by name, type, size, and date with debounced notifications
- **Context Menus** - Right-click file operations with comprehensive options

**🔒 Security & Configuration:**
- **Secure credential management** with AES-256 encryption and master password protection
- **Multiple Credential Sources** - AWS CLI, environment variables, or manual entry
- **State Persistence** - Remembers your location and settings across sessions
- **Encrypted Configuration** - All sensitive data encrypted with master password

**🤖 AI & Advanced Features:**
- **AI Integration** - OpenAI and Anthropic AI search capabilities
- **Plugin System** - Extensible architecture for custom features
- **Theme System** - Classic Norton Commander, Modern Dark, and Light themes
- **International Support** - RTL languages (Hebrew, Arabic) and multilanguage text
- **File Viewer** - Built-in viewer for text, markdown, and image files with RTL support

**📊 Operations & Feedback:**
- **Job Management System** - Real-time progress tracking and comprehensive notifications
- **Enhanced Notifications** - Detailed operation feedback with file details and collapse option
- **Command History** - Track all operations with source/destination details
- **Cross-Provider Operations** - Copy, move between different storage types
- **Comprehensive Help** - F1 help dialog with all features, shortcuts, and GitHub repository info

🔒 **Security Features:**
- **Encrypted credential storage** using AES-256-CBC encryption
- **Master password protection** with PBKDF2 key derivation
- **Secure credential handling** - no plain text storage
- **Automatic credential detection** from multiple sources
- **Memory-safe operations** - passwords cleared after use

## 🔧 Testing AWS S3 Operations

### 1. Set up AWS Credentials

The application supports multiple secure methods for AWS credential management:

**Option 1: Environment Variables (Most Secure)**
```bash
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_REGION="us-east-1"
```

**Option 2: AWS CLI Configuration**
```bash
aws configure
# Credentials will be automatically detected from ~/.aws/credentials
```

**Option 3: Encrypted App Configuration (New!)**
1. Click "Configure AWS" in the application
2. Set a master password for encryption
3. Enter your AWS credentials
4. Credentials are encrypted and stored securely

**Option 4: IAM Roles (for EC2/ECS)**
- No configuration needed - uses instance/container roles automatically

### 2. Test S3 Functionality

The application provides several test buttons:

- **"Test S3 Connection"** - Tests basic S3 connectivity
- **"List S3 Buckets"** - Lists all your S3 buckets
- **"Create Test Bucket"** - Creates a test S3 bucket
- **"Configure AWS"** - Opens secure credential configuration dialog

### 3. Check Console for Details

Open the browser console (F12) to see detailed logs and any error messages.

## 🔒 Security

### Credential Protection

The AIFS Client implements enterprise-grade security for credential management:

- **AES-256-CBC Encryption**: All stored credentials are encrypted using industry-standard encryption
- **Master Password Protection**: Credentials require a master password to decrypt
- **PBKDF2 Key Derivation**: 100,000 iterations with SHA-256 for secure key generation
- **Random Salt & IV**: Unique salt and initialization vector for each encryption
- **Memory Safety**: Master passwords are cleared from memory after use
- **No Plain Text Storage**: Credentials are never stored in plain text

### Supported Credential Sources (in priority order)

1. **Environment Variables** - Most secure, no local storage
2. **AWS CLI Configuration** - Uses AWS's own security mechanisms
3. **Encrypted App Configuration** - Protected by master password
4. **IAM Roles** - For cloud environments (EC2, ECS, Lambda)

### Security Best Practices

- Use environment variables when possible
- Set strong master passwords (12+ characters)
- Regularly rotate AWS credentials
- Never share master passwords
- Use IAM roles in cloud environments

## 📁 Project Structure

```
working-electron-app/
├── src/
│   ├── index.js              # Main Electron process
│   ├── preload.js            # Preload script for secure API exposure
│   ├── index.html            # Modern UI with security dialogs
│   ├── config/               # Configuration management
│   │   └── aws-config.js     # Encrypted AWS credential management
│   ├── providers/            # Storage provider implementations
│   │   ├── FileProvider.js   # Local file system operations
│   │   └── S3Provider.js     # AWS S3 operations with encryption
│   └── jobs/
│       └── JobEngine.js      # Asynchronous job management
├── package.json              # Dependencies and scripts
└── forge.config.js           # Electron Forge configuration
```

## 🛠️ Available Scripts

- `npm start` - Start the application in development mode
- `npm run package` - Package the application for distribution
- `npm run make` - Create distributables for your platform
- `npm run lint` - Run ESLint (if configured)

## 🔌 Supported Storage Providers

### FileProvider (Local Files)
- **URI Format:** `file:///path/to/file`
- **Operations:** list, stat, get, put, delete, copy, move, mkdir, exists

### S3Provider (AWS S3)
- **URI Format:** `s3://bucket-name/path/to/object`
- **Operations:** list, stat, get, put, delete, copy, move, mkdir, exists
- **Features:** 
  - Automatic credential detection
  - Multipart upload support
  - Cross-bucket operations
  - 5GB limit for atomic copy operations

## 🎨 UI Features

The current interface includes:

- **Status Display** - Shows operation results and errors
- **Test Controls** - Buttons to test different operations
- **File List** - Displays operation results
- **Console Integration** - Detailed logging for debugging

## ⌨️ Keyboard Shortcuts & Usage

### 🎮 Navigation
| Key | Action |
|-----|--------|
| **Arrow Keys** | Navigate through files and directories |
| **Tab** | Switch between left and right panes |
| **Enter** | Open selected file/directory |
| **Escape** | Close dialogs and menus |

### 🖱️ File Selection
| Key Combination | Action |
|----------------|--------|
| **Space** | Toggle selection of focused file |
| **Ctrl+A** | Select all files in current pane |
| **Ctrl+Click** | Toggle individual file selection |
| **Shift+Click** | Range selection from last selected to clicked |

### 🔧 Function Keys
| Key | Action |
|-----|--------|
| **F1** | Show comprehensive help dialog |
| **F3** | Toggle filter bar |
| **F4** | AI Search |
| **F5** | Copy selected files |
| **F6** | Move selected files |
| **F7** | Create new directory |
| **F8** | Delete selected files |
| **F9** | Open configuration dialog |
| **F10** | Quit application |

### 🎯 Advanced Operations
| Key Combination | Action |
|----------------|--------|
| **Ctrl+U** | Swap left and right panes |
| **Ctrl+H** | Show command history |
| **Double-Click** | Open file with system default application |
| **Drag & Drop** | Copy files between panes |
| **Shift+Drag** | Move files between panes |

### 📁 File Operations
- **Copy**: Select files and press F5 or drag to other pane
- **Move**: Select files and press F6 or Shift+drag to other pane
- **Delete**: Select files and press F8
- **View**: Double-click any file to open with system application
- **Cloud Files**: Automatically downloaded to ~/.aifs-temp before opening

### 🔍 Filtering & Search
- **F3** to toggle filter bar
- Filter by name, type, size, and date
- Debounced notifications (0.5s delay) to avoid spam
- **F4** for AI-powered semantic search

### 🎨 Customization
- **Themes**: Access via menu bar (Classic, Modern Dark, Light)
- **Configuration**: F9 for secure credential management
- **Pane Resizing**: Drag the divider between panes
- **State Persistence**: Automatically saves your location and settings

## 🔮 Future Enhancements

### Planned Features:
- **React Frontend** - Modern UI with drag-and-drop support
- **Azure Blob Storage** - Microsoft Azure integration
- **Google Cloud Storage** - GCS provider implementation
- **AIFS Provider** - AI-Native File System with semantic search
- **Advanced Job Management** - Progress bars, pause/resume, cancellation
- **File Preview** - Built-in file viewer for common formats

### AIFS-Specific Features (Planned):
- **Semantic Search** - Find files based on meaning, not just names
- **Content-Addressed Storage** - Files identified by BLAKE3 content hash
- **Snapshot Management** - Point-in-time snapshots of data
- **Lineage Tracking** - Track relationships between files
- **Vector Embeddings** - Store and query embeddings for AI/ML workflows

## 🚀 Ready for Git Push

This project is now ready for version control and collaboration:

### ✅ What's Included
- **Working Electron Application** with Electron Forge
- **Secure Credential Management** with AES-256 encryption
- **Complete Documentation** (README, GETTING_STARTED, SECURITY)
- **Proper .gitignore** excluding sensitive files
- **Modern UI** with security dialogs
- **Multi-provider Support** (File, S3 with more planned)

### 🔒 Security Considerations
- **No sensitive data** in git repository
- **Encrypted config files** excluded from version control
- **AWS credentials** never committed
- **Master passwords** never stored

### 📁 Repository Structure
```
aifs-client-new/
├── README.md                    # Main documentation
├── GETTING_STARTED.md          # Quick start guide
├── SECURITY.md                 # Security documentation
├── .gitignore                  # Excludes sensitive files
├── setup.sh                    # Automated setup script
├── working-electron-app/       # Working application
│   ├── src/                    # Source code
│   ├── package.json           # Dependencies
│   └── forge.config.js        # Electron Forge config
└── spec/                      # Specifications
    └── functional_spec.md     # Original requirements
```

### 🎯 Next Steps
1. **Initialize Git**: `git init`
2. **Add Files**: `git add .`
3. **Initial Commit**: `git commit -m "Initial commit: Working AIFS Client with secure credential management"`
4. **Add Remote**: `git remote add origin <repository-url>`
5. **Push**: `git push -u origin main`

## 🐛 Troubleshooting

### Common Issues:

1. **AWS Credentials Not Found**
   - Ensure AWS credentials are configured via `aws configure` or environment variables
   - Check that the AWS region is set correctly

2. **S3 Operations Failing**
   - Verify your AWS credentials have the necessary S3 permissions
   - Check that the bucket exists and you have access to it

3. **Application Won't Start**
   - Ensure you're in the `working-electron-app` directory
   - Run `npm install` to ensure all dependencies are installed
   - Check Node.js version (requires v16 or later)

### Debug Mode:

Open the browser console (F12) to see detailed error messages and operation logs.

## 📋 Development Notes

### Architecture:
- **Main Process** (`src/index.js`) - Handles file operations and IPC
- **Renderer Process** (`src/index.html`) - UI and user interactions  
- **Preload Script** (`src/preload.js`) - Secure API bridge
- **Providers** - Modular storage backend implementations

### Key Design Decisions:
- **Electron Forge** - Used instead of standard Electron due to module resolution issues
- **CommonJS** - Providers converted from TypeScript to CommonJS for compatibility
- **Modular Design** - Easy to add new storage providers
- **Error Handling** - Comprehensive error handling with user-friendly messages

## 📄 License

MIT

---

## 🎮 Keyboard Shortcuts & Usage

### Essential Shortcuts
| Shortcut | Action | Description |
|----------|--------|-------------|
| **Arrow Keys** | Navigate | Move through file list |
| **Tab** | Switch Panes | Switch between left and right panes with smart focus |
| **Enter** | Open | Open selected file/directory |
| **Space** | Toggle Selection | Toggle selection of current file |
| **F1** | Help | Show comprehensive help dialog |
| **F3** | Filter | Toggle filter bar |
| **F4** | AI Search | Open AI search dialog |
| **F5** | Copy | Copy selected files |
| **F6** | Move | Move selected files |
| **F7** | New Directory | Create new directory |
| **F8** | Delete | Delete selected files |
| **F9** | Config | Open configuration dialog |
| **F10** | Quit | Quit application |
| **Ctrl+A** | Select All | Select all files |
| **Ctrl+Click** | Toggle Selection | Toggle individual file selection |
| **Shift+Click** | Range Selection | Select range of files |
| **Ctrl+H** | History | Show command history |
| **Escape** | Close Dialogs | Close any open dialog |

### Multiple Selection
- **Single Selection**: Click on a file
- **Toggle Selection**: Ctrl+Click on files
- **Range Selection**: Shift+Click to select a range
- **Select All**: Ctrl+A
- **Space Bar**: Toggle selection of currently highlighted file

### Pane Switching
- **Tab Key**: Switch between left and right panes
- **Smart Focus**: Automatically focuses on first file or last selected file
- **History Tracking**: Remembers your position in each pane

## 🌐 Cloud Storage Testing

### AWS S3 Setup
1. **Configure AWS credentials** (one of these methods):
   - Use AWS CLI: `aws configure`
   - Use the app's config dialog (F9) to enter credentials securely
   - Set environment variables: `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`

2. **Test S3 operations**:
   - Switch right pane to S3 provider
   - Browse your S3 buckets
   - Upload files by dragging from local pane to S3 pane
   - Copy files between S3 buckets
   - Delete files from S3

### Google Cloud Storage Setup
1. **Create service account** in Google Cloud Console
2. **Download JSON key file**
3. **Configure in app** (F9 → Providers tab)
4. **Test GCP operations** similar to S3

## 🎉 Success!

Your AIFS Client is now fully functional with advanced features! The application successfully:

- ✅ **Norton Commander UI** with authentic blue theme
- ✅ **Cross-Cloud Support** for Local, S3, and GCP
- ✅ **AI Integration** with OpenAI and Anthropic
- ✅ **Smart Pane Switching** with focus management
- ✅ **Multiple Selection** with keyboard shortcuts
- ✅ **File Viewer** with RTL and multilanguage support
- ✅ **Theme System** with three professional themes
- ✅ **Comprehensive Help** with F1 dialog
- ✅ **Enhanced Notifications** with file details
- ✅ **Command History** with operation tracking
- ✅ **Secure Configuration** with encrypted storage

Ready to test your cloud storage operations and AI features! 🚀