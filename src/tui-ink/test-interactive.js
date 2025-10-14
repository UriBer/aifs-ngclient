#!/usr/bin/env node

// Interactive test for TUI keyboard input
import { spawn } from 'child_process';
import { createInterface } from 'readline';

class InteractiveTUITester {
  constructor() {
    this.tuiProcess = null;
    this.testResults = [];
    this.rl = null;
  }

  async startTUI() {
    console.log('🚀 Starting TUI for interactive testing...');
    
    this.tuiProcess = spawn('node', ['dist/index.js'], {
      cwd: process.cwd(),
      env: { ...process.env, FORCE_TUI: '1' },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Handle TUI output
    this.tuiProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('📺 TUI:', output.replace(/\n/g, '\\n'));
    });

    this.tuiProcess.stderr.on('data', (data) => {
      console.error('❌ TUI Error:', data.toString());
    });

    // Wait for TUI to start
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('✅ TUI started');
  }

  async sendKey(key) {
    if (!this.tuiProcess) {
      throw new Error('TUI not started');
    }

    console.log(`🔑 Sending: ${JSON.stringify(key)}`);
    this.tuiProcess.stdin.write(key);
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  async runInteractiveTest() {
    try {
      await this.startTUI();
      
      console.log('\n🎯 Interactive Test Menu:');
      console.log('========================');
      console.log('1. Test Function Keys (F1, F5, F6, F7, F8, F10)');
      console.log('2. Test Navigation Keys (Tab, Arrow Keys, Enter, Space)');
      console.log('3. Test Character Keys (h, j, k, l)');
      console.log('4. Run All Tests');
      console.log('5. Manual Test Mode');
      console.log('0. Exit');
      
      this.rl = createInterface({
        input: process.stdin,
        output: process.stdout
      });

      this.rl.question('\nSelect test (0-5): ', async (choice) => {
        switch (choice) {
          case '1':
            await this.testFunctionKeys();
            break;
          case '2':
            await this.testNavigationKeys();
            break;
          case '3':
            await this.testCharacterKeys();
            break;
          case '4':
            await this.runAllTests();
            break;
          case '5':
            await this.manualTestMode();
            break;
          case '0':
            await this.cleanup();
            process.exit(0);
            break;
          default:
            console.log('Invalid choice');
            this.runInteractiveTest();
        }
      });
      
    } catch (error) {
      console.error('❌ Test failed:', error);
      await this.cleanup();
    }
  }

  async testFunctionKeys() {
    console.log('\n🧪 Testing Function Keys...');
    
    const functionKeys = [
      { key: 'f1', name: 'F1', expected: 'Help modal' },
      { key: 'f5', name: 'F5', expected: 'Copy files' },
      { key: 'f6', name: 'F6', expected: 'Move files' },
      { key: 'f7', name: 'F7', expected: 'Create directory' },
      { key: 'f8', name: 'F8', expected: 'Delete files' },
      { key: 'f10', name: 'F10', expected: 'Quit' }
    ];

    for (const fkey of functionKeys) {
      console.log(`\n🔍 Testing ${fkey.name} (${fkey.expected})...`);
      await this.sendKey(fkey.key);
      
      // Wait for user to see the result
      await new Promise(resolve => {
        this.rl.question('Did it work? (y/n): ', (answer) => {
          const result = {
            key: fkey.name,
            expected: fkey.expected,
            success: answer.toLowerCase() === 'y'
          };
          this.testResults.push(result);
          console.log(`${result.success ? '✅ PASS' : '❌ FAIL'}: ${fkey.name}`);
          resolve();
        });
      });
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
      await this.sendKey(navKey.key);
      
      await new Promise(resolve => {
        this.rl.question('Did it work? (y/n): ', (answer) => {
          const result = {
            key: navKey.name,
            expected: navKey.expected,
            success: answer.toLowerCase() === 'y'
          };
          this.testResults.push(result);
          console.log(`${result.success ? '✅ PASS' : '❌ FAIL'}: ${navKey.name}`);
          resolve();
        });
      });
    }
  }

  async testCharacterKeys() {
    console.log('\n🧪 Testing Character Keys...');
    
    const charKeys = [
      { key: 'h', name: 'H', expected: 'Go up directory' },
      { key: 'j', name: 'J', expected: 'Navigate down' },
      { key: 'k', name: 'K', expected: 'Navigate up' },
      { key: 'l', name: 'L', expected: 'Open directory' }
    ];

    for (const charKey of charKeys) {
      console.log(`\n🔍 Testing ${charKey.name} (${charKey.expected})...`);
      await this.sendKey(charKey.key);
      
      await new Promise(resolve => {
        this.rl.question('Did it work? (y/n): ', (answer) => {
          const result = {
            key: charKey.name,
            expected: charKey.expected,
            success: answer.toLowerCase() === 'y'
          };
          this.testResults.push(result);
          console.log(`${result.success ? '✅ PASS' : '❌ FAIL'}: ${charKey.name}`);
          resolve();
        });
      });
    }
  }

  async runAllTests() {
    console.log('\n🧪 Running All Tests...');
    await this.testFunctionKeys();
    await this.testNavigationKeys();
    await this.testCharacterKeys();
    this.generateReport();
  }

  async manualTestMode() {
    console.log('\n🎮 Manual Test Mode');
    console.log('==================');
    console.log('Send keys to the TUI manually. Type "exit" to quit.');
    
    const manualTest = () => {
      this.rl.question('Enter key to send (or "exit"): ', async (input) => {
        if (input === 'exit') {
          await this.cleanup();
          process.exit(0);
        }
        
        await this.sendKey(input);
        manualTest();
      });
    };
    
    manualTest();
  }

  generateReport() {
    console.log('\n📊 Test Results Summary:');
    console.log('========================');
    
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} ✅`);
    console.log(`Failed: ${failedTests} ❌`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    console.log('\n📋 Detailed Results:');
    this.testResults.forEach(result => {
      console.log(`${result.success ? '✅' : '❌'} ${result.key}: ${result.expected}`);
    });
  }

  async cleanup() {
    if (this.tuiProcess) {
      console.log('\n🧹 Cleaning up...');
      this.tuiProcess.kill();
    }
    if (this.rl) {
      this.rl.close();
    }
  }
}

// Run the interactive tester
const tester = new InteractiveTUITester();
tester.runInteractiveTest().catch(console.error);
