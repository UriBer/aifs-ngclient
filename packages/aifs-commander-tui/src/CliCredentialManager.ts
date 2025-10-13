import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export interface CliCredentials {
  aws?: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    sessionToken?: string;
  };
  gcp?: {
    projectId: string;
    keyFilename?: string;
    credentials?: any;
  };
  azure?: {
    subscriptionId: string;
    tenantId: string;
    clientId: string;
    clientSecret?: string;
    accessToken?: string;
  };
}

export class CliCredentialManager {
  private credentials: CliCredentials = {};

  async loadAllCredentials(): Promise<CliCredentials> {
    this.credentials = {};
    
    // Load credentials in parallel
    await Promise.all([
      this.loadAwsCredentials(),
      this.loadGcpCredentials(),
      this.loadAzureCredentials()
    ]);
    
    return this.credentials;
  }

  private async loadAwsCredentials(): Promise<void> {
    try {
      // Try AWS CLI credentials
      const awsProfile = process.env.AWS_PROFILE || 'default';
      const credentialsPath = path.join(os.homedir(), '.aws', 'credentials');
      const configPath = path.join(os.homedir(), '.aws', 'config');
      
      // Check if AWS CLI is configured
      const hasCredentials = await this.fileExists(credentialsPath);
      const hasConfig = await this.fileExists(configPath);
      
      if (hasCredentials && hasConfig) {
        const credentials = await this.parseAwsCredentials(credentialsPath, awsProfile);
        const config = await this.parseAwsConfig(configPath, awsProfile);
        
        if (credentials && config) {
          this.credentials.aws = {
            accessKeyId: credentials.accessKeyId,
            secretAccessKey: credentials.secretAccessKey,
            region: config.region || 'us-east-1',
            sessionToken: credentials.sessionToken
          };
        }
      }
    } catch (error) {
      console.warn('Failed to load AWS CLI credentials:', error);
    }
  }

  private async loadGcpCredentials(): Promise<void> {
    try {
      // Try GCP Application Default Credentials
      const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 
                            path.join(os.homedir(), '.config', 'gcloud', 'application_default_credentials.json');
      
      if (await this.fileExists(credentialsPath)) {
        const credentials = await this.parseGcpCredentials(credentialsPath);
        if (credentials) {
          this.credentials.gcp = {
            projectId: credentials.project_id || await this.getGcpProjectId(),
            keyFilename: credentialsPath,
            credentials: credentials
          };
        }
      }
    } catch (error) {
      console.warn('Failed to load GCP CLI credentials:', error);
    }
  }

  private async loadAzureCredentials(): Promise<void> {
    try {
      // Try Azure CLI credentials
      const azureProfilePath = path.join(os.homedir(), '.azure', 'azureProfile.json');
      
      if (await this.fileExists(azureProfilePath)) {
        const profile = await this.parseAzureProfile(azureProfilePath);
        if (profile) {
          this.credentials.azure = {
            subscriptionId: profile.subscriptionId,
            tenantId: profile.tenantId,
            clientId: profile.clientId,
            accessToken: profile.accessToken
          };
        }
      }
    } catch (error) {
      console.warn('Failed to load Azure CLI credentials:', error);
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async parseAwsCredentials(credentialsPath: string, profile: string): Promise<any> {
    try {
      const content = await fs.readFile(credentialsPath, 'utf8');
      const lines = content.split('\n');
      
      let inProfile = false;
      const credentials: any = {};
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === `[${profile}]`) {
          inProfile = true;
          continue;
        }
        if (trimmed.startsWith('[') && trimmed !== `[${profile}]`) {
          inProfile = false;
          continue;
        }
        
        if (inProfile && trimmed.includes('=')) {
          const [key, value] = trimmed.split('=', 2);
          credentials[key.trim()] = value.trim();
        }
      }
      
      return credentials.aws_access_key_id && credentials.aws_secret_access_key ? credentials : null;
    } catch (error) {
      return null;
    }
  }

  private async parseAwsConfig(configPath: string, profile: string): Promise<any> {
    try {
      const content = await fs.readFile(configPath, 'utf8');
      const lines = content.split('\n');
      
      let inProfile = false;
      const config: any = {};
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === `[profile ${profile}]` || trimmed === `[${profile}]`) {
          inProfile = true;
          continue;
        }
        if (trimmed.startsWith('[') && !trimmed.includes(profile)) {
          inProfile = false;
          continue;
        }
        
        if (inProfile && trimmed.includes('=')) {
          const [key, value] = trimmed.split('=', 2);
          config[key.trim()] = value.trim();
        }
      }
      
      return config;
    } catch (error) {
      return null;
    }
  }

  private async parseGcpCredentials(credentialsPath: string): Promise<any> {
    try {
      const content = await fs.readFile(credentialsPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      return null;
    }
  }

  private async getGcpProjectId(): Promise<string> {
    try {
      return new Promise((resolve, reject) => {
        const process = spawn('gcloud', ['config', 'get-value', 'project'], {
          stdio: ['ignore', 'pipe', 'pipe']
        });
        
        let output = '';
        process.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        process.on('close', (code) => {
          if (code === 0) {
            resolve(output.trim());
          } else {
            reject(new Error('Failed to get GCP project ID'));
          }
        });
      });
    } catch (error) {
      return 'default-project';
    }
  }

  private async parseAzureProfile(profilePath: string): Promise<any> {
    try {
      const content = await fs.readFile(profilePath, 'utf8');
      const profile = JSON.parse(content);
      
      // Find the default subscription
      const subscriptions = profile.subscriptions || [];
      const defaultSub = subscriptions.find((sub: any) => sub.isDefault) || subscriptions[0];
      
      if (defaultSub) {
        return {
          subscriptionId: defaultSub.id,
          tenantId: defaultSub.tenantId,
          clientId: defaultSub.user?.name || '',
          accessToken: defaultSub.accessToken || ''
        };
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  getCredentials(): CliCredentials {
    return this.credentials;
  }

  hasAwsCredentials(): boolean {
    return !!(this.credentials.aws?.accessKeyId && this.credentials.aws?.secretAccessKey);
  }

  hasGcpCredentials(): boolean {
    return !!(this.credentials.gcp?.projectId);
  }

  hasAzureCredentials(): boolean {
    return !!(this.credentials.azure?.subscriptionId && this.credentials.azure?.tenantId);
  }

  async testAwsConnection(): Promise<{success: boolean, message: string}> {
    if (!this.hasAwsCredentials()) {
      return { success: false, message: 'No AWS CLI credentials found' };
    }

    try {
      const { S3Client, ListBucketsCommand } = await import('@aws-sdk/client-s3');
      
      const client = new S3Client({
        region: this.credentials.aws!.region,
        credentials: {
          accessKeyId: this.credentials.aws!.accessKeyId,
          secretAccessKey: this.credentials.aws!.secretAccessKey,
          sessionToken: this.credentials.aws!.sessionToken
        }
      });

      await client.send(new ListBucketsCommand({}));
      return { success: true, message: 'AWS CLI credentials working' };
    } catch (error) {
      return { success: false, message: `AWS test failed: ${(error as Error).message}` };
    }
  }

  async testGcpConnection(): Promise<{success: boolean, message: string}> {
    if (!this.hasGcpCredentials()) {
      return { success: false, message: 'No GCP CLI credentials found' };
    }

    try {
      // Test with gcloud CLI
      return new Promise((resolve) => {
        const process = spawn('gcloud', ['auth', 'list', '--filter=status:ACTIVE', '--format=json'], {
          stdio: ['ignore', 'pipe', 'pipe']
        });
        
        let output = '';
        process.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        process.on('close', (code) => {
          if (code === 0) {
            resolve({ success: true, message: 'GCP CLI credentials working' });
          } else {
            resolve({ success: false, message: 'GCP CLI not authenticated' });
          }
        });
      });
    } catch (error) {
      return { success: false, message: `GCP test failed: ${(error as Error).message}` };
    }
  }

  async testAzureConnection(): Promise<{success: boolean, message: string}> {
    if (!this.hasAzureCredentials()) {
      return { success: false, message: 'No Azure CLI credentials found' };
    }

    try {
      // Test with az CLI
      return new Promise((resolve) => {
        const process = spawn('az', ['account', 'show', '--output', 'json'], {
          stdio: ['ignore', 'pipe', 'pipe']
        });
        
        let output = '';
        process.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        process.on('close', (code) => {
          if (code === 0) {
            resolve({ success: true, message: 'Azure CLI credentials working' });
          } else {
            resolve({ success: false, message: 'Azure CLI not authenticated' });
          }
        });
      });
    } catch (error) {
      return { success: false, message: `Azure test failed: ${(error as Error).message}` };
    }
  }
}
