import blessed from 'blessed';
import { TuiLogger } from './TuiLogger';
import { JobEngine } from '../main/jobs/JobEngine';
import { IObjectStore } from '../shared/interfaces/IObjectStore';
import { Obj } from '../shared/models/Obj';
import { UriUtils } from '../shared/utils/UriUtils';
import path from 'path';

interface TuiFileBrowserOptions {
  parent: blessed.Widgets.BoxElement;
  title: string;
  provider: IObjectStore;
  jobEngine: JobEngine;
  logger: TuiLogger;
}

export class TuiFileBrowser {
  private parent: blessed.Widgets.BoxElement;
  private title: string;
  private provider: IObjectStore;
  private jobEngine: JobEngine;
  private logger: TuiLogger;
  private currentUri: string = '';
  private items: Obj[] = [];
  private selectedIndex: number = 0;
  private listBox: blessed.Widgets.ListElement;
  private pathBox: blessed.Widgets.BoxElement;
  private statusBox: blessed.Widgets.BoxElement;

  constructor(options: TuiFileBrowserOptions) {
    this.parent = options.parent;
    this.title = options.title;
    this.provider = options.provider;
    this.jobEngine = options.jobEngine;
    this.logger = options.logger;

    this.createUI();
    this.setupEventHandlers();
  }

  private createUI(): void {
    // Create title bar
    const titleBar = blessed.box({
      parent: this.parent,
      top: 0,
      left: 0,
      width: '100%',
      height: 1,
      content: this.title,
      style: {
        bg: 'blue',
        fg: 'white',
        bold: true
      }
    });

    // Create path display
    this.pathBox = blessed.box({
      parent: this.parent,
      top: 1,
      left: 0,
      width: '100%',
      height: 1,
      content: '',
      style: {
        bg: 'black',
        fg: 'white'
      }
    });

    // Create file list
    this.listBox = blessed.list({
      parent: this.parent,
      top: 2,
      left: 0,
      width: '100%',
      height: '100%-3',
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: 'white'
        },
        selected: {
          bg: 'blue',
          fg: 'white'
        }
      },
      keys: true,
      vi: true,
      mouse: true,
      scrollable: true,
      scrollbar: {
        ch: ' ',
        track: {
          bg: 'black'
        },
        style: {
          inverse: true
        }
      }
    });

    // Create status bar
    this.statusBox = blessed.box({
      parent: this.parent,
      top: '100%-1',
      left: 0,
      width: '100%',
      height: 1,
      content: '',
      style: {
        bg: 'black',
        fg: 'white'
      }
    });
  }

  private setupEventHandlers(): void {
    this.listBox.on('select', (item, index) => {
      this.selectedIndex = index;
      this.updateStatus();
    });

    this.listBox.on('keypress', (ch, key) => {
      this.handleKeyPress(ch, key);
    });

    this.listBox.on('click', (data) => {
      this.selectedIndex = data.y - 2; // Adjust for title and path bars
      this.updateStatus();
    });
  }

  private handleKeyPress(ch: string, key: any): void {
    switch (key.name) {
      case 'enter':
        this.openSelectedItem();
        break;
      case 'backspace':
        this.goToParent();
        break;
      case 'up':
        if (this.selectedIndex > 0) {
          this.selectedIndex--;
          this.updateSelection();
        }
        break;
      case 'down':
        if (this.selectedIndex < this.items.length - 1) {
          this.selectedIndex++;
          this.updateSelection();
        }
        break;
      case 'home':
        this.selectedIndex = 0;
        this.updateSelection();
        break;
      case 'end':
        this.selectedIndex = this.items.length - 1;
        this.updateSelection();
        break;
      case 'pageup':
        this.selectedIndex = Math.max(0, this.selectedIndex - 10);
        this.updateSelection();
        break;
      case 'pagedown':
        this.selectedIndex = Math.min(this.items.length - 1, this.selectedIndex + 10);
        this.updateSelection();
        break;
    }
  }

  private updateSelection(): void {
    this.listBox.select(this.selectedIndex);
    this.updateStatus();
  }

  private updateStatus(): void {
    if (this.items.length > 0 && this.selectedIndex < this.items.length) {
      const item = this.items[this.selectedIndex];
      const size = item.size ? this.formatFileSize(item.size) : '';
      const type = item.isDirectory ? 'DIR' : 'FILE';
      this.statusBox.content = `${type} ${size} ${item.name}`;
    } else {
      this.statusBox.content = '';
    }
    this.parent.screen.render();
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  public async navigateTo(uri: string): Promise<void> {
    try {
      this.logger.info(`Navigating to: ${uri}`);
      this.currentUri = uri;
      this.pathBox.content = uri;
      
      // Load items from provider
      const result = await this.provider.list(uri);
      this.items = result.items;
      
      // Update list display
      this.updateList();
      
      // Reset selection
      this.selectedIndex = 0;
      this.updateSelection();
      
      this.logger.info(`Loaded ${this.items.length} items from ${uri}`);
    } catch (error) {
      this.logger.error(`Failed to navigate to ${uri}:`, error);
      this.showError(`Failed to load directory: ${error.message}`);
    }
  }

  private updateList(): void {
    this.listBox.clearItems();
    
    // Add parent directory entry if not at root
    if (this.currentUri !== '/' && this.currentUri !== '') {
      this.listBox.addItem('.. (parent directory)');
    }
    
    // Add directory entries first
    const directories = this.items.filter(item => item.isDirectory);
    for (const dir of directories) {
      this.listBox.addItem(`📁 ${dir.name}/`);
    }
    
    // Add file entries
    const files = this.items.filter(item => !item.isDirectory);
    for (const file of files) {
      const size = file.size ? this.formatFileSize(file.size) : '';
      this.listBox.addItem(`📄 ${file.name} (${size})`);
    }
  }

  private async openSelectedItem(): Promise<void> {
    if (this.items.length === 0) return;
    
    const item = this.items[this.selectedIndex];
    
    if (item.isDirectory) {
      // Navigate to directory
      const newUri = UriUtils.join(this.currentUri, item.name);
      await this.navigateTo(newUri);
    } else {
      // Handle file selection
      this.logger.info(`Selected file: ${item.name}`);
      this.showError(`File operations not yet implemented: ${item.name}`);
    }
  }

  private async goToParent(): Promise<void> {
    const parentUri = UriUtils.getParent(this.currentUri);
    if (parentUri !== this.currentUri) {
      await this.navigateTo(parentUri);
    }
  }

  private showError(message: string): void {
    this.statusBox.content = `ERROR: ${message}`;
    this.statusBox.style.fg = 'red';
    this.parent.screen.render();
    
    // Reset error display after 3 seconds
    setTimeout(() => {
      this.statusBox.style.fg = 'white';
      this.updateStatus();
    }, 3000);
  }

  public focus(): void {
    this.listBox.focus();
  }

  public blur(): void {
    this.listBox.blur();
  }

  public getCurrentUri(): string {
    return this.currentUri;
  }

  public getSelectedItem(): Obj | null {
    if (this.items.length > 0 && this.selectedIndex < this.items.length) {
      return this.items[this.selectedIndex];
    }
    return null;
  }
}
