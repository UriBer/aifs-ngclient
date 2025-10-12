#!/usr/bin/env node

import { TuiApplication } from './TuiApplication.js';

// Check if running in terminal (be more lenient)
if (!process.stdout.isTTY && !process.env.FORCE_TUI) {
  console.error('AIFS Commander TUI requires a terminal environment');
  console.error('Set FORCE_TUI=1 to override this check');
  process.exit(1);
}

// Initialize and start TUI application
const app = new TuiApplication();
app.start().catch((error) => {
  console.error('Failed to start TUI application:', error);
  process.exit(1);
});
