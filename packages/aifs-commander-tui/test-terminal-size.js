#!/usr/bin/env node

// Test script to verify terminal size message
import { spawn } from 'child_process';

console.log('Testing terminal size message...');

// Test with very small terminal size
const child = spawn('node', ['dist/index.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    FORCE_TUI: '1',
    // Simulate small terminal size
    COLUMNS: '10',
    LINES: '5'
  },
  stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';
let errorOutput = '';

child.stdout.on('data', (data) => {
  output += data.toString();
});

child.stderr.on('data', (data) => {
  errorOutput += data.toString();
});

child.on('close', (code) => {
  console.log('Exit code:', code);
  console.log('STDOUT:', output);
  console.log('STDERR:', errorOutput);
  
  if (errorOutput.includes('Terminal size too small. Please resize to at least 20x6')) {
    console.log('✅ Terminal size message is correct!');
  } else {
    console.log('❌ Terminal size message is incorrect or missing');
  }
});

// Kill after 2 seconds
setTimeout(() => {
  child.kill();
}, 2000);
