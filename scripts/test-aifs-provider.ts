#!/usr/bin/env node

/**
 * Test script for AifsProvider
 * 
 * This script tests the basic functionality of the AifsProvider
 * against a running AIFS server.
 * 
 * Usage:
 *   npm run test:aifs
 * 
 * Environment variables:
 *   AIFS_ENDPOINT - AIFS server endpoint (default: localhost:50052)
 *   AIFS_AUTH_TOKEN - Optional authentication token
 */

import { AifsProvider } from '../src/main/providers/AifsProvider';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

async function testAifsProvider() {
  console.log('🧪 Testing AifsProvider...\n');
  
  // Initialize provider
  const provider = new AifsProvider({
    endpoint: process.env.AIFS_ENDPOINT || 'localhost:50052',
    token: process.env.AIFS_AUTH_TOKEN
  });
  
  console.log(`📡 Connected to AIFS server at: ${process.env.AIFS_ENDPOINT || 'localhost:50052'}`);
  
  try {
    // Test 1: List namespaces
    console.log('\n1️⃣ Testing namespace listing...');
    try {
      const result = await provider.list('aifs://');
      console.log(`✅ Found ${result.items.length} namespaces`);
      result.items.forEach(item => {
        console.log(`   📁 ${item.name}`);
      });
    } catch (error) {
      console.log(`❌ Failed to list namespaces: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Test 2: List branches in default namespace
    console.log('\n2️⃣ Testing branch listing...');
    try {
      const result = await provider.list('aifs://default');
      console.log(`✅ Found ${result.items.length} branches in default namespace`);
      result.items.forEach(item => {
        console.log(`   🌿 ${item.name}`);
      });
    } catch (error) {
      console.log(`❌ Failed to list branches: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Test 3: Create a test file
    console.log('\n3️⃣ Testing file upload...');
    const testContent = `Hello from AIFS Provider Test!
Timestamp: ${new Date().toISOString()}
Random data: ${Math.random().toString(36).substring(7)}`;
    
    const tempFile = path.join(os.tmpdir(), `aifs-test-${Date.now()}.txt`);
    const testUri = 'aifs://default/main/test-file.txt';
    
    try {
      // Write test content to temp file
      await fs.promises.writeFile(tempFile, testContent);
      console.log(`📝 Created test file: ${tempFile}`);
      
      // Upload to AIFS
      const uploadedObj = await provider.put(tempFile, testUri, {
        contentType: 'text/plain',
        metadata: {
          test: 'true',
          created_by: 'aifs-provider-test'
        }
      });
      
      console.log(`✅ Uploaded file to: ${uploadedObj.uri}`);
      console.log(`   Size: ${uploadedObj.size} bytes`);
      console.log(`   Checksum: ${uploadedObj.checksum}`);
      
      // Clean up temp file
      await fs.promises.unlink(tempFile);
      
    } catch (error) {
      console.log(`❌ Failed to upload file: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Test 4: List assets in main branch
    console.log('\n4️⃣ Testing asset listing...');
    try {
      const result = await provider.list('aifs://default/main');
      console.log(`✅ Found ${result.items.length} assets in main branch`);
      result.items.forEach(item => {
        console.log(`   📄 ${item.name} (${item.size} bytes)`);
      });
    } catch (error) {
      console.log(`❌ Failed to list assets: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Test 5: Download the test file
    console.log('\n5️⃣ Testing file download...');
    try {
      const downloadPath = path.join(os.tmpdir(), `aifs-download-${Date.now()}.txt`);
      await provider.get(testUri, downloadPath);
      
      const downloadedContent = await fs.promises.readFile(downloadPath, 'utf8');
      console.log(`✅ Downloaded file to: ${downloadPath}`);
      console.log(`   Content matches: ${downloadedContent === testContent ? 'Yes' : 'No'}`);
      
      // Clean up downloaded file
      await fs.promises.unlink(downloadPath);
      
    } catch (error) {
      console.log(`❌ Failed to download file: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Test 6: Get file metadata
    console.log('\n6️⃣ Testing file metadata...');
    try {
      const metadata = await provider.stat(testUri);
      console.log(`✅ Retrieved metadata for: ${metadata.name}`);
      console.log(`   Size: ${metadata.size} bytes`);
      console.log(`   Last modified: ${metadata.lastModified}`);
      console.log(`   Checksum: ${metadata.checksum}`);
    } catch (error) {
      console.log(`❌ Failed to get metadata: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Test 7: Check if file exists
    console.log('\n7️⃣ Testing file existence check...');
    try {
      const exists = await provider.exists(testUri);
      console.log(`✅ File exists: ${exists ? 'Yes' : 'No'}`);
    } catch (error) {
      console.log(`❌ Failed to check existence: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Test 8: Delete the test file
    console.log('\n8️⃣ Testing file deletion...');
    try {
      await provider.delete(testUri);
      console.log(`✅ Deleted file: ${testUri}`);
    } catch (error) {
      console.log(`❌ Failed to delete file: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Test 9: Verify file is deleted
    console.log('\n9️⃣ Testing file deletion verification...');
    try {
      const exists = await provider.exists(testUri);
      console.log(`✅ File still exists after deletion: ${exists ? 'Yes' : 'No'}`);
    } catch (error) {
      console.log(`❌ Failed to check existence after deletion: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    console.log('\n🎉 AifsProvider test completed!');
    
  } catch (error) {
    console.error(`💥 Test failed with error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testAifsProvider().catch(console.error);
}

export { testAifsProvider };