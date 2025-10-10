#!/usr/bin/env node

/**
 * Mock AIFS Server for Testing
 * 
 * This script provides a minimal mock implementation of the AIFS gRPC server
 * for testing the AifsProvider without requiring a real AIFS server.
 * 
 * Usage:
 *   npm run mock:aifs
 * 
 * The server will start on localhost:50052 and provide basic functionality
 * for testing the AifsProvider.
 */

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const fs = require('fs');

// Load the proto file
const protoPath = path.resolve(__dirname, '../src/main/proto/aifs_api.proto');
const packageDefinition = protoLoader.loadSync(protoPath, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const aifsPackage = protoDescriptor.aifs.v1;

// Mock data storage
const mockData = {
  namespaces: new Map(),
  assets: new Map(),
  branches: new Map(),
  snapshots: new Map()
};

// Initialize with default namespace
mockData.namespaces.set('default', {
  name: 'default',
  created_at: new Date().toISOString(),
  metadata: {}
});

mockData.branches.set('default/main', {
  name: 'main',
  namespace: 'default',
  snapshot_id: '',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  metadata: {}
});

// Helper function to generate asset URI
function generateAssetUri(namespace, branch, assetName) {
  return `aifs://${namespace}/${branch}/${assetName}`;
}

// Helper function to parse asset URI
function parseAssetUri(uri) {
  const match = uri.match(/^aifs:\/\/([^\/]+)\/([^\/]+)\/(.+)$/);
  if (!match) {
    throw new Error('Invalid asset URI format');
  }
  return {
    namespace: match[1],
    branch: match[2],
    assetName: match[3]
  };
}

// Health service implementation
const healthService = {
  Check: (call, callback) => {
    callback(null, { status: 'SERVING' });
  }
};

// AIFS service implementation
const aifsService = {
  // Asset Management
  PutAsset: (call, callback) => {
    let asset = null;
    let data = null;
    
    call.on('data', (request) => {
      if (request.metadata) {
        asset = request.metadata.asset;
        data = Buffer.from(request.metadata.data, 'base64');
      } else if (request.chunk) {
        if (!data) data = Buffer.alloc(0);
        data = Buffer.concat([data, request.chunk]);
      }
    });
    
    call.on('end', () => {
      if (!asset) {
        callback(new Error('No asset metadata provided'));
        return;
      }
      
      // Store the asset
      const assetUri = asset.uri;
      mockData.assets.set(assetUri, {
        ...asset,
        data: data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      callback(null, { asset });
    });
  },
  
  GetAsset: (call, callback) => {
    const { uri } = call.request;
    const asset = mockData.assets.get(uri);
    
    if (!asset) {
      callback(new Error('Asset not found'), null);
      return;
    }
    
    callback(null, {
      asset: {
        uri: asset.uri,
        namespace: asset.namespace,
        name: asset.name,
        kind: asset.kind,
        size: asset.size,
        created_at: asset.created_at,
        updated_at: asset.updated_at,
        blake3: asset.blake3,
        metadata: asset.metadata
      },
      data: asset.data
    });
  },
  
  ListAssets: (call, callback) => {
    const { namespace, limit = 1000, offset = 0, prefix = '' } = call.request;
    
    const assets = Array.from(mockData.assets.values())
      .filter(asset => asset.namespace === namespace)
      .filter(asset => !prefix || asset.name.startsWith(prefix))
      .slice(offset, offset + limit);
    
    callback(null, {
      assets: assets.map(asset => ({
        uri: asset.uri,
        namespace: asset.namespace,
        name: asset.name,
        kind: asset.kind,
        size: asset.size,
        created_at: asset.created_at,
        updated_at: asset.updated_at,
        blake3: asset.blake3,
        metadata: asset.metadata
      })),
      total_count: assets.length
    });
  },
  
  DeleteAsset: (call, callback) => {
    const { uri } = call.request;
    
    if (!mockData.assets.has(uri)) {
      callback(new Error('Asset not found'), null);
      return;
    }
    
    mockData.assets.delete(uri);
    callback(null, { success: true });
  },
  
  VerifyAsset: (call, callback) => {
    const { uri } = call.request;
    const asset = mockData.assets.get(uri);
    
    if (!asset) {
      callback(new Error('Asset not found'), null);
      return;
    }
    
    callback(null, {
      valid: true,
      checksum: asset.blake3
    });
  },
  
  // Branch Management
  CreateBranch: (call, callback) => {
    const { branch_name, namespace, snapshot_id, metadata = {} } = call.request;
    
    if (!mockData.namespaces.has(namespace)) {
      callback(new Error('Namespace not found'), null);
      return;
    }
    
    const branchKey = `${namespace}/${branch_name}`;
    if (mockData.branches.has(branchKey)) {
      callback(new Error('Branch already exists'), null);
      return;
    }
    
    const branch = {
      name: branch_name,
      namespace,
      snapshot_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata
    };
    
    mockData.branches.set(branchKey, branch);
    callback(null, { branch });
  },
  
  GetBranch: (call, callback) => {
    const { branch_name, namespace } = call.request;
    const branchKey = `${namespace}/${branch_name}`;
    const branch = mockData.branches.get(branchKey);
    
    if (!branch) {
      callback(new Error('Branch not found'), null);
      return;
    }
    
    callback(null, { branch });
  },
  
  ListBranches: (call, callback) => {
    const { namespace } = call.request;
    
    const branches = Array.from(mockData.branches.values())
      .filter(branch => branch.namespace === namespace);
    
    callback(null, { branches });
  },
  
  GetBranchHistory: (call, callback) => {
    const { branch_name, namespace } = call.request;
    const branchKey = `${namespace}/${branch_name}`;
    const branch = mockData.branches.get(branchKey);
    
    if (!branch) {
      callback(new Error('Branch not found'), null);
      return;
    }
    
    callback(null, { history: [] });
  },
  
  DeleteBranch: (call, callback) => {
    const { branch_name, namespace } = call.request;
    const branchKey = `${namespace}/${branch_name}`;
    
    if (!mockData.branches.has(branchKey)) {
      callback(new Error('Branch not found'), null);
      return;
    }
    
    mockData.branches.delete(branchKey);
    callback(null, { success: true });
  },
  
  // Namespace Management
  GetNamespace: (call, callback) => {
    const { namespace } = call.request;
    const ns = mockData.namespaces.get(namespace);
    
    if (!ns) {
      callback(new Error('Namespace not found'), null);
      return;
    }
    
    callback(null, { namespace: ns });
  },
  
  ListNamespaces: (call, callback) => {
    const namespaces = Array.from(mockData.namespaces.values());
    callback(null, { namespaces });
  },
  
  // Vector Search (not implemented)
  VectorSearch: (call, callback) => {
    callback(null, { assets: [], scores: [] });
  },
  
  // Event Subscription (not implemented)
  SubscribeEvents: (call) => {
    // Not implemented for mock server
  }
};

// Create and start the server
const server = new grpc.Server();

// Add services
server.addService(aifsPackage.Health.service, healthService);
server.addService(aifsPackage.AIFS.service, aifsService);

const port = process.env.AIFS_PORT || '50052';
const host = process.env.AIFS_HOST || '0.0.0.0';

server.bindAsync(`${host}:${port}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
  if (err) {
    console.error('❌ Failed to start mock AIFS server:', err);
    process.exit(1);
  }
  
  console.log(`🚀 Mock AIFS server started on ${host}:${port}`);
  console.log(`📡 gRPC endpoint: ${host}:${port}`);
  console.log(`🏠 Default namespace: default`);
  console.log(`🌿 Default branch: main`);
  console.log(`\n💡 Use Ctrl+C to stop the server`);
  
  server.start();
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down mock AIFS server...');
  server.forceShutdown();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down mock AIFS server...');
  server.forceShutdown();
  process.exit(0);
});