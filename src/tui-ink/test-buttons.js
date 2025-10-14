#!/usr/bin/env node

// Test script to verify function keys work in the TUI
import { spawn } from 'child_process';

console.log('🧪 Testing TUI Function Keys...\n');

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

// Wait for TUI to start, then test function keys
setTimeout(async () => {
  console.log('\n🎯 Testing Function Keys...\n');
  
  const functionKeys = [
    { key: 'f1', name: 'F1', expected: 'Help modal' },
    { key: 'f5', name: 'F5', expected: 'Copy files' },
    { key: 'f6', name: 'F6', expected: 'Move files' },
    { key: 'f7', name: 'F7', expected: 'Create directory' },
    { key: 'f8', name: 'F8', expected: 'Delete files' },
    { key: 'f10', name: 'F10', expected: 'Quit' }
  ];

  for (const fkey of functionKeys) {
    console.log(`🔍 Testing ${fkey.name} (${fkey.expected})...`);
    
    // Send the function key
    tuiProcess.stdin.write(fkey.key + '\n');
    
    // Wait for response
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check if the key was detected
    const detected = outputBuffer.includes(`${fkey.name} detected`);
    const result = {
      key: fkey.name,
      expected: fkey.expected,
      detected,
      success: detected
    };
    
    testResults.push(result);
    console.log(`   Result: ${result.success ? '✅ PASS' : '❌ FAIL'}`);
    
    if (result.success) {
      console.log(`   ✅ ${fkey.name} was detected successfully`);
    } else {
      console.log(`   ❌ ${fkey.name} was not detected`);
    }
  }
  
  // Test navigation keys
  console.log('\n🎯 Testing Navigation Keys...\n');
  
  const navKeys = [
    { key: '\t', name: 'Tab', expected: 'Switch panes' },
    { key: '\u001b[A', name: 'Up Arrow', expected: 'Navigate up' },
    { key: '\u001b[B', name: 'Down Arrow', expected: 'Navigate down' },
    { key: '\r', name: 'Enter', expected: 'Open directory' },
    { key: ' ', name: 'Space', expected: 'Toggle selection' }
  ];

  for (const navKey of navKeys) {
    console.log(`🔍 Testing ${navKey.name} (${navKey.expected})...`);
    
    // Send the navigation key
    tuiProcess.stdin.write(navKey.key);
    
    // Wait for response
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Check if the key was detected
    const detected = outputBuffer.includes(`${navKey.name} detected`);
    const result = {
      key: navKey.name,
      expected: navKey.expected,
      detected,
      success: detected
    };
    
    testResults.push(result);
    console.log(`   Result: ${result.success ? '✅ PASS' : '❌ FAIL'}`);
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
