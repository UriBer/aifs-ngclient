#!/usr/bin/env node

// Test script to verify file listing API
const { FileProvider } = require('./working-electron-app/src/providers/FileProvider');

async function testFileListing() {
    console.log('Testing file listing API...');
    
    const fileProvider = new FileProvider();
    
    try {
        // Test with Documents directory
        const homeDir = process.env.HOME;
        const documentsPath = `file://${homeDir}/Documents/`;
        
        console.log(`Testing path: ${documentsPath}`);
        
        const result = await fileProvider.list(documentsPath);
        console.log('Result:', JSON.stringify(result, null, 2));
        
        if (result.items && result.items.length > 0) {
            console.log(`✅ Successfully listed ${result.items.length} items`);
            result.items.slice(0, 5).forEach(item => {
                console.log(`  - ${item.name} (${item.isDir ? 'DIR' : 'FILE'})`);
            });
            if (result.items.length > 5) {
                console.log(`  ... and ${result.items.length - 5} more items`);
            }
        } else {
            console.log('❌ No items found in directory');
        }
        
    } catch (error) {
        console.error('❌ Error testing file listing:', error.message);
    }
}

testFileListing();
