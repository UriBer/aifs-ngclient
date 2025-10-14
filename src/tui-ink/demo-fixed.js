#!/usr/bin/env node

// Simple demo script for the fixed Ink TUI
console.log('Starting AIFS Commander TUI (Ink) - Fixed Version');
console.log('================================================');
console.log('');
console.log('Key Features:');
console.log('• Tab - Switch between left and right panes');
console.log('• Arrow keys - Navigate within active pane');
console.log('• Enter - Open directory or file');
console.log('• Space - Select/deselect items');
console.log('• H - Go up one directory level');
console.log('• F1 - Show help');
console.log('• F10 or Ctrl+Q - Quit');
console.log('');
console.log('Starting TUI in 3 seconds...');
console.log('');

setTimeout(() => {
  try {
    // Import and run the Ink TUI
    const { render } = require('ink');
    const { App } = require('./dist/App.js');
    
    console.log('Rendering Ink TUI...');
    render(React.createElement(App));
  } catch (error) {
    console.error('Error starting TUI:', error.message);
    console.error('Make sure to run: npm run build');
    process.exit(1);
  }
}, 3000);
