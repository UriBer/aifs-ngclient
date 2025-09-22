const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const fs = require('fs');

// Load the proto file
const PROTO_PATH = path.resolve(__dirname, '../src/main/proto/aifs.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const aifsService = protoDescriptor.aifs.AifsService;

// In-memory storage for objects and directories
const storage = {
  namespaces: {}
};

// Helper functions
function ensureNamespace(namespace) {
  if (!storage.namespaces[namespace]) {
    storage.namespaces[namespace] = {
      objects: {},
      directories: {}
    };
  }
  return storage.namespaces[namespace];
}

function getParentPath(path) {
  const parts = path.split('/');
  parts.pop();
  return parts.join('/');
}

function getObjectName(path) {
  const parts = path.split('/');
  return parts[parts.length - 1];
}

// Implementation of the service
const serviceImpl = {
  // Directory operations
  createDirectory: (call, callback) => {
    const { namespace, path, recursive } = call.request;
    console.log(`Creating directory: ${namespace}/${path}, recursive: ${recursive}`);
    
    try {
      const ns = ensureNamespace(namespace);
      
      // Check if parent directories exist when not recursive
      if (!recursive) {
        const parentPath = getParentPath(path);
        if (parentPath && !ns.directories[parentPath]) {
          return callback({
            code: grpc.status.NOT_FOUND,
            details: 'Parent directory does not exist'
          });
        }
      }
      
      // Create directory
      ns.directories[path] = {
        path,
        created: new Date().toISOString(),
        modified: new Date().toISOString()
      };
      
      callback(null, {
        success: true,
        message: 'Directory created successfully'
      });
    } catch (error) {
      callback({
        code: grpc.status.INTERNAL,
        details: error.message
      });
    }
  },
  
  // Object operations
  listObjects: (call, callback) => {
    const { namespace, path, recursive, page_token, page_size } = call.request;
    console.log(`Listing objects: ${namespace}/${path}, recursive: ${recursive}`);
    
    try {
      const ns = ensureNamespace(namespace);
      const results = [];
      
      // List directories
      Object.keys(ns.directories).forEach(dirPath => {
        if (dirPath.startsWith(path) && (recursive || dirPath.split('/').length === path.split('/').length + 1)) {
          results.push({
            path: dirPath,
            name: getObjectName(dirPath),
            is_directory: true,
            size: 0,
            created: ns.directories[dirPath].created,
            modified: ns.directories[dirPath].modified,
            metadata: {}
          });
        }
      });
      
      // List objects
      Object.keys(ns.objects).forEach(objPath => {
        if (objPath.startsWith(path) && (recursive || objPath.split('/').length === path.split('/').length + 1)) {
          results.push({
            path: objPath,
            name: getObjectName(objPath),
            is_directory: false,
            size: ns.objects[objPath].content.length,
            created: ns.objects[objPath].created,
            modified: ns.objects[objPath].modified,
            metadata: ns.objects[objPath].metadata || {}
          });
        }
      });
      
      callback(null, {
        success: true,
        items: results,
        next_page_token: ''
      });
    } catch (error) {
      callback({
        code: grpc.status.INTERNAL,
        details: error.message
      });
    }
  },
  
  getObjectMetadata: (call, callback) => {
    const { namespace, path } = call.request;
    console.log(`Getting object metadata: ${namespace}/${path}`);
    
    try {
      const ns = ensureNamespace(namespace);
      
      // Check if it's a directory
      if (ns.directories[path]) {
        callback(null, {
          success: true,
          object: {
            path,
            name: getObjectName(path),
            is_directory: true,
            size: 0,
            created: ns.directories[path].created,
            modified: ns.directories[path].modified,
            metadata: {}
          }
        });
        return;
      }
      
      // Check if it's an object
      if (ns.objects[path]) {
        callback(null, {
          success: true,
          object: {
            path,
            name: getObjectName(path),
            is_directory: false,
            size: ns.objects[path].content.length,
            created: ns.objects[path].created,
            modified: ns.objects[path].modified,
            metadata: ns.objects[path].metadata || {}
          }
        });
        return;
      }
      
      callback({
        code: grpc.status.NOT_FOUND,
        details: 'Object not found'
      });
    } catch (error) {
      callback({
        code: grpc.status.INTERNAL,
        details: error.message
      });
    }
  },
  
  uploadObject: (call) => {
    let metadata = null;
    let chunks = [];
    
    call.on('data', (data) => {
      if (data.metadata) {
        metadata = data.metadata;
        console.log(`Uploading object: ${metadata.namespace}/${metadata.path}`);
      } else if (data.chunk) {
        chunks.push(data.chunk);
      }
    });
    
    call.on('end', () => {
      try {
        if (!metadata) {
          call.emit('error', {
            code: grpc.status.INVALID_ARGUMENT,
            details: 'No metadata provided'
          });
          return;
        }
        
        const ns = ensureNamespace(metadata.namespace);
        const content = Buffer.concat(chunks);
        
        // Create parent directories if they don't exist
        const parentPath = getParentPath(metadata.path);
        if (parentPath && !ns.directories[parentPath]) {
          ns.directories[parentPath] = {
            path: parentPath,
            created: new Date().toISOString(),
            modified: new Date().toISOString()
          };
        }
        
        // Store the object
        ns.objects[metadata.path] = {
          content,
          contentType: metadata.content_type,
          metadata: metadata.metadata,
          semanticTags: metadata.semantic_tags,
          embedding: metadata.embedding,
          created: new Date().toISOString(),
          modified: new Date().toISOString()
        };
        
        call.write({
          success: true,
          object: {
            path: metadata.path,
            name: getObjectName(metadata.path),
            is_directory: false,
            size: content.length,
            created: ns.objects[metadata.path].created,
            modified: ns.objects[metadata.path].modified,
            metadata: metadata.metadata || {}
          }
        });
        
        call.end();
      } catch (error) {
        call.emit('error', {
          code: grpc.status.INTERNAL,
          details: error.message
        });
      }
    });
  },
  
  downloadObject: (call) => {
    const { namespace, path } = call.request;
    console.log(`Downloading object: ${namespace}/${path}`);
    
    try {
      const ns = ensureNamespace(namespace);
      
      if (!ns.objects[path]) {
        call.emit('error', {
          code: grpc.status.NOT_FOUND,
          details: 'Object not found'
        });
        return;
      }
      
      const object = ns.objects[path];
      const content = object.content;
      
      // Send content in chunks
      const CHUNK_SIZE = 64 * 1024; // 64KB
      for (let i = 0; i < content.length; i += CHUNK_SIZE) {
        const chunk = content.slice(i, i + CHUNK_SIZE);
        call.write({ chunk });
      }
      
      call.end();
    } catch (error) {
      call.emit('error', {
        code: grpc.status.INTERNAL,
        details: error.message
      });
    }
  },
  
  deleteObject: (call, callback) => {
    const { namespace, path } = call.request;
    console.log(`Deleting object: ${namespace}/${path}`);
    
    try {
      const ns = ensureNamespace(namespace);
      
      // Check if it's a directory
      if (ns.directories[path]) {
        delete ns.directories[path];
        callback(null, { success: true });
        return;
      }
      
      // Check if it's an object
      if (ns.objects[path]) {
        delete ns.objects[path];
        callback(null, { success: true });
        return;
      }
      
      callback({
        code: grpc.status.NOT_FOUND,
        details: 'Object not found'
      });
    } catch (error) {
      callback({
        code: grpc.status.INTERNAL,
        details: error.message
      });
    }
  },
  
  copyObject: (call, callback) => {
    const { source_namespace, source_path, dest_namespace, dest_path } = call.request;
    console.log(`Copying object: ${source_namespace}/${source_path} to ${dest_namespace}/${dest_path}`);
    
    try {
      const sourceNs = ensureNamespace(source_namespace);
      const destNs = ensureNamespace(dest_namespace);
      
      // Check if source exists
      if (!sourceNs.objects[source_path]) {
        callback({
          code: grpc.status.NOT_FOUND,
          details: 'Source object not found'
        });
        return;
      }
      
      // Create parent directories if they don't exist
      const parentPath = getParentPath(dest_path);
      if (parentPath && !destNs.directories[parentPath]) {
        destNs.directories[parentPath] = {
          path: parentPath,
          created: new Date().toISOString(),
          modified: new Date().toISOString()
        };
      }
      
      // Copy the object
      const sourceObj = sourceNs.objects[source_path];
      destNs.objects[dest_path] = {
        content: Buffer.from(sourceObj.content),
        contentType: sourceObj.contentType,
        metadata: { ...sourceObj.metadata },
        semanticTags: [...sourceObj.semanticTags],
        embedding: [...sourceObj.embedding],
        created: new Date().toISOString(),
        modified: new Date().toISOString()
      };
      
      callback(null, {
        success: true,
        object: {
          path: dest_path,
          name: getObjectName(dest_path),
          is_directory: false,
          size: destNs.objects[dest_path].content.length,
          created: destNs.objects[dest_path].created,
          modified: destNs.objects[dest_path].modified,
          metadata: destNs.objects[dest_path].metadata || {}
        }
      });
    } catch (error) {
      callback({
        code: grpc.status.INTERNAL,
        details: error.message
      });
    }
  },
  
  moveObject: (call, callback) => {
    const { source_namespace, source_path, dest_namespace, dest_path } = call.request;
    console.log(`Moving object: ${source_namespace}/${source_path} to ${dest_namespace}/${dest_path}`);
    
    try {
      const sourceNs = ensureNamespace(source_namespace);
      const destNs = ensureNamespace(dest_namespace);
      
      // Check if source exists
      if (!sourceNs.objects[source_path]) {
        callback({
          code: grpc.status.NOT_FOUND,
          details: 'Source object not found'
        });
        return;
      }
      
      // Create parent directories if they don't exist
      const parentPath = getParentPath(dest_path);
      if (parentPath && !destNs.directories[parentPath]) {
        destNs.directories[parentPath] = {
          path: parentPath,
          created: new Date().toISOString(),
          modified: new Date().toISOString()
        };
      }
      
      // Move the object
      const sourceObj = sourceNs.objects[source_path];
      destNs.objects[dest_path] = {
        content: Buffer.from(sourceObj.content),
        contentType: sourceObj.contentType,
        metadata: { ...sourceObj.metadata },
        semanticTags: [...sourceObj.semanticTags],
        embedding: [...sourceObj.embedding],
        created: sourceObj.created,
        modified: new Date().toISOString()
      };
      
      // Delete the source object
      delete sourceNs.objects[source_path];
      
      callback(null, {
        success: true,
        object: {
          path: dest_path,
          name: getObjectName(dest_path),
          is_directory: false,
          size: destNs.objects[dest_path].content.length,
          created: destNs.objects[dest_path].created,
          modified: destNs.objects[dest_path].modified,
          metadata: destNs.objects[dest_path].metadata || {}
        }
      });
    } catch (error) {
      callback({
        code: grpc.status.INTERNAL,
        details: error.message
      });
    }
  },
  
  objectExists: (call, callback) => {
    const { namespace, path } = call.request;
    console.log(`Checking if object exists: ${namespace}/${path}`);
    
    try {
      const ns = ensureNamespace(namespace);
      const exists = ns.objects[path] !== undefined || ns.directories[path] !== undefined;
      
      callback(null, { exists });
    } catch (error) {
      callback({
        code: grpc.status.INTERNAL,
        details: error.message
      });
    }
  },
  
  semanticSearch: (call, callback) => {
    const { namespace, query, limit, embedding } = call.request;
    console.log(`Semantic search: ${namespace}, query: ${query}`);
    
    try {
      const ns = ensureNamespace(namespace);
      
      // Mock semantic search by returning some objects
      const results = Object.keys(ns.objects)
        .slice(0, limit || 10)
        .map(path => {
          const obj = ns.objects[path];
          return {
            path,
            name: getObjectName(path),
            is_directory: false,
            size: obj.content.length,
            created: obj.created,
            modified: obj.modified,
            metadata: obj.metadata || {},
            score: 0.9 // Mock similarity score
          };
        });
      
      callback(null, {
        success: true,
        results
      });
    } catch (error) {
      callback({
        code: grpc.status.INTERNAL,
        details: error.message
      });
    }
  }
};

// Create and start the server
function startServer() {
  const server = new grpc.Server();
  server.addService(aifsService.service, serviceImpl);
  
  const port = 50051;
  server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      console.error('Failed to bind server:', err);
      return;
    }
    
    console.log(`AIFS mock server running at 0.0.0.0:${port}`);
    server.start();
  });
  
  return server;
}

// Start the server if this script is run directly
if (require.main === module) {
  const server = startServer();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('Shutting down server...');
    server.tryShutdown(() => {
      console.log('Server shut down successfully');
      process.exit(0);
    });
  });
}

module.exports = { startServer };