#!/usr/bin/env node

import { TuiApplication } from './TuiApplication.js';

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  help: args.includes('--help') || args.includes('-h'),
  version: args.includes('--version') || args.includes('-v'),
  config: args.includes('--config') ? args[args.indexOf('--config') + 1] : null,
  autoConfigureCli: args.includes('--auto-configure-cli')
};

// Handle help
if (options.help) {
  console.log('AIFS Commander TUI - Terminal User Interface');
  console.log('');
  console.log('Usage: aifs-tui [options]');
  console.log('');
  console.log('Options:');
  console.log('  -h, --help          Show this help message');
  console.log('  -v, --version       Show version information');
  console.log('  --config <path>     Use custom configuration file');
  console.log('  --auto-configure-cli Auto-configure providers from CLI credentials');
  console.log('');
  console.log('Examples:');
  console.log('  aifs-tui                    # Start TUI with default settings');
  console.log('  aifs-tui --config ./my-config.json  # Use custom configuration');
  console.log('  aifs-tui --auto-configure-cli       # Auto-configure from CLI');
  console.log('');
  console.log('Environment Variables:');
  console.log('  AUTO_CONFIGURE_CLI=1        # Auto-configure providers from CLI');
  console.log('  FORCE_TUI=1                 # Force TUI mode (non-terminal)');
  console.log('');
  console.log('For more information, visit: https://github.com/UriBer/aifs-ngclient');
  process.exit(0);
}

// Handle version
if (options.version) {
  const pkg = require('../package.json');
  console.log(pkg.version);
  process.exit(0);
}

// Set environment variables based on flags
if (options.autoConfigureCli) {
  process.env.AUTO_CONFIGURE_CLI = '1';
}

// Check if running in terminal (be more lenient)
if (!process.stdout.isTTY && !process.env.FORCE_TUI) {
  console.error('AIFS Commander TUI requires a terminal environment');
  console.error('Set FORCE_TUI=1 to override this check');
  process.exit(1);
}

// Initialize and start TUI application
const app = new TuiApplication({
  configPath: options.config
});
app.start().catch((error) => {
  console.error('Failed to start TUI application:', error);
  process.exit(1);
});
