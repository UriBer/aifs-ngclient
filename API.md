# AIFS Commander API Documentation

This document provides comprehensive API documentation for AIFS Commander, including both the Electron application and the Terminal User Interface (TUI) package.

## Table of Contents

- [Core Interfaces](#core-interfaces)
- [Storage Providers](#storage-providers)
- [TUI Application](#tui-application)
- [Configuration Management](#configuration-management)
- [Job Management](#job-management)
- [State Management](#state-management)
- [CLI Interface](#cli-interface)

## Core Interfaces

### IObjectStore

The core interface that all storage providers must implement.

```typescript
interface IObjectStore {
  // List objects in a directory/prefix
  listObjects(uri: string): Promise<ObjectInfo[]>;
  
  // Copy an object from source to destination
  copyObject(src: string, dest: string): Promise<void>;
  
  // Move an object from source to destination
  moveObject(src: string, dest: string): Promise<void>;
  
  // Delete an object
  deleteObject(uri: string): Promise<void>;
  
  // Get object metadata
  getObjectInfo(uri: string): Promise<ObjectInfo>;
  
  // Download object to local file
  downloadObject(uri: string, localPath: string): Promise<void>;
  
  // Upload local file to storage
  uploadObject(localPath: string, uri: string): Promise<void>;
}
```

### ObjectInfo

Represents metadata about a storage object.

```typescript
interface ObjectInfo {
  name: string;           // Object name
  uri: string;           // Full URI
  size: number;          // Size in bytes
  lastModified: Date;    // Last modification time
  isDirectory: boolean;   // Whether it's a directory
  checksum?: string;     // Optional checksum
  metadata?: Record<string, string>; // Additional metadata
}
```

## Storage Providers

### LocalProvider

Manages local file system operations.

```typescript
class LocalProvider implements IObjectStore {
  constructor();
  
  // Convert file path to URI
  pathToUri(path: string): string;
  
  // Convert URI to file path
  uriToPath(uri: string): string;
}
```

### S3Provider

Manages AWS S3 operations.

```typescript
class S3Provider implements IObjectStore {
  constructor(config: S3Config);
  
  // Test S3 connection
  testConnection(): Promise<boolean>;
}

interface S3Config {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
  endpoint?: string; // For S3-compatible services
}
```

### GCSProvider

Manages Google Cloud Storage operations.

```typescript
class GCSProvider implements IObjectStore {
  constructor(config: GCSConfig);
  
  // Test GCS connection
  testConnection(): Promise<boolean>;
}

interface GCSConfig {
  projectId: string;
  keyFilename?: string; // Path to service account key
  bucket: string;
}
```

### AzureProvider

Manages Azure Blob Storage operations.

```typescript
class AzureProvider implements IObjectStore {
  constructor(config: AzureConfig);
  
  // Test Azure connection
  testConnection(): Promise<boolean>;
}

interface AzureConfig {
  connectionString: string;
  containerName: string;
}
```

### AifsProvider

Manages AIFS (AI-centric file system) operations.

```typescript
class AifsProvider implements IObjectStore {
  constructor(config: AifsConfig);
  
  // Test AIFS connection
  testConnection(): Promise<boolean>;
}

interface AifsConfig {
  endpoint: string;
  credentials: {
    username: string;
    password: string;
  };
}
```

## TUI Application

### TuiApplication

Main class for the Terminal User Interface.

```typescript
class TuiApplication {
  constructor(options?: TuiApplicationOptions);
  
  // Start the TUI application
  start(): Promise<void>;
  
  // Stop the TUI application
  stop(): Promise<void>;
  
  // Get current configuration
  getConfig(): TuiConfig;
  
  // Update configuration
  updateConfig(config: Partial<TuiConfig>): void;
}

interface TuiApplicationOptions {
  configPath?: string;    // Path to configuration file
  theme?: TuiTheme;       // UI theme
  logLevel?: LogLevel;    // Logging level
}

interface TuiConfig {
  providers: ProviderConfig[];
  ui: {
    theme: TuiTheme;
    showHiddenFiles: boolean;
    sortBy: 'name' | 'size' | 'date';
    sortOrder: 'asc' | 'desc';
  };
  shortcuts: Record<string, string>;
}

type TuiTheme = 'dark' | 'light' | 'high-contrast';
type LogLevel = 'error' | 'warn' | 'info' | 'debug';
```

### TuiFileBrowser

Manages file browser functionality.

```typescript
class TuiFileBrowser {
  constructor(screen: blessed.Widgets.Screen, options: FileBrowserOptions);
  
  // Navigate to directory
  navigateTo(uri: string): Promise<void>;
  
  // Get current directory
  getCurrentUri(): string;
  
  // Get selected items
  getSelectedItems(): ObjectInfo[];
  
  // Refresh current directory
  refresh(): Promise<void>;
}

interface FileBrowserOptions {
  position: { left: number; top: number; width: number; height: number };
  label: string;
  onSelect?: (item: ObjectInfo) => void;
  onNavigate?: (uri: string) => void;
}
```

## Configuration Management

### ConfigManager

Manages application configuration.

```typescript
class ConfigManager {
  constructor(configPath: string);
  
  // Load configuration
  loadConfig(): Promise<TuiConfig>;
  
  // Save configuration
  saveConfig(config: TuiConfig): Promise<void>;
  
  // Get provider configuration
  getProviderConfig(scheme: string): ProviderConfig | undefined;
  
  // Update provider configuration
  updateProviderConfig(scheme: string, config: ProviderConfig): Promise<void>;
  
  // Remove provider configuration
  removeProviderConfig(scheme: string): Promise<void>;
}

interface ProviderConfig {
  scheme: string;         // Provider scheme (file, s3, gcs, azure, aifs)
  name: string;          // Display name
  enabled: boolean;      // Whether provider is enabled
  credentials: Record<string, any>; // Provider-specific credentials
}
```

### CliCredentialManager

Manages CLI credential integration.

```typescript
class CliCredentialManager {
  constructor();
  
  // Load all CLI credentials
  loadAllCredentials(): Promise<void>;
  
  // Check if AWS credentials are available
  hasAwsCredentials(): boolean;
  
  // Check if GCP credentials are available
  hasGcpCredentials(): boolean;
  
  // Check if Azure credentials are available
  hasAzureCredentials(): boolean;
  
  // Get AWS credentials
  getAwsCredentials(): AwsCredentials | null;
  
  // Get GCP credentials
  getGcpCredentials(): GcpCredentials | null;
  
  // Get Azure credentials
  getAzureCredentials(): AzureCredentials | null;
  
  // Test AWS connection
  testAwsConnection(): Promise<boolean>;
  
  // Test GCP connection
  testGcpConnection(): Promise<boolean>;
  
  // Test Azure connection
  testAzureConnection(): Promise<boolean>;
}
```

## Job Management

### TuiJobManager

Manages background jobs and progress tracking.

```typescript
class TuiJobManager {
  constructor(screen: blessed.Widgets.Screen);
  
  // Start a new job
  startJob(job: Job): Promise<string>;
  
  // Get job status
  getJobStatus(jobId: string): JobStatus | undefined;
  
  // Cancel a job
  cancelJob(jobId: string): Promise<void>;
  
  // Get all jobs
  getAllJobs(): JobStatus[];
  
  // Clear completed jobs
  clearCompletedJobs(): void;
}

interface Job {
  id: string;
  type: JobType;
  description: string;
  source: string;
  destination: string;
  onProgress?: (progress: number) => void;
  onComplete?: (result: any) => void;
  onError?: (error: Error) => void;
}

interface JobStatus {
  id: string;
  type: JobType;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;      // 0-100
  description: string;
  startTime: Date;
  endTime?: Date;
  error?: string;
}

type JobType = 'copy' | 'move' | 'delete' | 'upload' | 'download';
```

## State Management

### StateManager

Manages application state persistence.

```typescript
class StateManager {
  constructor(statePath: string);
  
  // Save current state
  saveState(leftUri: string, rightUri: string, leftSelected: number, rightSelected: number): Promise<void>;
  
  // Load saved state
  loadState(): Promise<SavedState | null>;
  
  // Clear saved state
  clearState(): Promise<void>;
}

interface SavedState {
  leftUri: string;
  rightUri: string;
  leftSelected: number;
  rightSelected: number;
  timestamp: Date;
}
```

## CLI Interface

### Command Line Interface

The TUI package provides a command-line interface.

```bash
# Install globally
npm install -g aifs-commander-tui

# Show help
aifs-tui --help

# Show version
aifs-tui --version

# Use custom config
aifs-tui --config ./my-config.json

# Start TUI
aifs-tui
```

### Programmatic Usage

```typescript
import { TuiApplication } from 'aifs-commander-tui';

// Create TUI application
const app = new TuiApplication({
  configPath: './config.json'
});

// Start the application
app.start().catch(console.error);
```

## Error Handling

### TuiError

Custom error class for TUI-specific errors.

```typescript
class TuiError extends Error {
  constructor(message: string, code: string, details?: any);
  
  code: string;
  details?: any;
}
```

### Error Codes

- `PROVIDER_NOT_FOUND`: Provider not configured
- `CONNECTION_FAILED`: Failed to connect to provider
- `PERMISSION_DENIED`: Insufficient permissions
- `FILE_NOT_FOUND`: File or directory not found
- `INVALID_URI`: Invalid URI format
- `OPERATION_FAILED`: General operation failure

## Events

### TuiApplication Events

```typescript
// Application events
app.on('ready', () => { /* Application ready */ });
app.on('error', (error: Error) => { /* Handle error */ });
app.on('exit', () => { /* Application exiting */ });

// File browser events
app.on('file-selected', (file: ObjectInfo) => { /* File selected */ });
app.on('directory-changed', (uri: string) => { /* Directory changed */ });

// Job events
app.on('job-started', (job: Job) => { /* Job started */ });
app.on('job-progress', (jobId: string, progress: number) => { /* Job progress */ });
app.on('job-completed', (job: Job) => { /* Job completed */ });
app.on('job-failed', (job: Job, error: Error) => { /* Job failed */ });
```

## Examples

### Basic Usage

```typescript
import { TuiApplication } from 'aifs-commander-tui';

const app = new TuiApplication();
app.start().catch(console.error);
```

### Custom Configuration

```typescript
import { TuiApplication } from 'aifs-commander-tui';

const app = new TuiApplication({
  configPath: './custom-config.json',
  theme: 'dark',
  logLevel: 'debug'
});

app.start().catch(console.error);
```

### Provider Configuration

```typescript
import { ConfigManager } from 'aifs-commander-tui';

const configManager = new ConfigManager('./config.json');

// Add AWS S3 provider
await configManager.updateProviderConfig('s3', {
  scheme: 's3',
  name: 'My S3 Bucket',
  enabled: true,
  credentials: {
    accessKeyId: 'your-access-key',
    secretAccessKey: 'your-secret-key',
    region: 'us-west-2',
    bucket: 'my-bucket'
  }
});
```

For more information, visit [https://github.com/aifs-ngclient/aifs-commander](https://github.com/aifs-ngclient/aifs-commander)
