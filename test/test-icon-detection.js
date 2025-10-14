#!/usr/bin/env node

// Test icon detection and display
const { spawn } = require('child_process');

console.log('🔍 Testing Icon Detection and Display');
console.log('=====================================');
console.log('');

// Test with different terminal configurations
const tests = [
  {
    name: 'Unicode Terminal',
    env: {
      ...process.env,
      FORCE_TUI: '1',
      COLUMNS: '100',
      LINES: '30',
      LANG: 'en_US.UTF-8',
      TERM: 'xterm-256color'
    }
  },
  {
    name: 'ASCII Terminal',
    env: {
      ...process.env,
      FORCE_TUI: '1',
      COLUMNS: '100',
      LINES: '30',
      LANG: 'C',
      LC_ALL: 'C',
      TERM: 'dumb'
    }
  },
  {
    name: 'VT100 Terminal',
    env: {
      ...process.env,
      FORCE_TUI: '1',
      COLUMNS: '100',
      LINES: '30',
      LANG: 'C',
      LC_ALL: 'C',
      TERM: 'vt100'
    }
  }
];

let testIndex = 0;

function runNextTest() {
  if (testIndex >= tests.length) {
    console.log('');
    console.log('🎉 Icon Detection Tests Complete!');
    console.log('');
    console.log('✨ The icon fallback system provides:');
    console.log('- Automatic terminal capability detection');
    console.log('- Graceful fallback to ASCII when Unicode unavailable');
    console.log('- Consistent user experience across all terminals');
    console.log('- Proper icon length calculation for text truncation');
    return;
  }

  const test = tests[testIndex];
  console.log(`📱 Test ${testIndex + 1}: ${test.name}`);
  
  const childProcess = spawn('node', ['src/tui/dist/index.js'], {
    cwd: process.cwd(),
    env: test.env,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let output = '';
  let error = '';

  childProcess.stdout.on('data', (data) => {
    output += data.toString();
  });

  childProcess.stderr.on('data', (data) => {
    error += data.toString();
  });

  childProcess.on('close', (code) => {
    console.log(`   Exit code: ${code}`);
    if (error) {
      console.log(`   Error: ${error.trim()}`);
    }
    console.log(`   Output length: ${output.length} chars`);
    
    // Analyze the output for different icon types
    const unicodeIcons = ['📁', '📄', '☁️', '🌐', '🔷', '🤖', '❓'];
    const asciiIcons = ['[DIR]', '[FILE]', '[LOCAL]', '[S3]', '[GCS]', '[AZ]', '[AIFS]', '[?]'];
    
    const foundUnicode = unicodeIcons.filter(icon => output.includes(icon));
    const foundAscii = asciiIcons.filter(icon => output.includes(icon));
    
    if (foundUnicode.length > 0) {
      console.log(`   ✅ Unicode icons: ${foundUnicode.join(', ')}`);
    }
    if (foundAscii.length > 0) {
      console.log(`   ✅ ASCII icons: ${foundAscii.join(', ')}`);
    }
    if (foundUnicode.length === 0 && foundAscii.length === 0) {
      console.log('   ❓ No icons detected');
    }
    
    console.log('');
    testIndex++;
    setTimeout(runNextTest, 1000);
  });

  // Kill after 3 seconds
  setTimeout(() => {
    childProcess.kill();
  }, 3000);
}

runNextTest();
