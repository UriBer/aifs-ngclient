import blessed from 'blessed';
import { TuiLayout } from './TuiLayout';
import { TuiFileBrowser } from './TuiFileBrowser';
import { TuiJobManager } from './TuiJobManager';
import { TuiConfig } from './TuiConfig';
import { TuiLogger } from './TuiLogger';
import { FileProvider } from '../main/providers/FileProvider';
import { JobEngine } from '../main/jobs/JobEngine';
import path from 'path';
import os from 'os';

export class TuiApplication {
  private screen: blessed.Widgets.Screen;
  private layout: TuiLayout;
  private leftPane: TuiFileBrowser;
  private rightPane: TuiFileBrowser;
  private jobManager: TuiJobManager;
  private config: TuiConfig;
  private logger: TuiLogger;
  private jobEngine: JobEngine;
  private providers: Map<string, any> = new Map();
  private currentPane: 'left' | 'right' = 'left';

  constructor() {
    this.config = new TuiConfig();
    this.logger = new TuiLogger(this.config);
    this.jobEngine = new JobEngine({
      maxConcurrentJobs: this.config.get('performance.maxConcurrentJobs', 5),
      persistencePath: path.join(os.homedir(), '.aifs-commander', 'jobs')
    });
    
    this.initializeProviders();
    this.initializeScreen();
    this.initializeLayout();
    this.setupEventHandlers();
  }

  private initializeProviders(): void {
    // Initialize file system provider
    const fileProvider = new FileProvider();
    this.providers.set('file', fileProvider);
    
    // TODO: Initialize other providers (S3, etc.) in future phases
    this.logger.info('Initialized providers: file');
  }

  private initializeScreen(): void {
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'AIFS Commander TUI',
      cursor: {
        artificial: true,
        shape: 'block',
        blink: true
      },
      debug: process.env.NODE_ENV === 'development'
    });

    // Handle terminal resize
    this.screen.on('resize', () => {
      this.layout.resize();
    });

    // Handle Ctrl+C
    this.screen.key(['C-c'], () => {
      this.quit();
    });
  }

  private initializeLayout(): void {
    this.layout = new TuiLayout(this.screen);
    
    // Create left pane
    this.leftPane = new TuiFileBrowser({
      parent: this.layout.getLeftPane(),
      title: 'Left Pane',
      provider: this.providers.get('file'),
      jobEngine: this.jobEngine,
      logger: this.logger
    });

    // Create right pane
    this.rightPane = new TuiFileBrowser({
      parent: this.layout.getRightPane(),
      title: 'Right Pane',
      provider: this.providers.get('file'),
      jobEngine: this.jobEngine,
      logger: this.logger
    });

    // Create job manager
    this.jobManager = new TuiJobManager({
      parent: this.layout.getJobPanel(),
      jobEngine: this.jobEngine,
      logger: this.logger
    });

    // Set initial focus
    this.setFocus('left');
  }

  private setupEventHandlers(): void {
    // Tab key to switch between panes
    this.screen.key(['tab'], () => {
      this.switchPane();
    });

    // F1 for help
    this.screen.key(['f1'], () => {
      this.showHelp();
    });

    // F2 for configuration
    this.screen.key(['f2'], () => {
      this.showConfig();
    });

    // F3 for jobs
    this.screen.key(['f3'], () => {
      this.toggleJobPanel();
    });

    // F10 to quit
    this.screen.key(['f10'], () => {
      this.quit();
    });
  }

  private switchPane(): void {
    this.currentPane = this.currentPane === 'left' ? 'right' : 'left';
    this.setFocus(this.currentPane);
  }

  private setFocus(pane: 'left' | 'right'): void {
    if (pane === 'left') {
      this.leftPane.focus();
      this.rightPane.blur();
    } else {
      this.rightPane.focus();
      this.leftPane.blur();
    }
    this.currentPane = pane;
    this.screen.render();
  }

  private showHelp(): void {
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
  F2           - Configuration
  F3           - Toggle job panel
  F10          - Quit

Jobs:
  Ctrl+J       - Show job manager
  Ctrl+C       - Cancel selected job
  Ctrl+R       - Retry failed job

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

  private showConfig(): void {
    // TODO: Implement configuration dialog
    this.logger.info('Configuration dialog not yet implemented');
  }

  private toggleJobPanel(): void {
    this.layout.toggleJobPanel();
    this.screen.render();
  }

  private quit(): void {
    this.logger.info('Shutting down TUI application');
    this.jobEngine.persistState();
    process.exit(0);
  }

  public async start(): Promise<void> {
    try {
      this.logger.info('Starting AIFS Commander TUI');
      
      // Load initial directories
      const homeDir = os.homedir();
      await this.leftPane.navigateTo(homeDir);
      await this.rightPane.navigateTo(homeDir);
      
      // Render the screen
      this.screen.render();
      
      this.logger.info('TUI application started successfully');
    } catch (error) {
      this.logger.error('Failed to start TUI application:', error);
      throw error;
    }
  }
}
