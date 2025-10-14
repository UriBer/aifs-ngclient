#!/usr/bin/env node

// Visual test for TUI interface
const { spawn } = require('child_process');

console.log('👁️  Visual TUI Interface Test');
console.log('==============================');
console.log('');

console.log('📱 Starting TUI for visual inspection...');
console.log('   - Press any key to continue through tests');
console.log('   - Watch for visual artifacts, flickering, or layout issues');
console.log('   - Check icon rendering and text alignment');
console.log('');

const test = spawn('node', ['src/tui/dist/index.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    FORCE_TUI: '1',
    COLUMNS: '120',
    LINES: '35'
  },
  stdio: ['inherit', 'inherit', 'pipe']
});

let error = '';

test.stderr.on('data', (data) => {
  error += data.toString();
});

test.on('close', (code) => {
  console.log(`\n   Exit code: ${code}`);
  if (error) {
    console.log(`   Error: ${error.trim()}`);
  }
});

// Test sequence with delays
setTimeout(() => {
  console.log('\n🔍 Test 1: Initial interface loading');
  console.log('   - Check if loading state appears');
  console.log('   - Verify panes are properly sized');
  console.log('   - Look for any flickering during startup');
}, 1000);

setTimeout(() => {
  console.log('\n🔍 Test 2: Directory listing display');
  console.log('   - Check file and directory icons');
  console.log('   - Verify text truncation works');
  console.log('   - Look for proper alignment');
}, 2000);

setTimeout(() => {
  console.log('\n🔍 Test 3: Navigation and selection');
  console.log('   - Try arrow keys to navigate');
  console.log('   - Check selection highlighting');
  console.log('   - Look for smooth transitions');
}, 3000);

setTimeout(() => {
  console.log('\n🔍 Test 4: Provider switching');
  console.log('   - Press P to open provider menu');
  console.log('   - Check menu appearance');
  console.log('   - Look for any rendering issues');
}, 4000);

setTimeout(() => {
  console.log('\n🔍 Test 5: Resize handling');
  console.log('   - Try resizing terminal window');
  console.log('   - Check if layout adapts properly');
  console.log('   - Look for any visual glitches');
}, 5000);

setTimeout(() => {
  console.log('\n🔍 Test 6: Error handling');
  console.log('   - Try navigating to invalid paths');
  console.log('   - Check error message display');
  console.log('   - Look for proper error styling');
}, 6000);

setTimeout(() => {
  console.log('\n🎉 Visual inspection complete!');
  console.log('   - Press Ctrl+C to exit');
  console.log('   - Note any visual issues you observed');
}, 7000);

// Kill after 10 seconds
setTimeout(() => {
  test.kill();
  console.log('\n✅ Visual test completed');
}, 10000);
