#!/usr/bin/env node

// Mock input test that simulates keyboard input without raw mode
import { spawn } from 'child_process';

console.log('🧪 Testing TUI Input Handling (Mock)...\n');

// Start the TUI process
const tuiProcess = spawn('node', ['dist/index.js'], {
  cwd: process.cwd(),
  env: { ...process.env, FORCE_TUI: '1' },
  stdio: ['pipe', 'pipe', 'pipe']
});

let outputBuffer = '';
let testResults = [];

// Capture TUI output
tuiProcess.stdout.on('data', (data) => {
  const output = data.toString();
  outputBuffer += output;
  console.log('📺 TUI Output:', output.replace(/\n/g, '\\n'));
});

tuiProcess.stderr.on('data', (data) => {
  console.error('❌ TUI Error:', data.toString());
});

// Wait for TUI to start, then test input
setTimeout(async () => {
  console.log('\n🎯 Testing Input Handling...\n');
  
  // Test basic input
  const testInputs = [
    { input: 'f1\n', name: 'F1', expected: 'Help modal' },
    { input: 'f5\n', name: 'F5', expected: 'Copy files' },
    { input: 'f6\n', name: 'F6', expected: 'Move files' },
    { input: 'f7\n', name: 'F7', expected: 'Create directory' },
    { input: 'f8\n', name: 'F8', expected: 'Delete files' },
    { input: 'f10\n', name: 'F10', expected: 'Quit' },
    { input: 'h\n', name: 'H', expected: 'Go up directory' },
    { input: 'j\n', name: 'J', expected: 'Navigate down' },
    { input: 'k\n', name: 'K', expected: 'Navigate up' },
    { input: 'l\n', name: 'L', expected: 'Open directory' }
  ];

  for (const test of testInputs) {
    console.log(`🔍 Testing ${test.name} (${test.expected})...`);
    
    // Send the input
    tuiProcess.stdin.write(test.input);
    
    // Wait for response
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check if the input was detected
    const detected = outputBuffer.includes(`${test.name} detected`) || 
                    outputBuffer.includes(`${test.name} key detected`);
    const result = {
      key: test.name,
      expected: test.expected,
      detected,
      success: detected
    };
    
    testResults.push(result);
    console.log(`   Result: ${result.success ? '✅ PASS' : '❌ FAIL'}`);
    
    if (result.success) {
      console.log(`   ✅ ${test.name} was detected successfully`);
    } else {
      console.log(`   ❌ ${test.name} was not detected`);
    }
  }
  
  // Generate test report
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  
  const totalTests = testResults.length;
  const passedTests = testResults.filter(r => r.success).length;
  const failedTests = totalTests - passedTests;
  
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests} ✅`);
  console.log(`Failed: ${failedTests} ❌`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  console.log('\n📋 Detailed Results:');
  testResults.forEach(result => {
    console.log(`${result.success ? '✅' : '❌'} ${result.key}: ${result.expected}`);
  });
  
  console.log('\n🔍 Raw Output Buffer:');
  console.log('====================');
  console.log(JSON.stringify(outputBuffer.substring(0, 1000)));
  
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
