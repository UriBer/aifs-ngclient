import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { IObjectStore, Obj } from '../../shared/interfaces/IObjectStore';
import { BaseObj } from '../../shared/models/Obj';
import { parseUri } from '../../shared/utils/UriUtils';
import * as blake3 from 'blake3';

const mkdir = promisify(fs.mkdir);
const stat = promisify(fs.stat);

/**
 * AifsProvider implements the IObjectStore interface for the AI-Native File System.
 */
export class AifsProvider implements IObjectStore {
  private aifsClient: any;
  private endpoint: string;
  private token?: string;
  
  /**
   * Creates a new AifsProvider instance.
   * 
   * @param config Configuration for the AIFS client
   */
  constructor(config: { endpoint?: string; token?: string }) {
    this.endpoint = config.endpoint || 'localhost:50052';
    this.token = config.token;
    
    // Load the proto file
    // __dirname is dist/main/main/providers
    // Go up 4 levels to project/asar root (../../../../), then to src/main/proto/
    const protoPath = path.resolve(__dirname, '../../../../src/main/proto/aifs_api.proto');
    const packageDefinition = protoLoader.loadSync(protoPath, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true
    });
    
    const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
    const aifsPackage = (protoDescriptor as any).aifs.v1;
    
    // Create credentials
    const credentials = grpc.credentials.createInsecure();
    
    // Create client
    this.aifsClient = new aifsPackage.AIFS(this.endpoint, credentials);
  }
  
  /**
   * Returns the URI scheme for this provider.
   */
  scheme(): 'aifs' {
    return 'aifs';
  }
  
  /**
   * Parses an AIFS URI into namespace, branch, and asset components.
   * Format: aifs://namespace/branch/asset-name
   * 
   * @param uri The URI to parse
   * @returns The parsed URI components
   */
  private parseAifsUri(uri: string): { namespace: string; branch: string; assetName: string } {
    const { path: uriPath } = parseUri(uri);
    
    if (!uriPath) {
      throw new Error('Invalid AIFS URI: missing path');
    }
    
    const parts = uriPath.split('/').filter(part => part.length > 0);
    
    if (parts.length === 0) {
      throw new Error('Invalid AIFS URI: empty path');
    }
    
    const namespace = parts[0];
    const branch = parts.length > 1 ? parts[1] : 'main';
    const assetName = parts.length > 2 ? parts.slice(2).join('/') : '';
    
    return { namespace, branch, assetName };
  }
  
  /**
   * Creates gRPC metadata with optional authentication token.
   */
  private createMetadata(): grpc.Metadata {
    const metadata = new grpc.Metadata();
    if (this.token) {
      metadata.add('authorization', `Bearer ${this.token}`);
    }
    return metadata;
  }
  
  /**
   * Promisify a gRPC method call with metadata.
   */
  private promisifyGrpcCall(method: any, request: any, metadata?: grpc.Metadata): Promise<any> {
    return new Promise((resolve, reject) => {
      const callMetadata = metadata || this.createMetadata();
      method.call(this.aifsClient, request, callMetadata, (err: any, response: any) => {
        if (err) {
          reject(this.mapGrpcError(err));
        } else {
          resolve(response);
        }
      });
    });
  }
  
  /**
   * Maps gRPC errors to meaningful error messages.
   */
  private mapGrpcError(error: any): Error {
    switch (error.code) {
      case 5: // NOT_FOUND
        return new Error('Object not found');
      case 7: // PERMISSION_DENIED
        return new Error('Authentication failed');
      case 3: // INVALID_ARGUMENT
        return new Error('Invalid URI format');
      case 13: // INTERNAL
        return new Error('Server error');
      default:
        return new Error(error.message || 'Unknown error');
    }
  }
  
  /**
   * Lists objects in a namespace or branch.
   */
  async list(uri: string, opts?: {
    prefix?: string;
    delimiter?: string;
    pageToken?: string;
    pageSize?: number;
  }): Promise<{ items: Obj[]; nextPageToken?: string }> {
    try {
      const { namespace, branch, assetName } = this.parseAifsUri(uri);
      
      // If no asset name specified, list branches
      if (!assetName) {
        if (branch === 'main' && !uri.includes('/main')) {
          // List branches in namespace
          const request = { namespace };
          const response = await this.promisifyGrpcCall(this.aifsClient.listBranches, request);
          
          const items = response.branches.map((branch: any) => 
            BaseObj.directory(
              `aifs://${namespace}/${branch.name}/`,
              branch.name
            )
          );
          
          return { items };
        } else {
          // List assets in branch
          const request = {
            namespace,
            limit: opts?.pageSize || 1000,
            offset: 0,
            prefix: opts?.prefix || ''
          };
          
          const response = await this.promisifyGrpcCall(this.aifsClient.listAssets, request);
          
          const items = response.assets.map((asset: any) => this.convertAssetToObj(asset));
          
          return { 
            items,
            nextPageToken: response.total_count > (opts?.pageSize || 1000) ? 'next' : undefined
          };
        }
      }
      
      // If asset name specified, this is a file - return empty list
      return { items: [] };
    } catch (error) {
      throw new Error(`Failed to list AIFS objects at ${uri}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Returns metadata for a single AIFS object.
   */
  async stat(uri: string): Promise<Obj> {
    try {
      const { namespace, branch, assetName } = this.parseAifsUri(uri);
      
      // If no asset name, check if it's a branch or namespace
      if (!assetName) {
        if (branch === 'main' && !uri.includes('/main')) {
          // Check if namespace exists
          const request = { namespace };
          await this.promisifyGrpcCall(this.aifsClient.getNamespace, request);
          
          return BaseObj.directory(
            uri,
            namespace
          );
        } else {
          // Check if branch exists
          const request = { branch_name: branch, namespace };
          await this.promisifyGrpcCall(this.aifsClient.getBranch, request);
          
          return BaseObj.directory(
            uri,
            branch
          );
        }
      }
      
      // Get asset metadata
      const request = { uri };
      const response = await this.promisifyGrpcCall(this.aifsClient.getAsset, request);
      
      return this.convertAssetToObj(response.asset);
    } catch (error) {
      throw new Error(`Failed to stat ${uri}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Downloads an AIFS asset to a local file.
   */
  async get(uri: string, destPath: string): Promise<void> {
    try {
      const { assetName } = this.parseAifsUri(uri);
      
      if (!assetName) {
        throw new Error(`Cannot download directory: ${uri}`);
      }
      
      // Ensure the destination directory exists
      const destDir = path.dirname(destPath);
      await mkdir(destDir, { recursive: true });
      
      // Get the asset
      const request = { uri };
      const response = await this.promisifyGrpcCall(this.aifsClient.getAsset, request);
      
      // Write the data to file
      await fs.promises.writeFile(destPath, response.data);
      
      // Verify checksum if available
      if (response.asset.blake3) {
        const fileBuffer = await fs.promises.readFile(destPath);
        const computedHash = blake3.hash(fileBuffer).toString('hex');
        if (computedHash !== response.asset.blake3) {
          throw new Error('Checksum verification failed');
        }
      }
    } catch (error) {
      throw new Error(`Failed to download ${uri}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Uploads a local file to AIFS.
   */
  async put(srcPath: string, destUri: string, opts?: {
    contentType?: string;
    metadata?: Record<string, string>;
  }): Promise<Obj> {
    try {
      const { assetName } = this.parseAifsUri(destUri);
      
      if (!assetName) {
        throw new Error(`Cannot upload to directory: ${destUri}`);
      }
      
      // Read the source file
      const fileBuffer = await fs.promises.readFile(srcPath);
      const fileStats = await stat(srcPath);
      
      // Compute BLAKE3 checksum
      const blake3Hash = blake3.hash(fileBuffer).toString('hex');
      
      // Parse the destination URI to get namespace
      const { namespace } = this.parseAifsUri(destUri);
      
      // Create the asset metadata
      const asset = {
        uri: destUri,
        namespace,
        name: assetName,
        kind: 'BLOB',
        size: fileStats.size,
        blake3: blake3Hash,
        metadata: {
          content_type: opts?.contentType || 'application/octet-stream',
          ...opts?.metadata
        }
      };
      
      // Upload the asset using streaming
      return new Promise((resolve, reject) => {
        const call = this.aifsClient.putAsset(this.createMetadata(), (err: any, response: any) => {
          if (err) {
            reject(this.mapGrpcError(err));
          } else {
            resolve(this.convertAssetToObj(response.asset));
          }
        });
        
        // Send metadata first
        call.write({
          metadata: {
            asset,
            data: fileBuffer.toString('base64')
          }
        });
        
        // End the call
        call.end();
      });
    } catch (error) {
      throw new Error(`Failed to upload to ${destUri}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Deletes an AIFS asset or branch.
   */
  async delete(uri: string, _recursive = false): Promise<void> {
    try {
      const { namespace, branch, assetName } = this.parseAifsUri(uri);
      
      if (!assetName) {
        // Delete branch
        const request = { branch_name: branch, namespace };
        await this.promisifyGrpcCall(this.aifsClient.deleteBranch, request);
      } else {
        // Delete asset
        const request = { uri };
        await this.promisifyGrpcCall(this.aifsClient.deleteAsset, request);
      }
    } catch (error) {
      throw new Error(`Failed to delete ${uri}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Copies an AIFS asset (not supported - will fallback to download+upload).
   */
  async copy(_srcUri: string, _destUri: string): Promise<Obj> {
    throw new Error('AIFS does not support server-side copy');
  }
  
  /**
   * Moves an AIFS asset (implemented as copy + delete).
   */
  async move(srcUri: string, destUri: string): Promise<Obj> {
    try {
      // Download from source
      const tempPath = path.join(require('os').tmpdir(), `temp-move-${Date.now()}`);
      await this.get(srcUri, tempPath);
      
      // Upload to destination
      const result = await this.put(tempPath, destUri);
      
      // Delete source
      await this.delete(srcUri);
      
      // Clean up temp file
      await fs.promises.unlink(tempPath);
      
      return result;
    } catch (error) {
      throw new Error(`Failed to move ${srcUri} to ${destUri}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Creates a branch in AIFS.
   */
  async mkdir(uri: string): Promise<void> {
    try {
      const { namespace, branch, assetName } = this.parseAifsUri(uri);
      
      if (assetName) {
        throw new Error('Cannot create directory with asset name');
      }
      
      if (branch === 'main' && !uri.includes('/main')) {
        throw new Error('Cannot create namespace (requires admin privileges)');
      }
      
      // Create branch
      const request = {
        branch_name: branch,
        namespace,
        snapshot_id: '', // Empty snapshot for new branch
        metadata: {}
      };
      
      await this.promisifyGrpcCall(this.aifsClient.createBranch, request);
    } catch (error) {
      throw new Error(`Failed to create directory ${uri}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Checks if an AIFS object exists.
   */
  async exists(uri: string): Promise<boolean> {
    try {
      await this.stat(uri);
      return true;
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return false;
      }
      throw error;
    }
  }
  
  /**
   * Converts an AIFS Asset to an Obj.
   */
  private convertAssetToObj(asset: any): Obj {
    return BaseObj.file(
      asset.uri,
      asset.name,
      asset.size,
      asset.created_at ? new Date(asset.created_at) : undefined,
      asset.blake3, // Use BLAKE3 as checksum
      asset.blake3, // Use BLAKE3 as ETag
      asset.metadata
    );
  }
}