# AIFS Client (Commander)

A cross-cloud object management client that provides a unified interface for working with files across different storage providers, including local file system, cloud storage (S3, GCS, Azure), and the AI-Native File System (AIFS).

## 🚀 Quick Start

The application is now working with Electron Forge! 

**📖 For detailed setup instructions, see [GETTING_STARTED.md](GETTING_STARTED.md)**  
**🔒 For security details, see [SECURITY.md](SECURITY.md)**

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
- **Electron application** with proper module resolution using Electron Forge
- **Local file system operations** (FileProvider)
- **AWS S3 operations** (S3Provider) with full CRUD support
- **Secure credential management** with AES-256 encryption
- **Master password protection** for stored credentials
- **Multi-source credential detection** (env vars, AWS CLI, encrypted config)
- **Job management system** with progress tracking
- **IPC communication** between main and renderer processes
- **Modern UI** with configuration dialogs and security prompts
- **Cross-provider operations** (copy, move between different storage types)

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

## 🎉 Success!

Your AIFS Client is now fully functional! The application successfully:

- ✅ Resolves the Electron module import issues
- ✅ Provides working AWS S3 integration
- ✅ Supports local file system operations
- ✅ Includes a job management system
- ✅ Offers a clean testing interface

Ready to test your cloud storage operations! 🚀