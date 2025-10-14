import blessed from 'blessed';
import * as os from 'os';
import * as path from 'path';
import { spawn } from 'child_process';
import { FileItem, NavigationHistoryEntry, PaneType, TuiApplicationOptions } from './types.js';
import { ProviderManager } from './ProviderManager.js';
import { StateManager } from './StateManager.js';
import { ConfigUI } from './ConfigUI.js';
import { ConfigManager } from './ConfigManager.js';
import { CliCredentialManager } from './CliCredentialManager.js';

export class TuiApplication {
  private screen: blessed.Widgets.Screen | null = null;
  private leftPane: blessed.Widgets.ListElement | null = null;
  private rightPane: blessed.Widgets.ListElement | null = null;
  private statusBar: blessed.Widgets.BoxElement | null = null;
  private currentPane: PaneType = 'left';
  private leftUri: string = os.homedir();
  private rightUri: string = os.homedir();
  private leftItems: FileItem[] = [];
  private rightItems: FileItem[] = [];
  private leftSelected: number = 0;
  private rightSelected: number = 0;
  private leftSelectedItems: Set<string> = new Set();
  private rightSelectedItems: Set<string> = new Set();
  private navigationHistory: Record<PaneType, NavigationHistoryEntry[]> = {
    left: [],
    right: []
  };
  private providerManager: ProviderManager;
  private stateManager: StateManager;
  private configManager: ConfigManager;
  private configUI: ConfigUI | null = null;
  private leftProvider: string = 'file';
  private rightProvider: string = 'file';
  private providerMenu: blessed.Widgets.ListElement | null = null;
  private dividerPosition: number = 50; // Percentage of screen width
  private overlayMode: boolean = true; // Toggle between overlay and full screen
  private terminalOverlayActive: boolean = false;
  private terminalSupportsUnicode: boolean = false;
  private renderQueue: (() => void)[] = [];
  private renderTimeout: NodeJS.Timeout | null = null;
  private isRendering: boolean = false;
  private renderBuffer: string[] = [];
  private bufferSize: number = 1000;
  private lastRenderTime: number = 0;
  private renderState: 'idle' | 'rendering' | 'queued' = 'idle';

  constructor(_options?: TuiApplicationOptions) {
    this.providerManager = new ProviderManager();
    this.stateManager = new StateManager();
    this.configManager = new ConfigManager();
  }

  async start(): Promise<void> {
    try {
      // Check terminal size first
      const rows = process.stdout.rows || parseInt(process.env.LINES || '24');
      const cols = process.stdout.columns || parseInt(process.env.COLUMNS || '80');
      
      if (rows < 6 || cols < 20) {
        console.error('Terminal size too small. Please resize to at least 20x6');
        console.error(`Current size: ${cols}x${rows}`);
        process.exit(1);
      }

      // Initialize screen first
      this.initializeScreen();
      
      // Detect terminal Unicode support
      this.detectTerminalCapabilities();
      
      // Show loading state immediately
      this.showLoadingState();
      
      // Load all data asynchronously
      await this.loadAllInitialData();
      
      // Initialize layout after data is loaded
      this.initializeLayout();
      this.setupEventHandlers();
      
      // Load directories with proper error handling
      await this.loadInitialDirectories();
      
      // Create terminal overlay after all debug messages are written
      this.createTerminalOverlay();
      
      // Final render only after everything is ready
      this.hideLoadingState();
      this.screen!.render();
      
    } catch (error) {
      console.error('Failed to start TUI:', error);
      process.exit(1);
    }
  }

  private async loadAllInitialData(): Promise<void> {
    // Load saved state
    const savedState = await this.stateManager.loadState();
    if (savedState) {
      this.leftUri = savedState.leftUri;
      this.rightUri = savedState.rightUri;
      this.leftSelected = savedState.leftSelectedIndex;
      this.rightSelected = savedState.rightSelectedIndex;
    }

    // Load provider configuration
    await this.loadProviderConfiguration();

    // Auto-configure providers from CLI credentials if enabled
    const shouldAutoConfig = process.env.AUTO_CONFIGURE_CLI === '1';
    if (shouldAutoConfig) {
      await this.autoConfigureProvidersFromCli();
    }
  }

  private async loadInitialDirectories(): Promise<void> {
    try {
      // Use progressive rendering for cloud buckets, regular for local
      const leftIsCloud = !this.leftUri.startsWith('file://') && !this.leftUri.startsWith('/');
      const rightIsCloud = !this.rightUri.startsWith('file://') && !this.rightUri.startsWith('/');
      
      if (leftIsCloud || rightIsCloud) {
        // Use progressive rendering for cloud buckets
        await Promise.all([
          leftIsCloud ? this.loadDirectoryProgressive('left', this.leftUri, this.leftSelected) : this.loadDirectory('left', this.leftUri, this.leftSelected),
          rightIsCloud ? this.loadDirectoryProgressive('right', this.rightUri, this.rightSelected) : this.loadDirectory('right', this.rightUri, this.rightSelected)
        ]);
      } else {
        // Use regular loading for local directories
        await Promise.all([
          this.loadDirectory('left', this.leftUri, this.leftSelected),
          this.loadDirectory('right', this.rightUri, this.rightSelected)
        ]);
      }
    } catch (error) {
      this.showError(`Failed to load directories: ${(error as Error).message}`);
    }
  }

  private showLoadingState(): void {
    if (!this.screen) return;
    
    blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: 40,
      height: 7,
      content: 'Loading AIFS Commander...\n\nInitializing providers...\nLoading directories...',
      border: 'line',
      style: {
        fg: 'white',
        bg: 'blue',
        border: {
          fg: 'bright-blue'
        }
      },
      tags: true
    });
    
    this.screen.render();
  }

  private hideLoadingState(): void {
    if (!this.screen) return;
    
    // Remove all loading boxes
    this.screen.children.forEach(child => {
      if (child.type === 'box' && (child as any).content && (child as any).content.includes('Loading AIFS Commander')) {
        child.detach();
      }
    });
  }

  private detectTerminalCapabilities(): void {
    // Check if terminal supports Unicode properly
    try {
      // Check environment variables that indicate Unicode support
      const lcAll = process.env.LC_ALL || process.env.LANG || '';
      const term = process.env.TERM || '';
      
      // Check for explicit ASCII-only environments
      const isAsciiOnly = (
        lcAll.toLowerCase() === 'c' ||
        lcAll.toLowerCase() === 'posix' ||
        term.toLowerCase() === 'dumb' ||
        term.toLowerCase() === 'vt100' ||
        term.toLowerCase() === 'vt220' ||
        process.env.TERM_PROGRAM === 'unknown'
      );
      
      if (isAsciiOnly) {
        this.terminalSupportsUnicode = false;
        return;
      }
      
      // Check if we're in a terminal that supports Unicode
      this.terminalSupportsUnicode = (
        lcAll.toLowerCase().includes('utf') ||
        lcAll.toLowerCase().includes('utf8') ||
        term.includes('xterm') ||
        term.includes('screen') ||
        term.includes('tmux') ||
        process.env.TERM_PROGRAM === 'vscode' ||
        process.env.TERM_PROGRAM === 'iTerm.app' ||
        process.env.TERM_PROGRAM === 'Apple_Terminal'
      );
      
      // If we can't determine from environment, assume Unicode support for modern terminals
      if (!this.terminalSupportsUnicode && !isAsciiOnly) {
        // For unknown terminals, assume Unicode support unless explicitly ASCII
        this.terminalSupportsUnicode = true;
      }
      
    } catch (error) {
      // If detection fails, assume no Unicode support
      this.terminalSupportsUnicode = false;
    }
  }

  private getFileIcon(item: FileItem): string {
    if (this.terminalSupportsUnicode) {
      return item.isDirectory ? '📁' : '📄';
    } else {
      // ASCII fallbacks
      return item.isDirectory ? '[DIR]' : '[FILE]';
    }
  }

  private scheduleRender(callback: () => void): void {
    // Add to render queue
    this.renderQueue.push(callback);
    this.renderState = 'queued';
    
    if (this.renderTimeout) {
      clearTimeout(this.renderTimeout);
    }
    
    // Debounce renders to ~60fps (16ms)
    this.renderTimeout = setTimeout(() => {
      this.flushRenderQueue();
    }, 16);
  }

  private addToRenderBuffer(message: string): void {
    this.renderBuffer.push(`[${new Date().toISOString()}] ${message}`);
    
    // Keep buffer size manageable
    if (this.renderBuffer.length > this.bufferSize) {
      this.renderBuffer = this.renderBuffer.slice(-this.bufferSize);
    }
  }


  private getRenderStats(): { 
    queueSize: number; 
    isRendering: boolean; 
    renderState: string; 
    bufferSize: number; 
    lastRenderTime: number;
    renderDuration: number;
  } {
    const now = Date.now();
    const renderDuration = this.lastRenderTime > 0 ? now - this.lastRenderTime : 0;
    
    return {
      queueSize: this.renderQueue.length,
      isRendering: this.isRendering,
      renderState: this.renderState,
      bufferSize: this.renderBuffer.length,
      lastRenderTime: this.lastRenderTime,
      renderDuration: renderDuration
    };
  }

  private debugRenderState(): void {
    const stats = this.getRenderStats();
    console.log('🔍 Render State Debug:');
    console.log(`   Queue size: ${stats.queueSize}`);
    console.log(`   Is rendering: ${stats.isRendering}`);
    console.log(`   Render state: ${stats.renderState}`);
    console.log(`   Buffer size: ${stats.bufferSize}`);
    console.log(`   Last render: ${stats.lastRenderTime}`);
    console.log(`   Render duration: ${stats.renderDuration}ms`);
  }

  private flushRenderQueue(): void {
    if (this.renderQueue.length === 0 || this.isRendering) return;
    
    this.isRendering = true;
    this.renderState = 'rendering';
    const startTime = Date.now();
    
    try {
      // Add to render buffer
      this.addToRenderBuffer(`Starting render queue flush with ${this.renderQueue.length} operations`);
      
      // Execute all queued renders safely
      this.renderQueue.forEach((callback, index) => {
        try {
          callback();
          this.addToRenderBuffer(`Render operation ${index + 1} completed`);
        } catch (error) {
          console.error('Render callback error:', error);
          this.addToRenderBuffer(`Render operation ${index + 1} failed: ${error}`);
        }
      });
      
      this.renderQueue = [];
      
      // Safe render with error handling
      if (this.screen) {
        try {
          this.screen.render();
          this.addToRenderBuffer('Screen render completed successfully');
        } catch (renderError) {
          console.error('Screen render error:', renderError);
          this.addToRenderBuffer(`Screen render failed: ${renderError}`);
        }
      }
      
      // Update render timing
      const endTime = Date.now();
      const renderDuration = endTime - startTime;
      this.lastRenderTime = endTime;
      
      this.addToRenderBuffer(`Render queue flush completed in ${renderDuration}ms`);
      
    } catch (error) {
      console.error('Render error:', error);
      this.addToRenderBuffer(`Render queue flush failed: ${error}`);
    } finally {
      this.isRendering = false;
      this.renderState = 'idle';
    }
  }


  private async loadDirectoryProgressive(pane: PaneType, uri: string, selectedIndex: number = 0): Promise<void> {
    try {
      console.log(`Loading directory for ${pane} pane: ${uri}`);
      
      // Show loading indicator immediately
      this.scheduleRender(() => {
        const paneList = pane === 'left' ? this.leftPane : this.rightPane;
        if (paneList) {
          paneList.setItems(['Loading...']);
        }
      });
      
      // Convert local path to file URI only if it's a local path
      let finalUri = uri;
      if (!uri.includes('://') && !uri.startsWith('file://')) {
        finalUri = `file://${path.resolve(uri)}`;
      }
      
      console.log(`Calling providerManager.list with URI: ${finalUri}`);
      const result = await this.providerManager.list(finalUri);
      console.log(`Received ${result.items.length} items from provider`);
      
      const items = result.items;
      const paneList = pane === 'left' ? this.leftPane : this.rightPane;
      
      if (!paneList) {
        console.error(`Pane list not found for ${pane}`);
        return;
      }
      
      // Progressive rendering: update UI in chunks
      this.scheduleRender(() => {
        paneList.clearItems();
        
        // Add parent directory if not at root
        if (uri !== '/' && uri !== '') {
          paneList.addItem('.. (parent directory)');
        }
      });
      
      // Calculate available width for this pane based on divider position
      const screenWidth = this.screen!.width as number;
      const paneWidth = pane === 'left' 
        ? Math.floor((screenWidth * this.dividerPosition) / 100) - 2
        : Math.floor((screenWidth * (100 - this.dividerPosition)) / 100) - 2;
      
      // Add directories first with progressive rendering
      const dirs = items.filter(item => item.isDirectory);
      for (let i = 0; i < dirs.length; i++) {
        const dir = dirs[i];
        const isSelected = pane === 'left' ? this.leftSelectedItems.has(dir.uri) : this.rightSelectedItems.has(dir.uri);
        const prefix = isSelected ? '✓ ' : '  ';
        const icon = this.getFileIcon(dir);
        const displayName = this.truncateFileName(dir.name, paneWidth);
        const suffix = this.terminalSupportsUnicode ? '/' : '/';
        
        // Schedule render for each directory
        this.scheduleRender(() => {
          paneList.addItem(`${prefix}${icon} ${displayName}${suffix}`);
        });
        
        // Small delay for progressive effect
        if (i % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1));
        }
      }
      
      // Add files with progressive rendering
      const files = items.filter(item => !item.isDirectory);
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isSelected = pane === 'left' ? this.leftSelectedItems.has(file.uri) : this.rightSelectedItems.has(file.uri);
        const prefix = isSelected ? '✓ ' : '  ';
        const icon = this.getFileIcon(file);
        const size = file.size ? this.formatFileSize(file.size) : '';
        const displayName = this.truncateFileName(file.name, paneWidth);
        
        // Schedule render for each file
        this.scheduleRender(() => {
          paneList.addItem(`${prefix}${icon} ${displayName} (${size})`);
        });
        
        // Small delay for progressive effect
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1));
        }
      }
      
      // Final setup
      this.scheduleRender(() => {
        if (pane === 'left') {
          this.leftUri = uri;
          this.leftItems = items;
          this.leftSelected = Math.min(selectedIndex, (paneList as any).items.length - 1);
          paneList.select(this.leftSelected);
        } else {
          this.rightUri = uri;
          this.rightItems = items;
          this.rightSelected = Math.min(selectedIndex, (paneList as any).items.length - 1);
          paneList.select(this.rightSelected);
        }
        
        // Save state after navigation
        this.saveState();
        this.updateStatus();
      });
      
    } catch (error) {
      console.error(`Error loading directory ${uri}:`, error);
      this.showError(`Failed to load directory: ${(error as Error).message}`);
      throw error;
    }
  }


  private initializeScreen(): void {
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'AIFS Commander TUI',
      fullUnicode: true,
      dockBorders: true,
      autoPadding: true,
      warnings: false,
      fastCSR: true,
      sendFocus: true,
      // Disable automatic rendering during initialization
      autoRender: false,
      cursor: {
        artificial: true,
        shape: 'block',
        blink: true,
        color: 'black'
      }
    });

    // Clear screen but don't render yet
    process.stdout.write('\x1b[2J\x1b[H');

    this.screen.on('resize', () => {
      this.handleResize();
    });

    this.screen.key(['C-c'], () => {
      this.quit();
    });
  }


  private createTerminalOverlay(): void {
    if (this.terminalOverlayActive) return;
    
    // Don't interfere with blessed.js - just mark as active
    this.terminalOverlayActive = true;
  }

  private removeTerminalOverlay(): void {
    if (!this.terminalOverlayActive) return;
    
    // Reset terminal attributes
    process.stdout.write('\x1b[0m'); // Reset all attributes
    process.stdout.write('\x1b[2J\x1b[H'); // Clear screen
    this.terminalOverlayActive = false;
  }

  private toggleOverlayMode(): void {
    this.overlayMode = !this.overlayMode;
    
    if (this.overlayMode) {
      // State 3: Solid overlay mode - cover terminal text, show TUI
      this.createTerminalOverlay();
      this.showStatus('Overlay mode: Terminal hidden (F12 to show)');
    } else {
      // State 2: Transparent mode - hide overlay to show terminal
      this.removeTerminalOverlay();
      this.showStatus('Transparent mode: Terminal visible (F12 to hide)');
    }
    
    // Force complete screen redraw
    this.screen!.render();
  }


  private initializeLayout(): void {
    if (!this.screen) return;

    // Create main container
    const mainContainer = blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%-1',
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: 'dark-gray'
        },
        fg: 'black',
        bg: 'white'
      }
    });
    
    // Create left pane
    this.leftPane = blessed.list({
      parent: mainContainer,
      top: 0,
      left: 0,
      width: `${this.dividerPosition}%`,
      height: '100%',
      name: 'leftPane',
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: 'dark-gray'
        },
        selected: {
          bg: 'blue',
          fg: 'white'
        },
        item: {
          fg: 'black',
          bg: 'white'
        }
      },
      keys: true,
      vi: true,
      mouse: true,
      scrollable: true
    });

    // Create right pane
    this.rightPane = blessed.list({
      parent: mainContainer,
      top: 0,
      left: `${this.dividerPosition}%`,
      width: `${100 - this.dividerPosition}%`,
      height: '100%',
      name: 'rightPane',
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: 'dark-gray'
        },
        selected: {
          bg: 'blue',
          fg: 'white'
        },
        item: {
          fg: 'black',
          bg: 'white'
        }
      },
      keys: true,
      vi: true,
      mouse: true,
      scrollable: true
    });

    // Create status bar
    this.statusBar = blessed.box({
      parent: this.screen,
      top: '100%-1',
      left: 0,
      width: '100%',
      height: 1,
      name: 'statusBar',
      content: 'AIFS Commander TUI - Press F1 for help, F10 to quit',
      style: {
        bg: 'dark-gray',
        fg: 'white',
        bold: true
      }
    });

    // Set initial focus
    this.setFocus('left');
  }

  private setupEventHandlers(): void {
    if (!this.screen || !this.leftPane || !this.rightPane) return;

    // Tab key to switch between panes
    this.screen.key(['tab'], () => {
      this.switchPane();
    });

    // F1 for help
    this.screen.key(['f1'], () => {
      this.showHelp();
    });

    // F10 to quit
    this.screen.key(['f10'], () => {
      this.quit();
    });

    // F12 to toggle overlay mode
    this.screen.key(['f12'], () => {
      this.toggleOverlayMode();
    });

    // File operations
    this.screen.key(['f5'], () => {
      this.handleCopy();
    });

    this.screen.key(['f6'], () => {
      this.handleMove();
    });

    this.screen.key(['f7'], () => {
      this.handleMkdir();
    });

    this.screen.key(['f8'], () => {
      this.handleDelete();
    });

    this.screen.key(['f9'], () => {
      this.showConfiguration();
    });

    // Global key handlers for divider resizing
    this.screen.key(['C-left'], () => {
      this.handleGlobalKeyPress('', { name: 'left', ctrl: true });
    });

    this.screen.key(['C-right'], () => {
      this.handleGlobalKeyPress('', { name: 'right', ctrl: true });
    });

    this.screen.key(['C-r'], () => {
      this.handleGlobalKeyPress('', { name: 'r', ctrl: true });
    });

    // Left pane events
    this.leftPane.on('select', (_item, index) => {
      this.leftSelected = index;
      this.updateStatus();
    });

    this.leftPane.on('keypress', async (ch, key) => {
      await this.handleKeyPress('left', ch, key);
    });

    // Add double-click support for left pane
    this.leftPane.on('click', async () => {
      await this.handleSelection('left', null, this.leftSelected);
    });

    // Right pane events
    this.rightPane.on('select', (_item, index) => {
      this.rightSelected = index;
      this.updateStatus();
    });

    this.rightPane.on('keypress', async (ch, key) => {
      await this.handleKeyPress('right', ch, key);
    });

    // Add double-click support for right pane
    this.rightPane.on('click', async () => {
      await this.handleSelection('right', null, this.rightSelected);
    });
  }

  private async loadDirectory(pane: PaneType, uri: string, selectedIndex: number = 0): Promise<void> {
    try {
      console.log(`Loading directory for ${pane} pane: ${uri}`);
      
      // Convert local path to file URI only if it's a local path
      let finalUri = uri;
      if (!uri.includes('://') && !uri.startsWith('file://')) {
        // It's a local path, convert to file URI
        finalUri = `file://${path.resolve(uri)}`;
      }
      
      console.log(`Calling providerManager.list with URI: ${finalUri}`);
      const result = await this.providerManager.list(finalUri);
      console.log(`Received ${result.items.length} items from provider`);
      
      const items = result.items;
      const paneList = pane === 'left' ? this.leftPane : this.rightPane;
      
      if (!paneList) {
        console.error(`Pane list not found for ${pane}`);
        return;
      }
      
      paneList.clearItems();
      
      // Add parent directory if not at root
      if (uri !== '/' && uri !== '') {
        paneList.addItem('.. (parent directory)');
      }
      
      // Calculate available width for this pane based on divider position
      const screenWidth = this.screen!.width as number;
      const paneWidth = pane === 'left' 
        ? Math.floor((screenWidth * this.dividerPosition) / 100) - 2
        : Math.floor((screenWidth * (100 - this.dividerPosition)) / 100) - 2;
      
      // Add directories first
      const dirs = items.filter(item => item.isDirectory);
      for (const dir of dirs) {
        const isSelected = pane === 'left' ? this.leftSelectedItems.has(dir.uri) : this.rightSelectedItems.has(dir.uri);
        const prefix = isSelected ? '✓ ' : '  ';
        const icon = this.getFileIcon(dir);
        const displayName = this.truncateFileName(dir.name, paneWidth);
        const suffix = this.terminalSupportsUnicode ? '/' : '/';
        paneList.addItem(`${prefix}${icon} ${displayName}${suffix}`);
      }
      
      // Add files
      const files = items.filter(item => !item.isDirectory);
      for (const file of files) {
        const isSelected = pane === 'left' ? this.leftSelectedItems.has(file.uri) : this.rightSelectedItems.has(file.uri);
        const prefix = isSelected ? '✓ ' : '  ';
        const icon = this.getFileIcon(file);
        const size = file.size ? this.formatFileSize(file.size) : '';
        const displayName = this.truncateFileName(file.name, paneWidth);
        paneList.addItem(`${prefix}${icon} ${displayName} (${size})`);
      }
      
      if (pane === 'left') {
        this.leftUri = uri;
        this.leftItems = items;
        this.leftSelected = Math.min(selectedIndex, (paneList as any).items.length - 1);
        paneList.select(this.leftSelected);
      } else {
        this.rightUri = uri;
        this.rightItems = items;
        this.rightSelected = Math.min(selectedIndex, (paneList as any).items.length - 1);
        paneList.select(this.rightSelected);
      }
      
      // Save state after navigation
      this.saveState();
      
      this.updateStatus();
      
      // Schedule progressive render after directory loading
      this.scheduleRender(() => {
        // Directory loading is complete
      });
      
    } catch (error) {
      console.error(`Error loading directory ${uri}:`, error);
      this.showError(`Failed to load directory: ${(error as Error).message}`);
      throw error; // Re-throw to be handled by caller
    }
  }



  private async handleSelection(pane: PaneType, _item: any, index: number): Promise<void> {
    const items = pane === 'left' ? this.leftItems : this.rightItems;
    const uri = pane === 'left' ? this.leftUri : this.rightUri;
    
    // Check if we're selecting the parent directory entry
    const hasParentEntry = uri !== '/' && uri !== '';
    const isParentEntry = hasParentEntry && index === 0;
    
    if (isParentEntry) {
      // Navigate to parent directory
      await this.goToParent(pane);
      return;
    }
    
    // Adjust index if parent entry is present
    const actualIndex = hasParentEntry ? index - 1 : index;
    
    if (actualIndex < 0 || actualIndex >= items.length) return;
    
    const selectedItem = items[actualIndex];
    if (selectedItem.isDirectory) {
      // Save current position in history before entering directory
      this.navigationHistory[pane].push({
        uri: uri,
        selectedIndex: index
      });
      
      const newUri = this.joinUri(uri, selectedItem.name);
      await this.loadDirectory(pane, newUri, 0); // Start at top of new directory
    } else {
      // For files, open with default application
      const filePath = selectedItem.uri.startsWith('file://') 
        ? selectedItem.uri.replace('file://', '') 
        : selectedItem.uri;
      await this.openFileWithDefaultApp(filePath);
    }
  }

  private async handleKeyPress(pane: PaneType, _ch: string, key: any): Promise<void> {
    const paneList = pane === 'left' ? this.leftPane : this.rightPane;
    const currentSelected = pane === 'left' ? this.leftSelected : this.rightSelected;
    
    if (!paneList) return;
    
    switch (key.name) {
      case 'enter':
        await this.handleSelection(pane, null, currentSelected);
        break;
      case 'backspace':
        this.goToParent(pane);
        break;
      case 'up':
        if (currentSelected > 0) {
          const newIndex = currentSelected - 1;
          paneList.select(newIndex);
          if (pane === 'left') {
            this.leftSelected = newIndex;
          } else {
            this.rightSelected = newIndex;
          }
          this.updateStatus();
        }
        break;
      case 'down':
        const maxIndex = (paneList as any).items.length - 1;
        if (currentSelected < maxIndex) {
          const newIndex = currentSelected + 1;
          paneList.select(newIndex);
          if (pane === 'left') {
            this.leftSelected = newIndex;
          } else {
            this.rightSelected = newIndex;
          }
          this.updateStatus();
        }
        break;
      case 'space':
        await this.toggleSelection(pane, currentSelected);
        break;
      case 'p':
        // Show provider menu for current pane
        this.showProviderMenu(pane);
        break;
    }
  }

  private async handleGlobalKeyPress(_ch: string, key: any): Promise<void> {
    switch (key.name) {
      case 'left':
        if (key.ctrl || key.meta) {
          // Resize divider left
          await this.resizeDivider(-5);
        }
        break;
      case 'right':
        if (key.ctrl || key.meta) {
          // Resize divider right
          await this.resizeDivider(5);
        }
        break;
      case 'r':
        if (key.ctrl || key.meta) {
          // Reset divider to center
          await this.resizeDivider(0, true);
        } else {
          // Manual refresh
          this.forceRefresh();
        }
        break;
      case 'd':
        if (key.ctrl || key.meta) {
          // Debug render state
          this.debugRenderState();
        }
        break;
    }
  }

  private async resizeDivider(delta: number, reset: boolean = false): Promise<void> {
    if (reset) {
      this.dividerPosition = 50;
    } else {
      this.dividerPosition = Math.max(20, Math.min(80, this.dividerPosition + delta));
    }
    
    // Update pane positions and sizes
    if (this.leftPane && this.rightPane) {
      this.leftPane.width = `${this.dividerPosition}%`;
      this.rightPane.left = `${this.dividerPosition}%`;
      this.rightPane.width = `${100 - this.dividerPosition}%`;
      
      // Refresh both panes to recalculate truncation
      await this.refreshCurrentPanes();
      
      this.showStatus(`Divider resized to ${this.dividerPosition}%`);
      
      // Schedule progressive render after divider resize
      this.scheduleRender(() => {
        // Divider resize is complete
      });
    }
  }

  private async refreshCurrentPanes(): Promise<void> {
    // Refresh both panes to recalculate truncation with new widths
    try {
      await this.loadDirectory('left', this.leftUri, this.leftSelected);
      await this.loadDirectory('right', this.rightUri, this.rightSelected);
      
      // Schedule progressive render after pane refresh
      this.scheduleRender(() => {
        // Pane refresh is complete
      });
    } catch (error) {
      console.error('Error refreshing panes:', error);
      this.showError(`Failed to refresh panes: ${(error as Error).message}`);
    }
  }

  private forceRefresh(): void {
    if (!this.screen) return;
    
    // Clear screen and force complete redraw
    process.stdout.write('\x1b[2J\x1b[H');
    this.screen.render();
  }

  private async showConfiguration(): Promise<void> {
    if (!this.screen) return;

    // Temporarily disable main TUI key handling
    this.screen.removeAllListeners('keypress');
    
    this.configUI = new ConfigUI(this.screen);
    
    // Add global escape handler for configuration
    const escapeHandler = (_ch: string, key: any) => {
      if (key.name === 'escape' && this.configUI) {
        this.configUI.hideConfigMenu();
        this.screen!.removeListener('keypress', escapeHandler);
        // Re-enable main TUI key handling
        this.setupEventHandlers();
      }
    };
    
    this.screen.on('keypress', escapeHandler);
    await this.configUI.showConfigMenu();
  }

  private async loadProviderConfiguration(): Promise<void> {
    try {
      const config = await this.configManager.loadConfig();
      
      // Update provider availability based on configuration
      for (const provider of config.providers) {
        if (provider.enabled) {
          // Check if provider has valid credentials
          const hasCredentials = Object.keys(provider.credentials).length > 0;
          this.providerManager.setProviderAvailable(provider.scheme, hasCredentials);
          
          if (hasCredentials) {
            console.log(`✅ Provider ${provider.name} (${provider.scheme}) is available`);
          } else {
            console.log(`❌ Provider ${provider.name} (${provider.scheme}) has no credentials`);
          }
        } else {
          this.providerManager.setProviderAvailable(provider.scheme, false);
        }
      }
    } catch (error) {
      console.warn('Failed to load provider configuration:', (error as Error).message);
    }
  }

  public async autoConfigureProvidersFromCli(): Promise<void> {
    try {
      console.log('🔧 Starting auto-configuration from CLI...');
      
      const cliManager = new CliCredentialManager();
      await cliManager.loadAllCredentials();
      const cliCreds = cliManager.getCredentials();

      console.log('🔍 CLI Credentials detected:');
      console.log('  AWS:', cliManager.hasAwsCredentials());
      console.log('  GCP:', cliManager.hasGcpCredentials());
      console.log('  Azure:', cliManager.hasAzureCredentials());

      // Auto-configure AWS S3 - Create separate config
      if (cliManager.hasAwsCredentials() && cliCreds.aws) {
        console.log('📦 Auto-configuring AWS S3...');
        const configName = `AWS S3 (${cliCreds.aws.region || 'default'})`;
        await this.createNewProviderConfig('s3', configName, {
          accessKeyId: cliCreds.aws.accessKeyId,
          secretAccessKey: cliCreds.aws.secretAccessKey,
          region: cliCreds.aws.region || 'us-east-1',
          bucket: 'default-bucket'
        });
        console.log('✅ AWS S3 auto-configured');
      } else {
        console.log('❌ AWS credentials not available');
      }
      
      // Auto-configure GCP - Create separate config
      if (cliManager.hasGcpCredentials() && cliCreds.gcp) {
        console.log('📦 Auto-configuring GCP...');
        const configName = `Google Cloud Storage (${cliCreds.gcp.projectId})`;
        await this.createNewProviderConfig('gcs', configName, {
          projectId: cliCreds.gcp.projectId,
          keyFilename: cliCreds.gcp.keyFilename || '',
          bucket: `${cliCreds.gcp.projectId}-bucket`
        });
        console.log('✅ GCP auto-configured');
      } else {
        console.log('❌ GCP credentials not available');
      }
      
      // Auto-configure Azure - Create separate config
      if (cliManager.hasAzureCredentials() && cliCreds.azure) {
        console.log('📦 Auto-configuring Azure...');
        const configName = `Azure Blob Storage (${cliCreds.azure.subscriptionId?.substring(0, 8)}...)`;
        await this.createNewProviderConfig('az', configName, {
          subscriptionId: cliCreds.azure.subscriptionId,
          tenantId: cliCreds.azure.tenantId,
          clientId: cliCreds.azure.clientId,
          containerName: 'default-container'
        });
        console.log('✅ Azure auto-configured');
      } else {
        console.log('❌ Azure credentials not available');
      }
      
      // Reload configuration after auto-config
      await this.loadProviderConfiguration();
      console.log('🎉 Auto-configuration completed');
    } catch (error) {
      console.warn('Failed to auto-configure from CLI:', (error as Error).message);
    }
  }

  private async createNewProviderConfig(scheme: string, name: string, credentials: Record<string, string>): Promise<void> {
    try {
      console.log(`🔧 Creating provider config: ${scheme} - ${name}`);
      
      const config = await this.configManager.loadConfig();
      
      // Generate unique ID based on scheme and timestamp
      const id = `${scheme}-${Date.now()}`;
      
      // For CLI auto-configuration, always create new providers to avoid conflicts
      // Check if a CLI-configured provider with this scheme already exists
      const existingCliProvider = config.providers.find(p => 
        p.scheme === scheme && 
        (p.name.includes('CLI') || p.name.includes('(') || p.name.includes('Auto'))
      );
      
      if (existingCliProvider) {
        // Update existing CLI provider
        console.log(`🔄 Updating existing CLI provider: ${existingCliProvider.name}`);
        existingCliProvider.credentials = {
          ...existingCliProvider.credentials,
          ...credentials
        };
        existingCliProvider.enabled = true;
        console.log(`✅ Updated existing CLI provider: ${existingCliProvider.name}`);
      } else {
        // Create new provider config with unique ID
        console.log(`🆕 Creating new CLI provider: ${name}`);
        const newProvider: any = {
          id,
          name,
          scheme,
          enabled: true,
          credentials,
          settings: {}
        };
        
        // Add provider-specific settings
        switch (scheme) {
          case 's3':
            newProvider.settings = { endpoint: '', useSSL: true };
            break;
          case 'gcs':
            newProvider.settings = { location: 'US' };
            break;
          case 'az':
            newProvider.settings = { endpoint: '' };
            break;
        }
        
        config.providers.push(newProvider);
        console.log(`✅ Created new CLI provider: ${name} with ID: ${id}`);
      }
      
      await this.configManager.saveConfig(config);
      console.log(`💾 Saved configuration for ${name}`);
    } catch (error) {
      console.warn(`Failed to create provider config for ${name}:`, (error as Error).message);
    }
  }

  private async openFileWithDefaultApp(filePath: string): Promise<void> {
    try {
      const platform = process.platform;
      let command: string;
      let args: string[];

      switch (platform) {
        case 'darwin': // macOS
          command = 'open';
          args = [filePath];
          break;
        case 'win32': // Windows
          command = 'cmd';
          args = ['/c', 'start', '""', filePath];
          break;
        case 'linux': // Linux
          command = 'xdg-open';
          args = [filePath];
          break;
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }

      const child = spawn(command, args, {
        detached: true,
        stdio: 'ignore'
      });

      child.unref(); // Allow the parent process to exit independently

      this.showStatus(`Opening ${path.basename(filePath)} with default application...`);
      
      // Clear the status message after a short delay
      setTimeout(() => {
        this.updateStatus();
      }, 2000);

    } catch (error) {
      this.showError(`Failed to open file: ${(error as Error).message}`);
    }
  }

  private async toggleSelection(pane: PaneType, index: number): Promise<void> {
    const items = pane === 'left' ? this.leftItems : this.rightItems;
    const selectedItems = pane === 'left' ? this.leftSelectedItems : this.rightSelectedItems;
    const uri = pane === 'left' ? this.leftUri : this.rightUri;
    
    // Check if we're selecting the parent directory entry
    const hasParentEntry = uri !== '/' && uri !== '';
    const isParentEntry = hasParentEntry && index === 0;
    
    if (isParentEntry) {
      return; // Don't select parent directory
    }
    
    // Adjust index if parent entry is present
    const actualIndex = hasParentEntry ? index - 1 : index;
    
    if (actualIndex < 0 || actualIndex >= items.length) return;
    
    const item = items[actualIndex];
    const wasSelected = selectedItems.has(item.uri);
    
    if (wasSelected) {
      selectedItems.delete(item.uri);
    } else {
      selectedItems.add(item.uri);
    }
    
    // Refresh the display to show selection
    await this.loadDirectory(pane, uri, index);
    
    // Save state after selection change
    this.saveState();
    
    // Schedule progressive render after selection change
    this.scheduleRender(() => {
      // Selection change is complete
    });
  }

  private async goToParent(pane: PaneType): Promise<void> {
    const uri = pane === 'left' ? this.leftUri : this.rightUri;
    const parentUri = path.dirname(uri);
    
    if (parentUri !== uri) {
      // Check if we have navigation history for this pane
      if (this.navigationHistory[pane].length > 0) {
        const historyEntry = this.navigationHistory[pane].pop()!;
        await this.loadDirectory(pane, historyEntry.uri, historyEntry.selectedIndex);
      } else {
        // No history, just go to parent directory
        await this.loadDirectory(pane, parentUri, 0);
      }
    }
  }

  private switchPane(): void {
    this.currentPane = this.currentPane === 'left' ? 'right' : 'left';
    this.setFocus(this.currentPane);
  }

  private setFocus(pane: PaneType): void {
    if (!this.leftPane || !this.rightPane) return;
    
    if (pane === 'left') {
      this.leftPane.focus();
      this.leftPane.style.border.fg = 'bright-blue';
      this.leftPane.style.border.bold = true;
      this.leftPane.style.item.fg = 'black';
      this.leftPane.style.item.bold = true;
      this.rightPane.style.border.fg = 'dark-gray';
      this.rightPane.style.border.bold = false;
      this.rightPane.style.item.fg = 'black';
      this.rightPane.style.item.bold = false;
    } else {
      this.rightPane.focus();
      this.rightPane.style.border.fg = 'bright-blue';
      this.rightPane.style.border.bold = true;
      this.rightPane.style.item.fg = 'black';
      this.rightPane.style.item.bold = true;
      this.leftPane.style.border.fg = 'dark-gray';
      this.leftPane.style.border.bold = false;
      this.leftPane.style.item.fg = 'black';
      this.leftPane.style.item.bold = false;
    }
    this.currentPane = pane;
    
    // Schedule progressive render after focus change
    this.scheduleRender(() => {
      // Focus change is complete
    });
  }

  private updateStatus(): void {
    if (!this.statusBar) return;
    
    const leftProviderInfo = this.providerManager.getProviderInfo(this.leftProvider);
    const rightProviderInfo = this.providerManager.getProviderInfo(this.rightProvider);
    
    const leftInfo = `Left [${leftProviderInfo?.displayName || this.leftProvider}]: ${this.leftUri}`;
    const rightInfo = `Right [${rightProviderInfo?.displayName || this.rightProvider}]: ${this.rightUri}`;
    
    // Get current selection info
    const currentPane = this.currentPane;
    const items = currentPane === 'left' ? this.leftItems : this.rightItems;
    const selectedIndex = currentPane === 'left' ? this.leftSelected : this.rightSelected;
    const selectedItems = currentPane === 'left' ? this.leftSelectedItems : this.rightSelectedItems;
    
    let selectionInfo = '';
    if (items.length > 0) {
      const hasParentEntry = (currentPane === 'left' ? this.leftUri : this.rightUri) !== '/' && (currentPane === 'left' ? this.leftUri : this.rightUri) !== '';
      const isParentEntry = hasParentEntry && selectedIndex === 0;
      
      if (isParentEntry) {
        selectionInfo = 'DIR .. (parent directory)';
      } else {
        const actualIndex = hasParentEntry ? selectedIndex - 1 : selectedIndex;
        if (actualIndex >= 0 && actualIndex < items.length) {
          const item = items[actualIndex];
          const size = item.size ? this.formatFileSize(item.size) : '';
          const type = item.isDirectory ? 'DIR' : 'FILE';
          const displayName = this.truncateFileName(item.name, 25);
          selectionInfo = `${type} ${size} ${displayName}`;
        }
      }
    }
    
    // Add selection count
    const selectionCount = selectedItems.size;
    const selectionText = selectionCount > 0 ? ` | Selected: ${selectionCount}` : '';
    
    const overlayStatus = this.overlayMode ? 'Overlay' : 'Full';
    this.statusBar.content = `${leftInfo} | ${rightInfo} | ${selectionInfo}${selectionText} | Press P for provider, F9 for config, F1 for help, F12 for ${overlayStatus} mode, F10 to quit`;
    
    // Schedule progressive render for status updates
    this.scheduleRender(() => {
      // Status update is complete
    });
  }

  private showError(message: string): void {
    if (!this.statusBar) return;
    
    this.statusBar.content = `ERROR: ${message}`;
    this.statusBar.style.fg = 'white';
    this.statusBar.style.bg = 'red';
    this.statusBar.style.bold = true;
    
    // Schedule progressive render for error display
    this.scheduleRender(() => {
      // Error display is complete
    });
    
    setTimeout(() => {
      this.statusBar!.style.fg = 'white';
      this.statusBar!.style.bg = 'dark-gray';
      this.statusBar!.style.bold = true;
      this.updateStatus();
    }, 3000);
  }

  private showHelp(): void {
    if (!this.screen) return;
    
    const helpBox = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: '80%',
      height: '80%',
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: 'bright-blue'
        },
        fg: 'black',
        bg: 'white'
      },
      scrollable: true,
      alwaysScroll: true,
      scrollbar: {
        ch: ' ',
        track: {
          bg: 'cyan'
        },
        style: {
          inverse: true
        }
      },
      content: `
AIFS Commander TUI - Help

Navigation:
  Tab          - Switch between panes
  ↑/↓          - Navigate file list
  Enter        - Open directory or file with default app
  Click        - Open directory or file with default app
  Backspace    - Go to parent directory
  Space        - Toggle file selection

File Operations:
  F5           - Copy selected files to other pane
  F6           - Move selected files to other pane
  F7           - Create new directory
  F8           - Delete selected files
  F9           - Open configuration panel

Provider Switching:
  P            - Switch provider for current pane
  Available:   Local File System, S3, GCS, Azure, AIFS

Pane Resizing:
  Ctrl+Left    - Move divider left (make left pane smaller)
  Ctrl+Right   - Move divider right (make right pane smaller)
  Ctrl+R       - Reset divider to center (50/50)

Configuration:
  F9           - Open configuration panel
  Configure   - Provider credentials and settings
  Encrypted   - All data stored securely encrypted

System:
  F1           - Show this help
  F12          - Toggle overlay mode (show/hide terminal content)
  F10          - Quit

Selection:
  Space        - Toggle selection of current item
  Selected items show with ✓ prefix

Configuration Panel:
  E            - Enable/Disable provider
  C            - Configure credentials
  S            - Configure settings
  T            - Test connection
  D            - Delete configuration
  ESC          - Close configuration panel

Security Features:
  • AES-256-CBC encryption for all stored data
  • Secure key management with restricted permissions
  • Credential masking in the interface
  • Configuration validation before enabling providers
  • Encrypted storage in ~/.aifs-commander/

Press any key to close this help.
      `,
      keys: true,
      vi: true
    });

    helpBox.key(['escape', 'q', 'enter', 'space'], () => {
      helpBox.detach();
      this.screen!.render();
    });

    helpBox.focus();
    this.screen.render();
  }

  private handleResize(): void {
    if (!this.statusBar || !this.screen) return;
    
    const { width, height } = this.screen;
    
    if ((width as number) < 80 || (height as number) < 20) {
      this.statusBar.content = 'Terminal too small. Please resize to at least 80x20';
      this.statusBar.style.bg = 'red';
    } else {
      this.statusBar.content = 'AIFS Commander TUI - Press F1 for help, F10 to quit';
      this.statusBar.style.bg = 'blue';
      
      // Refresh panes after resize to recalculate truncation
      this.refreshCurrentPanes();
    }
    
    // Schedule progressive render after resize
    this.scheduleRender(() => {
      // Resize is complete
    });
  }

  private async quit(): Promise<void> {
    try {
      // Save current state before exiting
      await this.stateManager.saveState(
        this.leftUri,
        this.rightUri,
        this.leftSelected,
        this.rightSelected
      );
    } catch (error) {
      console.warn('Failed to save state:', (error as Error).message);
    }
    
    // Clear the screen and restore terminal
    if (this.screen) {
      this.screen.destroy();
    }
    
    // Clear the screen completely
    process.stdout.write('\x1b[2J\x1b[H');
    process.stdout.write('\x1b[3J'); // Clear scrollback buffer
    process.stdout.write('\x1b[0m'); // Reset all attributes
    
    process.exit(0);
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private truncateFileName(name: string, availableWidth: number): string {
    // Calculate the actual available width for the filename
    // Account for prefixes (✓, icons), spaces, and size info
    const prefixLength = 3; // "✓ " or "  "
    const iconLength = this.terminalSupportsUnicode ? 2 : 6; // "📁" (2) or "[DIR]" (6)
    const spaceAfterIcon = 1; // " "
    const spaceBeforeSize = 1; // " "
    const sizeInfoLength = 15; // Approximate size info like "(155.69 MB)"
    const padding = 2; // Some padding for safety
    
    const maxNameLength = availableWidth - prefixLength - iconLength - spaceAfterIcon - spaceBeforeSize - sizeInfoLength - padding;
    
    if (name.length <= maxNameLength) {
      return name;
    }
    
    // Find the last dot to preserve file extension
    const lastDot = name.lastIndexOf('.');
    if (lastDot > 0 && lastDot > name.length - 8) {
      // Has a reasonable extension, truncate before the extension
      const extension = name.substring(lastDot);
      const nameWithoutExt = name.substring(0, lastDot);
      const availableLength = maxNameLength - extension.length - 3; // 3 for "..."
      
      if (availableLength > 0) {
        return `${nameWithoutExt.substring(0, availableLength)}...${extension}`;
      }
    }
    
    // No extension or extension too long, just truncate
    return `${name.substring(0, maxNameLength - 3)}...`;
  }

  private async handleCopy(): Promise<void> {
    const sourcePane = this.currentPane;
    const targetPane = sourcePane === 'left' ? 'right' : 'left';
    const sourceItems = sourcePane === 'left' ? this.leftItems : this.rightItems;
    const targetUri = targetPane === 'left' ? this.leftUri : this.rightUri;
    const selectedItems = sourcePane === 'left' ? this.leftSelectedItems : this.rightSelectedItems;
    const currentSelected = sourcePane === 'left' ? this.leftSelected : this.rightSelected;

    // If no items are explicitly selected, use the currently highlighted item
    let itemsToCopy: string[] = [];
    if (selectedItems.size === 0) {
      // Get the currently highlighted item
      const uri = sourcePane === 'left' ? this.leftUri : this.rightUri;
      const hasParentEntry = uri !== '/' && uri !== '';
      const isParentEntry = hasParentEntry && currentSelected === 0;
      
      if (isParentEntry) {
        this.showError('Cannot copy parent directory');
        return;
      }
      
      const actualIndex = hasParentEntry ? currentSelected - 1 : currentSelected;
      if (actualIndex < 0 || actualIndex >= sourceItems.length) {
        this.showError('No item selected for copy');
        return;
      }
      
      const highlightedItem = sourceItems[actualIndex];
      itemsToCopy = [highlightedItem.uri];
    } else {
      itemsToCopy = Array.from(selectedItems);
    }

    try {
      this.showStatus(`Copying ${itemsToCopy.length} item(s)...`);
      
      for (const itemUri of itemsToCopy) {
        const item = sourceItems.find(i => i.uri === itemUri);
        if (!item) continue;

        const targetName = item.name;
        const targetPath = targetUri.replace(/\/$/, '');
        const targetItemUri = `file://${path.resolve(targetPath, targetName)}`;
        
        const itemType = item.isDirectory ? 'directory' : 'file';
        this.showStatus(`Copying ${itemType}: ${item.name}...`);
        
        await this.providerManager.copy(itemUri, targetItemUri);
      }

      this.showStatus(`Successfully copied ${itemsToCopy.length} item(s)`);
      
      // Clear selections and refresh target pane
      if (sourcePane === 'left') {
        this.leftSelectedItems.clear();
      } else {
        this.rightSelectedItems.clear();
      }
      
      await this.loadDirectory(targetPane, targetUri);
      this.setFocus(targetPane);
      
    } catch (error) {
      this.showError(`Copy failed: ${(error as Error).message}`);
    }
  }

  private async handleMove(): Promise<void> {
    const sourcePane = this.currentPane;
    const targetPane = sourcePane === 'left' ? 'right' : 'left';
    const sourceItems = sourcePane === 'left' ? this.leftItems : this.rightItems;
    const sourceUri = sourcePane === 'left' ? this.leftUri : this.rightUri;
    const targetUri = targetPane === 'left' ? this.leftUri : this.rightUri;
    const selectedItems = sourcePane === 'left' ? this.leftSelectedItems : this.rightSelectedItems;
    const currentSelected = sourcePane === 'left' ? this.leftSelected : this.rightSelected;

    // If no items are explicitly selected, use the currently highlighted item
    let itemsToMove: string[] = [];
    if (selectedItems.size === 0) {
      // Get the currently highlighted item
      const uri = sourcePane === 'left' ? this.leftUri : this.rightUri;
      const hasParentEntry = uri !== '/' && uri !== '';
      const isParentEntry = hasParentEntry && currentSelected === 0;
      
      if (isParentEntry) {
        this.showError('Cannot move parent directory');
        return;
      }
      
      const actualIndex = hasParentEntry ? currentSelected - 1 : currentSelected;
      if (actualIndex < 0 || actualIndex >= sourceItems.length) {
        this.showError('No item selected for move');
        return;
      }
      
      const highlightedItem = sourceItems[actualIndex];
      itemsToMove = [highlightedItem.uri];
    } else {
      itemsToMove = Array.from(selectedItems);
    }

    try {
      this.showStatus(`Moving ${itemsToMove.length} item(s)...`);
      
      for (const itemUri of itemsToMove) {
        const item = sourceItems.find(i => i.uri === itemUri);
        if (!item) continue;

        const targetName = item.name;
        const targetPath = targetUri.replace(/\/$/, '');
        const targetItemUri = `file://${path.resolve(targetPath, targetName)}`;
        
        await this.providerManager.move(itemUri, targetItemUri);
      }

      this.showStatus(`Successfully moved ${itemsToMove.length} item(s)`);
      
      // Clear selections and refresh both panes
      if (sourcePane === 'left') {
        this.leftSelectedItems.clear();
      } else {
        this.rightSelectedItems.clear();
      }
      
      await this.loadDirectory(sourcePane, sourceUri);
      await this.loadDirectory(targetPane, targetUri);
      this.setFocus(targetPane);
      
    } catch (error) {
      this.showError(`Move failed: ${(error as Error).message}`);
    }
  }

  private async handleMkdir(): Promise<void> {
    const currentUri = this.currentPane === 'left' ? this.leftUri : this.rightUri;
    
    // Show input dialog for directory name
    const dialog = blessed.box({
      parent: this.screen!,
      top: 'center',
      left: 'center',
      width: '50%',
      height: 7,
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: 'bright-blue'
        },
        fg: 'white',
        bg: 'black'
      },
      label: 'Create Directory',
      keys: true,
      vi: true,
      mouse: true
    });

    blessed.text({
      parent: dialog,
      top: 0,
      left: 1,
      content: 'Enter directory name:'
    });

    const input = blessed.textbox({
      parent: dialog,
      top: 2,
      left: 1,
      width: '100%-2',
      height: 1,
      inputOnFocus: true,
      style: {
        fg: 'black',
        bg: 'white'
      }
    });

    blessed.text({
      parent: dialog,
      bottom: 0,
      left: 1,
      content: 'Press Enter to confirm, ESC to cancel'
    });

    input.key(['enter'], async () => {
      const value = input.getValue();
      dialog.detach();
      this.screen!.render();

      if (!value || value.trim() === '') return;

      try {
        // Convert file URI to local path
        const currentPath = currentUri.startsWith('file://') ? 
          currentUri.replace('file://', '') : currentUri;
        const cleanPath = currentPath.replace(/\/$/, '');
        const newDirPath = path.resolve(cleanPath, value);
        const newDirUri = `file://${newDirPath}`;
        
        await this.providerManager.mkdir(newDirUri);
        
        this.showStatus(`Created directory: ${value}`);
        await this.loadDirectory(this.currentPane, currentUri);
        
      } catch (error) {
        this.showError(`Failed to create directory: ${(error as Error).message}`);
      }
    });

    input.key(['escape'], () => {
      dialog.detach();
      this.screen!.render();
    });

    dialog.focus();
    input.focus();
    this.screen!.render();
  }

  private async handleDelete(): Promise<void> {
    const currentItems = this.currentPane === 'left' ? this.leftItems : this.rightItems;
    const currentUri = this.currentPane === 'left' ? this.leftUri : this.rightUri;
    const selectedItems = this.currentPane === 'left' ? this.leftSelectedItems : this.rightSelectedItems;
    const currentSelected = this.currentPane === 'left' ? this.leftSelected : this.rightSelected;

    // If no items are explicitly selected, use the currently highlighted item
    let itemsToDelete: string[] = [];
    if (selectedItems.size === 0) {
      // Get the currently highlighted item
      const uri = this.currentPane === 'left' ? this.leftUri : this.rightUri;
      const hasParentEntry = uri !== '/' && uri !== '';
      const isParentEntry = hasParentEntry && currentSelected === 0;
      
      if (isParentEntry) {
        this.showError('Cannot delete parent directory');
        return;
      }
      
      const actualIndex = hasParentEntry ? currentSelected - 1 : currentSelected;
      if (actualIndex < 0 || actualIndex >= currentItems.length) {
        this.showError('No item selected for deletion');
        return;
      }
      
      const highlightedItem = currentItems[actualIndex];
      itemsToDelete = [highlightedItem.uri];
    } else {
      itemsToDelete = Array.from(selectedItems);
    }

    const itemNames = itemsToDelete
      .map(uri => currentItems.find(item => item.uri === uri)?.name)
      .filter(Boolean)
      .join(', ');

    // Create a simple confirmation box
    const confirmBox = blessed.box({
      parent: this.screen!,
      top: 'center',
      left: 'center',
      width: '60%',
      height: 'shrink',
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: 'red'
        },
        fg: 'white',
        bg: 'black'
      },
      content: `Delete ${itemsToDelete.length} item(s): ${itemNames}?\n\nPress 'y' to confirm or any other key to cancel.`,
      keys: true,
      vi: true,
      mouse: true
    });

    // Handle key press for confirmation
    const handleKey = (ch: string, key: any) => {
      if (key.name === 'y' || ch === 'y') {
        // Confirm deletion
        confirmBox.detach();
        this.screen!.render();
        
        this.performDelete(itemsToDelete, currentUri);
      } else {
        // Cancel deletion
        confirmBox.detach();
        this.screen!.render();
        this.updateStatus();
      }
    };

    confirmBox.on('keypress', handleKey);
    confirmBox.focus();
    this.screen!.render();
  }

  private async performDelete(itemsToDelete: string[], currentUri: string): Promise<void> {
    try {
      this.showStatus(`Deleting ${itemsToDelete.length} item(s)...`);
      
      for (const itemUri of itemsToDelete) {
        const item = this.currentPane === 'left' ? 
          this.leftItems.find(i => i.uri === itemUri) : 
          this.rightItems.find(i => i.uri === itemUri);
        
        if (item) {
          const itemType = item.isDirectory ? 'directory' : 'file';
          this.showStatus(`Deleting ${itemType}: ${item.name}...`);
        }
        
        await this.providerManager.delete(itemUri);
      }

      this.showStatus(`Successfully deleted ${itemsToDelete.length} item(s)`);
      
      // Clear selections and refresh current pane
      if (this.currentPane === 'left') {
        this.leftSelectedItems.clear();
      } else {
        this.rightSelectedItems.clear();
      }
      
      await this.loadDirectory(this.currentPane, currentUri);
      
    } catch (error) {
      this.showError(`Delete failed: ${(error as Error).message}`);
    }
  }

  private showProviderMenu(pane: PaneType): void {
    if (!this.screen) return;

    const providers = this.providerManager.getAllProviders();
    const currentProvider = pane === 'left' ? this.leftProvider : this.rightProvider;

    // Create provider selection menu
    this.providerMenu = blessed.list({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: '50%',
      height: '60%',
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: 'blue'
        },
        selected: {
          bg: 'blue',
          fg: 'white'
        },
        item: {
          fg: 'white',
          bg: 'black'
        }
      },
      keys: true,
      vi: true,
      mouse: true,
      scrollable: true,
      label: `Select Provider for ${pane.toUpperCase()} Pane`,
      items: providers.map(provider => {
        const status = provider.available ? '✓' : '✗';
        const current = provider.scheme === currentProvider ? ' (current)' : '';
        return `${status} ${provider.displayName}${current}`;
      })
    });

    // Handle selection
    this.providerMenu.on('select', (_item: any, index: number) => {
      const selectedProvider = providers[index];
      this.providerMenu!.detach();
      this.screen!.render();

      if (selectedProvider.available) {
        this.switchProvider(pane, selectedProvider.scheme);
      } else {
        this.showError(`${selectedProvider.displayName} is not available. Please configure credentials.`);
      }
    });

    // Handle escape key
    this.providerMenu.key(['escape'], () => {
      this.providerMenu!.detach();
      this.screen!.render();
    });

    this.providerMenu.focus();
    this.screen.render();
  }

  private async switchProvider(pane: PaneType, providerScheme: string): Promise<void> {
    try {
      // Set the provider for the specified pane
      if (pane === 'left') {
        this.leftProvider = providerScheme;
        this.leftUri = this.getProviderRootUri(providerScheme);
        this.leftSelected = 0;
        this.leftSelectedItems.clear();
      } else {
        this.rightProvider = providerScheme;
        this.rightUri = this.getProviderRootUri(providerScheme);
        this.rightSelected = 0;
        this.rightSelectedItems.clear();
      }

      // Update provider manager
      this.providerManager.setCurrentProvider(providerScheme);

      // Load the new directory with proper error handling
      const uri = pane === 'left' ? this.leftUri : this.rightUri;
      console.log(`Switching ${pane} pane to ${providerScheme}, loading URI: ${uri}`);
      
      try {
        // Use progressive rendering for cloud providers
        const isCloudProvider = ['s3', 'gcs', 'az', 'aifs'].includes(providerScheme);
        if (isCloudProvider) {
          await this.loadDirectoryProgressive(pane, uri, 0);
        } else {
          await this.loadDirectory(pane, uri, 0);
        }
        this.showStatus(`Switched ${pane} pane to ${this.providerManager.getProviderInfo(providerScheme)?.displayName}`);
      } catch (loadError) {
        console.error(`Failed to load directory for ${providerScheme}:`, loadError);
        this.showError(`Failed to load ${providerScheme} content: ${(loadError as Error).message}`);
        
        // Fallback: show empty list with error message
        const paneList = pane === 'left' ? this.leftPane : this.rightPane;
        if (paneList) {
          paneList.setItems([`Error: ${(loadError as Error).message}`, '', 'Press P to switch provider']);
          paneList.render();
        }
      }

    } catch (error) {
      this.showError(`Failed to switch provider: ${(error as Error).message}`);
    }
  }

  private getProviderRootUri(providerScheme: string): string {
    switch (providerScheme) {
      case 'file':
        return os.homedir();
      case 's3':
        return 's3://';
      case 'gcs':
        return 'gcs://';
      case 'az':
        return 'az://';
      case 'aifs':
        return 'aifs://';
      default:
        return os.homedir();
    }
  }

  private joinUri(baseUri: string, itemName: string): string {
    // Handle different URI schemes
    if (baseUri.startsWith('s3://')) {
      return `${baseUri}${itemName}`;
    } else if (baseUri.startsWith('gcs://')) {
      return `${baseUri}${itemName}`;
    } else if (baseUri.startsWith('az://')) {
      return `${baseUri}${itemName}`;
    } else if (baseUri.startsWith('aifs://')) {
      return `${baseUri}${itemName}`;
    } else {
      // For file system paths, use path.join
      return path.join(baseUri, itemName);
    }
  }

  private showStatus(message: string): void {
    if (!this.statusBar) return;
    
    this.statusBar.content = message;
    this.statusBar.style.fg = 'white';
    this.statusBar.style.bg = 'green';
    this.statusBar.style.bold = true;
    
    // Schedule progressive render for status display
    this.scheduleRender(() => {
      // Status display is complete
    });
    
    setTimeout(() => {
      this.statusBar!.style.fg = 'white';
      this.statusBar!.style.bg = 'dark-gray';
      this.statusBar!.style.bold = true;
      this.updateStatus();
    }, 2000);
  }

  private saveState(): void {
    // Save state asynchronously without blocking UI
    this.stateManager.saveState(
      this.leftUri,
      this.rightUri,
      this.leftSelected,
      this.rightSelected
    ).catch(error => {
      console.warn('Failed to save state:', (error as Error).message);
    });
  }
}
