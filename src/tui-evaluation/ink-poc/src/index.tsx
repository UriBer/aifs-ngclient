#!/usr/bin/env node

import React from 'react';
import { render } from 'ink';
import { App } from './App.js';

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  help: args.includes('--help') || args.includes('-h'),
  version: args.includes('--version') || args.includes('-v'),
  debug: args.includes('--debug'),
};

// Handle help
if (options.help) {
  console.log('AIFS Commander TUI - Ink Proof of Concept');
  console.log('');
  console.log('Usage: node dist/index.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  -h, --help          Show this help message');
  console.log('  -v, --version       Show version information');
  console.log('  --debug             Enable debug mode');
  console.log('');
  console.log('Features:');
  console.log('  - Dual-pane file browser');
  console.log('  - Provider switching (file, S3, GCS, Azure)');
  console.log('  - Modal dialogs and progress indicators');
  console.log('  - React-based state management');
  console.log('  - Virtual DOM for smooth rendering');
  console.log('');
  console.log('Keyboard Shortcuts:');
  console.log('  Tab: Switch between panes');
  console.log('  Arrow Keys: Navigate files');
  console.log('  Enter: Open directory');
  console.log('  Backspace: Go up directory');
  console.log('  Space: Toggle selection');
  console.log('  F1: Show help');
  console.log('  F10: Quit');
  console.log('  Ctrl+Q: Quit');
  console.log('  Ctrl+P: Switch provider');
  console.log('  Ctrl+R: Refresh current pane');
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
  console.error('AIFS Commander TUI Ink POC requires a terminal environment');
  process.exit(1);
}

// Enable debug mode if requested
if (options.debug) {
  process.env.DEBUG = '1';
}

// Render the application
render(<App />);
