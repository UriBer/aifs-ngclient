import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

export class TuiConfig {
  private configPath: string;
  private config: any = {};
  private isLoaded: boolean = false;

  constructor() {
    this.configPath = path.join(os.homedir(), '.aifs-commander', 'tui-config.json');
  }

  public async load(): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.configPath), { recursive: true });
      
      if (await this.fileExists(this.configPath)) {
        const encryptedData = await fs.readFile(this.configPath, 'utf8');
        const decryptedData = this.decrypt(encryptedData);
        this.config = JSON.parse(decryptedData);
      } else {
        // Create default configuration
        this.config = this.getDefaultConfig();
        await this.save();
      }
      
      this.isLoaded = true;
    } catch (error) {
      console.error('Failed to load configuration:', error);
      this.config = this.getDefaultConfig();
      this.isLoaded = true;
    }
  }

  public async save(): Promise<void> {
    try {
      const jsonData = JSON.stringify(this.config, null, 2);
      const encryptedData = this.encrypt(jsonData);
      await fs.writeFile(this.configPath, encryptedData, 'utf8');
    } catch (error) {
      console.error('Failed to save configuration:', error);
    }
  }

  public get(key: string, defaultValue?: any): any {
    if (!this.isLoaded) {
      throw new Error('Configuration not loaded. Call load() first.');
    }
    
    const keys = key.split('.');
    let value = this.config;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return defaultValue;
      }
    }
    
    return value;
  }

  public set(key: string, value: any): void {
    if (!this.isLoaded) {
      throw new Error('Configuration not loaded. Call load() first.');
    }
    
    const keys = key.split('.');
    let current = this.config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in current) || typeof current[k] !== 'object') {
        current[k] = {};
      }
      current = current[k];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  private getDefaultConfig(): any {
    return {
      version: '1.0.0',
      ui: {
        theme: 'dark',
        paneLayout: 'side-by-side',
        viewMode: 'list',
        showJobPanel: false,
        statusBar: true
      },
      performance: {
        maxConcurrentJobs: 5,
        memoryLimit: '2GB',
        networkThrottle: '100MB/s',
        refreshInterval: 1000
      },
      logging: {
        level: 'info',
        maxFileSize: '10MB',
        maxFiles: 5,
        enableConsole: true,
        enableFile: true
      },
      providers: {
        file: {
          enabled: true,
          defaultPath: os.homedir()
        },
        s3: {
          enabled: false,
          profiles: []
        },
        gcs: {
          enabled: false,
          profiles: []
        }
      },
      databases: {
        connectionPooling: true,
        maxConnections: 10,
        queryTimeout: 300,
        schemaCache: true
      },
      pipelines: {
        maxConcurrentRuns: 5,
        defaultTimeout: 3600,
        retryAttempts: 3,
        monitoringEnabled: true
      }
    };
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private encrypt(text: string): string {
    const algorithm = 'aes-256-gcm';
    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  private decrypt(encryptedText: string): string {
    const algorithm = 'aes-256-gcm';
    const key = this.getEncryptionKey();
    const parts = encryptedText.split(':');
    
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipher(algorithm, key);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  private getEncryptionKey(): string {
    // In a real application, this should be derived from user input or stored securely
    const keySource = process.env.AIFS_ENCRYPTION_KEY || 'default-key-change-in-production';
    return crypto.createHash('sha256').update(keySource).digest();
  }

  public getConfigPath(): string {
    return this.configPath;
  }

  public isConfigurationLoaded(): boolean {
    return this.isLoaded;
  }
}
