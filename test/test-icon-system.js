#!/usr/bin/env node

// Test the icon system directly
const { TuiApplication } = require('../src/tui/dist/TuiApplication.js');

console.log('🎨 Testing Icon System Directly');
console.log('================================');
console.log('');

// Create a mock FileItem for testing
const mockFileItem = {
  name: 'test-file.txt',
  isDirectory: false,
  size: 1024,
  mtime: new Date(),
  uri: 'file:///test/test-file.txt'
};

const mockDirItem = {
  name: 'test-directory',
  isDirectory: true,
  size: 0,
  mtime: new Date(),
  uri: 'file:///test/test-directory'
};

// Test different terminal environments
const environments = [
  {
    name: 'Unicode Terminal',
    env: {
      LANG: 'en_US.UTF-8',
      TERM: 'xterm-256color'
    }
  },
  {
    name: 'ASCII Terminal',
    env: {
      LANG: 'C',
      LC_ALL: 'C',
      TERM: 'dumb'
    }
  },
  {
    name: 'VT100 Terminal',
    env: {
      LANG: 'C',
      LC_ALL: 'C',
      TERM: 'vt100'
    }
  }
];

environments.forEach((env, index) => {
  console.log(`📱 Test ${index + 1}: ${env.name}`);
  
  // Set environment variables
  Object.assign(process.env, env.env);
  
  // Create TuiApplication instance
  const app = new TuiApplication();
  
  // Access private methods for testing (this is a bit hacky but works for testing)
  const detectTerminalCapabilities = app.detectTerminalCapabilities.bind(app);
  const getFileIcon = app.getFileIcon.bind(app);
  
  // Test terminal detection
  detectTerminalCapabilities();
  
  // Test file icons
  const fileIcon = getFileIcon(mockFileItem);
  const dirIcon = getFileIcon(mockDirItem);
  
  console.log(`   Terminal supports Unicode: ${app.terminalSupportsUnicode}`);
  console.log(`   File icon: "${fileIcon}"`);
  console.log(`   Directory icon: "${dirIcon}"`);
  
  // Verify expected behavior
  if (env.name === 'Unicode Terminal') {
    if (fileIcon === '📄' && dirIcon === '📁') {
      console.log('   ✅ Unicode icons working correctly');
    } else {
      console.log('   ❌ Unicode icons not working');
    }
  } else {
    if (fileIcon === '[FILE]' && dirIcon === '[DIR]') {
      console.log('   ✅ ASCII fallbacks working correctly');
    } else {
      console.log('   ❌ ASCII fallbacks not working');
    }
  }
  
  console.log('');
});

console.log('🎉 Icon System Tests Complete!');
console.log('');
console.log('✨ The icon fallback system provides:');
console.log('- Automatic terminal capability detection');
console.log('- Graceful fallback to ASCII when Unicode unavailable');
console.log('- Consistent user experience across all terminals');
console.log('- Proper icon length calculation for text truncation');
