#!/usr/bin/env node

// Cross-platform testing script for AIFS Commander TUI
import os from 'os';
import fs from 'fs/promises';
import path from 'path';

console.log('AIFS Commander TUI - Cross-Platform Testing');
console.log('==========================================');
console.log('');

// Test platform information
console.log('Platform Information:');
console.log(`  OS: ${os.platform()} ${os.arch()}`);
console.log(`  Node.js: ${process.version}`);
console.log(`  Terminal: ${process.env.TERM || 'unknown'}`);
console.log(`  Shell: ${process.env.SHELL || 'unknown'}`);
console.log('');

// Test terminal requirements
const { rows, cols } = process.stdout;
console.log('Terminal Requirements:');
console.log(`  Size: ${cols}x${rows}`);
console.log(`  TTY: ${process.stdout.isTTY ? 'Yes' : 'No'}`);
console.log(`  Color: ${process.stdout.hasColors() ? 'Yes' : 'No'}`);
console.log('');

// Check if requirements are met
let requirementsMet = true;

if (rows < 20 || cols < 80) {
  console.log('❌ Terminal size too small (need at least 80x20)');
  requirementsMet = false;
} else {
  console.log('✅ Terminal size OK');
}

if (!process.stdout.isTTY) {
  console.log('❌ Not running in a terminal');
  requirementsMet = false;
} else {
  console.log('✅ Running in terminal');
}

// Test Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

if (majorVersion < 18) {
  console.log(`❌ Node.js version ${nodeVersion} is too old (need 18.0.0+)`);
  requirementsMet = false;
} else {
  console.log(`✅ Node.js version ${nodeVersion} OK`);
}

// Test dependencies
console.log('');
console.log('Dependencies:');

const dependencies = [
  'blessed',
  'blessed-contrib',
  'chalk',
  'commander',
  'inquirer',
  'ora',
  'table',
  'yargs'
];

let allDependenciesAvailable = true;

for (const dep of dependencies) {
  try {
    await import(dep);
    console.log(`✅ ${dep} available`);
  } catch (error) {
    console.log(`❌ ${dep} not available: ${error.message}`);
    allDependenciesAvailable = false;
  }
}

// Test file system access
console.log('');
console.log('File System Access:');

try {
  const homeDir = os.homedir();
  await fs.access(homeDir, fs.constants.R_OK | fs.constants.W_OK);
  console.log(`✅ Home directory accessible: ${homeDir}`);
} catch (error) {
  console.log(`❌ Home directory not accessible: ${error.message}`);
  requirementsMet = false;
}

// Test configuration directory creation
try {
  const configDir = path.join(os.homedir(), '.aifs-commander');
  await fs.mkdir(configDir, { recursive: true });
  console.log(`✅ Configuration directory created: ${configDir}`);
} catch (error) {
  console.log(`❌ Cannot create configuration directory: ${error.message}`);
  requirementsMet = false;
}

// Test log file creation
try {
  const logFile = path.join(os.homedir(), '.aifs-commander', 'test.log');
  await fs.writeFile(logFile, 'Test log entry\n');
  await fs.unlink(logFile);
  console.log('✅ Log file creation OK');
} catch (error) {
  console.log(`❌ Cannot create log file: ${error.message}`);
  requirementsMet = false;
}

// Platform-specific tests
console.log('');
console.log('Platform-Specific Tests:');

switch (os.platform()) {
  case 'linux':
    console.log('✅ Linux platform detected');
    console.log(`  Desktop: ${process.env.XDG_CURRENT_DESKTOP || 'unknown'}`);
    console.log(`  Terminal: ${process.env.TERM || 'unknown'}`);
    break;
    
  case 'darwin':
    console.log('✅ macOS platform detected');
    console.log(`  Terminal: ${process.env.TERM || 'unknown'}`);
    break;
    
  case 'win32':
    console.log('✅ Windows platform detected');
    console.log(`  Terminal: ${process.env.TERM || 'unknown'}`);
    console.log(`  PowerShell: ${process.env.PSModulePath ? 'Yes' : 'No'}`);
    break;
    
  default:
    console.log(`⚠️  Unknown platform: ${os.platform()}`);
}

// Test blessed.js functionality
console.log('');
console.log('Blessed.js Functionality:');

try {
  const blessed = await import('blessed');
  
  // Test screen creation
  const screen = blessed.screen({
    smartCSR: true,
    title: 'Test Screen'
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
  requirementsMet = false;
}

// Final result
console.log('');
console.log('Test Results:');
console.log('=============');

if (requirementsMet && allDependenciesAvailable) {
  console.log('✅ All tests passed! TUI should work on this platform.');
  console.log('');
  console.log('To start the TUI:');
  console.log('  npm start');
  console.log('  or');
  console.log('  node index.js');
} else {
  console.log('❌ Some tests failed. Please fix the issues above.');
  process.exit(1);
}
