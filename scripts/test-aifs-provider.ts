/**
 * Test script for the AIFS provider
 * 
 * This script demonstrates the basic functionality of the AIFS provider.
 * 
 * Usage:
 * npm run ts-node scripts/test-aifs-provider.ts
 */

const { AifsProvider } = require('../src/main/providers/AifsProvider');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Configuration
const AIFS_ENDPOINT = process.env.AIFS_API_ENDPOINT || 'http://localhost:50051';
const AIFS_API_KEY = process.env.AIFS_API_KEY || 'your-api-key';
const TEST_NAMESPACE = 'test-namespace';
const TEST_FILE_CONTENT = 'This is a test file for AIFS.';

// Create a temporary directory and file for testing
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aifs-test-'));
const tempFilePath = path.join(tempDir, 'test-file.txt');
fs.writeFileSync(tempFilePath, TEST_FILE_CONTENT);

console.log(`Created temporary file at ${tempFilePath}`);

// Initialize the AIFS provider
const provider = new AifsProvider({ endpoint: AIFS_ENDPOINT, apiKey: AIFS_API_KEY });

async function runTests() {
  try {
    console.log('Testing AIFS provider...');
    
    // Test mkdir
    console.log('\nCreating test directory...');
    const dirUri = `aifs://${TEST_NAMESPACE}/test-dir/`;
    await provider.mkdir(dirUri, true);
    console.log(`Created directory: ${dirUri}`);
    
    // Test write
    console.log('\nUploading test file...');
    const fileUri = `aifs://${TEST_NAMESPACE}/test-dir/test-file.txt`;
    const fileContent = fs.readFileSync(tempFilePath);
    await provider.write(fileUri, fileContent, {
      semanticTags: ['test', 'example', 'documentation'],
      contentType: 'text/plain'
    });
    console.log(`Uploaded file: ${fileUri}`);
    
    // Test list
    console.log('\nListing files in directory...');
    const listResult = await provider.list(`aifs://${TEST_NAMESPACE}/test-dir/`);
    console.log('Files in directory:');
    listResult.items.forEach((item: any) => {
      console.log(`- ${item.name} (${item.size} bytes, isDir: ${item.isDir})`);
    });
    
    // Test stat
    console.log('\nGetting file metadata...');
    const fileStat = await provider.stat(fileUri);
    console.log('File metadata:');
    console.log(`- Name: ${fileStat.name}`);
    console.log(`- Size: ${fileStat.size} bytes`);
    console.log(`- Last modified: ${fileStat.lastModified}`);
    console.log(`- Checksum: ${fileStat.checksum}`);
    console.log(`- Semantic tags: ${JSON.stringify(fileStat.semanticTags)}`);
    
    // Test semantic search
    console.log('\nPerforming semantic search...');
    const searchResult = await provider.list(`aifs://${TEST_NAMESPACE}/`, {
      semanticQuery: 'example documentation'
    });
    console.log(`Found ${searchResult.items.length} results for semantic search`);
    
    // Test copy
    console.log('\nCopying file...');
    const copyUri = `aifs://${TEST_NAMESPACE}/test-dir/test-file-copy.txt`;
    await provider.copy(fileUri, copyUri);
    console.log(`Copied file to: ${copyUri}`);
    
    // Test read
    console.log('\nDownloading file...');
    const downloadPath = path.join(tempDir, 'downloaded-file.txt');
    const downloadedBuffer = await provider.read(copyUri);
    fs.writeFileSync(downloadPath, downloadedBuffer);
    console.log(`Downloaded file to: ${downloadPath}`);
    const downloadedContent = fs.readFileSync(downloadPath, 'utf8');
    console.log(`Downloaded content: ${downloadedContent}`);
    console.log(`Content matches original: ${downloadedContent === TEST_FILE_CONTENT}`);
    
    // Test move
    console.log('\nMoving file...');
    const moveUri = `aifs://${TEST_NAMESPACE}/test-dir/test-file-moved.txt`;
    await provider.move(copyUri, moveUri);
    console.log(`Moved file to: ${moveUri}`);
    
    // Test exists
    console.log('\nChecking if files exist...');
    const originalExists = await provider.exists(fileUri);
    const movedExists = await provider.exists(moveUri);
    const copyExists = await provider.exists(copyUri);
    console.log(`Original file exists: ${originalExists}`);
    console.log(`Moved file exists: ${movedExists}`);
    console.log(`Copy file exists (should be false): ${copyExists}`);
    
    // Test delete
    console.log('\nDeleting files...');
    await provider.delete(fileUri);
    await provider.delete(moveUri);
    console.log('Files deleted');
    
    // Test recursive delete
    console.log('\nDeleting directory recursively...');
    await provider.delete(dirUri, true);
    console.log(`Directory deleted: ${dirUri}`);
    
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Error during tests:', error);
  } finally {
    // Clean up temporary files
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log(`\nCleaned up temporary directory: ${tempDir}`);
    } catch (cleanupError) {
      console.error('Error cleaning up:', cleanupError);
    }
  }
}

runTests();