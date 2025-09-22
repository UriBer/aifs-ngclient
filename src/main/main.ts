import * as electron from 'electron';
const { app, BrowserWindow, ipcMain, dialog } = electron;
import path from 'path';
import os from 'os';
import fs from 'fs';
import { FileProvider } from './providers/FileProvider';
import { S3Provider } from './providers/S3Provider';
// import { AifsProvider } from './providers/AifsProvider';
import { JobEngine } from './jobs/JobEngine';
import { IObjectStore } from '../shared/interfaces/IObjectStore';

// Initialize providers
const providers: Record<string, IObjectStore> = {
  file: new FileProvider(),
  s3: new S3Provider()
  // aifs: new AifsProvider({ endpoint: process.env.AIFS_ENDPOINT || 'http://localhost:8080' })
};

// Keep a global reference of the window object to prevent garbage collection
let mainWindow: electron.BrowserWindow | null = null;
let jobEngine: JobEngine;

/**
 * Creates the main application window.
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    // In development, load from the dev server
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load from the built files
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Create window when Electron is ready
app.whenReady().then(() => {
  // Initialize job engine after app is ready
  jobEngine = new JobEngine({
    maxConcurrentJobs: 5,
    persistencePath: path.join(app.getPath('userData'), 'jobs')
  });

  createWindow();

  app.on('activate', () => {
    // On macOS, re-create the window when the dock icon is clicked
    if (mainWindow === null) {
      createWindow();
    }
  });

  // Set up IPC handlers for object store operations
  ipcMain.handle('object:list', async (_event, uri, options) => {
    const scheme = uri.split('://')[0];
    const provider = providers[scheme];
    
    if (!provider) {
      throw new Error(`Unsupported scheme: ${scheme}`);
    }
    
    return await provider.list(uri, options);
  });

  ipcMain.handle('object:stat', async (_event, uri) => {
    const scheme = uri.split('://')[0];
    const provider = providers[scheme];
    
    if (!provider) {
      throw new Error(`Unsupported scheme: ${scheme}`);
    }
    
    return await provider.stat(uri);
  });

  ipcMain.handle('object:get', async (_event, uri, destPath) => {
    const scheme = uri.split('://')[0];
    const provider = providers[scheme];
    
    if (!provider) {
      throw new Error(`Unsupported scheme: ${scheme}`);
    }
    
    return await provider.get(uri, destPath);
  });

  ipcMain.handle('object:put', async (_event, srcPath, uri) => {
    const scheme = uri.split('://')[0];
    const provider = providers[scheme];
    
    if (!provider) {
      throw new Error(`Unsupported scheme: ${scheme}`);
    }
    
    return await provider.put(srcPath, uri);
  });

  ipcMain.handle('object:delete', async (_event, uri) => {
    const scheme = uri.split('://')[0];
    const provider = providers[scheme];
    
    if (!provider) {
      throw new Error(`Unsupported scheme: ${scheme}`);
    }
    
    return await provider.delete(uri);
  });

  ipcMain.handle('object:copy', async (_event, srcUri, destUri) => {
    const srcScheme = srcUri.split('://')[0];
    const destScheme = destUri.split('://')[0];
    const srcProvider = providers[srcScheme];
    const destProvider = providers[destScheme];
    
    if (!srcProvider) {
      throw new Error(`Unsupported source scheme: ${srcScheme}`);
    }
    
    if (!destProvider) {
      throw new Error(`Unsupported destination scheme: ${destScheme}`);
    }
    
    // If same provider, use provider's copy method
    if (srcProvider === destProvider) {
      return await srcProvider.copy(srcUri, destUri);
    }
    
    // Cross-provider copy: download then upload
    const tempPath = path.join(os.tmpdir(), `temp-copy-${Date.now()}`);
    
    try {
      // Download from source
      await srcProvider.get(srcUri, tempPath);
      
      // Upload to destination
      const result = await destProvider.put(tempPath, destUri);
      
      // Clean up temp file
      await fs.promises.unlink(tempPath);
      
      return result;
    } catch (error) {
      // Clean up temp file on error
      try {
        await fs.promises.unlink(tempPath);
      } catch (unlinkError) {
        // Ignore unlink errors
      }
      throw error;
    }
  });

  ipcMain.handle('object:move', async (_event, srcUri, destUri) => {
    const srcScheme = srcUri.split('://')[0];
    const destScheme = destUri.split('://')[0];
    const srcProvider = providers[srcScheme];
    const destProvider = providers[destScheme];
    
    if (!srcProvider) {
      throw new Error(`Unsupported source scheme: ${srcScheme}`);
    }
    
    if (!destProvider) {
      throw new Error(`Unsupported destination scheme: ${destScheme}`);
    }
    
    // If same provider, use provider's move method
    if (srcProvider === destProvider) {
      return await srcProvider.move(srcUri, destUri);
    }
    
    // Cross-provider move: copy then delete
    const tempPath = path.join(os.tmpdir(), `temp-move-${Date.now()}`);
    
    try {
      // Download from source
      await srcProvider.get(srcUri, tempPath);
      
      // Upload to destination
      const result = await destProvider.put(tempPath, destUri);
      
      // Delete source
      await srcProvider.delete(srcUri);
      
      // Clean up temp file
      await fs.promises.unlink(tempPath);
      
      return result;
    } catch (error) {
      // Clean up temp file on error
      try {
        await fs.promises.unlink(tempPath);
      } catch (unlinkError) {
        // Ignore unlink errors
      }
      throw error;
    }
  });

  ipcMain.handle('object:mkdir', async (_event, uri) => {
    const scheme = uri.split('://')[0];
    const provider = providers[scheme];
    
    if (!provider) {
      throw new Error(`Unsupported scheme: ${scheme}`);
    }
    
    return await provider.mkdir(uri);
  });

  ipcMain.handle('object:exists', async (_event, uri) => {
    const scheme = uri.split('://')[0];
    const provider = providers[scheme];
    
    if (!provider) {
      throw new Error(`Unsupported scheme: ${scheme}`);
    }
    
    return await provider.exists(uri);
  });

  // Set up IPC handlers for job operations
  ipcMain.handle('job:get', (_event, jobId) => {
    return jobEngine.getJob(jobId);
  });

  ipcMain.handle('job:list', (_event, filter) => {
    return jobEngine.listJobs(filter);
  });

  ipcMain.handle('job:cancel', (_event, jobId) => {
    return jobEngine.cancelJob(jobId);
  });

  ipcMain.handle('job:clear', (_event, olderThan) => {
    return jobEngine.clearFinishedJobs(olderThan ? new Date(olderThan) : undefined);
  });

  // Set up IPC handlers for dialog operations
  ipcMain.handle('dialog:showOpenDialog', async (_event, options) => {
    if (!mainWindow) {
      throw new Error('Main window not available');
    }
    
    const result = await dialog.showOpenDialog(mainWindow, options);
    return result;
  });

  ipcMain.handle('dialog:showSaveDialog', async (_event, options) => {
    if (!mainWindow) {
      throw new Error('Main window not available');
    }
    
    const result = await dialog.showSaveDialog(mainWindow, options);
    return result;
  });

  // Set up job event listeners
  jobEngine.on('job:progress', (job) => {
    if (mainWindow) {
      mainWindow.webContents.send('job:progress', job);
    }
  });

  jobEngine.on('job:completed', (job) => {
    if (mainWindow) {
      mainWindow.webContents.send('job:completed', job);
    }
  });

  jobEngine.on('job:failed', (job) => {
    if (mainWindow) {
      mainWindow.webContents.send('job:failed', job);
    }
  });

  jobEngine.on('job:canceled', (job) => {
    if (mainWindow) {
      mainWindow.webContents.send('job:canceled', job);
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});