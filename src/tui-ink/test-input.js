#!/usr/bin/env node

// Simple test to verify input handling works
import { createInterface } from 'readline';

console.log('Input Test - Press keys to test function key detection');
console.log('Press Ctrl+C to exit');

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true
});

rl.on('line', (input) => {
  console.log('Input received:', JSON.stringify(input));
  
  // Test function key detection
  if (input === '\u001bOP' || input === 'f1') {
    console.log('✅ F1 detected!');
  } else if (input === '\u001b[15~' || input === 'f5') {
    console.log('✅ F5 detected!');
  } else if (input === '\u001b[17~' || input === 'f6') {
    console.log('✅ F6 detected!');
  } else if (input === '\u001b[18~' || input === 'f7') {
    console.log('✅ F7 detected!');
  } else if (input === '\u001b[19~' || input === 'f8') {
    console.log('✅ F8 detected!');
  } else if (input === '\u001b[21~' || input === 'f10') {
    console.log('✅ F10 detected!');
  } else if (input === '\t') {
    console.log('✅ Tab detected!');
  } else {
    console.log('Other input:', input);
  }
});

rl.on('close', () => {
  console.log('Input test ended');
  process.exit(0);
});
