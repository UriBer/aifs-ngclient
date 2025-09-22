import { contextBridge, ipcRenderer } from 'electron';
import { Obj } from '../shared/interfaces/IObjectStore';
import { Job, JobStatus, JobType } from '../shared/interfaces/IJobEngine';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
  // Object store operations
  object: {
    list: (uri: string, options?: {
      prefix?: string;
      delimiter?: string;
      pageToken?: string;
      pageSize?: number;
      semanticQuery?: string;
      semanticThreshold?: number;
    }) => ipcRenderer.invoke('object:list', uri, options),
    
    stat: (uri: string) => ipcRenderer.invoke('object:stat', uri),
    
    get: (uri: string, destPath: string) => ipcRenderer.invoke('object:get', uri, destPath),
    
    put: (srcPath: string, destUri: string, options?: {
      contentType?: string;
      metadata?: Record<string, string>;
      semanticTags?: string[];
      generateEmbedding?: boolean;
    }) => ipcRenderer.invoke('object:put', srcPath, destUri, options),
    
    delete: (uri: string, recursive?: boolean) => ipcRenderer.invoke('object:delete', uri, recursive),
    
    copy: (srcUri: string, destUri: string) => ipcRenderer.invoke('object:copy', srcUri, destUri),
    
    move: (srcUri: string, destUri: string) => ipcRenderer.invoke('object:move', srcUri, destUri),
    
    mkdir: (uri: string) => ipcRenderer.invoke('object:mkdir', uri),
    
    exists: (uri: string) => ipcRenderer.invoke('object:exists', uri)
  },
  
  // Job operations
  jobs: {
    get: (jobId: string) => ipcRenderer.invoke('job:get', jobId),
    
    list: (filter?: {
      status?: JobStatus;
      type?: JobType;
      limit?: number;
      offset?: number;
    }) => ipcRenderer.invoke('job:list', filter),
    
    cancel: (jobId: string) => ipcRenderer.invoke('job:cancel', jobId),
    
    clear: (olderThan?: Date) => ipcRenderer.invoke('job:clear', olderThan),
    
    onProgress: (callback: (job: Job) => void) => {
      const listener = (_event: any, job: Job) => callback(job);
      ipcRenderer.on('job:progress', listener);
      return () => ipcRenderer.removeListener('job:progress', listener);
    },
    
    onStatusChange: (callback: (job: Job) => void) => {
      const progressListener = (_event: any, job: Job) => callback(job);
      const completedListener = (_event: any, job: Job) => callback(job);
      const failedListener = (_event: any, job: Job) => callback(job);
      const canceledListener = (_event: any, job: Job) => callback(job);
      
      ipcRenderer.on('job:progress', progressListener);
      ipcRenderer.on('job:completed', completedListener);
      ipcRenderer.on('job:failed', failedListener);
      ipcRenderer.on('job:canceled', canceledListener);
      
      return () => {
        ipcRenderer.removeListener('job:progress', progressListener);
        ipcRenderer.removeListener('job:completed', completedListener);
        ipcRenderer.removeListener('job:failed', failedListener);
        ipcRenderer.removeListener('job:canceled', canceledListener);
      };
    }
  },
  
  // Dialog operations
  dialog: {
    showOpenDialog: (options: Electron.OpenDialogOptions) => ipcRenderer.invoke('dialog:showOpenDialog', options),
    
    showSaveDialog: (options: Electron.SaveDialogOptions) => ipcRenderer.invoke('dialog:showSaveDialog', options)
  }
});

// Define the API types for TypeScript
declare global {
  interface Window {
    api: {
      object: {
        list: (uri: string, options?: {
          prefix?: string;
          delimiter?: string;
          pageToken?: string;
          pageSize?: number;
          semanticQuery?: string;
          semanticThreshold?: number;
        }) => Promise<{ items: Obj[]; nextPageToken?: string }>;
        stat: (uri: string) => Promise<Obj>;
        get: (uri: string, destPath: string) => Promise<{ jobId: string }>;
        put: (srcPath: string, destUri: string, options?: {
          contentType?: string;
          metadata?: Record<string, string>;
          semanticTags?: string[];
          generateEmbedding?: boolean;
        }) => Promise<{ jobId: string }>;
        delete: (uri: string, recursive?: boolean) => Promise<{ jobId: string }>;
        copy: (srcUri: string, destUri: string) => Promise<{ jobId: string }>;
        move: (srcUri: string, destUri: string) => Promise<{ jobId: string }>;
        mkdir: (uri: string) => Promise<void>;
        exists: (uri: string) => Promise<boolean>;
      };
      jobs: {
        get: (jobId: string) => Promise<Job | undefined>;
        list: (filter?: {
          status?: JobStatus;
          type?: JobType;
          limit?: number;
          offset?: number;
        }) => Promise<Job[]>;
        cancel: (jobId: string) => Promise<boolean>;
        clear: (olderThan?: Date) => Promise<number>;
        onProgress: (callback: (job: Job) => void) => () => void;
        onStatusChange: (callback: (job: Job) => void) => () => void;
      };
      dialog: {
        showOpenDialog: (options: Electron.OpenDialogOptions) => Promise<Electron.OpenDialogReturnValue>;
        showSaveDialog: (options: Electron.SaveDialogOptions) => Promise<Electron.SaveDialogReturnValue>;
      };
    };
  }
}