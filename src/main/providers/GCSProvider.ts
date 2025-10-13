import { Storage } from '@google-cloud/storage';
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
 * GCSProvider implements the IObjectStore interface for Google Cloud Storage.
 */
export class GCSProvider implements IObjectStore {
  private storage: Storage;
  
  /**
   * Creates a new GCSProvider instance.
   * 
   * @param config Optional GCS client configuration
   */
  constructor(config?: { projectId?: string, keyFilename?: string }) {
    // Use default Google Cloud credentials if no config provided
    const gcsConfig = config || {};
    
    this.storage = new Storage(gcsConfig);
  }
  
  /**
   * Returns the URI scheme for this provider.
   */
  scheme(): 'gcs' {
    return 'gcs';
  }
  
  /**
   * Parses a GCS URI into bucket and path components.
   * 
   * @param uri The GCS URI to parse (gcs://bucket/path)
   * @returns Object containing bucket and path
   */
  private parseGCSUri(uri: string): { bucket: string, path: string } {
    const { path: uriPath } = parseUri(uri);
    
    // Extract bucket and path from URI path
    const parts = uriPath.split('/');
    const bucket = parts[0];
    const path = parts.slice(1).join('/');
    
    return { bucket, path };
  }
  
  /**
   * Lists objects in a GCS bucket with the given prefix.
   * 
   * @param uri The URI to list (gcs://bucket/prefix/)
   * @param opts Options for listing
   * @returns Promise resolving to a list of objects
   */
  async list(uri: string, opts?: {
    prefix?: string;
    delimiter?: string;
    pageToken?: string;
    pageSize?: number;
  }): Promise<{ items: Obj[]; nextPageToken?: string }> {
    const { bucket: bucketName, path: prefix } = this.parseGCSUri(uri);
    const bucket = this.storage.bucket(bucketName);
    
    try {
      const [files, , apiResponse] = await bucket.getFiles({
        prefix: prefix.endsWith('/') ? prefix : `${prefix}/`,
        delimiter: opts?.delimiter || '/',
        maxResults: opts?.pageSize || 1000,
        pageToken: opts?.pageToken
      });
      
      const items: Obj[] = [];
      
      // Process directories (common prefixes)
      if (apiResponse?.prefixes) {
        for (const dirPrefix of apiResponse.prefixes) {
          const name = dirPrefix.replace(prefix, '').replace(/\/$/, '');
          if (name) {
            const dirUri = `gcs://${bucketName}/${dirPrefix}`;
            items.push(BaseObj.directory(dirUri, name));
          }
        }
      }
      
      // Process files
      for (const file of files) {
        // Skip the directory marker itself
        if (file.name === prefix) continue;
        
        // Skip objects that represent directories (end with /)
        if (file.name.endsWith('/')) continue;
        
        const relativePath = file.name.replace(prefix, '');
        // Skip nested objects when delimiter is used
        if (opts?.delimiter && relativePath.includes(opts.delimiter)) continue;
        
        if (relativePath) {
          const fileUri = `gcs://${bucketName}/${file.name}`;
          const [metadata] = await file.getMetadata();
          
          items.push(BaseObj.file(
            fileUri,
            relativePath,
            parseInt(metadata.size || '0'),
            metadata.updated ? new Date(metadata.updated) : undefined,
            metadata.md5Hash, // Use MD5 hash as ETag
            metadata.crc32c, // Use CRC32C as checksum
            metadata.metadata // Include GCS metadata
          ));
        }
      }
      
      return {
        items,
        nextPageToken: apiResponse.nextPageToken
      };
    } catch (error) {
      throw new Error(`Failed to list GCS objects at ${uri}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Returns metadata for a single GCS object.
   * 
   * @param uri The URI to get metadata for
   * @returns Promise resolving to the object metadata
   */
  async stat(uri: string): Promise<Obj> {
    const { bucket: bucketName, path: objectPath } = this.parseGCSUri(uri);
    const bucket = this.storage.bucket(bucketName);
    
    try {
      // Check if this is a directory (path ends with /)
      if (objectPath === '' || objectPath.endsWith('/')) {
        // For bucket root or directory marker
        if (objectPath === '') {
          // Verify bucket exists
          await bucket.getMetadata();
        } else {
          // Verify directory marker exists
          const file = bucket.file(objectPath);
          await file.getMetadata();
        }
        
        return BaseObj.directory(
          uri,
          objectPath === '' ? bucketName : path.basename(objectPath.slice(0, -1))
        );
      }
      
      // Try to get object metadata
      try {
        const file = bucket.file(objectPath);
        const [metadata] = await file.getMetadata();
        
        return BaseObj.file(
          uri,
          path.basename(objectPath),
          parseInt(metadata.size || '0'),
          metadata.updated ? new Date(metadata.updated) : undefined,
          metadata.md5Hash, // Use MD5 hash as ETag
          metadata.crc32c, // Use CRC32C as checksum
          metadata.metadata // Include GCS metadata
        );
      } catch (error) {
        // Check if it might be a directory without a directory marker
        // by listing objects with this prefix
        const [files] = await bucket.getFiles({
          prefix: `${objectPath}/`,
          maxResults: 1
        });
        
        if (files.length > 0) {
          // This is a directory without a directory marker
          return BaseObj.directory(
            uri,
            path.basename(objectPath)
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
   * Downloads a GCS object to a local file.
   * 
   * @param uri The URI of the object to download
   * @param destPath The local file path to download to
   * @returns Promise that resolves when download completes
   */
  async get(uri: string, destPath: string): Promise<void> {
    const { bucket: bucketName, path: objectPath } = this.parseGCSUri(uri);
    const bucket = this.storage.bucket(bucketName);
    
    try {
      // Ensure the destination directory exists
      const destDir = path.dirname(destPath);
      await mkdir(destDir, { recursive: true });
      
      // Get the file
      const file = bucket.file(objectPath);
      
      // Stream the object to a file
      const writeStream = createWriteStream(destPath);
      await pipeline(file.createReadStream(), writeStream);
    } catch (error) {
      throw new Error(`Failed to download ${uri}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Uploads a local file to GCS.
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
    const { bucket: bucketName, path: objectPath } = this.parseGCSUri(destUri);
    const bucket = this.storage.bucket(bucketName);
    
    try {
      // Check if source file exists
      const stats = await promisify(fs.stat)(srcPath);
      if (!stats.isFile()) {
        throw new Error(`Source is not a file: ${srcPath}`);
      }
      
      // Create a read stream for the file
      const fileStream = createReadStream(srcPath);
      
      // Upload the file
      const file = bucket.file(objectPath);
      const uploadOptions: any = {
        metadata: {
          contentType: opts?.contentType,
          metadata: opts?.metadata
        }
      };
      
      // Use resumable upload for files larger than 2MB
      if (stats.size > 2 * 1024 * 1024) {
        uploadOptions.resumable = true;
      }
      
      await new Promise<void>((resolve, reject) => {
        const writeStream = file.createWriteStream(uploadOptions);
        
        writeStream.on('error', reject);
        writeStream.on('finish', resolve);
        
        fileStream.pipe(writeStream);
      });
      
      // Get metadata for the uploaded object
      const [metadata] = await file.getMetadata();
      
      // Return metadata for the uploaded object
      return BaseObj.file(
        destUri,
        path.basename(objectPath),
        stats.size,
        metadata.updated ? new Date(metadata.updated) : new Date(),
        metadata.md5Hash, // Use MD5 hash as ETag
        metadata.crc32c, // Use CRC32C as checksum
        opts?.metadata
      );
    } catch (error) {
      throw new Error(`Failed to upload to ${destUri}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Deletes a GCS object or directory.
   * 
   * @param uri The URI of the object to delete
   * @param recursive If true, recursively delete directories
   * @returns Promise that resolves when deletion completes
   */
  async delete(uri: string, recursive = false): Promise<void> {
    const { bucket: bucketName, path: objectPath } = this.parseGCSUri(uri);
    const bucket = this.storage.bucket(bucketName);
    
    try {
      // Check if this is a directory
      if (objectPath === '' || objectPath.endsWith('/')) {
        if (!recursive) {
          // Check if directory is empty
          const [files] = await bucket.getFiles({
            prefix: objectPath,
            maxResults: 2
          });
          
          if (files.length > 1) {
            throw new Error(`Directory not empty: ${uri}`);
          }
        } else {
          // Recursively delete all objects with this prefix
          const [files] = await bucket.getFiles({
            prefix: objectPath
          });
          
          for (const file of files) {
            await file.delete();
          }
          
          return;
        }
      }
      
      // Delete the object
      const file = bucket.file(objectPath);
      await file.delete();
    } catch (error) {
      throw new Error(`Failed to delete ${uri}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Copies a GCS object (server-side copy).
   * 
   * @param srcUri The source URI to copy from
   * @param destUri The destination URI to copy to
   * @returns Promise resolving to the copied object metadata
   */
  async copy(srcUri: string, destUri: string): Promise<Obj> {
    const srcParsed = this.parseGCSUri(srcUri);
    const destParsed = this.parseGCSUri(destUri);
    
    try {
      // Check if source is a directory
      const srcStat = await this.stat(srcUri);
      if (srcStat.isDir) {
        throw new Error(`Copying directories is not supported yet: ${srcUri}`);
      }
      
      // Perform server-side copy
      const srcBucket = this.storage.bucket(srcParsed.bucket);
      const destBucket = this.storage.bucket(destParsed.bucket);
      const srcFile = srcBucket.file(srcParsed.path);
      const destFile = destBucket.file(destParsed.path);
      
      await srcFile.copy(destFile);
      
      // Get metadata for the copied object
      const [metadata] = await destFile.getMetadata();
      
      // Return metadata for the copied object
      return BaseObj.file(
        destUri,
        path.basename(destParsed.path),
        parseInt(metadata.size || '0'),
        metadata.updated ? new Date(metadata.updated) : new Date(),
        metadata.md5Hash, // Use MD5 hash as ETag
        metadata.crc32c, // Use CRC32C as checksum
        metadata.metadata // Include GCS metadata
      );
    } catch (error) {
      throw new Error(`Failed to copy ${srcUri} to ${destUri}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Moves a GCS object (copy then delete).
   * 
   * @param srcUri The source URI to move from
   * @param destUri The destination URI to move to
   * @returns Promise resolving to the moved object metadata
   */
  async move(srcUri: string, destUri: string): Promise<Obj> {
    try {
      // Copy the object to the destination
      const copiedObj = await this.copy(srcUri, destUri);
      
      // Delete the source object
      await this.delete(srcUri);
      
      return copiedObj;
    } catch (error) {
      throw new Error(`Failed to move ${srcUri} to ${destUri}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Creates a directory in GCS (creates an empty object with a trailing slash).
   * 
   * @param uri The URI of the directory to create
   * @returns Promise that resolves when directory creation completes
   */
  async mkdir(uri: string): Promise<void> {
    const { bucket: bucketName, path: objectPath } = this.parseGCSUri(uri);
    const bucket = this.storage.bucket(bucketName);
    
    try {
      const dirPath = objectPath.endsWith('/') ? objectPath : `${objectPath}/`;
      
      // Create an empty object with a trailing slash to represent a directory
      const file = bucket.file(dirPath);
      await file.save('');
    } catch (error) {
      throw new Error(`Failed to create directory ${uri}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Checks if a GCS object or directory exists.
   * 
   * @param uri The URI to check existence for
   * @returns Promise resolving to true if the object exists, false otherwise
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
