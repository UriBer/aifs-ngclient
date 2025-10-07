#!/usr/bin/env node

// Simple test script for TUI functionality (no TTY required)
import blessed from 'blessed';
import os from 'os';
import fs from 'fs/promises';
import path from 'path';

console.log('Testing AIFS Commander TUI...');
console.log('');

// Test Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

if (majorVersion < 18) {
  console.log(`❌ Node.js version ${nodeVersion} is too old (need 18.0.0+)`);
  process.exit(1);
} else {
  console.log(`✅ Node.js version ${nodeVersion} OK`);
}

// Test dependencies
console.log('Testing dependencies...');

try {
  await import('blessed');
  console.log('✅ blessed available');
} catch (error) {
  console.log(`❌ blessed not available: ${error.message}`);
  process.exit(1);
}

try {
  await import('blessed-contrib');
  console.log('✅ blessed-contrib available');
} catch (error) {
  console.log(`❌ blessed-contrib not available: ${error.message}`);
}

try {
  await import('chalk');
  console.log('✅ chalk available');
} catch (error) {
  console.log(`❌ chalk not available: ${error.message}`);
}

try {
  await import('commander');
  console.log('✅ commander available');
} catch (error) {
  console.log(`❌ commander not available: ${error.message}`);
}

try {
  await import('inquirer');
  console.log('✅ inquirer available');
} catch (error) {
  console.log(`❌ inquirer not available: ${error.message}`);
}

try {
  await import('ora');
  console.log('✅ ora available');
} catch (error) {
  console.log(`❌ ora not available: ${error.message}`);
}

try {
  await import('table');
  console.log('✅ table available');
} catch (error) {
  console.log(`❌ table not available: ${error.message}`);
}

try {
  await import('yargs');
  console.log('✅ yargs available');
} catch (error) {
  console.log(`❌ yargs not available: ${error.message}`);
}

// Test file system access
console.log('');
console.log('Testing file system access...');

try {
  const homeDir = os.homedir();
  await fs.access(homeDir, fs.constants.R_OK | fs.constants.W_OK);
  console.log(`✅ Home directory accessible: ${homeDir}`);
} catch (error) {
  console.log(`❌ Home directory not accessible: ${error.message}`);
  process.exit(1);
}

// Test configuration directory creation
try {
  const configDir = path.join(os.homedir(), '.aifs-commander');
  await fs.mkdir(configDir, { recursive: true });
  console.log(`✅ Configuration directory created: ${configDir}`);
} catch (error) {
  console.log(`❌ Cannot create configuration directory: ${error.message}`);
  process.exit(1);
}

// Test log file creation
try {
  const logFile = path.join(os.homedir(), '.aifs-commander', 'test.log');
  await fs.writeFile(logFile, 'Test log entry\n');
  await fs.unlink(logFile);
  console.log('✅ Log file creation OK');
} catch (error) {
  console.log(`❌ Cannot create log file: ${error.message}`);
  process.exit(1);
}

// Test blessed.js functionality
console.log('');
console.log('Testing blessed.js functionality...');

try {
  // Test screen creation (without showing it)
  const screen = blessed.screen({
    smartCSR: true,
    title: 'Test Screen',
    debug: false
  });
  
  // Test box creation
  const box = blessed.box({
    parent: screen,
    top: 0,
    left: 0,
    width: 10,
    height: 5,
    content: 'Test'
  });
  
  // Test list creation
  const list = blessed.list({
    parent: screen,
    top: 0,
    left: 0,
    width: 10,
    height: 5,
    items: ['Item 1', 'Item 2']
  });
  
  // Clean up
  screen.destroy();
  
  console.log('✅ Blessed.js functionality OK');
} catch (error) {
  console.log(`❌ Blessed.js functionality test failed: ${error.message}`);
  process.exit(1);
}

// Test directory listing
console.log('');
console.log('Testing directory listing...');

try {
  const homeDir = os.homedir();
  const entries = await fs.readdir(homeDir, { withFileTypes: true });
  console.log(`✅ Directory listing OK (${entries.length} entries)`);
} catch (error) {
  console.log(`❌ Directory listing failed: ${error.message}`);
  process.exit(1);
}

console.log('');
console.log('✅ All tests passed! TUI should work on this platform.');
console.log('');
console.log('To start the TUI:');
console.log('  npm start');
console.log('  or');
console.log('  node index.js');
console.log('');
console.log('Note: The TUI requires a terminal environment to run properly.');
