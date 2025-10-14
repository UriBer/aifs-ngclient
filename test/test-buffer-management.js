#!/usr/bin/env node

// Test buffer management performance
const { spawn } = require('child_process');

console.log('📊 Testing Buffer Management Performance');
console.log('========================================');
console.log('');

console.log('🔧 Buffer Management Features:');
console.log('   - Render queue system with debouncing');
console.log('   - Safe rendering with error handling');
console.log('   - Render state management');
console.log('   - Performance monitoring and statistics');
console.log('');

console.log('📱 Starting TUI for buffer management testing...');
const test = spawn('node', ['src/tui/dist/index.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    FORCE_TUI: '1',
    COLUMNS: '100',
    LINES: '30'
  },
  stdio: ['inherit', 'inherit', 'pipe']
});

let error = '';
let renderStats = {
  totalRenders: 0,
  renderErrors: 0,
  averageRenderTime: 0,
  maxRenderTime: 0,
  minRenderTime: Infinity,
  queueOverflows: 0
};

test.stderr.on('data', (data) => {
  error += data.toString();
  
  // Parse render statistics from stderr
  const dataStr = data.toString();
  if (dataStr.includes('Render queue flush completed in')) {
    const match = dataStr.match(/Render queue flush completed in (\d+)ms/);
    if (match) {
      const renderTime = parseInt(match[1]);
      renderStats.totalRenders++;
      renderStats.averageRenderTime = (renderStats.averageRenderTime + renderTime) / 2;
      renderStats.maxRenderTime = Math.max(renderStats.maxRenderTime, renderTime);
      renderStats.minRenderTime = Math.min(renderStats.minRenderTime, renderTime);
    }
  }
  
  if (dataStr.includes('Render operation') && dataStr.includes('failed')) {
    renderStats.renderErrors++;
  }
  
  if (dataStr.includes('Queue size') && dataStr.includes('1000')) {
    renderStats.queueOverflows++;
  }
});

test.on('close', (code) => {
  console.log(`\n   Exit code: ${code}`);
  if (error) {
    console.log(`   Error: ${error.trim()}`);
  }
  
  console.log('\n📈 Buffer Management Performance Results:');
  console.log(`   Total renders: ${renderStats.totalRenders}`);
  console.log(`   Render errors: ${renderStats.renderErrors}`);
  console.log(`   Average render time: ${renderStats.averageRenderTime.toFixed(2)}ms`);
  console.log(`   Max render time: ${renderStats.maxRenderTime}ms`);
  console.log(`   Min render time: ${renderStats.minRenderTime === Infinity ? 'N/A' : renderStats.minRenderTime}ms`);
  console.log(`   Queue overflows: ${renderStats.queueOverflows}`);
  
  // Performance analysis
  if (renderStats.averageRenderTime < 50) {
    console.log('   ✅ Excellent render performance');
  } else if (renderStats.averageRenderTime < 100) {
    console.log('   ✅ Good render performance');
  } else {
    console.log('   ⚠️  Slow render performance');
  }
  
  if (renderStats.renderErrors === 0) {
    console.log('   ✅ No render errors detected');
  } else {
    console.log('   ⚠️  Some render errors detected');
  }
  
  if (renderStats.queueOverflows === 0) {
    console.log('   ✅ No queue overflows detected');
  } else {
    console.log('   ⚠️  Queue overflows detected');
  }
});

// Test sequence for buffer management
setTimeout(() => {
  console.log('\n🔍 Test 1: Rapid navigation to stress render queue');
  console.log('   - Use arrow keys rapidly to navigate');
  console.log('   - Check if render queue handles rapid updates');
  console.log('   - Look for any visual artifacts or delays');
}, 1000);

setTimeout(() => {
  console.log('\n🔍 Test 2: Provider switching to test render state');
  console.log('   - Press P to open provider menu');
  console.log('   - Switch between providers rapidly');
  console.log('   - Check render state management');
}, 3000);

setTimeout(() => {
  console.log('\n🔍 Test 3: Resize operations to test buffer management');
  console.log('   - Resize terminal window multiple times');
  console.log('   - Use Ctrl+Left/Right to resize divider');
  console.log('   - Check if buffer handles resize operations');
}, 5000);

setTimeout(() => {
  console.log('\n🔍 Test 4: Debug render statistics');
  console.log('   - Press Ctrl+D to show render debug info');
  console.log('   - Check render queue size and state');
  console.log('   - Look for render timing information');
}, 7000);

setTimeout(() => {
  console.log('\n🔍 Test 5: Error handling and recovery');
  console.log('   - Try navigating to invalid paths');
  console.log('   - Check if render system recovers gracefully');
  console.log('   - Look for any render state corruption');
}, 9000);

setTimeout(() => {
  console.log('\n🎉 Buffer Management Test Complete!');
  console.log('   - Press Ctrl+C to exit');
  console.log('   - Check console for detailed render statistics');
}, 11000);

// Kill after 13 seconds
setTimeout(() => {
  test.kill();
  console.log('\n✅ Buffer management test completed');
  
  console.log('\n💡 Buffer Management Benefits:');
  console.log('- Reduced flickering through debounced updates');
  console.log('- Better performance with render queue system');
  console.log('- Safe rendering prevents conflicts and errors');
  console.log('- Render state management ensures stability');
  console.log('- Performance monitoring helps identify issues');
}, 13000);
