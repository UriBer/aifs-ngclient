import blessed from 'blessed';
import * as os from 'os';
import * as path from 'path';
import { spawn } from 'child_process';
import { FileItem, NavigationHistoryEntry, PaneType, TuiApplicationOptions } from './types.js';
import { ProviderManager } from './ProviderManager.js';
import { StateManager } from './StateManager.js';
import { ConfigUI } from './ConfigUI.js';
import { ConfigManager } from './ConfigManager.js';

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

  constructor(_options?: TuiApplicationOptions) {
    this.providerManager = new ProviderManager();
    this.stateManager = new StateManager();
    this.configManager = new ConfigManager();
  }

  async start(): Promise<void> {
    try {
      // Check terminal size (be more lenient)
      const rows = process.stdout.rows || parseInt(process.env.LINES || '24');
      const cols = process.stdout.columns || parseInt(process.env.COLUMNS || '80');
      
      if (rows < 6 || cols < 20) {
        console.error('Terminal size too small. Please resize to at least 20x6');
        console.error(`Current size: ${cols}x${rows}`);
        process.exit(1);
      }

      // Load saved state
      const savedState = await this.stateManager.loadState();
      if (savedState) {
        this.leftUri = savedState.leftUri;
        this.rightUri = savedState.rightUri;
        this.leftSelected = savedState.leftSelectedIndex;
        this.rightSelected = savedState.rightSelectedIndex;
      }

    this.initializeScreen();
    this.initializeLayout();
    this.setupEventHandlers();
      
    // Load provider configuration
    await this.loadProviderConfiguration();

    // Load initial directories
    await this.loadDirectory('left', this.leftUri, this.leftSelected);
    await this.loadDirectory('right', this.rightUri, this.rightSelected);
      
      this.screen!.render();
      
    } catch (error) {
      console.error('Failed to start TUI:', error);
      process.exit(1);
    }
  }

  private initializeScreen(): void {
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'AIFS Commander TUI',
      cursor: {
        artificial: true,
        shape: 'block',
        blink: true,
        color: 'black'
      }
    });

    this.screen.on('resize', () => {
      this.handleResize();
    });

    this.screen.key(['C-c'], () => {
      this.quit();
    });
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

    this.leftPane.on('keypress', (ch, key) => {
      this.handleKeyPress('left', ch, key);
    });

    // Add double-click support for left pane
    this.leftPane.on('click', () => {
      this.handleSelection('left', null, this.leftSelected);
    });

    // Right pane events
    this.rightPane.on('select', (_item, index) => {
      this.rightSelected = index;
      this.updateStatus();
    });

    this.rightPane.on('keypress', (ch, key) => {
      this.handleKeyPress('right', ch, key);
    });

    // Add double-click support for right pane
    this.rightPane.on('click', () => {
      this.handleSelection('right', null, this.rightSelected);
    });
  }

  private async loadDirectory(pane: PaneType, uri: string, selectedIndex: number = 0): Promise<void> {
    try {
      // Convert local path to file URI if needed
      const fileUri = uri.startsWith('file://') ? uri : `file://${path.resolve(uri)}`;
      
      const result = await this.providerManager.list(fileUri);
      const items = result.items;
      const paneList = pane === 'left' ? this.leftPane : this.rightPane;
      
      if (!paneList) return;
      
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
        const displayName = this.truncateFileName(dir.name, paneWidth);
        paneList.addItem(`${prefix}📁 ${displayName}/`);
      }
      
      // Add files
      const files = items.filter(item => !item.isDirectory);
      for (const file of files) {
        const isSelected = pane === 'left' ? this.leftSelectedItems.has(file.uri) : this.rightSelectedItems.has(file.uri);
        const prefix = isSelected ? '✓ ' : '  ';
        const size = file.size ? this.formatFileSize(file.size) : '';
        const displayName = this.truncateFileName(file.name, paneWidth);
        paneList.addItem(`${prefix}📄 ${displayName} (${size})`);
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
      
    } catch (error) {
      this.showError(`Failed to load directory: ${(error as Error).message}`);
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
      
      const newUri = path.join(uri, selectedItem.name);
      await this.loadDirectory(pane, newUri, 0); // Start at top of new directory
    } else {
      // For files, open with default application
      const filePath = selectedItem.uri.startsWith('file://') 
        ? selectedItem.uri.replace('file://', '') 
        : selectedItem.uri;
      await this.openFileWithDefaultApp(filePath);
    }
  }

  private handleKeyPress(pane: PaneType, _ch: string, key: any): void {
    const paneList = pane === 'left' ? this.leftPane : this.rightPane;
    const currentSelected = pane === 'left' ? this.leftSelected : this.rightSelected;
    
    if (!paneList) return;
    
    switch (key.name) {
      case 'enter':
        this.handleSelection(pane, null, currentSelected);
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
        this.toggleSelection(pane, currentSelected);
        break;
      case 'p':
        // Show provider menu for current pane
        this.showProviderMenu(pane);
        break;
    }
  }

  private handleGlobalKeyPress(_ch: string, key: any): void {
    switch (key.name) {
      case 'left':
        if (key.ctrl || key.meta) {
          // Resize divider left
          this.resizeDivider(-5);
        }
        break;
      case 'right':
        if (key.ctrl || key.meta) {
          // Resize divider right
          this.resizeDivider(5);
        }
        break;
      case 'r':
        if (key.ctrl || key.meta) {
          // Reset divider to center
          this.resizeDivider(0, true);
        }
        break;
    }
  }

  private resizeDivider(delta: number, reset: boolean = false): void {
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
      this.refreshCurrentPanes();
      
      this.showStatus(`Divider resized to ${this.dividerPosition}%`);
    }
  }

  private async refreshCurrentPanes(): Promise<void> {
    // Refresh both panes to recalculate truncation with new widths
    await this.loadDirectory('left', this.leftUri, this.leftSelected);
    await this.loadDirectory('right', this.rightUri, this.rightSelected);
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
        this.providerManager.setProviderAvailability(provider.scheme, provider.enabled);
      }
    } catch (error) {
      console.warn('Failed to load provider configuration:', (error as Error).message);
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

  private toggleSelection(pane: PaneType, index: number): void {
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
    this.loadDirectory(pane, uri, index);
    
    // Save state after selection change
    this.saveState();
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
    this.screen!.render();
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
    
    this.statusBar.content = `${leftInfo} | ${rightInfo} | ${selectionInfo}${selectionText} | Press P for provider, F9 for config, F1 for help, F10 to quit`;
    this.screen!.render();
  }

  private showError(message: string): void {
    if (!this.statusBar) return;
    
    this.statusBar.content = `ERROR: ${message}`;
    this.statusBar.style.fg = 'white';
    this.statusBar.style.bg = 'red';
    this.statusBar.style.bold = true;
    this.screen!.render();
    
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
    if (!this.statusBar) return;
    
    const { width, height } = this.screen!;
    
    if ((width as number) < 80 || (height as number) < 20) {
      this.statusBar.content = 'Terminal too small. Please resize to at least 80x20';
      this.statusBar.style.bg = 'red';
    } else {
      this.statusBar.content = 'AIFS Commander TUI - Press F1 for help, F10 to quit';
      this.statusBar.style.bg = 'blue';
    }
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
      console.log('State saved successfully');
    } catch (error) {
      console.warn('Failed to save state:', (error as Error).message);
    }
    
    console.log('Shutting down TUI application');
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
    // Account for prefixes (✓, 📁/📄), spaces, and size info
    const prefixLength = 3; // "✓ " or "  "
    const iconLength = 2; // "📁" or "📄"
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
    const inputBox = blessed.prompt({
      parent: this.screen!,
      top: 'center',
      left: 'center',
      width: '50%',
      height: 'shrink',
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

    inputBox.input('Enter directory name:', '', async (err, value) => {
      inputBox.detach();
      this.screen!.render();

      if (err || !value) return;

      try {
        const currentPath = currentUri.replace(/\/$/, '');
        const newDirUri = `file://${path.resolve(currentPath, value)}`;
        await this.providerManager.mkdir(newDirUri);
        
        this.showStatus(`Created directory: ${value}`);
        await this.loadDirectory(this.currentPane, currentUri);
        
      } catch (error) {
        this.showError(`Failed to create directory: ${(error as Error).message}`);
      }
    });

    inputBox.focus();
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
        await this.providerManager.delete(itemUri, true); // recursive delete
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

      // Load the new directory
      await this.loadDirectory(pane, pane === 'left' ? this.leftUri : this.rightUri);

      this.showStatus(`Switched ${pane} pane to ${this.providerManager.getProviderInfo(providerScheme)?.displayName}`);

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

  private showStatus(message: string): void {
    if (!this.statusBar) return;
    
    this.statusBar.content = message;
    this.statusBar.style.fg = 'white';
    this.statusBar.style.bg = 'green';
    this.statusBar.style.bold = true;
    this.screen!.render();
    
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
