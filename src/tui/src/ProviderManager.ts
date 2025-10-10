import * as fs from 'fs/promises';
import * as path from 'path';
import { FileItem } from './types.js';

export class ProviderManager {
  private currentProvider: string = 'file';

  constructor() {
    // For now, only support file system operations
  }

  getCurrentProvider(): string {
    return this.currentProvider;
  }

  setCurrentProvider(scheme: string): void {
    if (scheme !== 'file') {
      throw new Error(`Provider ${scheme} not available in TUI`);
    }
    this.currentProvider = scheme;
  }

  async list(uri: string): Promise<{ items: FileItem[]; nextPageToken?: string }> {
    try {
      // Convert file URI to local path
      const localPath = uri.startsWith('file://') ? uri.replace('file://', '') : uri;
      
      const stats = await fs.stat(localPath);
      if (!stats.isDirectory()) {
        throw new Error('Not a directory');
      }
      
      const entries = await fs.readdir(localPath, { withFileTypes: true });
      const items: FileItem[] = [];
      
      for (const entry of entries) {
        try {
          const fullPath = path.join(localPath, entry.name);
          const stats = await fs.stat(fullPath);
          
          items.push({
            name: entry.name,
            isDirectory: entry.isDirectory(),
            size: stats.size,
            mtime: stats.mtime,
            uri: `file://${path.resolve(fullPath)}`
          });
        } catch (statError) {
          // Skip files we can't access
          continue;
        }
      }
      
      // Sort: directories first, then files
      items.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
      
      return { items, nextPageToken: undefined };
    } catch (error) {
      throw new Error(`Cannot read directory: ${(error as Error).message}`);
    }
  }

  async copy(srcUri: string, destUri: string): Promise<void> {
    const srcPath = srcUri.startsWith('file://') ? srcUri.replace('file://', '') : srcUri;
    const destPath = destUri.startsWith('file://') ? destUri.replace('file://', '') : destUri;
    
    try {
      // Ensure destination directory exists
      const destDir = path.dirname(destPath);
      await fs.mkdir(destDir, { recursive: true });
      
      await fs.copyFile(srcPath, destPath);
    } catch (error) {
      throw new Error(`Failed to copy ${srcPath} to ${destPath}: ${(error as Error).message}`);
    }
  }

  async move(srcUri: string, destUri: string): Promise<void> {
    const srcPath = srcUri.startsWith('file://') ? srcUri.replace('file://', '') : srcUri;
    const destPath = destUri.startsWith('file://') ? destUri.replace('file://', '') : destUri;
    
    try {
      // Ensure destination directory exists
      const destDir = path.dirname(destPath);
      await fs.mkdir(destDir, { recursive: true });
      
      await fs.rename(srcPath, destPath);
    } catch (error) {
      throw new Error(`Failed to move ${srcPath} to ${destPath}: ${(error as Error).message}`);
    }
  }

  async delete(uri: string, recursive?: boolean): Promise<void> {
    const localPath = uri.startsWith('file://') ? uri.replace('file://', '') : uri;
    
    if (recursive) {
      await fs.rm(localPath, { recursive: true, force: true });
    } else {
      const stats = await fs.stat(localPath);
      if (stats.isDirectory()) {
        await fs.rmdir(localPath);
      } else {
        await fs.unlink(localPath);
      }
    }
  }

  async mkdir(uri: string): Promise<void> {
    const localPath = uri.startsWith('file://') ? uri.replace('file://', '') : uri;
    await fs.mkdir(localPath, { recursive: true });
  }

  async exists(uri: string): Promise<boolean> {
    try {
      const localPath = uri.startsWith('file://') ? uri.replace('file://', '') : uri;
      await fs.access(localPath);
      return true;
    } catch {
      return false;
    }
  }

  getCurrentProviderScheme(): string {
    return this.currentProvider;
  }
}
