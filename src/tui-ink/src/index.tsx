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
  useInk: args.includes('--use-ink'),
};

// Handle help
if (options.help) {
  console.log('AIFS Commander TUI - Ink Implementation');
  console.log('');
  console.log('Usage: node dist/index.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  -h, --help          Show this help message');
  console.log('  -v, --version       Show version information');
  console.log('  --debug             Enable debug mode');
  console.log('  --use-ink           Use Ink TUI (default)');
  console.log('');
  console.log('Features:');
  console.log('  - Dual-pane file browser with virtual DOM');
  console.log('  - Provider switching (file, S3, GCS, Azure, AIFS)');
  console.log('  - Modal dialogs and progress indicators');
  console.log('  - React-based state management');
  console.log('  - Automatic refresh issue resolution');
  console.log('  - Modern TypeScript development experience');
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
  console.log('  Ctrl+F: Filter files');
  console.log('  Ctrl+H: Toggle hidden files');
  console.log('');
  console.log('Refresh Issue Resolution:');
  console.log('  ✅ Virtual DOM prevents unnecessary re-renders');
  console.log('  ✅ State changes automatically trigger UI updates');
  console.log('  ✅ No manual screen.render() calls needed');
  console.log('  ✅ Built-in diffing algorithm prevents flickering');
  console.log('  ✅ React component model ensures state consistency');
  console.log('');
  process.exit(0);
}

// Handle version
if (options.version) {
  const pkg = require('../package.json');
  console.log(pkg.version);
  process.exit(0);
}

// Check if running in terminal (be more lenient)
if (!process.stdout.isTTY && !process.env.FORCE_TUI) {
  console.error('AIFS Commander TUI requires a terminal environment');
  console.error('Set FORCE_TUI=1 to override this check');
  process.exit(1);
}

// Enable debug mode if requested
if (options.debug) {
  process.env.DEBUG = '1';
}

// Check if raw mode is supported
if (!process.stdin.isTTY) {
  console.error('❌ Error: Raw mode is not supported in this environment');
  console.error('This usually happens when running in certain terminals or IDEs');
  console.error('Try running in a regular terminal or set FORCE_TUI=1');
  process.exit(1);
}

// Render the application
try {
  render(<App />, {
    patchConsole: false,
    exitOnCtrlC: true
  });
} catch (error) {
  if (error instanceof Error && error.message.includes('Raw mode is not supported')) {
    console.error('❌ Error: Raw mode is not supported in this environment');
    console.error('This usually happens when running in certain terminals or IDEs');
    console.error('Try running in a regular terminal or set FORCE_TUI=1');
    process.exit(1);
  }
  throw error;
}
