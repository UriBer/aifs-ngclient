#!/usr/bin/env node

import blessed from 'blessed';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

// Simple TUI Application
class TuiApplication {
  constructor() {
    this.screen = null;
    this.leftPane = null;
    this.rightPane = null;
    this.currentPane = 'left';
    this.leftUri = os.homedir();
    this.rightUri = os.homedir();
    this.leftItems = [];
    this.rightItems = [];
    this.leftSelected = 0;
    this.rightSelected = 0;
  }

  async start() {
    try {
      console.log('Starting AIFS Commander TUI...');
      
      // Check terminal size
      const { rows, cols } = process.stdout;
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
      
      this.screen.render();
      console.log('TUI started successfully!');
      
    } catch (error) {
      console.error('Failed to start TUI:', error);
      process.exit(1);
    }
  }

  initializeScreen() {
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'AIFS Commander TUI',
      cursor: {
        artificial: true,
        shape: 'block',
        blink: true
      }
    });

    this.screen.on('resize', () => {
      this.handleResize();
    });

    this.screen.key(['C-c'], () => {
      this.quit();
    });
  }

  initializeLayout() {
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

  setupEventHandlers() {
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

  async loadDirectory(pane, uri) {
    try {
      const items = await this.listDirectory(uri);
      const paneList = pane === 'left' ? this.leftPane : this.rightPane;
      
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
      } else {
        this.rightUri = uri;
        this.rightItems = items;
      }
      
      this.updateStatus();
      
    } catch (error) {
      this.showError(`Failed to load directory: ${error.message}`);
    }
  }

  async listDirectory(uri) {
    try {
      const stats = await fs.stat(uri);
      if (!stats.isDirectory()) {
        throw new Error('Not a directory');
      }
      
      const entries = await fs.readdir(uri, { withFileTypes: true });
      const items = [];
      
      for (const entry of entries) {
        const fullPath = path.join(uri, entry.name);
        const stats = await fs.stat(fullPath);
        
        items.push({
          name: entry.name,
          isDirectory: entry.isDirectory(),
          size: stats.size,
          mtime: stats.mtime
        });
      }
      
      // Sort: directories first, then files
      items.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
      
      return items;
    } catch (error) {
      throw new Error(`Cannot read directory: ${error.message}`);
    }
  }

  async handleSelection(pane, item, index) {
    const items = pane === 'left' ? this.leftItems : this.rightItems;
    const uri = pane === 'left' ? this.leftUri : this.rightUri;
    
    if (index >= items.length) return;
    
    const selectedItem = items[index];
    if (selectedItem.isDirectory) {
      const newUri = path.join(uri, selectedItem.name);
      await this.loadDirectory(pane, newUri);
    } else {
      this.showError(`File operations not yet implemented: ${selectedItem.name}`);
    }
  }

  handleKeyPress(pane, ch, key) {
    switch (key.name) {
      case 'enter':
        this.handleSelection(pane, null, pane === 'left' ? this.leftSelected : this.rightSelected);
        break;
      case 'backspace':
        this.goToParent(pane);
        break;
    }
  }

  async goToParent(pane) {
    const uri = pane === 'left' ? this.leftUri : this.rightUri;
    const parentUri = path.dirname(uri);
    
    if (parentUri !== uri) {
      await this.loadDirectory(pane, parentUri);
    }
  }

  switchPane() {
    this.currentPane = this.currentPane === 'left' ? 'right' : 'left';
    this.setFocus(this.currentPane);
  }

  setFocus(pane) {
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
    this.screen.render();
  }

  updateStatus() {
    const leftInfo = `Left: ${this.leftUri}`;
    const rightInfo = `Right: ${this.rightUri}`;
    this.statusBar.content = `${leftInfo} | ${rightInfo} | Press F1 for help, F10 to quit`;
    this.screen.render();
  }

  showError(message) {
    this.statusBar.content = `ERROR: ${message}`;
    this.statusBar.style.fg = 'red';
    this.screen.render();
    
    setTimeout(() => {
      this.statusBar.style.fg = 'white';
      this.updateStatus();
    }, 3000);
  }

  showHelp() {
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
      this.screen.render();
    });

    helpBox.focus();
    this.screen.render();
  }

  handleResize() {
    const { width, height } = this.screen;
    
    if (width < 80 || height < 20) {
      this.statusBar.content = 'Terminal too small. Please resize to at least 80x20';
      this.statusBar.style.bg = 'red';
    } else {
      this.statusBar.content = 'AIFS Commander TUI - Press F1 for help, F10 to quit';
      this.statusBar.style.bg = 'blue';
    }
  }

  quit() {
    console.log('Shutting down TUI application');
    process.exit(0);
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Check if running in terminal
if (!process.stdout.isTTY) {
  console.error('AIFS Commander TUI requires a terminal environment');
  process.exit(1);
}

// Initialize and start TUI application
const app = new TuiApplication();
app.start().catch((error) => {
  console.error('Failed to start TUI application:', error);
  process.exit(1);
});