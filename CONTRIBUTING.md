# Contributing to AIFS Commander

Thank you for your interest in contributing to AIFS Commander! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites

- Node.js 16+ 
- npm 7+
- Git
- For Electron builds: Platform-specific build tools

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/aifs-commander.git
   cd aifs-commander
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start Development**
   ```bash
   # Start Electron app in development mode
   npm run dev
   
   # Or build and test TUI
   npm run build:tui
   cd src/tui && npm start
   ```

## 📁 Project Structure

```
aifs-commander/
├── src/
│   ├── main/                 # Electron main process
│   │   ├── providers/        # Storage provider implementations
│   │   │   ├── AifsProvider.ts
│   │   │   ├── S3Provider.ts
│   │   │   ├── GCSProvider.ts
│   │   │   └── AzureProvider.ts
│   │   └── proto/           # AIFS gRPC definitions
│   ├── renderer/            # Electron renderer (React)
│   │   ├── components/       # React components
│   │   ├── hooks/          # Custom React hooks
│   │   └── utils/           # Utility functions
│   └── tui/                 # Terminal User Interface
│       ├── src/            # TUI source code
│       └── dist/           # Compiled TUI
├── packages/
│   └── aifs-commander-tui/  # NPM package for TUI
└── dist-electron/          # Built distributions
```

## 🛠️ Development Workflow

### Making Changes

1. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation as needed

3. **Test Your Changes**
   ```bash
   # Test Electron app
   npm run dev
   
   # Test TUI
   npm run build:tui
   cd src/tui && npm start
   
   # Run tests
   npm test
   ```

4. **Build and Test Distributions**
   ```bash
   # Build for your platform
   npm run dist:mac    # macOS
   npm run dist:win    # Windows  
   npm run dist:linux  # Linux
   ```

### Code Style

- **TypeScript**: Use strict typing, avoid `any`
- **React**: Functional components with hooks
- **TUI**: Follow blessed.js patterns
- **Providers**: Implement `IObjectStore` interface
- **Naming**: camelCase for variables, PascalCase for classes

### Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:main      # Main process tests
npm run test:renderer  # Renderer tests
npm run test:tui       # TUI tests

# Run with coverage
npm run test:coverage
```

## 📦 Building and Distribution

### Local Development Builds

```bash
# Build everything
npm run build:all

# Build specific components
npm run build:main      # Main process only
npm run build:renderer  # Renderer only
npm run build:tui      # TUI only
```

### Distribution Builds

```bash
# Build for all platforms
npm run dist:all

# Build for specific platform
npm run dist:mac       # macOS (Intel + ARM64)
npm run dist:win       # Windows (x64)
npm run dist:linux     # Linux (x64)
```

### TUI Package

```bash
# Build TUI package
cd packages/aifs-commander-tui
npm run build

# Test package locally
npm pack --dry-run

# Publish to npm (maintainers only)
npm publish
```

## 🐛 Bug Reports

When reporting bugs, please include:

1. **Environment**: OS, Node.js version, npm version
2. **Steps to Reproduce**: Clear, numbered steps
3. **Expected Behavior**: What should happen
4. **Actual Behavior**: What actually happens
5. **Screenshots/Logs**: If applicable
6. **Additional Context**: Any other relevant information

## ✨ Feature Requests

For feature requests, please:

1. **Check Existing Issues**: Search for similar requests
2. **Describe the Feature**: Clear description of what you want
3. **Use Case**: Why this feature would be useful
4. **Implementation Ideas**: If you have ideas on how to implement it

## 🔧 Provider Development

### Adding a New Storage Provider

1. **Create Provider Class**
   ```typescript
   // src/main/providers/NewProvider.ts
   export class NewProvider implements IObjectStore {
     // Implement required methods
   }
   ```

2. **Register Provider**
   ```typescript
   // Add to provider registry
   ```

3. **Add Configuration UI**
   ```typescript
   // Add to ConfigUI.ts
   ```

4. **Add Tests**
   ```typescript
   // Create test file
   ```

### Provider Interface

All providers must implement the `IObjectStore` interface:

```typescript
interface IObjectStore {
  listObjects(uri: string): Promise<ObjectInfo[]>;
  copyObject(src: string, dest: string): Promise<void>;
  moveObject(src: string, dest: string): Promise<void>;
  deleteObject(uri: string): Promise<void>;
  // ... more methods
}
```

## 📝 Documentation

### Updating Documentation

- **README.md**: Main project documentation
- **CONTRIBUTING.md**: This file
- **API Documentation**: Inline code comments
- **TUI Package**: `packages/aifs-commander-tui/README.md`

### Documentation Standards

- Use clear, concise language
- Include code examples
- Update when adding features
- Keep installation instructions current

## 🚀 Release Process

### Version Management

- **Patch**: Bug fixes (`1.0.1`)
- **Minor**: New features (`1.1.0`)
- **Major**: Breaking changes (`2.0.0`)

### Release Checklist

1. Update version numbers
2. Update CHANGELOG.md
3. Test all platforms
4. Build distributions
5. Create GitHub release
6. Publish npm package (if applicable)

## 🤝 Community Guidelines

### Code of Conduct

- Be respectful and inclusive
- Help others learn and grow
- Focus on constructive feedback
- Follow the golden rule

### Communication

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and general discussion
- **Pull Requests**: Code contributions

## 📞 Getting Help

- **Documentation**: Check the README and inline docs
- **Issues**: Search existing issues first
- **Discussions**: Use GitHub Discussions for questions
- **Email**: team@even-derech-it.com for private matters

## 🙏 Recognition

Contributors will be recognized in:
- CONTRIBUTORS.md file
- Release notes
- Project documentation

Thank you for contributing to AIFS Commander! 🎉
