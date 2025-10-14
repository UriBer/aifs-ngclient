#!/usr/bin/env node

// Test script to verify configuration keys work
import blessed from 'blessed';

console.log('Testing configuration key handling...');

const screen = blessed.screen({
  smartCSR: true,
  title: 'Config Test',
  cursor: {
    artificial: true,
    shape: 'block',
    blink: true,
    color: 'black'
  }
});

// Create main box
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

// Create form box
const formBox = blessed.box({
  parent: mainBox,
  top: 1,
  left: 1,
  width: '100%-2',
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
  label: 'Configuration',
  keys: true,
  vi: true,
  mouse: true,
  scrollable: true,
  focusable: true
});

// Set initial content
formBox.setContent('Configuration Test\n\nPress action keys to test:\nE - Enable/Disable\nC - Configure\nT - Test\nD - Delete\n\nPress ESC to exit');

let currentProvider = 'Test Provider';

// Handle action keys
mainBox.key(['e', 'c', 's', 't', 'd', 'E', 'C', 'S', 'T', 'D'], (ch, key) => {
  console.log('Action key pressed:', key.name);
  
  const action = key.name.toLowerCase();
  
  switch (action) {
    case 'e':
      formBox.setContent(`E pressed: Toggled ${currentProvider}\n\nPress action keys to test:\nE - Enable/Disable\nC - Configure\nT - Test\nD - Delete\n\nPress ESC to exit`);
      break;
    case 'c':
      formBox.setContent(`C pressed: Configuring ${currentProvider}\n\nPress action keys to test:\nE - Enable/Disable\nC - Configure\nT - Test\nD - Delete\n\nPress ESC to exit`);
      break;
    case 's':
      formBox.setContent(`S pressed: Settings for ${currentProvider}\n\nPress action keys to test:\nE - Enable/Disable\nC - Configure\nT - Test\nD - Delete\n\nPress ESC to exit`);
      break;
    case 't':
      formBox.setContent(`T pressed: Testing ${currentProvider}\n\nPress action keys to test:\nE - Enable/Disable\nC - Configure\nT - Test\nD - Delete\n\nPress ESC to exit`);
      break;
    case 'd':
      formBox.setContent(`D pressed: Delete ${currentProvider}?\n\nPress action keys to test:\nE - Enable/Disable\nC - Configure\nT - Test\nD - Delete\n\nPress ESC to exit`);
      break;
  }
  
  screen.render();
});

// Also handle keys on the form box
formBox.key(['e', 'c', 's', 't', 'd', 'E', 'C', 'S', 'T', 'D'], (ch, key) => {
  console.log('Form box action key pressed:', key.name);
  
  const action = key.name.toLowerCase();
  
  switch (action) {
    case 'e':
      formBox.setContent(`E pressed (form): Toggled ${currentProvider}\n\nPress action keys to test:\nE - Enable/Disable\nC - Configure\nT - Test\nD - Delete\n\nPress ESC to exit`);
      break;
    case 'c':
      formBox.setContent(`C pressed (form): Configuring ${currentProvider}\n\nPress action keys to test:\nE - Enable/Disable\nC - Configure\nT - Test\nD - Delete\n\nPress ESC to exit`);
      break;
    case 's':
      formBox.setContent(`S pressed (form): Settings for ${currentProvider}\n\nPress action keys to test:\nE - Enable/Disable\nC - Configure\nT - Test\nD - Delete\n\nPress ESC to exit`);
      break;
    case 't':
      formBox.setContent(`T pressed (form): Testing ${currentProvider}\n\nPress action keys to test:\nE - Enable/Disable\nC - Configure\nT - Test\nD - Delete\n\nPress ESC to exit`);
      break;
    case 'd':
      formBox.setContent(`D pressed (form): Delete ${currentProvider}?\n\nPress action keys to test:\nE - Enable/Disable\nC - Configure\nT - Test\nD - Delete\n\nPress ESC to exit`);
      break;
  }
  
  screen.render();
});

// Handle escape
mainBox.key(['escape'], () => {
  console.log('Exiting...');
  process.exit(0);
});

formBox.key(['escape'], () => {
  console.log('Exiting...');
  process.exit(0);
});

// Handle Ctrl+C
screen.key(['C-c'], () => {
  console.log('Exiting...');
  process.exit(0);
});

// Initial focus
formBox.focus();
screen.render();

console.log('Config test started. Press E, C, S, T, D keys to test, ESC to exit.');
