#!/usr/bin/env node

// Simple test script for TUI functionality

console.log('Testing AIFS Commander TUI...');

// Test terminal requirements
const { rows, cols } = process.stdout;
console.log(`Terminal size: ${cols}x${rows}`);

if (rows < 20 || cols < 80) {
  console.error('❌ Terminal too small. Please resize to at least 80x20');
  process.exit(1);
}

console.log('✅ Terminal size OK');

// Test if we're in a TTY
if (!process.stdout.isTTY) {
  console.error('❌ Not running in a terminal');
  process.exit(1);
}

console.log('✅ Running in terminal');

// Test Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

if (majorVersion < 18) {
  console.error(`❌ Node.js version ${nodeVersion} is too old. Please upgrade to 18.0.0 or higher`);
  process.exit(1);
}

console.log(`✅ Node.js version ${nodeVersion} OK`);

// Test if blessed is available
try {
  const blessed = await import('blessed');
  console.log('✅ Blessed.js available');
} catch (error) {
  console.error('❌ Blessed.js not available:', error.message);
  process.exit(1);
}

console.log('✅ All basic requirements met');
console.log('🚀 TUI should be ready to run!');
console.log('');
console.log('To start the TUI, run:');
console.log('  npm start');
console.log('  or');
console.log('  node index.js');
