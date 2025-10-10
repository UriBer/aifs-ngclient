#!/usr/bin/env node

import { TuiApplication } from './TuiApplication.js';

// Check if running in terminal
if (!process.stdout.isTTY) {
  console.error('AIFS Commander TUI requires a terminal environment');
  process.exit(1);
}

// Initialize and start TUI application
const app = new TuiApplication();
app.start().catch((error) => {
  console.error('Failed to start TUI application:', error);
  process.exit(1);
});
