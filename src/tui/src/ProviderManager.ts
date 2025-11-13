import * as fs from 'fs/promises';
import * as path from 'path';
import { FileItem } from './types.js';
import { S3Client, ListBucketsCommand, ListObjectsV2Command, CopyObjectCommand, DeleteObjectCommand, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { Storage } from '@google-cloud/storage';
import { BlobServiceClient } from '@azure/storage-blob';
import { ConfigManager } from './ConfigManager.js';

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
  private configManager: ConfigManager | null = null;
  private s3Client: S3Client | null = null;
  private gcsClient: Storage | null = null;
  private azClient: BlobServiceClient | null = null;

  constructor(configManager?: ConfigManager) {
    this.configManager = configManager || null;
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

  getAllProviders(): ProviderInfo[] {
    return Array.from(this.providers.values());
  }

  getProviderInfo(scheme: string): ProviderInfo | undefined {
    return this.providers.get(scheme);
  }

  setProviderAvailable(scheme: string, available: boolean): void {
    const provider = this.providers.get(scheme);
    if (provider) {
      provider.available = available;
    }
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

  async list(uri: string): Promise<{ items: FileItem[]; nextPageToken?: string }> {
    try {
      // Handle different URI schemes
      if (uri.startsWith('s3://')) {
        return await this.listS3(uri);
      } else if (uri.startsWith('gcs://')) {
        return await this.listGCS(uri);
      } else if (uri.startsWith('az://')) {
        return await this.listAzure(uri);
      } else if (uri.startsWith('aifs://')) {
        return await this.listAIFS(uri);
      } else {
        // Handle file system URIs
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
      }
    } catch (error) {
      throw new Error(`Cannot read directory: ${(error as Error).message}`);
    }
  }

  private async listS3(uri: string): Promise<{ items: FileItem[]; nextPageToken?: string }> {
    try {
      // Create S3 client with default credentials
      const s3Client = new S3Client({});
      
      // Parse the S3 URI
      const s3Uri = uri.replace('s3://', '');
      const parts = s3Uri.split('/');
      const bucketName = parts[0];
      const prefix = parts.slice(1).join('/');
      
      if (!bucketName) {
        // List all buckets
        const command = new ListBucketsCommand({});
        const response = await s3Client.send(command);
        
        const items: FileItem[] = [];
        
        if (response.Buckets) {
          for (const bucket of response.Buckets) {
            if (bucket.Name) {
              items.push({
                name: `${bucket.Name}/`,
                isDirectory: true,
                size: 0,
                mtime: bucket.CreationDate || new Date(),
                uri: `s3://${bucket.Name}/`
              });
            }
          }
        }
        
        return { items };
      } else {
        // List objects in bucket
        const command = new ListObjectsV2Command({
          Bucket: bucketName,
          Prefix: prefix,
          Delimiter: '/',
          MaxKeys: 1000
        });
        
        const response = await s3Client.send(command);
        const items: FileItem[] = [];
        
        // Add common prefixes (directories)
        if (response.CommonPrefixes) {
          for (const commonPrefix of response.CommonPrefixes) {
            if (commonPrefix.Prefix) {
              const name = commonPrefix.Prefix.replace(prefix, '').replace(/\/$/, '');
              if (name) {
                items.push({
                  name: `${name}/`,
                  isDirectory: true,
                  size: 0,
                  mtime: new Date(),
                  uri: `s3://${bucketName}/${commonPrefix.Prefix}`
                });
              }
            }
          }
        }
        
        // Add objects (files)
        if (response.Contents) {
          for (const object of response.Contents) {
            if (object.Key && object.Key !== prefix) {
              const name = object.Key.replace(prefix, '');
              if (name && !name.includes('/')) {
                items.push({
                  name: name,
                  isDirectory: false,
                  size: object.Size || 0,
                  mtime: object.LastModified || new Date(),
                  uri: `s3://${bucketName}/${object.Key}`
                });
              }
            }
          }
        }
        
        return { items };
      }
    } catch (error) {
      console.error('S3 list error:', error);
      return {
        items: [
          {
            name: `Error: ${(error as Error).message}`,
            isDirectory: false,
            size: 0,
            mtime: new Date(),
            uri: 's3://error/'
          }
        ]
      };
    }
  }

  private async listGCS(_uri: string): Promise<{ items: FileItem[]; nextPageToken?: string }> {
    try {
      // Create GCS client with default credentials
      const storage = new Storage({});
      
      // List all buckets
      const [buckets] = await storage.getBuckets();
      
      const items: FileItem[] = [];
      
      for (const bucket of buckets) {
        items.push({
          name: `${bucket.name}/`,
          isDirectory: true,
          size: 0,
          mtime: bucket.metadata.timeCreated ? new Date(bucket.metadata.timeCreated) : new Date(),
          uri: `gcs://${bucket.name}/`
        });
      }
      
      return { items };
    } catch (error) {
      console.error('GCS list error:', error);
      
      // Check if it's a permission error
      const errorMessage = (error as Error).message;
      if (errorMessage.includes('permission') || errorMessage.includes('access') || errorMessage.includes('403')) {
        return {
          items: [
            {
              name: 'Permission Error: Insufficient GCP permissions',
              isDirectory: false,
              size: 0,
              mtime: new Date(),
              uri: 'gcs://error/'
            },
            {
              name: 'Please check your GCP credentials and permissions',
              isDirectory: false,
              size: 0,
              mtime: new Date(),
              uri: 'gcs://error/'
            }
          ]
        };
      }
      
      return {
        items: [
          {
            name: `Error: ${errorMessage}`,
            isDirectory: false,
            size: 0,
            mtime: new Date(),
            uri: 'gcs://error/'
          }
        ]
      };
    }
  }

  private async listAzure(_uri: string): Promise<{ items: FileItem[]; nextPageToken?: string }> {
    try {
      // Create Azure client with default credentials
      const blobServiceClient = new BlobServiceClient(
        process.env.AZURE_STORAGE_ACCOUNT_URL || 'https://yourstorageaccount.blob.core.windows.net'
      );
      
      // List all containers
      const containers = blobServiceClient.listContainers();
      
      const items: FileItem[] = [];
      
      for await (const container of containers) {
        items.push({
          name: `${container.name}/`,
          isDirectory: true,
          size: 0,
          mtime: container.properties.lastModified || new Date(),
          uri: `az://${container.name}/`
        });
      }
      
      return { items };
    } catch (error) {
      console.error('Azure list error:', error);
      return {
        items: [
          {
            name: `Error: ${(error as Error).message}`,
            isDirectory: false,
            size: 0,
            mtime: new Date(),
            uri: 'az://error/'
          }
        ]
      };
    }
  }

  private async listAIFS(_uri: string): Promise<{ items: FileItem[]; nextPageToken?: string }> {
    // For now, return a placeholder - this would need the actual AIFS provider
    return {
      items: [
        {
          name: 'aifs-directory1/',
          isDirectory: true,
          size: 0,
          mtime: new Date(),
          uri: 'aifs://directory1/'
        }
      ]
    };
  }

  async copy(srcUri: string, destUri: string): Promise<void> {
    const srcScheme = this.getScheme(srcUri);
    const destScheme = this.getScheme(destUri);
    if (srcScheme === 'file' && destScheme === 'file') {
      const srcPath = srcUri.startsWith('file://') ? srcUri.replace('file://', '') : srcUri;
      const destPath = destUri.startsWith('file://') ? destUri.replace('file://', '') : destUri;
      const srcStats = await fs.stat(srcPath);
      if (srcStats.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        const destDir = path.dirname(destPath);
        await fs.mkdir(destDir, { recursive: true });
        await fs.copyFile(srcPath, destPath);
      }
      return;
    }
    if (srcScheme === 's3' && destScheme === 's3') {
      await this.copyS3ToS3(srcUri, destUri);
      return;
    }
    if (srcScheme === 'gcs' && destScheme === 'gcs') {
      await this.copyGcsToGcs(srcUri, destUri);
      return;
    }
    if (srcScheme === 'az' && destScheme === 'az') {
      await this.copyAzToAz(srcUri, destUri);
      return;
    }
    const tmp = await this.downloadToTemp(srcUri);
    await this.uploadFromPath(destUri, tmp);
  }

  private async copyDirectory(srcDir: string, destDir: string): Promise<void> {
    await fs.mkdir(destDir, { recursive: true });
    
    const entries = await fs.readdir(srcDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(srcDir, entry.name);
      const destPath = path.join(destDir, entry.name);
      
      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  async move(srcUri: string, destUri: string): Promise<void> {
    const srcScheme = this.getScheme(srcUri);
    const destScheme = this.getScheme(destUri);
    if (srcScheme === 'file' && destScheme === 'file') {
      const srcPath = srcUri.startsWith('file://') ? srcUri.replace('file://', '') : srcUri;
      const destPath = destUri.startsWith('file://') ? destUri.replace('file://', '') : destUri;
      await fs.rename(srcPath, destPath);
      return;
    }
    await this.copy(srcUri, destUri);
    await this.delete(srcUri);
  }

  async delete(uri: string): Promise<void> {
    const scheme = this.getScheme(uri);
    if (scheme === 'file') {
      const filePath = uri.startsWith('file://') ? uri.replace('file://', '') : uri;
      const stats = await fs.stat(filePath);
      if (stats.isDirectory()) {
        await fs.rm(filePath, { recursive: true, force: true });
      } else {
        await fs.unlink(filePath);
      }
      return;
    }
    if (scheme === 's3') {
      const { bucket, key } = this.parseS3(uri);
      const client = await this.getS3Client();
      await client.send(new DeleteObjectCommand({ Bucket: bucket!, Key: key! }));
      return;
    }
    if (scheme === 'gcs') {
      const { bucket, key } = this.parseGcs(uri);
      const storage = await this.getGcsClient();
      await storage.bucket(bucket!).file(key!).delete();
      return;
    }
    if (scheme === 'az') {
      const { container, key } = this.parseAz(uri);
      const svc = await this.getAzClient();
      await svc.getContainerClient(container!).deleteBlob(key!);
      return;
    }
    throw new Error(`Unsupported scheme: ${scheme}`);
  }

  async mkdir(uri: string): Promise<void> {
    const scheme = this.getScheme(uri);
    if (scheme === 'file') {
      const dirPath = uri.startsWith('file://') ? uri.replace('file://', '') : uri;
      await fs.mkdir(dirPath, { recursive: true });
      return;
    }
    if (scheme === 's3') {
      const { bucket, key } = this.parseS3(uri);
      const client = await this.getS3Client();
      const folderKey = key!.endsWith('/') ? key! : `${key!}/`;
      await client.send(new PutObjectCommand({ Bucket: bucket!, Key: folderKey, Body: '' }));
      return;
    }
    if (scheme === 'gcs') {
      const { bucket, key } = this.parseGcs(uri);
      const storage = await this.getGcsClient();
      const folderKey = key!.endsWith('/') ? key! : `${key!}/`;
      await storage.bucket(bucket!).file(folderKey).save('');
      return;
    }
    if (scheme === 'az') {
      const { container, key } = this.parseAz(uri);
      const svc = await this.getAzClient();
      const folderKey = key!.endsWith('/') ? key! : `${key!}/`;
      await svc.getContainerClient(container!).getBlockBlobClient(folderKey).upload('', 0);
      return;
    }
    throw new Error(`Unsupported scheme: ${scheme}`);
  }

  async exists(uri: string): Promise<boolean> {
    const scheme = this.getScheme(uri);
    if (scheme === 'file') {
      try {
        const filePath = uri.startsWith('file://') ? uri.replace('file://', '') : uri;
        await fs.access(filePath);
        return true;
      } catch { return false; }
    }
    if (scheme === 's3') {
      const { bucket, key } = this.parseS3(uri);
      const client = await this.getS3Client();
      try {
        await client.send(new HeadObjectCommand({ Bucket: bucket!, Key: key! }));
        return true;
      } catch { return false; }
    }
    if (scheme === 'gcs') {
      const { bucket, key } = this.parseGcs(uri);
      const storage = await this.getGcsClient();
      const [exists] = await storage.bucket(bucket!).file(key!).exists();
      return exists;
    }
    if (scheme === 'az') {
      const { container, key } = this.parseAz(uri);
      const svc = await this.getAzClient();
      const exists = await svc.getContainerClient(container!).getBlobClient(key!).exists();
      return exists;
    }
    return false;
  }

  private getScheme(uri: string): string {
    if (uri.startsWith('file://') || uri.startsWith('/')) return 'file';
    const m = uri.match(/^([a-z]+):\/\//);
    return m ? m[1] : 'file';
  }

  private parseS3(uri: string): { bucket?: string; key?: string } {
    const m = uri.match(/^s3:\/\/([^\/]+)?\/?(.*)?$/);
    return { bucket: m && m[1] ? m[1] : undefined, key: m && m[2] ? m[2] : undefined };
  }
  private parseGcs(uri: string): { bucket?: string; key?: string } {
    const m = uri.match(/^gcs:\/\/([^\/]+)?\/?(.*)?$/);
    return { bucket: m && m[1] ? m[1] : undefined, key: m && m[2] ? m[2] : undefined };
  }
  private parseAz(uri: string): { container?: string; key?: string } {
    const m = uri.match(/^az:\/\/([^\/]+)?\/?(.*)?$/);
    return { container: m && m[1] ? m[1] : undefined, key: m && m[2] ? m[2] : undefined };
  }

  private async getS3Client(): Promise<S3Client> {
    if (this.s3Client) return this.s3Client;
    const conf = this.configManager ? await this.configManager.getProviderConfig('s3') : null;
    this.s3Client = new S3Client({
      region: conf?.credentials.region || process.env.AWS_REGION || 'us-east-1',
      credentials: conf?.credentials.accessKeyId && conf?.credentials.secretAccessKey ? {
        accessKeyId: conf.credentials.accessKeyId,
        secretAccessKey: conf.credentials.secretAccessKey
      } : undefined,
      endpoint: conf?.settings?.endpoint || undefined,
      forcePathStyle: Boolean(conf?.settings?.endpoint)
    });
    return this.s3Client;
  }
  private async getGcsClient(): Promise<Storage> {
    if (this.gcsClient) return this.gcsClient;
    const conf = this.configManager ? await this.configManager.getProviderConfig('gcs') : null;
    this.gcsClient = new Storage({
      projectId: conf?.credentials.projectId || undefined,
      keyFilename: conf?.credentials.keyFilename || undefined
    });
    return this.gcsClient;
  }
  private async getAzClient(): Promise<BlobServiceClient> {
    if (this.azClient) return this.azClient;
    const conf = this.configManager ? await this.configManager.getProviderConfig('az') : null;
    if (conf?.credentials.connectionString) {
      this.azClient = BlobServiceClient.fromConnectionString(conf.credentials.connectionString);
    } else {
      const endpoint = conf?.settings?.endpoint || (process.env.AZURE_STORAGE_ACCOUNT_URL || '');
      if (!endpoint) throw new Error('Azure endpoint not configured');
      this.azClient = new BlobServiceClient(endpoint);
    }
    return this.azClient;
  }

  private async copyS3ToS3(srcUri: string, destUri: string): Promise<void> {
    const client = await this.getS3Client();
    const s = this.parseS3(srcUri);
    const d = this.parseS3(destUri);
    if (!s.bucket || !s.key || !d.bucket || !d.key) throw new Error('Invalid S3 URIs');
    await client.send(new CopyObjectCommand({ Bucket: d.bucket, Key: d.key, CopySource: `/${s.bucket}/${s.key}` }));
  }
  private async copyGcsToGcs(srcUri: string, destUri: string): Promise<void> {
    const storage = await this.getGcsClient();
    const s = this.parseGcs(srcUri);
    const d = this.parseGcs(destUri);
    if (!s.bucket || !s.key || !d.bucket || !d.key) throw new Error('Invalid GCS URIs');
    await storage.bucket(s.bucket).file(s.key).copy(storage.bucket(d.bucket).file(d.key));
  }
  private async copyAzToAz(srcUri: string, destUri: string): Promise<void> {
    const svc = await this.getAzClient();
    const s = this.parseAz(srcUri);
    const d = this.parseAz(destUri);
    if (!s.container || !s.key || !d.container || !d.key) throw new Error('Invalid Azure URIs');
    const srcUrl = svc.getContainerClient(s.container).getBlobClient(s.key).url;
    await svc.getContainerClient(d.container).getBlockBlobClient(d.key).beginCopyFromURL(srcUrl);
  }

  private async downloadToTemp(uri: string): Promise<string> {
    const scheme = this.getScheme(uri);
    const tmpDir = path.join(process.cwd(), '.aifs-tmp');
    await fs.mkdir(tmpDir, { recursive: true });
    const tmpPath = path.join(tmpDir, `dl-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    if (scheme === 'file') {
      const srcPath = uri.startsWith('file://') ? uri.replace('file://', '') : uri;
      await fs.copyFile(srcPath, tmpPath);
      return tmpPath;
    }
    if (scheme === 's3') {
      const client = await this.getS3Client();
      const { bucket, key } = this.parseS3(uri);
      const { GetObjectCommand } = await import('@aws-sdk/client-s3');
      const res: any = await client.send(new GetObjectCommand({ Bucket: bucket!, Key: key! }));
      const stream = res.Body as NodeJS.ReadableStream;
      const fsStream = (await import('fs')).createWriteStream(tmpPath);
      await new Promise<void>((resolve, reject) => { stream.pipe(fsStream).on('finish', () => resolve()).on('error', reject); });
      return tmpPath;
    }
    if (scheme === 'gcs') {
      const storage = await this.getGcsClient();
      const { bucket, key } = this.parseGcs(uri);
      await storage.bucket(bucket!).file(key!).download({ destination: tmpPath });
      return tmpPath;
    }
    if (scheme === 'az') {
      const svc = await this.getAzClient();
      const { container, key } = this.parseAz(uri);
      const res = await svc.getContainerClient(container!).getBlockBlobClient(key!).download();
      const fsStream = (await import('fs')).createWriteStream(tmpPath);
      await new Promise<void>((resolve, reject) => { res.readableStreamBody!.pipe(fsStream).on('finish', () => resolve()).on('error', reject); });
      return tmpPath;
    }
    throw new Error(`Unsupported scheme: ${scheme}`);
  }

  private async uploadFromPath(destUri: string, localPath: string): Promise<void> {
    const scheme = this.getScheme(destUri);
    if (scheme === 'file') {
      const destPath = destUri.startsWith('file://') ? destUri.replace('file://', '') : destUri;
      const dir = path.dirname(destPath);
      await fs.mkdir(dir, { recursive: true });
      await fs.copyFile(localPath, destPath);
      return;
    }
    if (scheme === 's3') {
      const client = await this.getS3Client();
      const { bucket, key } = this.parseS3(destUri);
      const body = (await import('fs')).createReadStream(localPath);
      await client.send(new PutObjectCommand({ Bucket: bucket!, Key: key!, Body: body }));
      return;
    }
    if (scheme === 'gcs') {
      const storage = await this.getGcsClient();
      const { bucket, key } = this.parseGcs(destUri);
      await storage.bucket(bucket!).upload(localPath, { destination: key! });
      return;
    }
    if (scheme === 'az') {
      const svc = await this.getAzClient();
      const { container, key } = this.parseAz(destUri);
      await svc.getContainerClient(container!).getBlockBlobClient(key!).uploadFile(localPath);
      return;
    }
    throw new Error(`Unsupported scheme: ${scheme}`);
  }
}
