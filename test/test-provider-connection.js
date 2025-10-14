#!/usr/bin/env node

// Provider Connection Test Script
const { ConfigManager } = require('../src/tui/dist/ConfigManager.js');

console.log('Provider Connection Test Script');
console.log('================================');

async function testProviderConnections() {
  const configManager = new ConfigManager();
  
  try {
    const config = await configManager.loadConfig();
    console.log(`\nLoaded configuration with ${config.providers.length} providers\n`);

    for (const provider of config.providers) {
      console.log(`Testing ${provider.name} (${provider.scheme}):`);
      console.log(`  Status: ${provider.enabled ? '✓ Enabled' : '✗ Disabled'}`);
      
      if (provider.enabled) {
        // Validate configuration
        const validation = await configManager.validateProviderConfig(provider.scheme);
        if (validation.valid) {
          console.log(`  Configuration: ✓ Valid`);
          
          // Test connection based on provider type
          switch (provider.scheme) {
            case 'file':
              await testFileConnection();
              break;
            case 's3':
              await testS3Connection(provider);
              break;
            case 'gcs':
              await testGCSConnection(provider);
              break;
            case 'az':
              await testAzureConnection(provider);
              break;
            case 'aifs':
              await testAIFSConnection(provider);
              break;
            default:
              console.log(`  Connection: ? Unknown provider type`);
          }
        } else {
          console.log(`  Configuration: ✗ Invalid`);
          console.log(`  Errors: ${validation.errors.join(', ')}`);
        }
      } else {
        console.log(`  Configuration: - Not enabled`);
      }
      console.log('');
    }
  } catch (error) {
    console.error('Failed to test providers:', error.message);
  }
}

async function testFileConnection() {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const os = await import('os');
    
    const homeDir = os.homedir();
    const testFile = path.join(homeDir, '.aifs-test-file');
    
    // Test write
    await fs.writeFile(testFile, 'test');
    console.log(`  File Write: ✓ Success`);
    
    // Test read
    const content = await fs.readFile(testFile, 'utf8');
    if (content === 'test') {
      console.log(`  File Read: ✓ Success`);
    } else {
      console.log(`  File Read: ✗ Content mismatch`);
    }
    
    // Test delete
    await fs.unlink(testFile);
    console.log(`  File Delete: ✓ Success`);
    console.log(`  Connection: ✓ File system working correctly`);
  } catch (error) {
    console.log(`  Connection: ✗ ${error.message}`);
  }
}

async function testS3Connection(provider) {
  try {
    const { S3Client, HeadBucketCommand } = await import('@aws-sdk/client-s3');
    
    const client = new S3Client({
      region: provider.credentials.region || 'us-east-1',
      credentials: {
        accessKeyId: provider.credentials.accessKeyId || '',
        secretAccessKey: provider.credentials.secretAccessKey || ''
      }
    });

    const command = new HeadBucketCommand({
      Bucket: provider.credentials.bucket || ''
    });

    await client.send(command);
    console.log(`  Connection: ✓ S3 bucket accessible`);
  } catch (error) {
    console.log(`  Connection: ✗ ${error.message}`);
  }
}

async function testGCSConnection(provider) {
  try {
    const { Storage } = await import('@google-cloud/storage');
    
    const storage = new Storage({
      projectId: provider.credentials.projectId,
      keyFilename: provider.credentials.keyFilename || undefined
    });

    const bucket = storage.bucket(provider.credentials.bucket);
    const [exists] = await bucket.exists();
    
    if (exists) {
      console.log(`  Connection: ✓ GCS bucket accessible`);
    } else {
      console.log(`  Connection: ✗ GCS bucket not found`);
    }
  } catch (error) {
    console.log(`  Connection: ✗ ${error.message}`);
  }
}

async function testAzureConnection(provider) {
  try {
    const { BlobServiceClient } = await import('@azure/storage-blob');
    
    let client;
    if (provider.credentials.connectionString) {
      client = BlobServiceClient.fromConnectionString(provider.credentials.connectionString);
    } else {
      const accountName = provider.credentials.accountName;
      const accountKey = provider.credentials.accountKey;
      const connectionString = `DefaultEndpointsProtocol=https;AccountName=${accountName};AccountKey=${accountKey};EndpointSuffix=core.windows.net`;
      client = BlobServiceClient.fromConnectionString(connectionString);
    }

    const containerClient = client.getContainerClient(provider.credentials.containerName);
    const exists = await containerClient.exists();
    
    if (exists) {
      console.log(`  Connection: ✓ Azure container accessible`);
    } else {
      console.log(`  Connection: ✗ Azure container not found`);
    }
  } catch (error) {
    console.log(`  Connection: ✗ ${error.message}`);
  }
}

async function testAIFSConnection(provider) {
  try {
    const grpc = await import('@grpc/grpc-js');
    const protoLoader = await import('@grpc/proto-loader');
    
    const endpoint = provider.credentials.endpoint;
    if (!endpoint.includes(':')) {
      console.log(`  Connection: ✗ Invalid endpoint format (missing port)`);
      return;
    }

    // For now, just validate the endpoint format
    // Full gRPC connection test would require the actual proto file
    console.log(`  Connection: ? Endpoint format valid (${endpoint})`);
    console.log(`  Note: Full gRPC test requires AIFS server to be running`);
  } catch (error) {
    console.log(`  Connection: ✗ ${error.message}`);
  }
}

// Run the tests
testProviderConnections().then(() => {
  console.log('\nProvider connection tests completed.');
  process.exit(0);
}).catch((error) => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
