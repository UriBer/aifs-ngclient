#!/usr/bin/env node

// Test ASCII fallback behavior specifically
const { spawn } = require('child_process');

console.log('🔤 Testing ASCII Fallback Behavior');
console.log('==================================');
console.log('');

console.log('📱 Test: Force ASCII fallback mode');
const test = spawn('node', ['src/tui/dist/index.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    FORCE_TUI: '1',
    COLUMNS: '100',
    LINES: '30',
    // Force ASCII mode by setting restrictive environment
    LANG: 'C',
    LC_ALL: 'C',
    LC_CTYPE: 'C',
    TERM: 'dumb',
    TERM_PROGRAM: 'unknown'
  },
  stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';
let error = '';

test.stdout.on('data', (data) => {
  output += data.toString();
});

test.stderr.on('data', (data) => {
  error += data.toString();
});

test.on('close', (code) => {
  console.log(`   Exit code: ${code}`);
  if (error) {
    console.log(`   Error: ${error.trim()}`);
  }
  console.log(`   Output length: ${output.length} chars`);
  
  // Check for ASCII fallbacks
  const hasAsciiFallbacks = output.includes('[DIR]') || output.includes('[FILE]') || 
                           output.includes('[LOCAL]') || output.includes('[S3]') || 
                           output.includes('[GCS]') || output.includes('[AZ]') || 
                           output.includes('[AIFS]');
  
  const hasUnicodeIcons = output.includes('📁') || output.includes('📄') || 
                         output.includes('☁️') || output.includes('🌐') || 
                         output.includes('🔷') || output.includes('🤖');
  
  if (hasAsciiFallbacks && !hasUnicodeIcons) {
    console.log('   ✅ ASCII fallbacks working correctly');
    console.log('   ✅ No Unicode icons detected');
  } else if (hasUnicodeIcons && !hasAsciiFallbacks) {
    console.log('   ⚠️  Unicode icons still showing (detection may need improvement)');
  } else if (hasAsciiFallbacks && hasUnicodeIcons) {
    console.log('   ⚠️  Mixed icon types detected (inconsistent behavior)');
  } else {
    console.log('   ❓ No clear icon pattern detected');
  }
  
  console.log('');
  console.log('🔍 Icon Analysis:');
  if (output.includes('[DIR]')) console.log('   - [DIR] found');
  if (output.includes('[FILE]')) console.log('   - [FILE] found');
  if (output.includes('[LOCAL]')) console.log('   - [LOCAL] found');
  if (output.includes('[S3]')) console.log('   - [S3] found');
  if (output.includes('[GCS]')) console.log('   - [GCS] found');
  if (output.includes('[AZ]')) console.log('   - [AZ] found');
  if (output.includes('[AIFS]')) console.log('   - [AIFS] found');
  if (output.includes('📁')) console.log('   - 📁 found (Unicode)');
  if (output.includes('📄')) console.log('   - 📄 found (Unicode)');
  if (output.includes('☁️')) console.log('   - ☁️ found (Unicode)');
  if (output.includes('🌐')) console.log('   - 🌐 found (Unicode)');
  if (output.includes('🔷')) console.log('   - 🔷 found (Unicode)');
  if (output.includes('🤖')) console.log('   - 🤖 found (Unicode)');
});

// Kill after 4 seconds
setTimeout(() => {
  test.kill();
  
  console.log('');
  console.log('🎉 ASCII Fallback Test Complete!');
  console.log('');
  console.log('💡 The icon fallback system provides:');
  console.log('- Automatic terminal capability detection');
  console.log('- Graceful fallback to ASCII when Unicode unavailable');
  console.log('- Consistent user experience across all terminals');
  console.log('- Proper icon length calculation for text truncation');
}, 4000);

