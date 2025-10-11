import * as fs from 'fs/promises';
import * as path from 'path';
import { FileItem } from './types.js';

export interface ProviderInfo {
  name: string;
  scheme: string;
  displayName: string;
  description: string;
  available: boolean;
}

export class ProviderManager {
  private currentProvider: string = 'file';
  private providers: Map<string, ProviderInfo> = new Map();

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    this.providers.set('file', {
      name: 'file',
      scheme: 'file',
      displayName: 'Local File System',
      description: 'Local file system access',
      available: true
    });

    this.providers.set('s3', {
      name: 's3',
      scheme: 's3',
      displayName: 'Amazon S3',
      description: 'Amazon Simple Storage Service',
      available: false // Will be enabled when credentials are configured
    });

    this.providers.set('gcs', {
      name: 'gcs',
      scheme: 'gcs',
      displayName: 'Google Cloud Storage',
      description: 'Google Cloud Storage',
      available: false // Will be enabled when credentials are configured
    });

    this.providers.set('az', {
      name: 'az',
      scheme: 'az',
      displayName: 'Azure Blob Storage',
      description: 'Microsoft Azure Blob Storage',
      available: false // Will be enabled when credentials are configured
    });

    this.providers.set('aifs', {
      name: 'aifs',
      scheme: 'aifs',
      displayName: 'AIFS',
      description: 'AI-centric File System',
      available: false // Will be enabled when endpoint is configured
    });
  }

  getCurrentProvider(): string {
    return this.currentProvider;
  }

  getAvailableProviders(): ProviderInfo[] {
    return Array.from(this.providers.values()).filter(p => p.available);
  }

  getAllProviders(): ProviderInfo[] {
    return Array.from(this.providers.values());
  }

  setCurrentProvider(scheme: string): void {
    if (!this.providers.has(scheme)) {
      throw new Error(`Provider ${scheme} not found`);
    }
    
    const provider = this.providers.get(scheme)!;
    if (!provider.available) {
      throw new Error(`Provider ${provider.displayName} is not available. Please configure credentials.`);
    }
    
    this.currentProvider = scheme;
  }

  getProviderInfo(scheme: string): ProviderInfo | undefined {
    return this.providers.get(scheme);
  }

  setProviderAvailability(scheme: string, available: boolean): void {
    const provider = this.providers.get(scheme);
    if (provider) {
      provider.available = available;
    }
  }

  async list(uri: string): Promise<{ items: FileItem[]; nextPageToken?: string }> {
    try {
      // Convert file URI to local path
      const localPath = uri.startsWith('file://') ? uri.replace('file://', '') : uri;
      
      const stats = await fs.stat(localPath);
      if (!stats.isDirectory()) {
        throw new Error('Not a directory');
      }
      
      const entries = await fs.readdir(localPath, { withFileTypes: true, encoding: 'utf8' });
      const items: FileItem[] = [];
      
      for (const entry of entries) {
        try {
          const fullPath = path.join(localPath, entry.name);
          const stats = await fs.stat(fullPath);
          
          // Decode the file name properly
          let decodedName = entry.name;
          try {
            // Remove any leading question marks that might be from encoding issues
            decodedName = decodedName.replace(/^\?+\s*/, '');
            
            // Try to decode URL-encoded characters
            if (decodedName.includes('%')) {
              decodedName = decodeURIComponent(decodedName);
            }
            
            // Handle other common encoding issues
            // If the name looks like it might be double-encoded, try decoding again
            if (decodedName.includes('%') && decodedName.match(/%[0-9A-Fa-f]{2}/)) {
              try {
                decodedName = decodeURIComponent(decodedName);
              } catch (e) {
                // If double decoding fails, keep the single decoded version
              }
            }
            
            // Clean up any remaining encoding artifacts
            decodedName = decodedName.replace(/^\?+\s*/, '');
            
            // Keep the full decoded name - let the TUI handle truncation if needed
            // The TUI will handle display truncation with ... if the name is too long
            
          } catch (decodeError) {
            // If decoding fails, use the original name but clean it up
            decodedName = entry.name.replace(/^\?+\s*/, '');
            console.warn('Failed to decode filename:', entry.name, decodeError);
          }
          
          items.push({
            name: decodedName,
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
