// UI.ts - Simplified terminal-kit based UI implementation

import pkg from 'terminal-kit';
const { terminal } = pkg;
import { FileBrowser, FileItem, PaneState } from './FileBrowser.js';

export class UI {
  private fileBrowser: FileBrowser;
  private isRunning: boolean = false;
  private modalVisible: boolean = false;
  private progressVisible: boolean = false;
  private statusMessage: string = 'AIFS Commander TUI - Press F1 for help, F10 to quit';
  private statusType: 'info' | 'success' | 'warning' | 'error' = 'info';

  constructor(fileBrowser: FileBrowser) {
    this.fileBrowser = fileBrowser;
    this.setupEventHandlers();
  }

  async initialize(): Promise<void> {
    // Initialize terminal
    terminal.fullscreen(true);
    terminal.hideCursor();
    terminal.grabInput(true);

    // Load initial data
    await this.loadInitialData();
  }

  async run(): Promise<void> {
    this.isRunning = true;
    this.render();
    
    // Main event loop
    while (this.isRunning) {
      await new Promise(resolve => setTimeout(resolve, 16)); // ~60 FPS
      this.render();
    }
  }

  private setupEventHandlers(): void {
    // File browser events
    this.fileBrowser.on('paneChanged', () => this.render());
    this.fileBrowser.on('dividerChanged', () => this.render());
    this.fileBrowser.on('directoryLoaded', () => this.render());
    this.fileBrowser.on('itemSelected', () => this.render());
    this.fileBrowser.on('selectionChanged', () => this.render());
    this.fileBrowser.on('providerChanged', () => this.render());
    this.fileBrowser.on('error', (pane: string, error: any) => {
      this.setStatus(`Error in ${pane} pane: ${error.message}`, 'error');
    });

    // Terminal events
    terminal.on('key', (name: string, matches: any, data: any) => {
      this.handleKeyPress(name, matches, data);
    });

    terminal.on('resize', (width: number, height: number) => {
      this.handleResize(width, height);
    });
  }

  private async loadInitialData(): Promise<void> {
    this.setStatus('Loading initial directories...', 'info');
    this.showProgress('Loading initial directories...');

    try {
      // Load left pane
      await this.fileBrowser.navigateTo(this.fileBrowser.getLeftPane().uri, 'left');
      
      // Load right pane
      await this.fileBrowser.navigateTo(this.fileBrowser.getRightPane().uri, 'right');

      this.hideProgress();
      this.setStatus('AIFS Commander TUI - Ready', 'success');
    } catch (error) {
      this.hideProgress();
      this.setStatus(`Error loading initial data: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  }

  private handleKeyPress(name: string, matches: any, data: any): void {
    if (this.modalVisible) {
      this.handleModalKeyPress(name, matches, data);
      return;
    }

    switch (name) {
      case 'CTRL_C':
      case 'CTRL_Q':
        this.quit();
        break;
      case 'F10':
        this.quit();
        break;
      case 'F1':
        this.showHelp();
        break;
      case 'TAB':
        this.switchPane();
        break;
      case 'UP':
        this.navigateUp();
        break;
      case 'DOWN':
        this.navigateDown();
        break;
      case 'ENTER':
        this.openItem();
        break;
      case 'BACKSPACE':
        this.navigateUpDirectory();
        break;
      case 'SPACE':
        this.toggleSelection();
        break;
      case 'LEFT':
        this.adjustDivider(-5);
        break;
      case 'RIGHT':
        this.adjustDivider(5);
        break;
      case 'CTRL_P':
        this.showProviderMenu();
        break;
      case 'CTRL_R':
        this.refreshCurrentPane();
        break;
    }
  }

  private handleModalKeyPress(name: string, matches: any, data: any): void {
    switch (name) {
      case 'y':
      case 'Y':
      case 'ENTER':
        this.hideModal();
        break;
      case 'n':
      case 'N':
      case 'ESCAPE':
        this.hideModal();
        break;
    }
  }

  private switchPane(): void {
    const currentPane = this.fileBrowser.getCurrentPane();
    this.fileBrowser.setCurrentPane(currentPane === 'left' ? 'right' : 'left');
  }

  private navigateUp(): void {
    const currentPane = this.fileBrowser.getCurrentPane();
    const paneState = currentPane === 'left' ? this.fileBrowser.getLeftPane() : this.fileBrowser.getRightPane();
    const newIndex = Math.max(0, paneState.selectedIndex - 1);
    this.fileBrowser.selectItem(newIndex);
  }

  private navigateDown(): void {
    const currentPane = this.fileBrowser.getCurrentPane();
    const paneState = currentPane === 'left' ? this.fileBrowser.getLeftPane() : this.fileBrowser.getRightPane();
    const newIndex = Math.min(paneState.items.length - 1, paneState.selectedIndex + 1);
    this.fileBrowser.selectItem(newIndex);
  }

  private async openItem(): Promise<void> {
    const currentPane = this.fileBrowser.getCurrentPane();
    const paneState = currentPane === 'left' ? this.fileBrowser.getLeftPane() : this.fileBrowser.getRightPane();
    const selectedItem = paneState.items[paneState.selectedIndex];
    
    if (selectedItem && selectedItem.isDirectory) {
      await this.fileBrowser.navigateTo(selectedItem.uri);
    }
  }

  private async navigateUpDirectory(): Promise<void> {
    await this.fileBrowser.navigateUp();
  }

  private toggleSelection(): void {
    const currentPane = this.fileBrowser.getCurrentPane();
    const paneState = currentPane === 'left' ? this.fileBrowser.getLeftPane() : this.fileBrowser.getRightPane();
    const selectedItem = paneState.items[paneState.selectedIndex];
    
    if (selectedItem) {
      this.fileBrowser.toggleSelection(selectedItem);
    }
  }

  private adjustDivider(delta: number): void {
    const currentPosition = this.fileBrowser.getDividerPosition();
    this.fileBrowser.setDividerPosition(currentPosition + delta);
  }

  private showProviderMenu(): void {
    this.showModal('Switch Provider', 'Choose provider:\n\n1. Local File System\n2. AWS S3\n3. Google Cloud Storage\n4. Azure Blob Storage\n\nPress number to select');
  }

  private async refreshCurrentPane(): Promise<void> {
    const currentPane = this.fileBrowser.getCurrentPane();
    const paneState = currentPane === 'left' ? this.fileBrowser.getLeftPane() : this.fileBrowser.getRightPane();
    await this.fileBrowser.navigateTo(paneState.uri, currentPane);
  }

  private showHelp(): void {
    this.showModal('Help', 'Keyboard shortcuts:\n\nTab: Switch panes\nArrow Keys: Navigate files\nEnter: Open directory\nBackspace: Go up directory\nSpace: Toggle selection\nF1: Help\nF10: Quit\nCtrl+Q: Quit\nCtrl+P: Switch provider\nCtrl+R: Refresh current pane');
  }

  private showModal(title: string, message: string): void {
    this.modalVisible = true;
    this.render();
  }

  private hideModal(): void {
    this.modalVisible = false;
    this.render();
  }

  private showProgress(message: string): void {
    this.progressVisible = true;
    this.render();
  }

  private hideProgress(): void {
    this.progressVisible = false;
    this.render();
  }

  private setStatus(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    this.statusMessage = message;
    this.statusType = type;
    this.render();
  }

  private handleResize(width: number, height: number): void {
    this.render();
  }

  private render(): void {
    if (!this.isRunning) return;

    // Clear screen
    terminal.clear();

    // Render main content
    this.renderMainContent();

    // Render status bar
    this.renderStatusBar();

    // Render modal if visible
    if (this.modalVisible) {
      this.renderModal();
    }

    // Render progress if visible
    if (this.progressVisible) {
      this.renderProgress();
    }
  }

  private renderMainContent(): void {
    const leftPane = this.fileBrowser.getLeftPane();
    const rightPane = this.fileBrowser.getRightPane();
    const currentPane = this.fileBrowser.getCurrentPane();
    const dividerPos = this.fileBrowser.getDividerPosition();

    // Calculate pane widths
    const leftWidth = Math.floor(terminal.width * dividerPos / 100);
    const rightWidth = terminal.width - leftWidth;

    // Render left pane
    this.renderPane(0, 0, leftWidth, terminal.height - 1, leftPane, 'left', currentPane === 'left');

    // Render right pane
    this.renderPane(leftWidth, 0, rightWidth, terminal.height - 1, rightPane, 'right', currentPane === 'right');
  }

  private renderPane(x: number, y: number, width: number, height: number, paneState: PaneState, paneName: string, isActive: boolean): void {
    // Draw border
    terminal.moveTo(x, y);
    terminal('┌' + '─'.repeat(width - 2) + '┐');
    
    for (let i = 1; i < height - 1; i++) {
      terminal.moveTo(x, y + i);
      terminal('│' + ' '.repeat(width - 2) + '│');
    }
    
    terminal.moveTo(x, y + height - 1);
    terminal('└' + '─'.repeat(width - 2) + '┘');

    // Draw header
    const headerText = `${paneName === 'left' ? 'Left' : 'Right'} Pane - ${this.getProviderIcon(paneState.provider)} ${paneState.provider}`;
    terminal.moveTo(x + 1, y);
    terminal(headerText);

    if (paneState.loading) {
      terminal.moveTo(x + 1, y + 2);
      terminal('Loading...');
      return;
    }

    if (paneState.error) {
      terminal.moveTo(x + 1, y + 2);
      terminal(`Error: ${paneState.error}`);
      return;
    }

    // Draw file list
    const startY = y + 2;
    const maxItems = height - 4;
    const startIndex = Math.max(0, paneState.selectedIndex - Math.floor(maxItems / 2));
    const endIndex = Math.min(paneState.items.length, startIndex + maxItems);

    for (let i = startIndex; i < endIndex; i++) {
      const item = paneState.items[i];
      const itemY = startY + (i - startIndex);
      const isSelected = i === paneState.selectedIndex;
      const isItemSelected = paneState.selectedItems.has(item.uri);
      
      let text = '';
      if (isItemSelected) {
        text += '✓ ';
      } else {
        text += '  ';
      }
      
      text += `${this.getFileIcon(item)} ${item.name}`;
      
      if (!item.isDirectory) {
        text += ` (${this.formatFileSize(item.size)})`;
      }

      // Truncate text to fit
      if (text.length > width - 4) {
        text = text.substring(0, width - 7) + '...';
      }

      terminal.moveTo(x + 1, itemY);
      
      if (isSelected) {
        terminal.inverse(text);
      } else if (isItemSelected) {
        terminal.green(text);
      } else {
        terminal(text);
      }
    }

    // Draw footer
    const footerText = `${paneState.items.length} items | ${paneState.selectedItems.size} selected`;
    terminal.moveTo(x + 1, y + height - 2);
    terminal(footerText);
  }

  private renderStatusBar(): void {
    const leftPane = this.fileBrowser.getLeftPane();
    const rightPane = this.fileBrowser.getRightPane();
    const currentPane = this.fileBrowser.getCurrentPane();
    
    const leftText = `Left [${this.getProviderIcon(leftPane.provider)} ${this.getProviderName(leftPane.provider)}]: ${this.formatUri(leftPane.uri, leftPane.provider)}`;
    const rightText = `Right [${this.getProviderIcon(rightPane.provider)} ${this.getProviderName(rightPane.provider)}]: ${this.formatUri(rightPane.uri, rightPane.provider)}`;
    
    terminal.moveTo(0, terminal.height - 1);
    terminal.bgGray();
    
    if (currentPane === 'left') {
      terminal.blue(leftText);
    } else {
      terminal(leftText);
    }
    
    terminal(' | ');
    
    if (currentPane === 'right') {
      terminal.blue(rightText);
    } else {
      terminal(rightText);
    }
    
    terminal(' | ');
    
    // Status message
    const statusColor = this.statusType === 'error' ? 'red' : this.statusType === 'success' ? 'green' : 'white';
    terminal[statusColor](this.statusMessage);
    
    terminal.reset();
  }

  private renderModal(): void {
    const modalWidth = Math.floor(terminal.width * 0.8);
    const modalHeight = Math.floor(terminal.height * 0.6);
    const modalX = Math.floor((terminal.width - modalWidth) / 2);
    const modalY = Math.floor((terminal.height - modalHeight) / 2);

    // Draw modal background
    for (let y = modalY; y < modalY + modalHeight; y++) {
      terminal.moveTo(modalX, y);
      terminal(' '.repeat(modalWidth));
    }

    // Draw modal border
    terminal.moveTo(modalX, modalY);
    terminal('┌' + '─'.repeat(modalWidth - 2) + '┐');
    
    for (let i = 1; i < modalHeight - 1; i++) {
      terminal.moveTo(modalX, modalY + i);
      terminal('│' + ' '.repeat(modalWidth - 2) + '│');
    }
    
    terminal.moveTo(modalX, modalY + modalHeight - 1);
    terminal('└' + '─'.repeat(modalWidth - 2) + '┘');

    // Draw title
    terminal.moveTo(modalX + 1, modalY);
    terminal.bold('Help');

    // Draw content
    const content = 'Keyboard shortcuts:\n\nTab: Switch panes\nArrow Keys: Navigate files\nEnter: Open directory\nBackspace: Go up directory\nSpace: Toggle selection\nF1: Help\nF10: Quit\nCtrl+Q: Quit\nCtrl+P: Switch provider\nCtrl+R: Refresh current pane';
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length && i < modalHeight - 4; i++) {
      terminal.moveTo(modalX + 1, modalY + 2 + i);
      terminal(lines[i]);
    }
    
    // Draw actions
    const actionsY = modalY + modalHeight - 2;
    terminal.moveTo(modalX + 1, actionsY);
    terminal.green('Y: Confirm');
    terminal(' | ');
    terminal.red('N: Cancel');
    terminal(' | ');
    terminal.gray('ESC: Cancel');
  }

  private renderProgress(): void {
    const progressWidth = Math.floor(terminal.width * 0.6);
    const progressHeight = Math.floor(terminal.height * 0.2);
    const progressX = Math.floor((terminal.width - progressWidth) / 2);
    const progressY = Math.floor((terminal.height - progressHeight) / 2);

    // Draw progress background
    for (let y = progressY; y < progressY + progressHeight; y++) {
      terminal.moveTo(progressX, y);
      terminal(' '.repeat(progressWidth));
    }

    // Draw progress border
    terminal.moveTo(progressX, progressY);
    terminal('┌' + '─'.repeat(progressWidth - 2) + '┐');
    
    for (let i = 1; i < progressHeight - 1; i++) {
      terminal.moveTo(progressX, progressY + i);
      terminal('│' + ' '.repeat(progressWidth - 2) + '│');
    }
    
    terminal.moveTo(progressX, progressY + progressHeight - 1);
    terminal('└' + '─'.repeat(progressWidth - 2) + '┘');

    // Draw progress message
    terminal.moveTo(progressX + 1, progressY);
    terminal.yellow.bold('Loading initial directories...');

    // Draw progress bar
    const barWidth = progressWidth - 4;
    const barY = progressY + Math.floor(progressHeight / 2);
    
    terminal.moveTo(progressX + 2, barY);
    terminal('[');
    terminal.moveTo(progressX + 2 + barWidth, barY);
    terminal(']');
    
    // Animated progress
    const progress = Math.floor((Date.now() / 100) % barWidth);
    for (let i = 0; i < progress; i++) {
      terminal.moveTo(progressX + 3 + i, barY);
      terminal.green('█');
    }
  }

  private getFileIcon(item: FileItem): string {
    return item.isDirectory ? '📁' : '📄';
  }

  private getProviderIcon(provider: string): string {
    switch (provider) {
      case 'file': return '📁';
      case 's3': return '☁️';
      case 'gcs': return '🌐';
      case 'az': return '🔷';
      case 'aifs': return '🤖';
      default: return '❓';
    }
  }

  private getProviderName(provider: string): string {
    switch (provider) {
      case 'file': return 'Local File System';
      case 's3': return 'AWS S3';
      case 'gcs': return 'Google Cloud Storage';
      case 'az': return 'Azure Blob Storage';
      case 'aifs': return 'AIFS Provider';
      default: return 'Unknown Provider';
    }
  }

  private formatUri(uri: string, provider: string): string {
    if (provider === 'file') {
      return uri;
    }
    const parts = uri.split('/');
    if (parts.length > 3) {
      return `${parts[0]}//${parts[2]}/.../${parts[parts.length - 1]}`;
    }
    return uri;
  }

  private formatFileSize(size: number): string {
    if (size === 0) return '';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let unitIndex = 0;
    let fileSize = size;
    
    while (fileSize >= 1024 && unitIndex < units.length - 1) {
      fileSize /= 1024;
      unitIndex++;
    }
    
    return `${fileSize.toFixed(2)} ${units[unitIndex]}`;
  }

  private quit(): void {
    this.isRunning = false;
    terminal.grabInput(false);
    terminal.fullscreen(false);
    terminal('\n\nGoodbye!\n');
    process.exit(0);
  }
}