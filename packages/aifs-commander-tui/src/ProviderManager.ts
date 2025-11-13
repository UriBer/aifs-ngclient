import * as fs from 'fs/promises';
import * as path from 'path';
import { FileItem } from './types.js';
import { ConfigManager } from './ConfigManager.js';
import { S3Client, ListBucketsCommand, ListObjectsV2Command, CopyObjectCommand, DeleteObjectCommand, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { Storage } from '@google-cloud/storage';
import { BlobServiceClient } from '@azure/storage-blob';

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
  private configManager: ConfigManager;
  private s3Client: S3Client | null = null;
  private gcsClient: Storage | null = null;
  private azClient: BlobServiceClient | null = null;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
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
    const scheme = this.getScheme(uri);
    switch (scheme) {
      case 'file':
        return this.listLocal(uri);
      case 's3':
        return this.listS3(uri);
      case 'gcs':
        return this.listGcs(uri);
      case 'az':
        return this.listAzure(uri);
      default:
        throw new Error(`Unsupported scheme: ${scheme}`);
    }
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

    const tempPath = await this.downloadToTemp(srcUri);
    await this.uploadFromPath(destUri, tempPath);
  }

  private async copyDirectory(srcDir: string, destDir: string): Promise<void> {
    // Create destination directory
    await fs.mkdir(destDir, { recursive: true });
    
    // Read source directory contents
    const entries = await fs.readdir(srcDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(srcDir, entry.name);
      const destPath = path.join(destDir, entry.name);
      
      if (entry.isDirectory()) {
        // Recursively copy subdirectory
        await this.copyDirectory(srcPath, destPath);
      } else {
        // Copy file
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
      const destDir = path.dirname(destPath);
      await fs.mkdir(destDir, { recursive: true });
      await fs.rename(srcPath, destPath);
      return;
    }
    await this.copy(srcUri, destUri);
    await this.delete(srcUri);
  }

  async delete(uri: string): Promise<void> {
    const scheme = this.getScheme(uri);
    if (scheme === 'file') {
      const localPath = uri.startsWith('file://') ? uri.replace('file://', '') : uri;
      const stats = await fs.stat(localPath);
      if (stats.isDirectory()) {
        await fs.rm(localPath, { recursive: true, force: true });
      } else {
        await fs.unlink(localPath);
      }
      return;
    }
    if (scheme === 's3') {
      const { bucket, key } = this.parseS3(uri);
      const client = await this.getS3Client();
      if (!key || key.endsWith('/')) {
        throw new Error('Directory deletion on S3 not supported in TUI yet');
      }
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
      const blobSvc = await this.getAzClient();
      const containerClient = blobSvc.getContainerClient(container!);
      await containerClient.deleteBlob(key!);
      return;
    }
    throw new Error(`Unsupported scheme: ${scheme}`);
  }

  async mkdir(uri: string): Promise<void> {
    const scheme = this.getScheme(uri);
    if (scheme === 'file') {
      const localPath = uri.startsWith('file://') ? uri.replace('file://', '') : uri;
      await fs.mkdir(localPath, { recursive: true });
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
      const blobSvc = await this.getAzClient();
      const containerClient = blobSvc.getContainerClient(container!);
      const folderKey = key!.endsWith('/') ? key! : `${key!}/`;
      await containerClient.getBlockBlobClient(folderKey).upload('', 0);
      return;
    }
    throw new Error(`Unsupported scheme: ${scheme}`);
  }

  async exists(uri: string): Promise<boolean> {
    const scheme = this.getScheme(uri);
    if (scheme === 'file') {
      try {
        const localPath = uri.startsWith('file://') ? uri.replace('file://', '') : uri;
        await fs.access(localPath);
        return true;
      } catch {
        return false;
      }
    }
    if (scheme === 's3') {
      const { bucket, key } = this.parseS3(uri);
      const client = await this.getS3Client();
      try {
        await client.send(new HeadObjectCommand({ Bucket: bucket!, Key: key! }));
        return true;
      } catch {
        return false;
      }
    }
    if (scheme === 'gcs') {
      const { bucket, key } = this.parseGcs(uri);
      const storage = await this.getGcsClient();
      const [exists] = await storage.bucket(bucket!).file(key!).exists();
      return exists;
    }
    if (scheme === 'az') {
      const { container, key } = this.parseAz(uri);
      const blobSvc = await this.getAzClient();
      const containerClient = blobSvc.getContainerClient(container!);
      const blobClient = containerClient.getBlobClient(key!);
      return await blobClient.exists();
    }
    return false;
  }

  getCurrentProviderScheme(): string {
    return this.currentProvider;
  }

  private getScheme(uri: string): string {
    if (uri.startsWith('file://') || uri.startsWith('/')) return 'file';
    const match = uri.match(/^([a-z]+):\/\//);
    return match ? match[1] : 'file';
  }

  private async listLocal(uri: string): Promise<{ items: FileItem[]; nextPageToken?: string }> {
    const localPath = uri.startsWith('file://') ? uri.replace('file://', '') : uri;
    const stats = await fs.stat(localPath);
    if (!stats.isDirectory()) throw new Error('Not a directory');
    const entries = await fs.readdir(localPath, { withFileTypes: true, encoding: 'utf8' });
    const items: FileItem[] = [];
    for (const entry of entries) {
      try {
        const fullPath = path.join(localPath, entry.name);
        const st = await fs.stat(fullPath);
        let decodedName = entry.name.replace(/^\?+\s*/, '');
        if (decodedName.includes('%')) {
          try { decodedName = decodeURIComponent(decodedName); } catch {}
        }
        items.push({
          name: decodedName,
          isDirectory: entry.isDirectory(),
          size: st.size,
          mtime: st.mtime,
          uri: `file://${path.resolve(fullPath)}`
        });
      } catch {}
    }
    items.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
    return { items };
  }

  private async listS3(uri: string): Promise<{ items: FileItem[] }> {
    const client = await this.getS3Client();
    const { bucket, key } = this.parseS3(uri);
    if (!bucket) {
      const res = await client.send(new ListBucketsCommand({}));
      const items = (res.Buckets || []).map(b => ({
        name: b.Name!,
        isDirectory: true,
        uri: `s3://${b.Name!}/`,
        size: 0
      }));
      return { items };
    }
    const prefix = key || '';
    const cmd = new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, Delimiter: '/' });
    const res = await client.send(cmd);
    const dirs = (res.CommonPrefixes || []).map(p => ({
      name: p.Prefix!.replace(prefix, '').replace(/\/$/, ''),
      isDirectory: true,
      uri: `s3://${bucket}/${p.Prefix!}`,
      size: 0
    }));
    const files = (res.Contents || [])
      .filter(o => o.Key !== prefix && !o.Key!.endsWith('/'))
      .map(o => ({
        name: o.Key!.substring(prefix.length),
        isDirectory: false,
        size: Number(o.Size || 0),
        uri: `s3://${bucket}/${o.Key!}`
      }));
    const items = [...dirs, ...files];
    items.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
    return { items };
  }

  private async listGcs(uri: string): Promise<{ items: FileItem[] }> {
    const storage = await this.getGcsClient();
    const { bucket, key } = this.parseGcs(uri);
    if (!bucket) {
      const [buckets] = await storage.getBuckets();
      const items = buckets.map(b => ({
        name: b.name,
        isDirectory: true,
        uri: `gcs://${b.name}/`,
        size: 0
      }));
      return { items };
    }
    const prefix = key || '';
    const [files] = await storage.bucket(bucket).getFiles({ prefix, delimiter: '/' });
    const dirs: FileItem[] = [];
    const prefixes = (files as any).prefixes || [];
    for (const p of prefixes) {
      const rel = p.replace(prefix, '').replace(/\/$/, '');
      dirs.push({ name: rel, isDirectory: true, size: 0, uri: `gcs://${bucket}/${p}` });
    }
    const fileItems = files
      .filter(f => f.name !== prefix && !f.name.endsWith('/'))
      .map(f => ({ name: f.name.substring(prefix.length), isDirectory: false, size: 0, uri: `gcs://${bucket}/${f.name}` }));
    const items = [...dirs, ...fileItems];
    items.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
    return { items };
  }

  private async listAzure(uri: string): Promise<{ items: FileItem[] }> {
    const svc = await this.getAzClient();
    const { container, key } = this.parseAz(uri);
    if (!container) {
      const items: FileItem[] = [];
      for await (const c of svc.listContainers()) {
        items.push({ name: c.name, isDirectory: true, size: 0, uri: `az://${c.name}/` });
      }
      return { items };
    }
    const containerClient = svc.getContainerClient(container);
    const prefix = key || '';
    const items: FileItem[] = [];
    for await (const seg of containerClient.listBlobsByHierarchy('/', { prefix })) {
      if ('kind' in seg && seg.kind === 'prefix') {
        const rel = seg.name.replace(prefix, '').replace(/\/$/, '');
        items.push({ name: rel, isDirectory: true, size: 0, uri: `az://${container}/${seg.name}` });
      } else {
        const blob = seg as any;
        if (blob.name !== prefix && !blob.name.endsWith('/')) {
          items.push({ name: blob.name.substring(prefix.length), isDirectory: false, size: Number(blob.properties.contentLength || 0), uri: `az://${container}/${blob.name}` });
        }
      }
    }
    items.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
    return { items };
  }

  private parseS3(uri: string): { bucket?: string; key?: string } {
    const m = uri.match(/^s3:\/\/([^\/]+)?\/?(.*)?$/);
    const bucket = m && m[1] ? m[1] : undefined;
    const key = m && m[2] ? m[2] : undefined;
    return { bucket, key };
  }

  private parseGcs(uri: string): { bucket?: string; key?: string } {
    const m = uri.match(/^gcs:\/\/([^\/]+)?\/?(.*)?$/);
    const bucket = m && m[1] ? m[1] : undefined;
    const key = m && m[2] ? m[2] : undefined;
    return { bucket, key };
  }

  private parseAz(uri: string): { container?: string; key?: string } {
    const m = uri.match(/^az:\/\/([^\/]+)?\/?(.*)?$/);
    const container = m && m[1] ? m[1] : undefined;
    const key = m && m[2] ? m[2] : undefined;
    return { container, key };
  }

  private async getS3Client(): Promise<S3Client> {
    if (this.s3Client) return this.s3Client;
    const conf = await this.configManager.getProviderConfig('s3');
    if (!conf || !conf.enabled) throw new Error('S3 provider not configured');
    this.s3Client = new S3Client({
      region: conf.credentials.region || 'us-east-1',
      credentials: conf.credentials.accessKeyId && conf.credentials.secretAccessKey ? {
        accessKeyId: conf.credentials.accessKeyId,
        secretAccessKey: conf.credentials.secretAccessKey
      } : undefined,
      endpoint: conf.settings?.endpoint || undefined,
      forcePathStyle: Boolean(conf.settings?.endpoint)
    });
    return this.s3Client;
  }

  private async getGcsClient(): Promise<Storage> {
    if (this.gcsClient) return this.gcsClient;
    const conf = await this.configManager.getProviderConfig('gcs');
    if (!conf || !conf.enabled) throw new Error('GCS provider not configured');
    this.gcsClient = new Storage({
      projectId: conf.credentials.projectId || undefined,
      keyFilename: conf.credentials.keyFilename || undefined
    });
    return this.gcsClient;
  }

  private async getAzClient(): Promise<BlobServiceClient> {
    if (this.azClient) return this.azClient;
    const conf = await this.configManager.getProviderConfig('az');
    if (!conf || !conf.enabled) throw new Error('Azure provider not configured');
    if (conf.credentials.connectionString) {
      this.azClient = BlobServiceClient.fromConnectionString(conf.credentials.connectionString);
    } else {
      const endpoint = conf.settings?.endpoint || `https://${conf.credentials.accountName}.blob.core.windows.net`;
      this.azClient = new BlobServiceClient(endpoint, (await import('@azure/storage-blob')).StorageSharedKeyCredential ? new (await import('@azure/storage-blob')).StorageSharedKeyCredential(conf.credentials.accountName, conf.credentials.accountKey) : undefined as any);
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
    const destClient = svc.getContainerClient(d.container).getBlockBlobClient(d.key);
    await destClient.beginCopyFromURL(srcUrl);
  }

  private async downloadToTemp(uri: string): Promise<string> {
    const scheme = this.getScheme(uri);
    const tmpDir = path.join(process.cwd(), '.aifs-tmp');
    await fs.mkdir(tmpDir, { recursive: true });
    const fileName = `dl-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const tmpPath = path.join(tmpDir, fileName);
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
      const block = svc.getContainerClient(container!).getBlockBlobClient(key!);
      const res = await block.download();
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
      const destDir = path.dirname(destPath);
      await fs.mkdir(destDir, { recursive: true });
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
      const block = svc.getContainerClient(container!).getBlockBlobClient(key!);
      await block.uploadFile(localPath);
      return;
    }
    throw new Error(`Unsupported scheme: ${scheme}`);
  }
}
