/**
 * Type declarations for the renderer process
 */

// Declare the window.api interface for the preload API
interface Window {
  api: {
    // Object store operations
    objectStore: {
      list: (uri: string) => Promise<any[]>;
      stat: (uri: string) => Promise<any>;
      get: (uri: string, destination: string) => Promise<string>;
      put: (source: string, uri: string) => Promise<string>;
      delete: (uri: string) => Promise<void>;
      copy: (sourceUri: string, destinationUri: string) => Promise<void>;
      move: (sourceUri: string, destinationUri: string) => Promise<void>;
      mkdir: (uri: string) => Promise<void>;
      exists: (uri: string) => Promise<boolean>;
    };
    
    // Job operations
    jobs: {
      get: (jobId: string) => Promise<any>;
      list: () => Promise<any[]>;
      cancel: (jobId: string) => Promise<void>;
      clear: () => Promise<void>;
      onProgress: (callback: (job: any) => void) => () => void;
      onStatusChange: (callback: (job: any) => void) => () => void;
    };
    
    // Dialog operations
    dialog: {
      showOpenDialog: (options: any) => Promise<{ canceled: boolean; filePaths: string[] }>;
      showSaveDialog: (options: any) => Promise<{ canceled: boolean; filePath?: string }>;
    };
  };
}