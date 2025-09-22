import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';
const promisify = util.promisify;
import { IObjectStore, Obj } from '../../shared/interfaces/IObjectStore';
import { BaseObj } from '../../shared/models/Obj';
import { parseUri, getNameFromUri } from '../../shared/utils/UriUtils';

// Promisify fs functions
const stat = promisify(fs.stat);
const readdir = promisify(fs.readdir);
const mkdir = promisify(fs.mkdir);
const unlink = promisify(fs.unlink);
const rmdir = promisify(fs.rmdir);
const copyFile = promisify(fs.copyFile);
const rename = promisify(fs.rename);
const access = promisify(fs.access);

/**
 * FileProvider implements the IObjectStore interface for the local file system.
 */
export class FileProvider implements IObjectStore {
  /**
   * Returns the URI scheme for this provider.
   */
  scheme(): 'file' {
    return 'file';
  }

  /**
   * Lists files and directories at the specified URI.
   * 
   * @param uri The URI to list (file:///path/to/dir/)
   * @param opts Options for listing
   * @returns Promise resolving to a list of files and directories
   */
  async list(uri: string, opts?: {
    prefix?: string;
    delimiter?: string;
    pageToken?: string;
    pageSize?: number;
  }): Promise<{ items: Obj[]; nextPageToken?: string }> {
    const { path: uriPath } = parseUri(uri);
    const dirPath = this.uriPathToLocalPath(uriPath);
    
    try {
      // Ensure it's a directory
      const stats = await stat(dirPath);
      if (!stats.isDirectory()) {
        throw new Error(`Not a directory: ${uri}`);
      }
      
      // Read directory contents
      const entries = await readdir(dirPath, { withFileTypes: true });
      
      // Apply prefix filter if specified
      let filteredEntries = entries;
      if (opts?.prefix) {
        filteredEntries = entries.filter(entry => entry.name.startsWith(opts.prefix!));
      }
      
      // Apply pagination if specified
      const pageSize = opts?.pageSize || filteredEntries.length;
      const startIndex = opts?.pageToken ? parseInt(opts.pageToken, 10) : 0;
      const endIndex = Math.min(startIndex + pageSize, filteredEntries.length);
      const pagedEntries = filteredEntries.slice(startIndex, endIndex);
      
      // Generate next page token if there are more entries
      const nextPageToken = endIndex < filteredEntries.length ? endIndex.toString() : undefined;
      
      // Convert entries to Obj instances
      const items = await Promise.all(pagedEntries.map(async entry => {
        const entryPath = path.join(dirPath, entry.name);
        const entryUri = `file://${entryPath}`;
        const entryName = entry.name;
        
        if (entry.isDirectory()) {
          return BaseObj.directory(entryUri, entryName);
        } else {
          const fileStats = await stat(entryPath);
          return BaseObj.file(
            entryUri,
            entryName,
            fileStats.size,
            fileStats.mtime,
            undefined, // No ETag for local files
            undefined, // No checksum for local files by default
            undefined  // No metadata for local files by default
          );
        }
      }));
      
      return { items, nextPageToken };
    } catch (error: any) {
      throw new Error(`Failed to list directory ${uri}: ${error.message}`);
    }
  }

  /**
   * Returns metadata for a single file or directory.
   * 
   * @param uri The URI to get metadata for
   * @returns Promise resolving to the object metadata
   */
  async stat(uri: string): Promise<Obj> {
    const { path: uriPath } = parseUri(uri);
    const localPath = this.uriPathToLocalPath(uriPath);
    
    try {
      const stats = await stat(localPath);
      const name = getNameFromUri(uri);
      
      if (stats.isDirectory()) {
        return BaseObj.directory(uri, name);
      } else {
        return BaseObj.file(
          uri,
          name,
          stats.size,
          stats.mtime,
          undefined, // No ETag for local files
          undefined, // No checksum for local files by default
          undefined  // No metadata for local files by default
        );
      }
    } catch (error) {
      throw new Error(`Failed to stat ${uri}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Downloads a file to a local path (essentially a copy operation for local files).
   * 
   * @param uri The URI of the file to download
   * @param destPath The local file path to download to
   * @returns Promise that resolves when download completes
   */
  async get(uri: string, destPath: string): Promise<void> {
    const { path: uriPath } = parseUri(uri);
    const srcPath = this.uriPathToLocalPath(uriPath);
    
    try {
      // Ensure source exists and is a file
      const stats = await stat(srcPath);
      if (stats.isDirectory()) {
        throw new Error(`Cannot download a directory: ${uri}`);
      }
      
      // Copy the file
      await copyFile(srcPath, destPath);
    } catch (error: any) {
      throw new Error(`Failed to download ${uri}: ${error.message || error}`);
    }
  }

  /**
   * Uploads a local file (essentially a copy operation for local files).
   * 
   * @param srcPath The local file path to upload
   * @param destUri The destination URI to upload to
   * @param opts Optional parameters
   * @returns Promise resolving to the uploaded file metadata
   */
  async put(srcPath: string, destUri: string, opts?: {
    contentType?: string;
    metadata?: Record<string, string>;
  }): Promise<Obj> {
    const { path: uriPath } = parseUri(destUri);
    const destPath = this.uriPathToLocalPath(uriPath);
    
    try {
      // Ensure source exists and is a file
      const srcStats = await stat(srcPath);
      if (srcStats.isDirectory()) {
        throw new Error(`Cannot upload a directory: ${srcPath}`);
      }
      
      // Create parent directory if it doesn't exist
      const destDir = path.dirname(destPath);
      await mkdir(destDir, { recursive: true });
      
      // Copy the file
      await copyFile(srcPath, destPath);
      
      // Return metadata for the uploaded file
      const destStats = await stat(destPath);
      const name = getNameFromUri(destUri);
      
      return BaseObj.file(
        destUri,
        name,
        destStats.size,
        destStats.mtime,
        undefined, // No ETag for local files
        undefined, // No checksum for local files by default
        opts?.metadata // Include any provided metadata
      );
    } catch (error: any) {
      throw new Error(`Failed to upload to ${destUri}: ${error.message || error}`);
    }
  }

  /**
   * Deletes a file or directory.
   * 
   * @param uri The URI of the file or directory to delete
   * @param recursive If true, recursively delete directories
   * @returns Promise that resolves when deletion completes
   */
  async delete(uri: string, recursive = false): Promise<void> {
    const { path: uriPath } = parseUri(uri);
    const localPath = this.uriPathToLocalPath(uriPath);
    
    try {
      const stats = await stat(localPath);
      
      if (stats.isDirectory()) {
        if (recursive) {
          // Recursively delete directory contents
          await this.recursiveDelete(localPath);
        } else {
          // Check if directory is empty
          const entries = await readdir(localPath);
          if (entries.length > 0) {
            throw new Error(`Directory not empty: ${uri}`);
          }
          await rmdir(localPath);
        }
      } else {
        // Delete file
        await unlink(localPath);
      }
    } catch (error: any) {
      throw new Error(`Failed to delete ${uri}: ${error.message || error}`);
    }
  }

  /**
   * Recursively deletes a directory and its contents.
   * 
   * @param dirPath The directory path to delete
   * @returns Promise that resolves when deletion completes
   */
  private async recursiveDelete(dirPath: string): Promise<void> {
    const entries = await readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        await this.recursiveDelete(entryPath);
      } else {
        await unlink(entryPath);
      }
    }
    
    await rmdir(dirPath);
  }

  /**
   * Copies a file or directory.
   * 
   * @param srcUri The source URI to copy from
   * @param destUri The destination URI to copy to
   * @returns Promise resolving to the copied file metadata
   */
  async copy(srcUri: string, destUri: string): Promise<Obj> {
    const { path: srcPath } = parseUri(srcUri);
    const { path: destPath } = parseUri(destUri);
    const srcLocalPath = this.uriPathToLocalPath(srcPath);
    const destLocalPath = this.uriPathToLocalPath(destPath);
    
    try {
      const stats = await stat(srcLocalPath);
      
      if (stats.isDirectory()) {
        throw new Error(`Copying directories is not supported yet: ${srcUri}`);
      } else {
        // Create parent directory if it doesn't exist
        const destDir = path.dirname(destLocalPath);
        await mkdir(destDir, { recursive: true });
        
        // Copy the file
        await copyFile(srcLocalPath, destLocalPath);
        
        // Return metadata for the copied file
        const destStats = await stat(destLocalPath);
        const name = getNameFromUri(destUri);
        
        return BaseObj.file(
          destUri,
          name,
          destStats.size,
          destStats.mtime,
          undefined, // No ETag for local files
          undefined, // No checksum for local files by default
          undefined  // No metadata for local files by default
        );
      }
    } catch (error: any) {
      throw new Error(`Failed to copy ${srcUri} to ${destUri}: ${error.message || error}`);
    }
  }

  /**
   * Moves a file or directory.
   * 
   * @param srcUri The source URI to move from
   * @param destUri The destination URI to move to
   * @returns Promise resolving to the moved file metadata
   */
  async move(srcUri: string, destUri: string): Promise<Obj> {
    const { path: srcPath } = parseUri(srcUri);
    const { path: destPath } = parseUri(destUri);
    const srcLocalPath = this.uriPathToLocalPath(srcPath);
    const destLocalPath = this.uriPathToLocalPath(destPath);
    
    try {
      // Create parent directory if it doesn't exist
      const destDir = path.dirname(destLocalPath);
      await mkdir(destDir, { recursive: true });
      
      // Move the file or directory
      await rename(srcLocalPath, destLocalPath);
      
      // Return metadata for the moved file/directory
      const stats = await stat(destLocalPath);
      const name = getNameFromUri(destUri);
      
      if (stats.isDirectory()) {
        return BaseObj.directory(destUri, name);
      } else {
        return BaseObj.file(
          destUri,
          name,
          stats.size,
          stats.mtime,
          undefined, // No ETag for local files
          undefined, // No checksum for local files by default
          undefined  // No metadata for local files by default
        );
      }
    } catch (error: any) {
      throw new Error(`Failed to move ${srcUri} to ${destUri}: ${error.message || error}`);
    }
  }

  /**
   * Creates a directory.
   * 
   * @param uri The URI of the directory to create
   * @returns Promise that resolves when directory creation completes
   */
  async mkdir(uri: string): Promise<void> {
    const { path: uriPath } = parseUri(uri);
    const dirPath = this.uriPathToLocalPath(uriPath);
    
    try {
      await mkdir(dirPath, { recursive: true });
    } catch (error: any) {
      throw new Error(`Failed to create directory ${uri}: ${error.message || error}`);
    }
  }

  /**
   * Checks if a file or directory exists.
   * 
   * @param uri The URI to check existence for
   * @returns Promise resolving to true if the file/directory exists, false otherwise
   */
  async exists(uri: string): Promise<boolean> {
    const { path: uriPath } = parseUri(uri);
    const localPath = this.uriPathToLocalPath(uriPath);
    
    try {
      await access(localPath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Converts a URI path to a local file system path.
   * 
   * @param uriPath The URI path to convert
   * @returns The local file system path
   */
  private uriPathToLocalPath(uriPath: string): string {
    // For Windows, handle drive letters correctly
    if (process.platform === 'win32') {
      // If path starts with a drive letter (e.g., C:), return as is
      if (/^[a-zA-Z]:/.test(uriPath)) {
        return uriPath;
      }
      // Otherwise, ensure it's an absolute path
      return path.resolve('/', uriPath);
    }
    
    // For Unix-like systems, ensure it's an absolute path
    return path.resolve('/', uriPath);
  }
}