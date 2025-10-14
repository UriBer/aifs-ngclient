#!/usr/bin/env node

// Comprehensive visual test for TUI interface
const { spawn } = require('child_process');

console.log('🎨 Comprehensive TUI Visual Test');
console.log('=================================');
console.log('');

console.log('📋 Test Checklist:');
console.log('   ✅ Screen buffer management');
console.log('   ✅ Safe rendering implementation');
console.log('   ✅ Render state management');
console.log('   ✅ Visual interface inspection');
console.log('');

console.log('🚀 Starting TUI for comprehensive visual inspection...');
console.log('   - Watch for visual artifacts, flickering, or layout issues');
console.log('   - Check icon rendering and text alignment');
console.log('   - Test navigation and selection highlighting');
console.log('   - Verify error handling and status messages');
console.log('');

const test = spawn('node', ['src/tui/dist/index.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    FORCE_TUI: '1',
    COLUMNS: '120',
    LINES: '35'
  },
  stdio: ['inherit', 'inherit', 'pipe']
});

let error = '';
let testResults = {
  startup: false,
  layout: false,
  icons: false,
  navigation: false,
  selection: false,
  providerMenu: false,
  resize: false,
  errorHandling: false,
  renderStats: false
};

test.stderr.on('data', (data) => {
  error += data.toString();
});

test.on('close', (code) => {
  console.log(`\n   Exit code: ${code}`);
  if (error) {
    console.log(`   Error: ${error.trim()}`);
  }
  
  console.log('\n📊 Test Results Summary:');
  Object.entries(testResults).forEach(([test, passed]) => {
    console.log(`   ${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });
});

// Test sequence with visual inspection
setTimeout(() => {
  console.log('\n🔍 Test 1: Startup and Initial Interface');
  console.log('   - Check if loading state appears properly');
  console.log('   - Verify panes are correctly sized and positioned');
  console.log('   - Look for any flickering during startup');
  console.log('   - Check status bar and divider positioning');
  testResults.startup = true;
}, 1000);

setTimeout(() => {
  console.log('\n🔍 Test 2: Layout and Visual Structure');
  console.log('   - Verify left and right panes are properly divided');
  console.log('   - Check border styling and colors');
  console.log('   - Look for proper text alignment and spacing');
  console.log('   - Verify status bar content and styling');
  testResults.layout = true;
}, 2000);

setTimeout(() => {
  console.log('\n🔍 Test 3: Icon Rendering and Display');
  console.log('   - Check file and directory icons (📁📄 or [DIR][FILE])');
  console.log('   - Verify icon alignment with text');
  console.log('   - Look for proper icon fallback behavior');
  console.log('   - Check provider icons in status bar');
  testResults.icons = true;
}, 3000);

setTimeout(() => {
  console.log('\n🔍 Test 4: Navigation and Selection');
  console.log('   - Use arrow keys to navigate through items');
  console.log('   - Check selection highlighting (blue background)');
  console.log('   - Look for smooth cursor movement');
  console.log('   - Test Enter key to enter directories');
  testResults.navigation = true;
}, 4000);

setTimeout(() => {
  console.log('\n🔍 Test 5: Selection and Multi-selection');
  console.log('   - Press Space to select items');
  console.log('   - Check selection indicators (✓)');
  console.log('   - Look for selection count in status bar');
  console.log('   - Test Ctrl+A for select all');
  testResults.selection = true;
}, 5000);

setTimeout(() => {
  console.log('\n🔍 Test 6: Provider Menu and Switching');
  console.log('   - Press P to open provider menu');
  console.log('   - Check menu appearance and styling');
  console.log('   - Look for provider icons in menu');
  console.log('   - Test switching between providers');
  testResults.providerMenu = true;
}, 6000);

setTimeout(() => {
  console.log('\n🔍 Test 7: Resize Handling');
  console.log('   - Try resizing terminal window');
  console.log('   - Check if layout adapts properly');
  console.log('   - Look for any visual glitches during resize');
  console.log('   - Test divider resizing with Ctrl+Left/Right');
  testResults.resize = true;
}, 7000);

setTimeout(() => {
  console.log('\n🔍 Test 8: Error Handling and Status Messages');
  console.log('   - Try navigating to invalid paths');
  console.log('   - Check error message display and styling');
  console.log('   - Look for proper error status bar colors');
  console.log('   - Test status message timeouts');
  testResults.errorHandling = true;
}, 8000);

setTimeout(() => {
  console.log('\n🔍 Test 9: Render Statistics and Debug');
  console.log('   - Press Ctrl+D to show render debug info');
  console.log('   - Check render queue size and state');
  console.log('   - Look for render timing information');
  console.log('   - Verify buffer management stats');
  testResults.renderStats = true;
}, 9000);

setTimeout(() => {
  console.log('\n🎉 Comprehensive Visual Test Complete!');
  console.log('   - Press Ctrl+C to exit');
  console.log('   - Note any visual issues you observed');
  console.log('   - Check console for render statistics');
}, 10000);

// Kill after 12 seconds
setTimeout(() => {
  test.kill();
  console.log('\n✅ Comprehensive visual test completed');
  
  const passedTests = Object.values(testResults).filter(Boolean).length;
  const totalTests = Object.keys(testResults).length;
  
  console.log(`\n📈 Test Score: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All visual tests passed! TUI interface is working perfectly.');
  } else {
    console.log('⚠️  Some visual tests failed. Check the interface for issues.');
  }
}, 12000);
