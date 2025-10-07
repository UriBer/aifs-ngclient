#!/usr/bin/env node

// Simple demo for AIFS Commander TUI
import blessed from 'blessed';

console.log('AIFS Commander TUI Demo');
console.log('=======================');
console.log('');

// Create a simple demo screen
const screen = blessed.screen({
  smartCSR: true,
  title: 'AIFS Commander TUI Demo'
});

// Create a welcome message
const welcomeBox = blessed.box({
  parent: screen,
  top: 'center',
  left: 'center',
  width: '80%',
  height: '60%',
  border: {
    type: 'line'
  },
  style: {
    border: {
      fg: 'blue'
    }
  },
  content: `
Welcome to AIFS Commander TUI!

This is a demonstration of the Terminal User Interface.

Features:
• Dual-pane file browser
• Cross-platform support
• Multiple storage providers
• Job management
• Keyboard navigation
• Configuration management
• Comprehensive logging

Navigation:
• Tab - Switch between panes
• ↑/↓ - Navigate file list
• Enter - Open directory/file
• Backspace - Go to parent directory
• F1 - Show help
• F10 - Quit

Press any key to continue...
  `,
  keys: true,
  vi: true
});

// Handle key presses
welcomeBox.on('keypress', (ch, key) => {
  if (key.name === 'escape' || key.name === 'q') {
    screen.destroy();
    process.exit(0);
  }
});

// Show the screen
screen.render();

// Handle Ctrl+C
screen.key(['C-c'], () => {
  screen.destroy();
  process.exit(0);
});

console.log('Demo started. Press any key in the terminal to continue...');
