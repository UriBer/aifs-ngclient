import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

// Add the window.api type definition
declare global {
  interface Window {
    api: {
      object: {
        list: (uri: string) => Promise<{ items: any[] }>;
        stat: (uri: string) => Promise<any>;
        get: (uri: string, localPath: string) => Promise<void>;
        put: (localPath: string, uri: string) => Promise<void>;
        delete: (uri: string, isDirectory: boolean) => Promise<void>;
        copy: (sourceUri: string, destUri: string) => Promise<void>;
        move: (sourceUri: string, destUri: string) => Promise<void>;
        mkdir: (uri: string) => Promise<void>;
        exists: (uri: string) => Promise<boolean>;
      };
      job: {
        list: (options: { limit?: number }) => Promise<any[]>;
        get: (id: string) => Promise<any>;
        cancel: (id: string) => Promise<void>;
        clear: () => Promise<void>;
        onProgress: (callback: (job: any) => void) => () => void;
        onCompleted: (callback: (job: any) => void) => () => void;
        onFailed: (callback: (job: any) => void) => () => void;
        onCanceled: (callback: (job: any) => void) => () => void;
      };
      dialog: {
        showOpenDialog: (options: any) => Promise<{ canceled: boolean; filePaths: string[] }>;
        showSaveDialog: (options: any) => Promise<{ canceled: boolean; filePath?: string }>;
      };
    };
  }
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);