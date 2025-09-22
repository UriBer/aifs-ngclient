import { S3Client, ListObjectsV2Command, HeadObjectCommand, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, CopyObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
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
 * S3Provider implements the IObjectStore interface for Amazon S3.
 */
export class S3Provider implements IObjectStore {
  private client: S3Client;
  
  /**
   * Creates a new S3Provider instance.
   * 
   * @param config Optional S3 client configuration
   */
  constructor(config?: { region?: string, credentials?: { accessKeyId: string, secretAccessKey: string } }) {
    // Use default AWS credential chain if no credentials provided
    const s3Config = config || {};
    
    // If no region is provided, try to get it from environment or use us-east-1
    if (!s3Config.region) {
      s3Config.region = process.env.AWS_REGION || 'us-east-1';
    }
    
    this.client = new S3Client(s3Config);
  }
  
  /**
   * Returns the URI scheme for this provider.
   */
  scheme(): 's3' {
    return 's3';
  }
  
  /**
   * Parses an S3 URI into bucket and key components.
   * 
   * @param uri The S3 URI to parse (s3://bucket/key)
   * @returns Object containing bucket and key
   */
  private parseS3Uri(uri: string): { bucket: string, key: string } {
    const { path } = parseUri(uri);
    
    // Extract bucket and key from path
    const parts = path.split('/');
    const bucket = parts[0];
    const key = parts.slice(1).join('/');
    
    return { bucket, key };
  }
  
  /**
   * Lists objects in an S3 bucket with the given prefix.
   * 
   * @param uri The URI to list (s3://bucket/prefix/)
   * @param opts Options for listing
   * @returns Promise resolving to a list of objects
   */
  async list(uri: string, opts?: {
    prefix?: string;
    delimiter?: string;
    pageToken?: string;
    pageSize?: number;
  }): Promise<{ items: Obj[]; nextPageToken?: string }> {
    const { bucket, key } = this.parseS3Uri(uri);
    const prefix = key.endsWith('/') ? key : `${key}/`;
    
    try {
      const command = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        Delimiter: opts?.delimiter || '/',
        MaxKeys: opts?.pageSize || 1000,
        ContinuationToken: opts?.pageToken,
      });
      
      const response = await this.client.send(command);
      const items: Obj[] = [];
      
      // Process common prefixes (directories)
      if (response.CommonPrefixes) {
        for (const commonPrefix of response.CommonPrefixes) {
          if (commonPrefix.Prefix) {
            const name = commonPrefix.Prefix.slice(prefix.length);
            if (name) {
              const dirUri = `s3://${bucket}/${commonPrefix.Prefix}`;
              items.push(BaseObj.directory(dirUri, name.replace('/', '')));
            }
          }
        }
      }
      
      // Process objects (files)
      if (response.Contents) {
        for (const content of response.Contents) {
          // Skip the directory marker itself
          if (content.Key === prefix) continue;
          
          // Skip objects that represent directories (end with /)
          if (content.Key?.endsWith('/')) continue;
          
          const relativePath = content.Key?.slice(prefix.length);
          // Skip nested objects when delimiter is used
          if (opts?.delimiter && relativePath?.includes(opts.delimiter)) continue;
          
          if (content.Key && relativePath) {
            const fileUri = `s3://${bucket}/${content.Key}`;
            items.push(BaseObj.file(
              fileUri,
              relativePath,
              content.Size || 0,
              content.LastModified,
              content.ETag?.replace(/"/g, ''), // Remove quotes from ETag
              undefined, // No checksum by default
              undefined  // No metadata by default
            ));
          }
        }
      }
      
      return {
        items,
        nextPageToken: response.NextContinuationToken
      };
    } catch (error) {
      throw new Error(`Failed to list S3 objects at ${uri}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Returns metadata for a single S3 object.
   * 
   * @param uri The URI to get metadata for
   * @returns Promise resolving to the object metadata
   */
  async stat(uri: string): Promise<Obj> {
    const { bucket, key } = this.parseS3Uri(uri);
    
    try {
      // Check if this is a directory (key ends with /)
      if (key === '' || key.endsWith('/')) {
        // For bucket root or directory marker
        if (key === '') {
          // Verify bucket exists
          await this.client.send(new HeadBucketCommand({ Bucket: bucket }));
        } else {
          // Verify directory marker exists
          await this.client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        }
        
        return BaseObj.directory(
          uri,
          key === '' ? bucket : path.basename(key.slice(0, -1))
        );
      }
      
      // Try to get object metadata
      try {
        const response = await this.client.send(new HeadObjectCommand({
          Bucket: bucket,
          Key: key
        }));
        
        return BaseObj.file(
          uri,
          path.basename(key),
          response.ContentLength || 0,
          response.LastModified,
          response.ETag?.replace(/"/g, ''), // Remove quotes from ETag
          undefined, // No checksum by default
          response.Metadata // Include S3 metadata
        );
      } catch (error) {
        // Check if it might be a directory without a directory marker
        // by listing objects with this prefix
        const listCommand = new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: `${key}/`,
          MaxKeys: 1
        });
        
        const listResponse = await this.client.send(listCommand);
        if (listResponse.Contents && listResponse.Contents.length > 0) {
          // This is a directory without a directory marker
          return BaseObj.directory(
            uri,
            path.basename(key)
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
   * Downloads an S3 object to a local file.
   * 
   * @param uri The URI of the object to download
   * @param destPath The local file path to download to
   * @returns Promise that resolves when download completes
   */
  async get(uri: string, destPath: string): Promise<void> {
    const { bucket, key } = this.parseS3Uri(uri);
    
    try {
      // Ensure the destination directory exists
      const destDir = path.dirname(destPath);
      await mkdir(destDir, { recursive: true });
      
      // Get the object
      const response = await this.client.send(new GetObjectCommand({
        Bucket: bucket,
        Key: key
      }));
      
      // Stream the object to a file
      if (response.Body) {
        const writeStream = createWriteStream(destPath);
        // @ts-ignore - Body has a pipe method but TypeScript doesn't recognize it
        await pipeline(response.Body, writeStream);
      } else {
        throw new Error('Response body is empty');
      }
    } catch (error) {
      throw new Error(`Failed to download ${uri}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Uploads a local file to S3.
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
    const { bucket, key } = this.parseS3Uri(destUri);
    
    try {
      // Check if source file exists
      const stats = await promisify(fs.stat)(srcPath);
      if (!stats.isFile()) {
        throw new Error(`Source is not a file: ${srcPath}`);
      }
      
      // Create a read stream for the file
      const fileStream = createReadStream(srcPath);
      
      // Use multipart upload for better handling of large files
      const upload = new Upload({
        client: this.client,
        params: {
          Bucket: bucket,
          Key: key,
          Body: fileStream,
          ContentType: opts?.contentType,
          Metadata: opts?.metadata
        }
      });
      
      await upload.done();
      
      // Return metadata for the uploaded object
      return BaseObj.file(
        destUri,
        path.basename(key),
        stats.size,
        new Date(),
        undefined, // ETag is not available here
        undefined, // No checksum by default
        opts?.metadata
      );
    } catch (error) {
      throw new Error(`Failed to upload to ${destUri}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Deletes an S3 object or directory.
   * 
   * @param uri The URI of the object to delete
   * @param recursive If true, recursively delete directories
   * @returns Promise that resolves when deletion completes
   */
  async delete(uri: string, recursive = false): Promise<void> {
    const { bucket, key } = this.parseS3Uri(uri);
    
    try {
      // Check if this is a directory
      if (key === '' || key.endsWith('/')) {
        if (!recursive) {
          // Check if directory is empty
          const listCommand = new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: key,
            MaxKeys: 2 // Get one more to check if there are objects other than the directory marker
          });
          
          const response = await this.client.send(listCommand);
          if (response.Contents && response.Contents.length > 1) {
            throw new Error(`Directory not empty: ${uri}`);
          }
        } else {
          // Recursively delete all objects with this prefix
          // Note: In a production environment, you might want to use S3 batch operations for large directories
          let continuationToken: string | undefined;
          
          do {
            const listCommand = new ListObjectsV2Command({
              Bucket: bucket,
              Prefix: key,
              ContinuationToken: continuationToken
            });
            
            const response = await this.client.send(listCommand);
            
            if (response.Contents && response.Contents.length > 0) {
              for (const content of response.Contents) {
                if (content.Key) {
                  await this.client.send(new DeleteObjectCommand({
                    Bucket: bucket,
                    Key: content.Key
                  }));
                }
              }
            }
            
            continuationToken = response.NextContinuationToken;
          } while (continuationToken);
          
          return;
        }
      }
      
      // Delete the object
      await this.client.send(new DeleteObjectCommand({
        Bucket: bucket,
        Key: key
      }));
    } catch (error) {
      throw new Error(`Failed to delete ${uri}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Copies an S3 object.
   * 
   * @param srcUri The source URI to copy from
   * @param destUri The destination URI to copy to
   * @returns Promise resolving to the copied object metadata
   */
  async copy(srcUri: string, destUri: string): Promise<Obj> {
    const srcParsed = this.parseS3Uri(srcUri);
    const destParsed = this.parseS3Uri(destUri);
    
    try {
      // Check if source is a directory
      const srcStat = await this.stat(srcUri);
      if (srcStat.isDir) {
        throw new Error(`Copying directories is not supported yet: ${srcUri}`);
      }
      
      // Check object size to determine copy method
      const objectSize = srcStat.size || 0;
      const FIVE_GB = 5 * 1024 * 1024 * 1024; // 5GB in bytes
      
      if (objectSize <= FIVE_GB) {
        // Use single atomic copy for objects ≤ 5GB
        const response = await this.client.send(new CopyObjectCommand({
          CopySource: `${srcParsed.bucket}/${srcParsed.key}`,
          Bucket: destParsed.bucket,
          Key: destParsed.key
        }));
        
        // Return metadata for the copied object
        return BaseObj.file(
          destUri,
          path.basename(destParsed.key),
          objectSize,
          response.CopyObjectResult?.LastModified || new Date(),
          response.CopyObjectResult?.ETag?.replace(/"/g, ''), // Remove quotes from ETag
          undefined, // No checksum by default
          undefined  // No metadata by default
        );
      } else {
        // For objects > 5GB, we need to use multipart copy
        // This is a simplified implementation - in production you'd want to use UploadPartCopy
        throw new Error(`Objects larger than 5GB require multipart copy, which is not implemented yet. Object size: ${objectSize} bytes`);
      }
    } catch (error) {
      throw new Error(`Failed to copy ${srcUri} to ${destUri}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Moves an S3 object (copy then delete).
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
   * Creates a directory in S3 (creates an empty object with a trailing slash).
   * 
   * @param uri The URI of the directory to create
   * @returns Promise that resolves when directory creation completes
   */
  async mkdir(uri: string): Promise<void> {
    const { bucket, key } = this.parseS3Uri(uri);
    const dirKey = key.endsWith('/') ? key : `${key}/`;
    
    try {
      // Create an empty object with a trailing slash to represent a directory
      await this.client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: dirKey,
        Body: ''
      }));
    } catch (error) {
      throw new Error(`Failed to create directory ${uri}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Checks if an S3 object or directory exists.
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