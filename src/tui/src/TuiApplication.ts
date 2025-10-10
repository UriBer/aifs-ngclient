import blessed from 'blessed';
import * as os from 'os';
import * as path from 'path';
import { FileItem, NavigationHistoryEntry, PaneType, TuiApplicationOptions } from './types.js';
import { ProviderManager } from './ProviderManager.js';
import { StateManager } from './StateManager.js';

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

  constructor(_options?: TuiApplicationOptions) {
    this.providerManager = new ProviderManager();
    this.stateManager = new StateManager();
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

      // Load saved state
      const savedState = await this.stateManager.loadState();
      if (savedState) {
        this.leftUri = savedState.leftUri;
        this.rightUri = savedState.rightUri;
        this.leftSelected = savedState.leftSelectedIndex;
        this.rightSelected = savedState.rightSelectedIndex;
        console.log(`Restored state: Left=${this.leftUri}, Right=${this.rightUri}`);
      } else {
        console.log('Using default directories');
      }

      this.initializeScreen();
      this.initializeLayout();
      this.setupEventHandlers();
      
      // Load initial directories
      await this.loadDirectory('left', this.leftUri, this.leftSelected);
      await this.loadDirectory('right', this.rightUri, this.rightSelected);
      
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
          fg: 'dark-gray'
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
          fg: 'dark-gray'
        },
        selected: {
          bg: 'blue',
          fg: 'white'
        },
        item: {
          fg: 'black'
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
          fg: 'dark-gray'
        },
        selected: {
          bg: 'blue',
          fg: 'white'
        },
        item: {
          fg: 'black'
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

    // Left pane events
    this.leftPane.on('select', (_item, index) => {
      this.leftSelected = index;
      this.updateStatus();
    });

    this.leftPane.on('keypress', (ch, key) => {
      this.handleKeyPress('left', ch, key);
    });

    // Right pane events
    this.rightPane.on('select', (_item, index) => {
      this.rightSelected = index;
      this.updateStatus();
    });

    this.rightPane.on('keypress', (ch, key) => {
      this.handleKeyPress('right', ch, key);
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
      
      // Add directories first
      const dirs = items.filter(item => item.isDirectory);
      for (const dir of dirs) {
        const isSelected = pane === 'left' ? this.leftSelectedItems.has(dir.uri) : this.rightSelectedItems.has(dir.uri);
        const prefix = isSelected ? '✓ ' : '  ';
        paneList.addItem(`${prefix}📁 ${dir.name}/`);
      }
      
      // Add files
      const files = items.filter(item => !item.isDirectory);
      for (const file of files) {
        const isSelected = pane === 'left' ? this.leftSelectedItems.has(file.uri) : this.rightSelectedItems.has(file.uri);
        const prefix = isSelected ? '✓ ' : '  ';
        const size = file.size ? this.formatFileSize(file.size) : '';
        paneList.addItem(`${prefix}📄 ${file.name} (${size})`);
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
      // For files, toggle selection instead of showing error
      this.toggleSelection(pane, index);
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
    
    const leftInfo = `Left: ${this.leftUri}`;
    const rightInfo = `Right: ${this.rightUri}`;
    
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
          selectionInfo = `${type} ${size} ${item.name}`;
        }
      }
    }
    
    // Add selection count
    const selectionCount = selectedItems.size;
    const selectionText = selectionCount > 0 ? ` | Selected: ${selectionCount}` : '';
    
    this.statusBar.content = `${leftInfo} | ${rightInfo} | ${selectionInfo}${selectionText} | Press F1 for help, F10 to quit`;
    this.screen!.render();
  }

  private showError(message: string): void {
    if (!this.statusBar) return;
    
    this.statusBar.content = `ERROR: ${message}`;
    this.statusBar.style.fg = 'white';
    this.statusBar.style.bg = 'red';
    this.screen!.render();
    
    setTimeout(() => {
      this.statusBar!.style.fg = 'white';
      this.statusBar!.style.bg = 'blue';
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
        fg: 'white',
        bg: 'black'
      },
      content: `
AIFS Commander TUI - Help

Navigation:
  Tab          - Switch between panes
  ↑/↓          - Navigate file list
  Enter        - Open directory/file
  Backspace    - Go to parent directory
  Space        - Toggle file selection

File Operations:
  F5           - Copy selected files to other pane
  F6           - Move selected files to other pane
  F7           - Create new directory
  F8           - Delete selected files

System:
  F1           - Show this help
  F10          - Quit

Selection:
  Space        - Toggle selection of current item
  Selected items show with ✓ prefix

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

    // Show confirmation dialog
    const confirmBox = blessed.prompt({
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
          fg: 'red'
        },
        fg: 'white',
        bg: 'black'
      },
      label: 'Confirm Delete',
      keys: true,
      vi: true,
      mouse: true
    });

    const itemNames = itemsToDelete
      .map(uri => currentItems.find(item => item.uri === uri)?.name)
      .filter(Boolean)
      .join(', ');

    confirmBox.input(`Delete ${itemsToDelete.length} item(s): ${itemNames}? (y/N):`, '', async (err: any, value: any) => {
      confirmBox.detach();
      this.screen!.render();

      if (err || !value || value.toLowerCase() !== 'y') return;

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
    });

    confirmBox.focus();
    this.screen!.render();
  }

  private showStatus(message: string): void {
    if (!this.statusBar) return;
    
    this.statusBar.content = message;
    this.statusBar.style.fg = 'white';
    this.statusBar.style.bg = 'green';
    this.screen!.render();
    
    setTimeout(() => {
      this.statusBar!.style.fg = 'white';
      this.statusBar!.style.bg = 'blue';
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
