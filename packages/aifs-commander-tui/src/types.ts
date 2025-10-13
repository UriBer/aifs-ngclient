/**
 * Type definitions for AIFS Commander TUI
 */

export interface ApplicationState {
  leftUri: string;
  rightUri: string;
  leftSelected: number;
  rightSelected: number;
  leftSelectedItems: Set<string>;
  rightSelectedItems: Set<string>;
  currentPane: 'left' | 'right';
  lastUpdate: number;
}

export interface TuiOptions {
  configPath?: string;
  theme?: 'light' | 'dark';
  showHiddenFiles?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export interface ProviderConfig {
  enabled: boolean;
  name: string;
  credentials?: Record<string, any>;
}

export interface AwsConfig extends ProviderConfig {
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
}

export interface GcpConfig extends ProviderConfig {
  projectId?: string;
  keyFilename?: string;
  credentials?: {
    client_email: string;
    private_key: string;
  };
}

export interface AzureConfig extends ProviderConfig {
  accountName?: string;
  accountKey?: string;
  connectionString?: string;
}

export interface AifsConfig extends ProviderConfig {
  endpoint?: string;
  token?: string;
  namespace?: string;
}

export interface TuiConfig {
  providers: {
    aws?: AwsConfig;
    gcp?: GcpConfig;
    azure?: AzureConfig;
    aifs?: AifsConfig;
  };
  ui: {
    theme: 'light' | 'dark';
    showHiddenFiles: boolean;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    file?: string;
  };
}

export interface FileItem {
  name: string;
  uri: string;
  isDirectory: boolean;
  size?: number;
  modified?: Date;
  permissions?: string;
}

export interface JobInfo {
  id: string;
  type: 'copy' | 'move' | 'delete' | 'upload' | 'download';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  source: string;
  destination?: string;
  startTime: Date;
  endTime?: Date;
  error?: string;
}

export interface CliCredentials {
  aws?: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
    region?: string;
  };
  gcp?: {
    projectId: string;
    credentials: any;
  };
  azure?: {
    subscriptionId: string;
    tenantId: string;
    clientId: string;
    clientSecret: string;
  };
}