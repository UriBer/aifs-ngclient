import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { createWriteStream, createReadStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { IObjectStore, Obj } from '../../shared/interfaces/IObjectStore';
import { AifsObject } from '../../shared/models/AifsObject';
import { parseUri } from '../../shared/utils/UriUtils';

const mkdir = promisify(fs.mkdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

/**
 * AifsProvider implements the IObjectStore interface for the AI-Native File System.
 */
export class AifsProvider implements IObjectStore {
  private client: any;
  private apiKey: string;
  private protoPath: string;
  
  /**
   * Creates a new AifsProvider instance.
   * 
   * @param config Configuration for the AIFS client
   */
  constructor(config: { endpoint: string; apiKey?: string }) {
    this.apiKey = config.apiKey;
    this.protoPath = path.resolve(__dirname, '../../main/proto/aifs.proto');
    
    // Load the proto file
    const packageDefinition = protoLoader.loadSync(this.protoPath, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true
    });
    
    const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
    const aifsService = protoDescriptor.aifs.AifsService;
    
    // Create credentials
    let credentials = grpc.credentials.createInsecure();
    
    // Create metadata for authentication
    const metadata = new grpc.Metadata();
    if (this.apiKey) {
      metadata.add('Authorization', `Bearer ${this.apiKey}`);
    }
    
    // Format the endpoint for gRPC (remove http:// or https:// prefix)
    let grpcEndpoint = config.endpoint;
    if (grpcEndpoint.startsWith('http://')) {
      grpcEndpoint = grpcEndpoint.substring(7);
    } else if (grpcEndpoint.startsWith('https://')) {
      grpcEndpoint = grpcEndpoint.substring(8);
    }
    
    // Create the client
    this.client = new aifsService(grpcEndpoint, credentials);
    
    // Add metadata to each call
    const originalMethods = {};
    const methodNames = Object.keys(this.client.__proto__);
    
    methodNames.forEach(methodName => {
      if (typeof this.client[methodName] === 'function' && !methodName.startsWith('_')) {
        originalMethods[methodName] = this.client[methodName];
        this.client[methodName] = (...args) => {
          const callback = args[args.length - 1];
          if (typeof callback === 'function') {
            args[args.length - 1] = (err, response) => {
              callback(err, response);
            };
            return originalMethods[methodName].call(this.client, ...args, metadata);
          } else {
            return originalMethods[methodName].call(this.client, ...args, metadata);
          }
        };
      }
    });
  }
  
  /**
   * Returns the URI scheme for this provider.
   */
  scheme(): 'aifs' {
    return 'aifs';
  }
  
  /**
   * Parses an AIFS URI into its components.
   * 
   * @param uri The URI to parse
   * @returns The parsed URI components
   */
  parseAifsUri(uri) {
    const parsed = parseUri(uri);
    
    if (parsed.scheme !== 'aifs') {
      throw new Error(`Invalid URI scheme: ${parsed.scheme}. Expected 'aifs'.`);
    }
    
    const parts = parsed.path.split('/');
    const namespace = parts[1] || '';
    const path = parts.slice(2).join('/');
    
    return {
      namespace,
      path
    };
  }
  
  /**
   * Promisify a gRPC method call
   * 
   * @param method The gRPC method to call
   * @param request The request object
   * @returns A promise that resolves with the response
   */
  promisifyGrpcCall(method, request) {
    return new Promise((resolve, reject) => {
      method(request, (err, response) => {
        if (err) {
          reject(err);
        } else {
          resolve(response);
        }
      });
    });
  }
  
  /**
   * Lists objects in a directory.
   * 
   * @param uri The URI to list
   * @param options Options for listing
   * @returns A list of objects
   */
  async list(uri, options = {}) {
    try {
      const { namespace, path } = this.parseAifsUri(uri);
      
      const request = {
        namespace,
        prefix: path,
        delimiter: options.delimiter || '/',
        page_size: options.pageSize || 1000,
        page_token: options.pageToken || '',
        semantic_query: options.semanticQuery || ''
      };
      
      const response = await this.promisifyGrpcCall(this.client.listObjects, request);
      
      const items = response.items.map(item => this.convertAifsObjectToObj(item, namespace));
      
      return {
        items,
        nextPageToken: response.next_page_token
      };
    } catch (error) {
      console.error('Error listing objects:', error);
      throw error;
    }
  }
  
  /**
   * Gets metadata for an object.
   * 
   * @param uri The URI of the object
   * @returns Promise resolving to the object metadata
   */
  async stat(uri) {
    try {
      const { namespace, path } = this.parseAifsUri(uri);
      
      const request = {
        namespace,
        path
      };
      
      const response = await this.promisifyGrpcCall(this.client.getObjectMetadata, request);
      
      return this.convertAifsObjectToObj(response, namespace);
    } catch (error) {
      console.error('Error getting object metadata:', error);
      throw error;
    }
  }
  
  /**
   * Creates a directory.
   * 
   * @param uri The URI of the directory to create
   * @param recursive Whether to create parent directories
   * @returns Promise resolving when the directory is created
   */
  async mkdir(uri, recursive = false) {
    try {
      const { namespace, path } = this.parseAifsUri(uri);
      
      const request = {
        namespace,
        path,
        recursive
      };
      
      const response = await this.promisifyGrpcCall(this.client.createDirectory, request);
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to create directory');
      }
      
      return {
        uri,
        name: path.split('/').filter(Boolean).pop() || namespace,
        isDir: true,
        size: 0,
        lastModified: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error creating directory:', error);
      throw error;
    }
  }
  
  /**
   * Reads an object's content.
   * 
   * @param uri The URI of the object to read
   * @returns Promise resolving to the object's content as a Buffer
   */
  async read(uri) {
    try {
      const { namespace, path } = this.parseAifsUri(uri);
      
      const request = {
        namespace,
        path
      };
      
      return new Promise((resolve, reject) => {
        const chunks = [];
        const call = this.client.downloadObject(request);
        
        call.on('data', (response) => {
          if (response.chunk) {
            chunks.push(response.chunk);
          }
        });
        
        call.on('error', (error) => {
          reject(error);
        });
        
        call.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve(buffer);
        });
      });
    } catch (error) {
      console.error('Error reading object:', error);
      throw error;
    }
  }
  
  /**
   * Downloads an object to a local path.
   * Implements the IObjectStore.get method.
   * 
   * @param uri The URI of the object to download
   * @param destPath The local file path to download to
   * @returns Promise that resolves when download completes
   */
  async get(uri, destPath) {
    try {
      // Read the object content
      const content = await this.read(uri);
      
      // Create parent directory if it doesn't exist
      const destDir = path.dirname(destPath);
      await mkdir(destDir, { recursive: true });
      
      // Write the content to the destination path
      await fs.promises.writeFile(destPath, content);
    } catch (error) {
      console.error('Error downloading object:', error);
      throw error;
    }
  }
  
  /**
   * Writes content to an object.
   * 
   * @param uri The URI of the object to write
   * @param content The content to write
   * @param options Optional write options
   * @returns Promise resolving to the written object
   */
  async write(uri, content, options = {}) {
    try {
      const { namespace, path } = this.parseAifsUri(uri);
      
      return new Promise((resolve, reject) => {
        // Create a call to the uploadObject method
        const call = this.client.uploadObject((error, response) => {
          if (error) {
            reject(error);
          } else {
            resolve(this.convertAifsObjectToObj(response, namespace));
          }
        });
        
        // Send metadata first
        const metadata = {
          namespace,
          path,
          content_type: options.contentType || 'application/octet-stream',
          metadata: options.metadata || {},
          semantic_tags: options.semanticTags || [],
          embedding: options.embedding || [],
          parents: options.parents || []
        };
        
        call.write({ metadata });
        
        // Then send the content in chunks
        const CHUNK_SIZE = 64 * 1024; // 64KB chunks
        const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
        
        for (let i = 0; i < buffer.length; i += CHUNK_SIZE) {
          const chunk = buffer.slice(i, i + CHUNK_SIZE);
          call.write({ chunk });
        }
        
        call.end();
      });
    } catch (error) {
      console.error('Error writing object:', error);
      throw error;
    }
  }
  
  /**
   * Uploads a local file to the provider.
   * Implements the IObjectStore.put method.
   * 
   * @param srcPath The local file path to upload
   * @param destUri The destination URI to upload to
   * @param opts Optional parameters (content type, metadata, semantic tags)
   * @returns Promise resolving to the uploaded object metadata
   */
  async put(srcPath, destUri, opts = {}) {
    try {
      // Read the file content
      const content = await fs.promises.readFile(srcPath);
      
      // Use the write method to upload the content
      return await this.write(destUri, content, {
        contentType: opts.contentType,
        metadata: opts.metadata,
        semanticTags: opts.semanticTags
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }
  
  /**
   * Deletes an object.
   * 
   * @param uri The URI of the object to delete
   * @returns Promise resolving to true if successful
   */
  async delete(uri) {
    try {
      const { namespace, path } = this.parseAifsUri(uri);
      
      const request = {
        namespace,
        path
      };
      
      const response = await this.promisifyGrpcCall(this.client.deleteObject, request);
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to delete object');
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting object:', error);
      throw error;
    }
  }
  
  /**
   * Performs a server-side copy when source and destination share the same provider.
   * Implements the IObjectStore.copy method.
   * 
   * @param srcUri The source URI to copy from
   * @param destUri The destination URI to copy to
   * @returns Promise resolving to the copied object metadata
   */
  async copy(srcUri, destUri) {
    try {
      const { namespace: srcNamespace, path: srcPath } = this.parseAifsUri(srcUri);
      const { namespace: destNamespace, path: destPath } = this.parseAifsUri(destUri);
      
      const request = {
        source_namespace: srcNamespace,
        source_path: srcPath,
        dest_namespace: destNamespace,
        dest_path: destPath,
        preserve_metadata: true
      };
      
      const response = await this.promisifyGrpcCall(this.client.copyObject, request);
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to copy object');
      }
      
      return this.convertAifsObjectToObj(response.object, destNamespace);
    } catch (error) {
      console.error('Error copying object:', error);
      throw error;
    }
  }
  
  /**
   * Moves an object from source to destination.
   * Implements the IObjectStore.move method.
   * 
   * @param srcUri The source URI to move from
   * @param destUri The destination URI to move to
   * @returns Promise resolving to the moved object metadata
   */
  async move(srcUri, destUri) {
    try {
      const { namespace: srcNamespace, path: srcPath } = this.parseAifsUri(srcUri);
      const { namespace: destNamespace, path: destPath } = this.parseAifsUri(destUri);
      
      const request = {
        source_namespace: srcNamespace,
        source_path: srcPath,
        dest_namespace: destNamespace,
        dest_path: destPath
      };
      
      const response = await this.promisifyGrpcCall(this.client.moveObject, request);
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to move object');
      }
      
      return this.convertAifsObjectToObj(response.object, destNamespace);
    } catch (error) {
      console.error('Error moving object:', error);
      throw error;
    }
  }
  
  /**
   * Creates a snapshot of a namespace.
   * 
   * @param uri The URI of the namespace to snapshot
   * @param name The name of the snapshot
   * @param description Optional description of the snapshot
   * @returns Promise resolving to the created snapshot object
   */
  async createSnapshot(uri, name, description) {
    try {
      const { namespace } = this.parseAifsUri(uri);
      
      const response = await this.client.post(`/namespaces/${namespace}/snapshots`, {
        name,
        description
      });
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to create snapshot');
      }
      
      return this.convertAifsObjectToObj(response.data.data);
    } catch (error) {
      console.error('Error creating snapshot:', error);
      throw error;
    }
  }
  
  /**
   * Lists snapshots in a namespace.
   * 
   * @param uri The URI of the namespace
   * @returns Promise resolving to an array of snapshot objects
   */
  async listSnapshots(uri) {
    try {
      const { namespace } = this.parseAifsUri(uri);
      
      const response = await this.client.get(`/namespaces/${namespace}/snapshots`);
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to list snapshots');
      }
      
      return this.convertAifsObjectsToObjs(response.data.data || []);
    } catch (error) {
      console.error('Error listing snapshots:', error);
      throw error;
    }
  }
  
  /**
   * Performs a semantic search in the namespace.
   * 
   * @param uri The URI of the namespace to search in
   * @param query The search query
   * @param options Search options
   * @returns Promise resolving to an array of matching objects
   */
  async semanticSearch(uri, query, options = {}) {
    try {
      const { namespace } = this.parseAifsUri(uri);
      
      const request = {
        namespace,
        query,
        limit: options.limit || 10,
        threshold: options.threshold || 0.7,
        filters: options.filters || {},
        embedding: options.embedding || []
      };
      
      const response = await this.promisifyGrpcCall(this.client.semanticSearch, request);
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to perform semantic search');
      }
      
      return response.results.map(item => this.convertAifsObjectToObj(item, namespace));
    } catch (error) {
      console.error('Error performing semantic search:', error);
      throw error;
    }
  }
  
  /**
   * Converts AIFS object metadata to Obj instances.
   * 
   * @param aifsObjects Array of AIFS object metadata
   * @returns Array of Obj instances
   */
  convertAifsObjectsToObjs(aifsObjects) {
    return aifsObjects.map(item => this.convertAifsObjectToObj(item));
  }
  
  /**
   * Converts a single AIFS object metadata to an Obj instance.
   * 
   * @param aifsObject AIFS object metadata
   * @returns Obj instance
   */
  convertAifsObjectToObj(aifsObject, namespace) {
    if (!aifsObject) return null;
    
    if (aifsObject.snapshot) {
      return AifsObject.snapshot(
        `aifs://${aifsObject.uri}`,
        aifsObject.name,
        aifsObject.modifiedTime ? new Date(aifsObject.modifiedTime) : new Date(),
        aifsObject.snapshot.description,
        aifsObject.metadata
      );
    }
    
    if (aifsObject.isDirectory) {
      return AifsObject.namespace(
        `aifs://${aifsObject.uri}`,
        aifsObject.name,
        aifsObject.metadata
      );
    }
    
    return AifsObject.asset(
      `aifs://${aifsObject.uri}`,
      aifsObject.name,
      aifsObject.size,
      aifsObject.modifiedTime ? new Date(aifsObject.modifiedTime) : undefined,
      aifsObject.checksum,
      aifsObject.metadata,
      aifsObject.semanticTags,
      aifsObject.contentType
    );
  }
  
  /**
   * Checks if an object exists.
   * 
   * @param uri The URI of the object to check
   * @returns Promise resolving to true if the object exists, false otherwise
   */
  async exists(uri) {
    try {
      const { namespace, path } = this.parseAifsUri(uri);
      
      const request = {
        namespace,
        path
      };
      
      const response = await this.promisifyGrpcCall(this.client.objectExists, request);
      return response.exists;
    } catch (error) {
      // If the error is a gRPC NOT_FOUND error, return false
      if (error.code === 5) { // 5 is the gRPC code for NOT_FOUND
        return false;
      }
      console.error('Error checking if object exists:', error);
      throw error;
    }
  }
}

module.exports = { AifsProvider };