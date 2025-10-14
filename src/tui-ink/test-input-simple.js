#!/usr/bin/env node

// Simple input test to debug keyboard handling
import { spawn } from 'child_process';

console.log('🔍 Testing TUI Input Handling...\n');

// Start the TUI process
const tuiProcess = spawn('node', ['dist/index.js'], {
  cwd: process.cwd(),
  env: { ...process.env, FORCE_TUI: '1' },
  stdio: ['pipe', 'pipe', 'pipe']
});

let outputBuffer = '';

// Capture TUI output
tuiProcess.stdout.on('data', (data) => {
  const output = data.toString();
  outputBuffer += output;
  console.log('📺 TUI Output:', output.replace(/\n/g, '\\n'));
});

tuiProcess.stderr.on('data', (data) => {
  console.error('❌ TUI Error:', data.toString());
});

// Wait for TUI to start
setTimeout(async () => {
  console.log('\n🎯 Starting Input Tests...\n');
  
  // Test 1: Function Keys
  console.log('Test 1: Function Keys');
  console.log('Sending F1...');
  tuiProcess.stdin.write('\u001bOP');
  await sleep(500);
  
  console.log('Sending F5...');
  tuiProcess.stdin.write('\u001b[15~');
  await sleep(500);
  
  console.log('Sending F10...');
  tuiProcess.stdin.write('\u001b[21~');
  await sleep(500);
  
  // Test 2: Navigation Keys
  console.log('\nTest 2: Navigation Keys');
  console.log('Sending Tab...');
  tuiProcess.stdin.write('\t');
  await sleep(300);
  
  console.log('Sending Up Arrow...');
  tuiProcess.stdin.write('\u001b[A');
  await sleep(300);
  
  console.log('Sending Down Arrow...');
  tuiProcess.stdin.write('\u001b[B');
  await sleep(300);
  
  console.log('Sending Enter...');
  tuiProcess.stdin.write('\r');
  await sleep(300);
  
  console.log('Sending Space...');
  tuiProcess.stdin.write(' ');
  await sleep(300);
  
  // Test 3: Character Keys
  console.log('\nTest 3: Character Keys');
  console.log('Sending "h"...');
  tuiProcess.stdin.write('h');
  await sleep(300);
  
  console.log('Sending "j"...');
  tuiProcess.stdin.write('j');
  await sleep(300);
  
  console.log('Sending "k"...');
  tuiProcess.stdin.write('k');
  await sleep(300);
  
  console.log('Sending "l"...');
  tuiProcess.stdin.write('l');
  await sleep(300);
  
  console.log('\n✅ Input tests completed');
  console.log('\n📊 Output Analysis:');
  console.log('==================');
  
  // Analyze output for key detection
  const keyDetections = [
    { pattern: 'F1 detected', key: 'F1' },
    { pattern: 'F5 detected', key: 'F5' },
    { pattern: 'F10 detected', key: 'F10' },
    { pattern: 'Tab detected', key: 'Tab' },
    { pattern: 'Up arrow detected', key: 'Up Arrow' },
    { pattern: 'Down arrow detected', key: 'Down Arrow' },
    { pattern: 'Enter detected', key: 'Enter' },
    { pattern: 'Space detected', key: 'Space' }
  ];
  
  keyDetections.forEach(detection => {
    const found = outputBuffer.includes(detection.pattern);
    console.log(`${found ? '✅' : '❌'} ${detection.key}: ${found ? 'DETECTED' : 'NOT DETECTED'}`);
  });
  
  console.log('\n🔍 Raw Output Buffer:');
  console.log('====================');
  console.log(JSON.stringify(outputBuffer));
  
  // Cleanup
  setTimeout(() => {
    console.log('\n🧹 Cleaning up...');
    tuiProcess.kill();
    process.exit(0);
  }, 1000);
  
}, 3000);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
