#!/usr/bin/env node

// Dynamic keyboard input test for TUI
import { spawn } from 'child_process';
import { createInterface } from 'readline';

class TUITester {
  constructor() {
    this.tuiProcess = null;
    this.testResults = [];
    this.currentTest = null;
  }

  async startTUI() {
    console.log('🚀 Starting TUI for testing...');
    
    this.tuiProcess = spawn('node', ['dist/index.js'], {
      cwd: process.cwd(),
      env: { ...process.env, FORCE_TUI: '1' },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Handle TUI output
    this.tuiProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('TUI Output:', output);
      
      if (this.currentTest) {
        this.currentTest.output += output;
      }
    });

    this.tuiProcess.stderr.on('data', (data) => {
      console.error('TUI Error:', data.toString());
    });

    // Wait for TUI to start
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('✅ TUI started');
  }

  async sendKey(key) {
    if (!this.tuiProcess) {
      throw new Error('TUI not started');
    }

    console.log(`🔑 Sending key: ${JSON.stringify(key)}`);
    
    // Send key to TUI stdin
    this.tuiProcess.stdin.write(key);
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  async testFunctionKeys() {
    console.log('\n🧪 Testing Function Keys...');
    
    const functionKeys = [
      { key: '\u001bOP', name: 'F1', expected: 'Help modal' },
      { key: '\u001b[15~', name: 'F5', expected: 'Copy files' },
      { key: '\u001b[17~', name: 'F6', expected: 'Move files' },
      { key: '\u001b[18~', name: 'F7', expected: 'Create directory' },
      { key: '\u001b[19~', name: 'F8', expected: 'Delete files' },
      { key: '\u001b[21~', name: 'F10', expected: 'Quit' }
    ];

    for (const fkey of functionKeys) {
      console.log(`\n🔍 Testing ${fkey.name} (${fkey.expected})...`);
      
      this.currentTest = {
        name: fkey.name,
        expected: fkey.expected,
        output: '',
        startTime: Date.now()
      };

      await this.sendKey(fkey.key);
      
      // Wait for response
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const result = {
        key: fkey.name,
        expected: fkey.expected,
        output: this.currentTest.output,
        duration: Date.now() - this.currentTest.startTime,
        success: this.currentTest.output.includes('detected') || 
                 this.currentTest.output.includes('Help') ||
                 this.currentTest.output.includes('Copy') ||
                 this.currentTest.output.includes('Move') ||
                 this.currentTest.output.includes('Create') ||
                 this.currentTest.output.includes('Delete')
      };

      this.testResults.push(result);
      console.log(`   Result: ${result.success ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`   Output: ${result.output.substring(0, 100)}...`);
    }
  }

  async testNavigationKeys() {
    console.log('\n🧪 Testing Navigation Keys...');
    
    const navKeys = [
      { key: '\t', name: 'Tab', expected: 'Switch panes' },
      { key: '\u001b[A', name: 'Up Arrow', expected: 'Navigate up' },
      { key: '\u001b[B', name: 'Down Arrow', expected: 'Navigate down' },
      { key: '\r', name: 'Enter', expected: 'Open directory' },
      { key: ' ', name: 'Space', expected: 'Toggle selection' }
    ];

    for (const navKey of navKeys) {
      console.log(`\n🔍 Testing ${navKey.name} (${navKey.expected})...`);
      
      this.currentTest = {
        name: navKey.name,
        expected: navKey.expected,
        output: '',
        startTime: Date.now()
      };

      await this.sendKey(navKey.key);
      
      // Wait for response
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const result = {
        key: navKey.name,
        expected: navKey.expected,
        output: this.currentTest.output,
        duration: Date.now() - this.currentTest.startTime,
        success: this.currentTest.output.includes('detected') ||
                 this.currentTest.output.includes('Tab') ||
                 this.currentTest.output.includes('arrow') ||
                 this.currentTest.output.includes('Enter') ||
                 this.currentTest.output.includes('Space')
      };

      this.testResults.push(result);
      console.log(`   Result: ${result.success ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`   Output: ${result.output.substring(0, 100)}...`);
    }
  }

  async testInputSequence() {
    console.log('\n🧪 Testing Input Sequence...');
    
    const sequence = [
      { key: '\u001bOP', name: 'F1', delay: 500 },
      { key: '\t', name: 'Tab', delay: 300 },
      { key: '\u001b[A', name: 'Up', delay: 300 },
      { key: '\u001b[B', name: 'Down', delay: 300 },
      { key: ' ', name: 'Space', delay: 300 },
      { key: '\u001b[15~', name: 'F5', delay: 500 }
    ];

    console.log('🎬 Running input sequence...');
    
    for (const step of sequence) {
      console.log(`   Sending ${step.name}...`);
      await this.sendKey(step.key);
      await new Promise(resolve => setTimeout(resolve, step.delay));
    }
  }

  async runAllTests() {
    try {
      console.log('🧪 Starting Dynamic TUI Tests...\n');
      
      await this.startTUI();
      
      await this.testFunctionKeys();
      await this.testNavigationKeys();
      await this.testInputSequence();
      
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Test failed:', error);
    } finally {
      await this.cleanup();
    }
  }

  generateReport() {
    console.log('\n📊 Test Results Summary:');
    console.log('========================');
    
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} ✅`);
    console.log.log(`Failed: ${failedTests} ❌`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    console.log('\n📋 Detailed Results:');
    this.testResults.forEach(result => {
      console.log(`${result.success ? '✅' : '❌'} ${result.key}: ${result.expected}`);
      if (!result.success) {
        console.log(`   Output: ${result.output.substring(0, 200)}...`);
      }
    });
    
    // Save results to file
    const fs = require('fs');
    const reportData = {
      timestamp: new Date().toISOString(),
      totalTests,
      passedTests,
      failedTests,
      successRate: (passedTests / totalTests) * 100,
      results: this.testResults
    };
    
    fs.writeFileSync('test-results.json', JSON.stringify(reportData, null, 2));
    console.log('\n💾 Results saved to test-results.json');
  }

  async cleanup() {
    if (this.tuiProcess) {
      console.log('\n🧹 Cleaning up...');
      this.tuiProcess.kill();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// Run the tests
const tester = new TUITester();
tester.runAllTests().catch(console.error);
