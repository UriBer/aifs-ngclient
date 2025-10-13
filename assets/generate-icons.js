#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Create a simple 512x512 PNG icon using a basic approach
// This is a placeholder - in production you'd want proper icon files

const createSimpleIcon = (size, filename) => {
  // Create a simple colored square as placeholder
  const canvas = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="#2563eb"/>
      <text x="50%" y="50%" text-anchor="middle" dy=".3em" 
            font-family="Arial, sans-serif" font-size="${size/4}" 
            fill="white" font-weight="bold">AIFS</text>
    </svg>
  `;
  
  fs.writeFileSync(path.join(__dirname, filename), canvas);
  console.log(`Created ${filename} (${size}x${size})`);
};

// Generate different icon formats
createSimpleIcon(512, 'icon.png');
createSimpleIcon(256, 'icon-256.png');
createSimpleIcon(128, 'icon-128.png');
createSimpleIcon(64, 'icon-64.png');
createSimpleIcon(32, 'icon-32.png');
createSimpleIcon(16, 'icon-16.png');

console.log('Icon generation complete!');
console.log('Note: These are placeholder icons. For production, use proper icon design tools.');

