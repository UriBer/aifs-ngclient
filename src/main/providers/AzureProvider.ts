import { BlobServiceClient, ContainerClient, BlobClient, BlobDownloadResponseParsed } from '@azure/storage-blob';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { IObjectStore, Obj } from '../../shared/interfaces/IObjectStore';
import { BaseObj } from '../../shared/models/Obj';
import { parseUri } from '../../shared/utils/UriUtils';

const mkdir = promisify(fs.mkdir);

/**
 * AzureProvider implements the IObjectStore interface for Azure Blob Storage.
 */
export class AzureProvider implements IObjectStore {
  private blobServiceClient: BlobServiceClient;
  
  /**
   * Creates a new AzureProvider instance.
   * 
   * @param config Optional Azure client configuration
   */
  constructor(config?: { 
    connectionString?: string;
    accountName?: string;
    accountKey?: string;
    sasToken?: string;
  }) {
    // Use connection string if provided, otherwise use account name and key
    if (config?.connectionString) {
      this.blobServiceClient = BlobServiceClient.fromConnectionString(config.connectionString);
    } else if (config?.accountName) {
      const accountUrl = `https://${config.accountName}.blob.core.windows.net`;
      this.blobServiceClient = new BlobServiceClient(accountUrl, {
        credential: config.accountKey ? {
          accountName: config.accountName,
          accountKey: config.accountKey
        } : undefined,
        // If SAS token is provided, it will be used for authentication
        ...(config.sasToken && { credential: undefined })
      });
    } else {
      // Use default Azure credentials
      this.blobServiceClient = new BlobServiceClient(
        process.env.AZURE_STORAGE_ACCOUNT_URL || 'https://yourstorageaccount.blob.core.windows.net'
      );
    }
  }
  
  /**
   * Returns the URI scheme for this provider.
   */
  scheme(): 'az' {
    return 'az';
  }
  
  /**
   * Parses an Azure URI into container and blob name components.
   * 
   * @param uri The Azure URI to parse (az://container/blob)
   * @returns Object containing container and blob name
   */
  private parseAzureUri(uri: string): { container: string, blobName: string } {
    const { path: uriPath } = parseUri(uri);
    
    // Extract container and blob name from URI path
    const parts = uriPath.split('/');
    const container = parts[0];
    const blobName = parts.slice(1).join('/');
    
    return { container, blobName };
  }
  
  /**
   * Lists blobs in an Azure container with the given prefix.
   * 
   * @param uri The URI to list (az://container/prefix/)
   * @param opts Options for listing
   * @returns Promise resolving to a list of objects
   */
  async list(uri: string, opts?: {
    prefix?: string;
    delimiter?: string;
    pageToken?: string;
    pageSize?: number;
  }): Promise<{ items: Obj[]; nextPageToken?: string }> {
    const { container: containerName, blobName: prefix } = this.parseAzureUri(uri);
    const containerClient = this.blobServiceClient.getContainerClient(containerName);
    
    try {
      const listOptions = {
        prefix: prefix.endsWith('/') ? prefix : `${prefix}/`,
        delimiter: opts?.delimiter || '/',
        maxPageSize: opts?.pageSize || 1000
      };
      
      const items: Obj[] = [];
      let continuationToken = opts?.pageToken;
      
      // List blobs with pagination
      const iterator = containerClient.listBlobsFlat(listOptions).byPage({
        continuationToken,
        maxPageSize: opts?.pageSize || 1000
      });
      
      const { value: page, done } = await iterator.next();
      
      if (page) {
        // Process blobs
        for (const blob of page.segment.blobItems) {
          // Skip the directory marker itself
          if (blob.name === prefix) continue;
          
          // Skip objects that represent directories (end with /)
          if (blob.name.endsWith('/')) continue;
          
          const relativePath = blob.name.replace(prefix, '');
          // Skip nested objects when delimiter is used
          if (opts?.delimiter && relativePath.includes(opts.delimiter)) continue;
          
          if (relativePath) {
            const blobUri = `az://${containerName}/${blob.name}`;
            items.push(BaseObj.file(
              blobUri,
              relativePath,
              blob.properties.contentLength || 0,
              blob.properties.lastModified,
              blob.properties.etag?.replace(/"/g, ''), // Remove quotes from ETag
              blob.properties.contentCrc64, // Use CRC64 as checksum
              blob.metadata // Include Azure metadata
            ));
          }
        }
        
        // Process virtual directories (common prefixes)
        if (page.segment.blobPrefixes) {
          for (const prefix of page.segment.blobPrefixes) {
            const name = prefix.name.replace(prefix, '').replace(/\/$/, '');
            if (name) {
              const dirUri = `az://${containerName}/${prefix.name}`;
              items.push(BaseObj.directory(dirUri, name));
            }
          }
        }
      }
      
      return {
        items,
        nextPageToken: page?.continuationToken
      };
    } catch (error) {
      throw new Error(`Failed to list Azure blobs at ${uri}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Returns metadata for a single Azure blob.
   * 
   * @param uri The URI to get metadata for
   * @returns Promise resolving to the object metadata
   */
  async stat(uri: string): Promise<Obj> {
    const { container: containerName, blobName } = this.parseAzureUri(uri);
    const containerClient = this.blobServiceClient.getContainerClient(containerName);
    
    try {
      // Check if this is a directory (blob name ends with /)
      if (blobName === '' || blobName.endsWith('/')) {
        // For container root or directory marker
        if (blobName === '') {
          // Verify container exists
          await containerClient.getProperties();
        } else {
          // Verify directory marker exists
          const blobClient = containerClient.getBlobClient(blobName);
          await blobClient.getProperties();
        }
        
        return BaseObj.directory(
          uri,
          blobName === '' ? containerName : path.basename(blobName.slice(0, -1))
        );
      }
      
      // Try to get blob metadata
      try {
        const blobClient = containerClient.getBlobClient(blobName);
        const properties = await blobClient.getProperties();
        
        return BaseObj.file(
          uri,
          path.basename(blobName),
          properties.contentLength || 0,
          properties.lastModified,
          properties.etag?.replace(/"/g, ''), // Remove quotes from ETag
          properties.contentCrc64, // Use CRC64 as checksum
          properties.metadata // Include Azure metadata
        );
      } catch (error) {
        // Check if it might be a directory without a directory marker
        // by listing blobs with this prefix
        const listOptions = {
          prefix: `${blobName}/`,
          maxPageSize: 1
        };
        
        const iterator = containerClient.listBlobsFlat(listOptions).byPage(listOptions);
        const { value: page } = await iterator.next();
        
        if (page && page.segment.blobItems.length > 0) {
          // This is a directory without a directory marker
          return BaseObj.directory(
            uri,
            path.basename(blobName)
          );
        }
        
        // Neither file nor directory exists
        throw error;
      }
    } catch (error) {
      throw new Error(`Failed to stat ${uri}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Downloads an Azure blob to a local file.
   * 
   * @param uri The URI of the blob to download
   * @param destPath The local file path to download to
   * @returns Promise that resolves when download completes
   */
  async get(uri: string, destPath: string): Promise<void> {
    const { container: containerName, blobName } = this.parseAzureUri(uri);
    const containerClient = this.blobServiceClient.getContainerClient(containerName);
    
    try {
      // Ensure the destination directory exists
      const destDir = path.dirname(destPath);
      await mkdir(destDir, { recursive: true });
      
      // Get the blob
      const blobClient = containerClient.getBlobClient(blobName);
      const downloadResponse = await blobClient.download();
      
      // Stream the blob to a file
      const writeStream = createWriteStream(destPath);
      await pipeline(downloadResponse.readableStreamBody!, writeStream);
    } catch (error) {
      throw new Error(`Failed to download ${uri}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Uploads a local file to Azure Blob Storage.
   * 
   * @param srcPath The local file path to upload
   * @param destUri The destination URI to upload to
   * @param opts Optional parameters
   * @returns Promise resolving to the uploaded object metadata
   */
  async put(srcPath: string, destUri: string, opts?: {
    contentType?: string;
    metadata?: Record<string, string>;
  }): Promise<Obj> {
    const { container: containerName, blobName } = this.parseAzureUri(destUri);
    const containerClient = this.blobServiceClient.getContainerClient(containerName);
    
    try {
      // Check if source file exists
      const stats = await promisify(fs.stat)(srcPath);
      if (!stats.isFile()) {
        throw new Error(`Source is not a file: ${srcPath}`);
      }
      
      // Create a read stream for the file
      const fileStream = createReadStream(srcPath);
      
      // Upload the file
      const blobClient = containerClient.getBlockBlobClient(blobName);
      const uploadOptions = {
        blobHTTPHeaders: {
          blobContentType: opts?.contentType
        },
        metadata: opts?.metadata
      };
      
      await blobClient.uploadStream(fileStream, undefined, undefined, uploadOptions);
      
      // Get metadata for the uploaded blob
      const properties = await blobClient.getProperties();
      
      // Return metadata for the uploaded object
      return BaseObj.file(
        destUri,
        path.basename(blobName),
        stats.size,
        properties.lastModified,
        properties.etag?.replace(/"/g, ''), // Remove quotes from ETag
        properties.contentCrc64, // Use CRC64 as checksum
        opts?.metadata
      );
    } catch (error) {
      throw new Error(`Failed to upload to ${destUri}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Deletes an Azure blob or directory.
   * 
   * @param uri The URI of the blob to delete
   * @param recursive If true, recursively delete directories
   * @returns Promise that resolves when deletion completes
   */
  async delete(uri: string, recursive = false): Promise<void> {
    const { container: containerName, blobName } = this.parseAzureUri(uri);
    const containerClient = this.blobServiceClient.getContainerClient(containerName);
    
    try {
      // Check if this is a directory
      if (blobName === '' || blobName.endsWith('/')) {
        if (!recursive) {
          // Check if directory is empty
          const listOptions = {
            prefix: blobName,
            maxPageSize: 2
          };
          
          const iterator = containerClient.listBlobsFlat(listOptions).byPage(listOptions);
          const { value: page } = await iterator.next();
          
          if (page && page.segment.blobItems.length > 1) {
            throw new Error(`Directory not empty: ${uri}`);
          }
        } else {
          // Recursively delete all blobs with this prefix
          const listOptions = {
            prefix: blobName
          };
          
          const iterator = containerClient.listBlobsFlat(listOptions).byPage(listOptions);
          
          for await (const page of iterator) {
            for (const blob of page.segment.blobItems) {
              const blobClient = containerClient.getBlobClient(blob.name);
              await blobClient.delete();
            }
          }
          
          return;
        }
      }
      
      // Delete the blob
      const blobClient = containerClient.getBlobClient(blobName);
      await blobClient.delete();
    } catch (error) {
      throw new Error(`Failed to delete ${uri}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Copies an Azure blob (server-side copy).
   * 
   * @param srcUri The source URI to copy from
   * @param destUri The destination URI to copy to
   * @returns Promise resolving to the copied object metadata
   */
  async copy(srcUri: string, destUri: string): Promise<Obj> {
    const srcParsed = this.parseAzureUri(srcUri);
    const destParsed = this.parseAzureUri(destUri);
    
    try {
      // Check if source is a directory
      const srcStat = await this.stat(srcUri);
      if (srcStat.isDir) {
        throw new Error(`Copying directories is not supported yet: ${srcUri}`);
      }
      
      // Perform server-side copy
      const srcContainerClient = this.blobServiceClient.getContainerClient(srcParsed.container);
      const destContainerClient = this.blobServiceClient.getContainerClient(destParsed.container);
      
      const srcBlobClient = srcContainerClient.getBlobClient(srcParsed.blobName);
      const destBlobClient = destContainerClient.getBlobClient(destParsed.blobName);
      
      // Start the copy operation
      const copyResponse = await destBlobClient.syncCopyFromURL(srcBlobClient.url);
      
      // Poll for copy completion
      let copyStatus = copyResponse.copyStatus;
      while (copyStatus === 'pending') {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        const properties = await destBlobClient.getProperties();
        copyStatus = properties.copyStatus;
      }
      
      if (copyStatus !== 'success') {
        throw new Error(`Copy operation failed with status: ${copyStatus}`);
      }
      
      // Get metadata for the copied blob
      const properties = await destBlobClient.getProperties();
      
      // Return metadata for the copied object
      return BaseObj.file(
        destUri,
        path.basename(destParsed.blobName),
        properties.contentLength || 0,
        properties.lastModified,
        properties.etag?.replace(/"/g, ''), // Remove quotes from ETag
        properties.contentCrc64, // Use CRC64 as checksum
        properties.metadata // Include Azure metadata
      );
    } catch (error) {
      throw new Error(`Failed to copy ${srcUri} to ${destUri}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Moves an Azure blob (copy then delete).
   * 
   * @param srcUri The source URI to move from
   * @param destUri The destination URI to move to
   * @returns Promise resolving to the moved object metadata
   */
  async move(srcUri: string, destUri: string): Promise<Obj> {
    try {
      // Copy the blob to the destination
      const copiedObj = await this.copy(srcUri, destUri);
      
      // Delete the source blob
      await this.delete(srcUri);
      
      return copiedObj;
    } catch (error) {
      throw new Error(`Failed to move ${srcUri} to ${destUri}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Creates a directory in Azure (creates an empty blob with a trailing slash).
   * 
   * @param uri The URI of the directory to create
   * @returns Promise that resolves when directory creation completes
   */
  async mkdir(uri: string): Promise<void> {
    const { container: containerName, blobName } = this.parseAzureUri(uri);
    const containerClient = this.blobServiceClient.getContainerClient(containerName);
    
    try {
      const dirBlobName = blobName.endsWith('/') ? blobName : `${blobName}/`;
      
      // Create an empty blob with a trailing slash to represent a directory
      const blobClient = containerClient.getBlockBlobClient(dirBlobName);
      await blobClient.upload('', 0);
    } catch (error) {
      throw new Error(`Failed to create directory ${uri}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Checks if an Azure blob or directory exists.
   * 
   * @param uri The URI to check existence for
   * @returns Promise resolving to true if the blob exists, false otherwise
   */
  async exists(uri: string): Promise<boolean> {
    try {
      await this.stat(uri);
      return true;
    } catch {
      return false;
    }
  }
}
