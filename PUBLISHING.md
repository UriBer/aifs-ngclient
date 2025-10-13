# Publishing Guide

This guide explains how to publish the AIFS Commander TUI package to npm.

## Prerequisites

1. **NPM Account**: Create an account at [npmjs.com](https://www.npmjs.com)
2. **Login**: Run `npm login` to authenticate
3. **Package Built**: Ensure the TUI package is built (`npm run build:tui`)

## Publishing Steps

### 1. Configure NPM (Fix sudo requirement)

```bash
# Create a global directory for npm packages
mkdir -p ~/.npm-global

# Configure npm to use the new directory
npm config set prefix '~/.npm-global'

# Add to your shell profile
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.zshrc
source ~/.zshrc
```

### 2. Login to NPM

```bash
npm login
# Enter your npm username, password, and email
```

### 3. Test the Package

```bash
cd packages/aifs-commander-tui

# Test the CLI
node bin/aifs-tui --version
FORCE_TUI=1 node bin/aifs-tui --help

# Validate package contents
npm pack --dry-run
```

### 4. Publish the Package

```bash
cd packages/aifs-commander-tui
npm publish
```

### 5. Verify Publication

```bash
# Check if package is available
npm view aifs-commander-tui

# Test global installation
npm install -g aifs-commander-tui
aifs-tui --version
```

## Package Information

- **Package Name**: `aifs-commander-tui`
- **Version**: `1.0.0`
- **Repository**: `https://github.com/UriBer/aifs-ngclient`
- **NPM URL**: `https://www.npmjs.com/package/aifs-commander-tui` (after publishing)

## Troubleshooting

### "npm requires sudo"

This happens when npm tries to install to `/usr/local`. Fix by configuring npm to use a user directory:

```bash
npm config set prefix '~/.npm-global'
```

### "Package already exists"

If the package name is taken, you can:

1. **Use a scoped package**: `@your-username/aifs-commander-tui`
2. **Change the name**: Update `name` in `package.json`
3. **Use a different registry**: Configure a private npm registry

### "Not logged in"

Run `npm login` and enter your npm credentials.

## Updating the Package

To publish a new version:

```bash
# Update version in package.json
npm version patch  # for bug fixes
npm version minor  # for new features
npm version major  # for breaking changes

# Publish new version
npm publish
```

## Package Contents

The published package includes:

- **CLI Executable**: `bin/aifs-tui` (1.5kB)
- **Main Library**: `dist/index.js` + TypeScript definitions
- **TUI Components**: All compiled TUI classes
- **Documentation**: README.md
- **Total Size**: ~245kB

## Security Notes

- Credentials are not included in the package
- Users must configure their own storage providers
- CLI credentials are auto-detected when available
- All sensitive data is encrypted locally

## Support

- **Issues**: [GitHub Issues](https://github.com/UriBer/aifs-ngclient/issues)
- **Documentation**: [GitHub README](https://github.com/UriBer/aifs-ngclient#readme)
- **Email**: team@even-derech-it.com
