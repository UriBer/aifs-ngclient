#!/usr/bin/env node

// Visual test for refresh/redraw issues
const { spawn } = require('child_process');

console.log('🔍 Testing TUI Refresh/Redraw Issues');
console.log('=====================================');

// Test 1: Normal terminal size
console.log('\n📱 Test 1: Normal terminal size (80x24)');
const normalTest = spawn('node', ['src/tui/dist/index.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    FORCE_TUI: '1',
    COLUMNS: '80',
    LINES: '24'
  },
  stdio: ['pipe', 'pipe', 'pipe']
});

let normalOutput = '';
let normalError = '';

normalTest.stdout.on('data', (data) => {
  normalOutput += data.toString();
});

normalTest.stderr.on('data', (data) => {
  normalError += data.toString();
});

normalTest.on('close', (code) => {
  console.log(`   Exit code: ${code}`);
  if (normalError) {
    console.log(`   Error: ${normalError.trim()}`);
  }
  console.log(`   Output length: ${normalOutput.length} chars`);
});

// Kill after 3 seconds
setTimeout(() => {
  normalTest.kill();
}, 3000);

// Test 2: Terminal resize simulation
setTimeout(() => {
  console.log('\n📱 Test 2: Terminal resize simulation');
  const resizeTest = spawn('node', ['src/tui/dist/index.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      FORCE_TUI: '1',
      COLUMNS: '120',
      LINES: '30'
    },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let resizeOutput = '';
  let resizeError = '';

  resizeTest.stdout.on('data', (data) => {
    resizeOutput += data.toString();
  });

  resizeTest.stderr.on('data', (data) => {
    resizeError += data.toString();
  });

  resizeTest.on('close', (code) => {
    console.log(`   Exit code: ${code}`);
    if (resizeError) {
      console.log(`   Error: ${resizeError.trim()}`);
    }
    console.log(`   Output length: ${resizeOutput.length} chars`);
  });

  // Kill after 3 seconds
  setTimeout(() => {
    resizeTest.kill();
  }, 3000);
}, 4000);

// Test 3: Small terminal (should show error)
setTimeout(() => {
  console.log('\n📱 Test 3: Small terminal (should show error)');
  const smallTest = spawn('node', ['src/tui/dist/index.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      FORCE_TUI: '1',
      COLUMNS: '15',
      LINES: '3'
    },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let smallOutput = '';
  let smallError = '';

  smallTest.stdout.on('data', (data) => {
    smallOutput += data.toString();
  });

  smallTest.stderr.on('data', (data) => {
    smallError += data.toString();
  });

  smallTest.on('close', (code) => {
    console.log(`   Exit code: ${code}`);
    if (smallError) {
      console.log(`   Error: ${smallError.trim()}`);
    }
    console.log(`   Output length: ${smallOutput.length} chars`);
    
    if (smallError.includes('Terminal size too small')) {
      console.log('   ✅ Correctly detected small terminal');
    } else {
      console.log('   ❌ Failed to detect small terminal');
    }
  });

  // Kill after 2 seconds
  setTimeout(() => {
    smallTest.kill();
  }, 2000);
}, 8000);

// Test 4: Rapid resize simulation
setTimeout(() => {
  console.log('\n📱 Test 4: Rapid resize simulation');
  const rapidTest = spawn('node', ['src/tui/dist/index.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      FORCE_TUI: '1',
      COLUMNS: '100',
      LINES: '25'
    },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let rapidOutput = '';
  let rapidError = '';

  rapidTest.stdout.on('data', (data) => {
    rapidOutput += data.toString();
  });

  rapidTest.stderr.on('data', (data) => {
    rapidError += data.toString();
  });

  rapidTest.on('close', (code) => {
    console.log(`   Exit code: ${code}`);
    if (rapidError) {
      console.log(`   Error: ${rapidError.trim()}`);
    }
    console.log(`   Output length: ${rapidOutput.length} chars`);
  });

  // Kill after 2 seconds
  setTimeout(() => {
    rapidTest.kill();
  }, 2000);
}, 12000);

// Summary after all tests
setTimeout(() => {
  console.log('\n📊 Test Summary');
  console.log('================');
  console.log('All refresh/redraw tests completed.');
  console.log('Check the output above for any issues.');
}, 15000);

