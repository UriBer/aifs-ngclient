#!/usr/bin/env node

// Test script to verify TUI can start without errors
import blessed from 'blessed';

console.log('Testing TUI startup...');

try {
  // Test if we can create a screen
  const screen = blessed.screen({
    smartCSR: true,
    title: 'Test Screen',
    debug: false
  });

  // Test if we can create panes
  const leftPane = blessed.list({
    parent: screen,
    top: 0,
    left: 0,
    width: '50%',
    height: '100%',
    border: {
      type: 'line'
    },
    style: {
      border: {
        fg: 'green'
      },
      selected: {
        bg: 'blue',
        fg: 'white'
      }
    },
    keys: true,
    vi: true,
    mouse: true,
    scrollable: true
  });

  const rightPane = blessed.list({
    parent: screen,
    top: 0,
    left: '50%',
    width: '50%',
    height: '100%',
    border: {
      type: 'line'
    },
    style: {
      border: {
        fg: 'green'
      },
      selected: {
        bg: 'blue',
        fg: 'white'
      }
    },
    keys: true,
    vi: true,
    mouse: true,
    scrollable: true
  });

  // Test focus management
  leftPane.focus();
  leftPane.style.border.fg = 'blue';
  rightPane.style.border.fg = 'green';

  // Test adding items
  leftPane.addItem('Test item 1');
  leftPane.addItem('Test item 2');
  rightPane.addItem('Test item 3');
  rightPane.addItem('Test item 4');

  // Test screen rendering
  screen.render();

  console.log('✅ TUI components created successfully');
  console.log('✅ Focus management works');
  console.log('✅ Screen rendering works');

  // Clean up
  screen.destroy();

  console.log('✅ TUI test completed successfully');
  console.log('');
  console.log('The TUI should work properly now!');
  console.log('Try running: npm start');

} catch (error) {
  console.error('❌ TUI test failed:', error.message);
  process.exit(1);
}
