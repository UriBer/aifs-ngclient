#!/usr/bin/env node

// Test raw input detection for function keys
console.log('Raw Input Test - Press function keys to test detection');
console.log('Press Ctrl+C to exit');

let inputBuffer = '';

const handleKeyPress = (chunk) => {
  const input = chunk.toString();
  inputBuffer += input;
  
  console.log('Raw input received:', JSON.stringify(input), 'Buffer:', JSON.stringify(inputBuffer));
  
  // Test function key detection
  if (inputBuffer === '\u001bOP' || inputBuffer === 'f1') {
    console.log('✅ F1 detected!');
    inputBuffer = '';
    return;
  }

  if (inputBuffer === '\u001b[21~' || inputBuffer === 'f10') {
    console.log('✅ F10 detected!');
    inputBuffer = '';
    return;
  }

  if (inputBuffer === '\u001b[15~' || inputBuffer === 'f5') {
    console.log('✅ F5 detected!');
    inputBuffer = '';
    return;
  }

  if (inputBuffer === '\u001b[17~' || inputBuffer === 'f6') {
    console.log('✅ F6 detected!');
    inputBuffer = '';
    return;
  }

  if (inputBuffer === '\u001b[18~' || inputBuffer === 'f7') {
    console.log('✅ F7 detected!');
    inputBuffer = '';
    return;
  }

  if (inputBuffer === '\u001b[19~' || inputBuffer === 'f8') {
    console.log('✅ F8 detected!');
    inputBuffer = '';
    return;
  }

  // Handle Tab
  if (input === '\t') {
    console.log('✅ Tab detected!');
    inputBuffer = '';
    return;
  }

  // Handle Enter
  if (input === '\r' || input === '\n') {
    console.log('✅ Enter detected!');
    inputBuffer = '';
    return;
  }

  // Handle Escape
  if (input === '\u001b') {
    // Start of escape sequence, wait for more
    return;
  }

  // Handle arrow keys
  if (inputBuffer === '\u001b[A') {
    console.log('✅ Up arrow detected!');
    inputBuffer = '';
    return;
  }

  if (inputBuffer === '\u001b[B') {
    console.log('✅ Down arrow detected!');
    inputBuffer = '';
    return;
  }

  // Handle Space
  if (input === ' ') {
    console.log('✅ Space detected!');
    inputBuffer = '';
    return;
  }

  // Clear buffer if it gets too long
  if (inputBuffer.length > 10) {
    inputBuffer = '';
  }
};

// Set up raw input
process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding('utf8');
process.stdin.on('data', handleKeyPress);

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\nExiting...');
  process.exit(0);
});
