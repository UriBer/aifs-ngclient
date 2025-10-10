import blessed from 'blessed';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import { FileItem, NavigationHistoryEntry, PaneType, TuiApplicationOptions } from './types.js';

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
  private navigationHistory: Record<PaneType, NavigationHistoryEntry[]> = {
    left: [],
    right: []
  };

  constructor(_options?: TuiApplicationOptions) {
    // Future configuration can be handled here
  }

  async start(): Promise<void> {
    try {
      console.log('Starting AIFS Commander TUI...');
      
      // Check terminal size
      const { rows, cols } = process.stdout as any;
      if (rows < 20 || cols < 80) {
        console.error('Terminal size too small. Please resize to at least 80x20');
        process.exit(1);
      }

      this.initializeScreen();
      this.initializeLayout();
      this.setupEventHandlers();
      
      // Load initial directories
      await this.loadDirectory('left', this.leftUri);
      await this.loadDirectory('right', this.rightUri);
      
      this.screen!.render();
      console.log('TUI started successfully!');
      
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
        color: 'white'
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
          fg: 'white'
        }
      }
    });

    // Create left pane
    this.leftPane = blessed.list({
      parent: mainContainer,
      top: 0,
      left: 0,
      width: '50%',
      height: '100%',
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: 'green'
        },
        selected: {
          bg: 'blue',
          fg: 'white'
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
      left: '50%',
      width: '50%',
      height: '100%',
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: 'green'
        },
        selected: {
          bg: 'blue',
          fg: 'white'
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
      content: 'AIFS Commander TUI - Press F1 for help, F10 to quit',
      style: {
        bg: 'blue',
        fg: 'white'
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

    // Left pane events
    this.leftPane.on('select', async (item, index) => {
      this.leftSelected = index;
      await this.handleSelection('left', item, index);
    });

    this.leftPane.on('keypress', (ch, key) => {
      this.handleKeyPress('left', ch, key);
    });

    // Right pane events
    this.rightPane.on('select', async (item, index) => {
      this.rightSelected = index;
      await this.handleSelection('right', item, index);
    });

    this.rightPane.on('keypress', (ch, key) => {
      this.handleKeyPress('right', ch, key);
    });
  }

  private async loadDirectory(pane: PaneType, uri: string, selectedIndex: number = 0): Promise<void> {
    try {
      const items = await this.listDirectory(uri);
      const paneList = pane === 'left' ? this.leftPane : this.rightPane;
      
      if (!paneList) return;
      
      paneList.clearItems();
      
      // Add parent directory if not at root
      if (uri !== '/' && uri !== '') {
        paneList.addItem('.. (parent directory)');
      }
      
      // Add directories first
      const dirs = items.filter(item => item.isDirectory);
      for (const dir of dirs) {
        paneList.addItem(`📁 ${dir.name}/`);
      }
      
      // Add files
      const files = items.filter(item => !item.isDirectory);
      for (const file of files) {
        const size = file.size ? this.formatFileSize(file.size) : '';
        paneList.addItem(`📄 ${file.name} (${size})`);
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
      
      this.updateStatus();
      
    } catch (error) {
      this.showError(`Failed to load directory: ${(error as Error).message}`);
    }
  }

  private async listDirectory(uri: string): Promise<FileItem[]> {
    try {
      const stats = await fs.stat(uri);
      if (!stats.isDirectory()) {
        throw new Error('Not a directory');
      }
      
      const entries = await fs.readdir(uri, { withFileTypes: true });
      const items: FileItem[] = [];
      
      for (const entry of entries) {
        try {
          const fullPath = path.join(uri, entry.name);
          const stats = await fs.stat(fullPath);
          
          items.push({
            name: entry.name,
            isDirectory: entry.isDirectory(),
            size: stats.size,
            mtime: stats.mtime
          });
        } catch (statError) {
          // Skip files we can't access instead of showing them with errors
          continue;
        }
      }
      
      // Sort: directories first, then files
      items.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
      
      return items;
    } catch (error) {
      throw new Error(`Cannot read directory: ${(error as Error).message}`);
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
      this.showError(`File operations not yet implemented: ${selectedItem.name}`);
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
    }
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
      this.leftPane.style.border.fg = 'blue';
      this.rightPane.style.border.fg = 'green';
    } else {
      this.rightPane.focus();
      this.rightPane.style.border.fg = 'blue';
      this.leftPane.style.border.fg = 'green';
    }
    this.currentPane = pane;
    this.screen!.render();
  }

  private updateStatus(): void {
    if (!this.statusBar) return;
    
    const leftInfo = `Left: ${this.leftUri}`;
    const rightInfo = `Right: ${this.rightUri}`;
    
    // Get current selection info
    const currentPane = this.currentPane;
    const items = currentPane === 'left' ? this.leftItems : this.rightItems;
    const selectedIndex = currentPane === 'left' ? this.leftSelected : this.rightSelected;
    
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
          selectionInfo = `${type} ${size} ${item.name}`;
        }
      }
    }
    
    this.statusBar.content = `${leftInfo} | ${rightInfo} | ${selectionInfo} | Press F1 for help, F10 to quit`;
    this.screen!.render();
  }

  private showError(message: string): void {
    if (!this.statusBar) return;
    
    this.statusBar.content = `ERROR: ${message}`;
    this.statusBar.style.fg = 'red';
    this.screen!.render();
    
    setTimeout(() => {
      this.statusBar!.style.fg = 'white';
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
          fg: 'blue'
        }
      },
      content: `
AIFS Commander TUI - Help

Navigation:
  Tab          - Switch between panes
  ↑/↓          - Navigate file list
  Enter        - Open directory/file
  Backspace    - Go to parent directory
  /            - Search files

File Operations:
  F5           - Copy selected files
  F6           - Move selected files
  F7           - Create new directory
  F8           - Delete selected files
  F9           - Rename file/directory

System:
  F1           - Show this help
  F10          - Quit

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

  private quit(): void {
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
}
