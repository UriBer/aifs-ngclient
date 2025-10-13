#!/usr/bin/env node

// Minimal TUI tester for 6x20 screen size
import blessed from 'blessed';

console.log('Starting minimal TUI tester...');

const screen = blessed.screen({
  smartCSR: true,
  title: 'Minimal TUI Test',
  cursor: {
    artificial: true,
    shape: 'block',
    blink: true,
    color: 'black'
  }
});

// Create a minimal layout for 6x20
const mainBox = blessed.box({
  parent: screen,
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  border: {
    type: 'line'
  },
  style: {
    border: {
      fg: 'blue'
    },
    fg: 'black',
    bg: 'white'
  },
  label: 'Config Test',
  keys: true,
  vi: true,
  mouse: true
});

// Provider list (left side)
const providerList = blessed.list({
  parent: mainBox,
  top: 1,
  left: 1,
  width: '50%',
  height: '100%-2',
  border: {
    type: 'line'
  },
  style: {
    border: {
      fg: 'gray'
    },
    selected: {
      bg: 'blue',
      fg: 'white'
    },
    item: {
      fg: 'black',
      bg: 'white'
    }
  },
  keys: true,
  vi: true,
  mouse: true,
  scrollable: true,
  label: 'Providers'
});

// Form area (right side)
const formBox = blessed.box({
  parent: mainBox,
  top: 1,
  left: '52%',
  width: '48%',
  height: '100%-2',
  border: {
    type: 'line'
  },
  style: {
    border: {
      fg: 'gray'
    },
    fg: 'black',
    bg: 'white'
  },
  label: 'Config',
  keys: true,
  vi: true,
  mouse: true,
  scrollable: true,
  focusable: true
});

// Add providers
providerList.addItem('✓ Local File System');
providerList.addItem('✗ Amazon S3');
providerList.addItem('✗ Google Cloud Storage');
providerList.addItem('✗ Azure Blob Storage');
providerList.addItem('✗ AIFS');

// Set initial content
formBox.setContent('Select a provider to configure\n\nActions:\nE - Enable/Disable\nC - Configure\nT - Test\nD - Delete');

// Key handlers
let currentProvider = null;

providerList.on('select', (item, index) => {
  console.log('Provider selected:', index);
  currentProvider = index;
  
  const providers = ['Local File System', 'Amazon S3', 'Google Cloud Storage', 'Azure Blob Storage', 'AIFS'];
  const selectedProvider = providers[index];
  
  formBox.setContent(`Provider: ${selectedProvider}\nScheme: ${['file', 's3', 'gcs', 'az', 'aifs'][index]}\nStatus: ${index === 0 ? 'Enabled' : 'Disabled'}\n\nActions:\nE - Enable/Disable\nC - Configure\nT - Test\nD - Delete\n\nPress ESC to close`);
  formBox.focus();
  screen.render();
});

// Handle action keys
mainBox.key(['e', 'c', 't', 'd', 'E', 'C', 'T', 'D'], (ch, key) => {
  console.log('Action key pressed:', key.name, 'currentProvider:', currentProvider);
  
  if (currentProvider === null) {
    formBox.setContent('Please select a provider first');
    screen.render();
    return;
  }
  
  const action = key.name.toLowerCase();
  const providers = ['Local File System', 'Amazon S3', 'Google Cloud Storage', 'Azure Blob Storage', 'AIFS'];
  const selectedProvider = providers[currentProvider];
  
  switch (action) {
    case 'e':
      formBox.setContent(`Toggled ${selectedProvider}\n\nPress ESC to close`);
      break;
    case 'c':
      formBox.setContent(`Configuring ${selectedProvider}...\n\nPress ESC to close`);
      break;
    case 't':
      formBox.setContent(`Testing ${selectedProvider}...\n\nPress ESC to close`);
      break;
    case 'd':
      formBox.setContent(`Delete ${selectedProvider}? (y/n)\n\nPress ESC to close`);
      break;
  }
  
  screen.render();
});

// Handle escape
mainBox.key(['escape'], () => {
  console.log('Exiting...');
  process.exit(0);
});

// Handle Ctrl+C
screen.key(['C-c'], () => {
  console.log('Exiting...');
  process.exit(0);
});

// Initial focus
providerList.focus();
screen.render();

console.log('Minimal TUI tester started. Use arrow keys to navigate, Enter to select, action keys (E,C,T,D) to test.');
