// FileBrowser.ts - Core file browser logic for terminal-kit POC

export interface FileItem {
  name: string;
  uri: string;
  isDirectory: boolean;
  size: number;
  lastModified?: Date;
}

export interface PaneState {
  uri: string;
  items: FileItem[];
  selectedIndex: number;
  selectedItems: Set<string>;
  provider: string;
  loading: boolean;
  error?: string;
}

export class FileBrowser {
  private leftPane: PaneState;
  private rightPane: PaneState;
  private currentPane: 'left' | 'right';
  private dividerPosition: number;
  private callbacks: Map<string, Function[]> = new Map();

  constructor() {
    this.leftPane = {
      uri: process.env.HOME || '/',
      items: [],
      selectedIndex: 0,
      selectedItems: new Set(),
      provider: 'file',
      loading: false,
    };
    this.rightPane = {
      uri: process.env.HOME || '/',
      items: [],
      selectedIndex: 0,
      selectedItems: new Set(),
      provider: 'file',
      loading: false,
    };
    this.currentPane = 'left';
    this.dividerPosition = 50;
  }

  // Event system
  on(event: string, callback: Function): void {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, []);
    }
    this.callbacks.get(event)!.push(callback);
  }

  emit(event: string, ...args: any[]): void {
    const callbacks = this.callbacks.get(event) || [];
    callbacks.forEach(callback => callback(...args));
  }

  // Getters
  getLeftPane(): PaneState {
    return this.leftPane;
  }

  getRightPane(): PaneState {
    return this.rightPane;
  }

  getCurrentPane(): 'left' | 'right' {
    return this.currentPane;
  }

  getDividerPosition(): number {
    return this.dividerPosition;
  }

  // Pane management
  setCurrentPane(pane: 'left' | 'right'): void {
    this.currentPane = pane;
    this.emit('paneChanged', pane);
  }

  setDividerPosition(position: number): void {
    this.dividerPosition = Math.max(20, Math.min(80, position));
    this.emit('dividerChanged', this.dividerPosition);
  }

  // Navigation
  async navigateTo(uri: string, pane?: 'left' | 'right'): Promise<void> {
    const targetPane = pane || this.currentPane;
    const paneState = targetPane === 'left' ? this.leftPane : this.rightPane;

    this.setPaneLoading(targetPane, true);
    this.clearPaneError(targetPane);

    try {
      const items = await this.loadDirectory(uri, paneState.provider);
      this.setPaneItems(targetPane, items);
      this.setPaneUri(targetPane, uri);
      this.setPaneLoading(targetPane, false);
      this.emit('directoryLoaded', targetPane, uri, items);
    } catch (error) {
      this.setPaneError(targetPane, error instanceof Error ? error.message : 'Unknown error');
      this.setPaneLoading(targetPane, false);
      this.emit('error', targetPane, error);
    }
  }

  async navigateUp(pane?: 'left' | 'right'): Promise<void> {
    const targetPane = pane || this.currentPane;
    const paneState = targetPane === 'left' ? this.leftPane : this.rightPane;
    const parentUri = paneState.uri.split('/').slice(0, -1).join('/') || '/';
    
    if (parentUri !== paneState.uri) {
      await this.navigateTo(parentUri, targetPane);
    }
  }

  // Selection management
  selectItem(index: number, pane?: 'left' | 'right'): void {
    const targetPane = pane || this.currentPane;
    const paneState = targetPane === 'left' ? this.leftPane : this.rightPane;
    
    if (index >= 0 && index < paneState.items.length) {
      this.setPaneSelectedIndex(targetPane, index);
      this.emit('itemSelected', targetPane, index, paneState.items[index]);
    }
  }

  toggleSelection(item: FileItem, pane?: 'left' | 'right'): void {
    const targetPane = pane || this.currentPane;
    const paneState = targetPane === 'left' ? this.leftPane : this.rightPane;
    const newSelected = new Set(paneState.selectedItems);
    
    if (newSelected.has(item.uri)) {
      newSelected.delete(item.uri);
    } else {
      newSelected.add(item.uri);
    }
    
    this.setPaneSelectedItems(targetPane, newSelected);
    this.emit('selectionChanged', targetPane, newSelected);
  }

  // Provider management
  async switchProvider(provider: string, pane?: 'left' | 'right'): Promise<void> {
    const targetPane = pane || this.currentPane;
    const paneState = targetPane === 'left' ? this.leftPane : this.rightPane;
    
    this.setPaneProvider(targetPane, provider);
    this.emit('providerChanged', targetPane, provider);
    
    // Reload current directory with new provider
    await this.navigateTo(paneState.uri, targetPane);
  }

  // File operations
  async copyFile(sourceUri: string, destUri: string): Promise<void> {
    // Simulate file copy
    await new Promise(resolve => setTimeout(resolve, 1000));
    this.emit('fileCopied', sourceUri, destUri);
  }

  async moveFile(sourceUri: string, destUri: string): Promise<void> {
    // Simulate file move
    await new Promise(resolve => setTimeout(resolve, 800));
    this.emit('fileMoved', sourceUri, destUri);
  }

  async deleteFile(uri: string): Promise<void> {
    // Simulate file delete
    await new Promise(resolve => setTimeout(resolve, 300));
    this.emit('fileDeleted', uri);
  }

  // Private methods
  private async loadDirectory(uri: string, provider: string): Promise<FileItem[]> {
    // Simulate network delay for cloud providers
    if (provider !== 'file') {
      await new Promise(resolve => setTimeout(resolve, 500));
    }

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
    ];

    // Add more files for cloud providers to simulate large directories
    if (provider !== 'file') {
      for (let i = 0; i < 20; i++) {
        mockFiles.push({
          name: `cloud-file-${i + 1}.txt`,
          uri: `${uri}/cloud-file-${i + 1}.txt`,
          isDirectory: false,
          size: Math.floor(Math.random() * 10000) + 100,
          lastModified: new Date(),
        });
      }
    }

    return mockFiles;
  }

  private setPaneLoading(pane: 'left' | 'right', loading: boolean): void {
    if (pane === 'left') {
      this.leftPane.loading = loading;
    } else {
      this.rightPane.loading = loading;
    }
  }

  private setPaneError(pane: 'left' | 'right', error?: string): void {
    if (pane === 'left') {
      this.leftPane.error = error;
    } else {
      this.rightPane.error = error;
    }
  }

  private clearPaneError(pane: 'left' | 'right'): void {
    if (pane === 'left') {
      this.leftPane.error = undefined;
    } else {
      this.rightPane.error = undefined;
    }
  }

  private setPaneItems(pane: 'left' | 'right', items: FileItem[]): void {
    if (pane === 'left') {
      this.leftPane.items = items;
    } else {
      this.rightPane.items = items;
    }
  }

  private setPaneUri(pane: 'left' | 'right', uri: string): void {
    if (pane === 'left') {
      this.leftPane.uri = uri;
    } else {
      this.rightPane.uri = uri;
    }
  }

  private setPaneSelectedIndex(pane: 'left' | 'right', index: number): void {
    if (pane === 'left') {
      this.leftPane.selectedIndex = index;
    } else {
      this.rightPane.selectedIndex = index;
    }
  }

  private setPaneSelectedItems(pane: 'left' | 'right', items: Set<string>): void {
    if (pane === 'left') {
      this.leftPane.selectedItems = items;
    } else {
      this.rightPane.selectedItems = items;
    }
  }

  private setPaneProvider(pane: 'left' | 'right', provider: string): void {
    if (pane === 'left') {
      this.leftPane.provider = provider;
    } else {
      this.rightPane.provider = provider;
    }
  }
}
