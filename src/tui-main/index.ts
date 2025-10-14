#!/usr/bin/env node

// Main entry point that switches between blessed.js and Ink TUI implementations

import { featureFlags } from '../shared/feature-flags.js';

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  help: args.includes('--help') || args.includes('-h'),
  version: args.includes('--version') || args.includes('-v'),
  debug: args.includes('--debug'),
  useInk: args.includes('--use-ink'),
  useBlessed: args.includes('--use-blessed'),
  forceInk: args.includes('--force-ink'),
  forceBlessed: args.includes('--force-blessed'),
};

// Handle help
if (options.help) {
  console.log('AIFS Commander TUI - Multi-Implementation');
  console.log('');
  console.log('Usage: node dist/index.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  -h, --help          Show this help message');
  console.log('  -v, --version       Show version information');
  console.log('  --debug             Enable debug mode');
  console.log('  --use-ink           Use Ink TUI implementation');
  console.log('  --use-blessed       Use blessed.js TUI implementation');
  console.log('  --force-ink         Force Ink TUI (override feature flags)');
  console.log('  --force-blessed     Force blessed.js TUI (override feature flags)');
  console.log('');
  console.log('Environment Variables:');
  console.log('  USE_INK_TUI=1       Use Ink TUI implementation');
  console.log('  ENABLE_OLD_TUI=1    Enable blessed.js TUI implementation');
  console.log('  DEBUG=1             Enable debug mode');
  console.log('');
  console.log('Feature Flags:');
  console.log('  Current implementation:', featureFlags.getTuiImplementation());
  console.log('  Debug info:', JSON.stringify(featureFlags.getDebugInfo(), null, 2));
  console.log('');
  process.exit(0);
}

// Handle version
if (options.version) {
  const pkg = require('../package.json');
  console.log(pkg.version);
  process.exit(0);
}

// Check if running in terminal
if (!process.stdout.isTTY) {
  console.error('AIFS Commander TUI requires a terminal environment');
  process.exit(1);
}

// Determine which implementation to use
let useInk = featureFlags.shouldUseInk();

// Override with command line arguments
if (options.forceInk) {
  useInk = true;
} else if (options.forceBlessed) {
  useInk = false;
} else if (options.useInk) {
  useInk = true;
} else if (options.useBlessed) {
  useInk = false;
}

// Set environment variables based on flags
if (options.debug) {
  process.env.DEBUG = '1';
}

// Load the appropriate implementation
async function loadImplementation() {
  try {
    if (useInk) {
      console.log('🚀 Starting Ink TUI implementation...');
      const { render } = await import('ink');
      const { App } = await import('../tui-ink/dist/App.js');
      render(App);
    } else {
      console.log('🚀 Starting blessed.js TUI implementation...');
      const { TuiApplication } = await import('../tui/dist/TuiApplication.js');
      const app = new TuiApplication();
      await app.start();
    }
  } catch (error) {
    console.error('Failed to load TUI implementation:', error);
    process.exit(1);
  }
}

// Start the application
loadImplementation();
