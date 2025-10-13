#!/usr/bin/env node

// Comprehensive Provider Test Suite
import blessed from 'blessed';
import { ConfigManager } from './dist/ConfigManager.js';

console.log('Starting Provider Test Suite...');

const screen = blessed.screen({
  smartCSR: true,
  title: 'Provider Test Suite',
  cursor: {
    artificial: true,
    shape: 'block',
    blink: true,
    color: 'black'
  }
});

// Create main container
const mainBox = blessed.box({
  parent: screen,
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  border: {
    type: 'line'
  },
  style: {
    border: {
      fg: 'blue'
    },
    fg: 'black',
    bg: 'white'
  },
  label: 'Provider Test Suite',
  keys: true,
  vi: true,
  mouse: true
});

// Create test results area
const resultsBox = blessed.box({
  parent: mainBox,
  top: 1,
  left: 1,
  width: '100%-2',
  height: '100%-2',
  border: {
    type: 'line'
  },
  style: {
    border: {
      fg: 'gray'
    },
    fg: 'black',
    bg: 'white'
  },
  label: 'Test Results',
  keys: true,
  vi: true,
  mouse: true,
  scrollable: true,
  alwaysScroll: true
});

// Create status bar
const statusBar = blessed.box({
  parent: screen,
  top: '100%-1',
  left: 0,
  width: '100%',
  height: 1,
  style: {
    bg: 'dark-gray',
    fg: 'white',
    bold: true
  }
});

let configManager;
let testResults = [];

// Initialize
async function initialize() {
  try {
    configManager = new ConfigManager();
    statusBar.content = 'Provider Test Suite - Press T to run tests, ESC to exit';
    screen.render();
  } catch (error) {
    showError(`Failed to initialize: ${error.message}`);
  }
}

// Show error message
function showError(message) {
  const errorBox = blessed.box({
    parent: screen,
    top: 'center',
    left: 'center',
    width: '60%',
    height: 6,
    border: { type: 'line' },
    style: {
      border: { fg: 'red' },
      fg: 'black',
      bg: 'white'
    },
    content: `Error: ${message}`,
    keys: true,
    vi: true,
    mouse: true
  });

  errorBox.key(['escape', 'enter', 'space'], () => {
    errorBox.detach();
    screen.render();
  });

  errorBox.focus();
  screen.render();
}

// Show success message
function showSuccess(message) {
  const successBox = blessed.box({
    parent: screen,
    top: 'center',
    left: 'center',
    width: '60%',
    height: 6,
    border: { type: 'line' },
    style: {
      border: { fg: 'green' },
      fg: 'black',
      bg: 'white'
    },
    content: `Success: ${message}`,
    keys: true,
    vi: true,
    mouse: true
  });

  successBox.key(['escape', 'enter', 'space'], () => {
    successBox.detach();
    screen.render();
  });

  successBox.focus();
  screen.render();

  // Auto-close after 3 seconds
  setTimeout(() => {
    successBox.detach();
    screen.render();
  }, 3000);
}

// Add test result
function addTestResult(provider, test, result, message) {
  const timestamp = new Date().toLocaleTimeString();
  const status = result ? '✓' : '✗';
  const color = result ? 'green' : 'red';
  
  testResults.push({ provider, test, result, message, timestamp });
  
  const resultText = `[${timestamp}] ${status} ${provider} - ${test}: ${message}`;
  resultsBox.insertLine(resultText);
  resultsBox.setScrollPerc(100);
  screen.render();
}

// Test file provider
async function testFileProvider() {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const os = await import('os');
    
    const homeDir = os.homedir();
    const testFile = path.join(homeDir, '.aifs-test-file');
    
    // Test write
    await fs.writeFile(testFile, 'test');
    addTestResult('File System', 'Write Test', true, 'File write successful');
    
    // Test read
    const content = await fs.readFile(testFile, 'utf8');
    if (content === 'test') {
      addTestResult('File System', 'Read Test', true, 'File read successful');
    } else {
      addTestResult('File System', 'Read Test', false, 'File content mismatch');
    }
    
    // Test delete
    await fs.unlink(testFile);
    addTestResult('File System', 'Delete Test', true, 'File delete successful');
    
    return true;
  } catch (error) {
    addTestResult('File System', 'File Operations', false, error.message);
    return false;
  }
}

// Test S3 provider
async function testS3Provider() {
  try {
    const provider = await configManager.getProviderConfig('s3');
    if (!provider) {
      addTestResult('S3', 'Configuration', false, 'Provider not configured');
      return false;
    }

    if (!provider.enabled) {
      addTestResult('S3', 'Configuration', false, 'Provider not enabled');
      return false;
    }

    // Validate credentials
    const validation = await configManager.validateProviderConfig('s3');
    if (!validation.valid) {
      addTestResult('S3', 'Configuration', false, `Validation failed: ${validation.errors.join(', ')}`);
      return false;
    }

    addTestResult('S3', 'Configuration', true, 'Configuration valid');

    // Test AWS SDK import
    try {
      const { S3Client } = await import('@aws-sdk/client-s3');
      addTestResult('S3', 'SDK Import', true, 'AWS SDK available');
    } catch (error) {
      addTestResult('S3', 'SDK Import', false, 'AWS SDK not available');
      return false;
    }

    return true;
  } catch (error) {
    addTestResult('S3', 'Configuration', false, error.message);
    return false;
  }
}

// Test GCS provider
async function testGCSProvider() {
  try {
    const provider = await configManager.getProviderConfig('gcs');
    if (!provider) {
      addTestResult('GCS', 'Configuration', false, 'Provider not configured');
      return false;
    }

    if (!provider.enabled) {
      addTestResult('GCS', 'Configuration', false, 'Provider not enabled');
      return false;
    }

    // Validate credentials
    const validation = await configManager.validateProviderConfig('gcs');
    if (!validation.valid) {
      addTestResult('GCS', 'Configuration', false, `Validation failed: ${validation.errors.join(', ')}`);
      return false;
    }

    addTestResult('GCS', 'Configuration', true, 'Configuration valid');

    // Test Google Cloud SDK import
    try {
      await import('@google-cloud/storage');
      addTestResult('GCS', 'SDK Import', true, 'Google Cloud SDK available');
    } catch (error) {
      addTestResult('GCS', 'SDK Import', false, 'Google Cloud SDK not available');
      return false;
    }

    return true;
  } catch (error) {
    addTestResult('GCS', 'Configuration', false, error.message);
    return false;
  }
}

// Test Azure provider
async function testAzureProvider() {
  try {
    const provider = await configManager.getProviderConfig('az');
    if (!provider) {
      addTestResult('Azure', 'Configuration', false, 'Provider not configured');
      return false;
    }

    if (!provider.enabled) {
      addTestResult('Azure', 'Configuration', false, 'Provider not enabled');
      return false;
    }

    // Validate credentials
    const validation = await configManager.validateProviderConfig('az');
    if (!validation.valid) {
      addTestResult('Azure', 'Configuration', false, `Validation failed: ${validation.errors.join(', ')}`);
      return false;
    }

    addTestResult('Azure', 'Configuration', true, 'Configuration valid');

    // Test Azure SDK import
    try {
      await import('@azure/storage-blob');
      addTestResult('Azure', 'SDK Import', true, 'Azure SDK available');
    } catch (error) {
      addTestResult('Azure', 'SDK Import', false, 'Azure SDK not available');
      return false;
    }

    return true;
  } catch (error) {
    addTestResult('Azure', 'Configuration', false, error.message);
    return false;
  }
}

// Test AIFS provider
async function testAIFSProvider() {
  try {
    const provider = await configManager.getProviderConfig('aifs');
    if (!provider) {
      addTestResult('AIFS', 'Configuration', false, 'Provider not configured');
      return false;
    }

    if (!provider.enabled) {
      addTestResult('AIFS', 'Configuration', false, 'Provider not enabled');
      return false;
    }

    // Validate credentials
    const validation = await configManager.validateProviderConfig('aifs');
    if (!validation.valid) {
      addTestResult('AIFS', 'Configuration', false, `Validation failed: ${validation.errors.join(', ')}`);
      return false;
    }

    addTestResult('AIFS', 'Configuration', true, 'Configuration valid');

    // Test gRPC import
    try {
      await import('@grpc/grpc-js');
      addTestResult('AIFS', 'gRPC Import', true, 'gRPC library available');
    } catch (error) {
      addTestResult('AIFS', 'gRPC Import', false, 'gRPC library not available');
      return false;
    }

    return true;
  } catch (error) {
    addTestResult('AIFS', 'Configuration', false, error.message);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  resultsBox.setContent('Running Provider Tests...\n\n');
  testResults = [];
  screen.render();

  const tests = [
    { name: 'File System', fn: testFileProvider },
    { name: 'S3', fn: testS3Provider },
    { name: 'GCS', fn: testGCSProvider },
    { name: 'Azure', fn: testAzureProvider },
    { name: 'AIFS', fn: testAIFSProvider }
  ];

  let passed = 0;
  let total = 0;

  for (const test of tests) {
    addTestResult('Test Suite', 'Starting', true, `Testing ${test.name} provider`);
    try {
      const result = await test.fn();
      if (result) passed++;
      total++;
    } catch (error) {
      addTestResult(test.name, 'Test Execution', false, error.message);
      total++;
    }
  }

  // Summary
  addTestResult('Test Suite', 'Summary', true, `Tests completed: ${passed}/${total} passed`);
  
  if (passed === total) {
    showSuccess(`All tests passed! (${passed}/${total})`);
  } else {
    showError(`Some tests failed: ${passed}/${total} passed`);
  }
}

// Key handlers
mainBox.key(['t', 'T'], () => {
  runAllTests();
});

mainBox.key(['escape'], () => {
  process.exit(0);
});

screen.key(['C-c'], () => {
  process.exit(0);
});

// Initialize and start
initialize().then(() => {
  resultsBox.focus();
  screen.render();
});

console.log('Provider Test Suite started. Press T to run tests, ESC to exit.');
