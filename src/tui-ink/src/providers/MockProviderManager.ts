// Mock ProviderManager for Ink TUI - simplified version

export interface FileItem {
  name: string;
  uri: string;
  isDirectory: boolean;
  size: number;
  lastModified?: Date;
  permissions?: string;
  owner?: string;
  group?: string;
}

export interface ProviderInfo {
  name: string;
  scheme: string;
  displayName: string;
  description: string;
  available: boolean;
}

export class MockProviderManager {
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
      available: false
    });

    this.providers.set('gcs', {
      name: 'gcs',
      scheme: 'gcs',
      displayName: 'Google Cloud Storage',
      description: 'Google Cloud Storage',
      available: false
    });

    this.providers.set('az', {
      name: 'az',
      scheme: 'az',
      displayName: 'Azure Blob Storage',
      description: 'Azure Blob Storage',
      available: false
    });

    this.providers.set('aifs', {
      name: 'aifs',
      scheme: 'aifs',
      displayName: 'AIFS',
      description: 'AI-centric File System',
      available: false
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

  setCurrentProvider(scheme: string): void {
    if (!this.providers.has(scheme)) {
      throw new Error(`Provider ${scheme} not found`);
    }
    this.currentProvider = scheme;
  }

  async list(uri: string): Promise<{ items: FileItem[]; nextPageToken?: string }> {
    // Mock file system for demonstration
    const mockFiles: FileItem[] = [
      {
        name: '..',
        uri: uri.split('/').slice(0, -1).join('/') || '/',
        isDirectory: true,
        size: 0,
        lastModified: new Date(),
      },
      {
        name: 'Documents',
        uri: `${uri}/Documents`,
        isDirectory: true,
        size: 4096,
        lastModified: new Date(),
      },
      {
        name: 'Downloads',
        uri: `${uri}/Downloads`,
        isDirectory: true,
        size: 8192,
        lastModified: new Date(),
      },
      {
        name: 'Pictures',
        uri: `${uri}/Pictures`,
        isDirectory: true,
        size: 16384,
        lastModified: new Date(),
      },
      {
        name: 'Projects',
        uri: `${uri}/Projects`,
        isDirectory: true,
        size: 32768,
        lastModified: new Date(),
      },
      {
        name: 'readme.txt',
        uri: `${uri}/readme.txt`,
        isDirectory: false,
        size: 1024,
        lastModified: new Date(),
      },
      {
        name: 'config.json',
        uri: `${uri}/config.json`,
        isDirectory: false,
        size: 512,
        lastModified: new Date(),
      },
      {
        name: 'data.csv',
        uri: `${uri}/data.csv`,
        isDirectory: false,
        size: 2048,
        lastModified: new Date(),
      },
      {
        name: 'image.jpg',
        uri: `${uri}/image.jpg`,
        isDirectory: false,
        size: 15360,
        lastModified: new Date(),
      },
      {
        name: 'video.mp4',
        uri: `${uri}/video.mp4`,
        isDirectory: false,
        size: 1048576,
        lastModified: new Date(),
      },
    ];

    return { items: mockFiles };
  }

  async copy(srcUri: string, destUri: string): Promise<void> {
    // Simulate copy operation
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  async move(srcUri: string, destUri: string): Promise<void> {
    // Simulate move operation
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  async delete(uri: string): Promise<void> {
    // Simulate delete operation
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  async mkdir(uri: string): Promise<void> {
    // Simulate directory creation
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}
