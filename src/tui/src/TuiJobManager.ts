import blessed from 'blessed';
import { TuiLogger } from './TuiLogger';
import { JobEngine } from '../main/jobs/JobEngine';
import { Job } from '../shared/interfaces/IJobEngine';

interface TuiJobManagerOptions {
  parent: blessed.Widgets.BoxElement;
  jobEngine: JobEngine;
  logger: TuiLogger;
}

export class TuiJobManager {
  private parent: blessed.Widgets.BoxElement;
  private jobEngine: JobEngine;
  private logger: TuiLogger;
  private jobList: blessed.Widgets.ListElement;
  private statusBox: blessed.Widgets.BoxElement;
  private refreshInterval: NodeJS.Timeout | null = null;

  constructor(options: TuiJobManagerOptions) {
    this.parent = options.parent;
    this.jobEngine = options.jobEngine;
    this.logger = options.logger;

    this.createUI();
    this.setupEventHandlers();
    this.startRefresh();
  }

  private createUI(): void {
    // Create title bar
    const titleBar = blessed.box({
      parent: this.parent,
      top: 0,
      left: 0,
      width: '100%',
      height: 1,
      content: 'Job Manager',
      style: {
        bg: 'yellow',
        fg: 'black',
        bold: true
      }
    });

    // Create job list
    this.jobList = blessed.list({
      parent: this.parent,
      top: 1,
      left: 0,
      width: '100%',
      height: '100%-2',
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
      content: 'Press C to cancel selected job, R to retry failed job',
      style: {
        bg: 'black',
        fg: 'white'
      }
    });
  }

  private setupEventHandlers(): void {
    this.jobList.on('keypress', (ch, key) => {
      this.handleKeyPress(ch, key);
    });

    this.jobList.on('select', (item, index) => {
      this.updateStatus();
    });
  }

  private handleKeyPress(ch: string, key: any): void {
    switch (key.name) {
      case 'c':
        this.cancelSelectedJob();
        break;
      case 'r':
        this.retrySelectedJob();
        break;
      case 'escape':
        this.hide();
        break;
    }
  }

  private async cancelSelectedJob(): Promise<void> {
    const selectedIndex = this.jobList.selected;
    if (selectedIndex >= 0 && selectedIndex < this.jobList.items.length) {
      const jobId = this.getJobIdFromIndex(selectedIndex);
      if (jobId) {
        try {
          await this.jobEngine.cancelJob(jobId);
          this.logger.info(`Cancelled job: ${jobId}`);
          this.refreshJobs();
        } catch (error) {
          this.logger.error(`Failed to cancel job ${jobId}:`, error);
        }
      }
    }
  }

  private async retrySelectedJob(): Promise<void> {
    const selectedIndex = this.jobList.selected;
    if (selectedIndex >= 0 && selectedIndex < this.jobList.items.length) {
      const jobId = this.getJobIdFromIndex(selectedIndex);
      if (jobId) {
        try {
          const job = this.jobEngine.getJob(jobId);
          if (job && job.status === 'FAILED') {
            await this.jobEngine.startJob(jobId);
            this.logger.info(`Retrying job: ${jobId}`);
            this.refreshJobs();
          }
        } catch (error) {
          this.logger.error(`Failed to retry job ${jobId}:`, error);
        }
      }
    }
  }

  private getJobIdFromIndex(index: number): string | null {
    if (index >= 0 && index < this.jobList.items.length) {
      const item = this.jobList.items[index];
      const content = item.getContent();
      // Extract job ID from display text
      const match = content.match(/\[([a-f0-9-]+)\]/);
      return match ? match[1] : null;
    }
    return null;
  }

  private updateStatus(): void {
    const selectedIndex = this.jobList.selected;
    if (selectedIndex >= 0 && selectedIndex < this.jobList.items.length) {
      const jobId = this.getJobIdFromIndex(selectedIndex);
      if (jobId) {
        const job = this.jobEngine.getJob(jobId);
        if (job) {
          this.statusBox.content = `Job: ${job.type} - ${job.status} - ${job.progress?.message || 'No progress info'}`;
        }
      }
    } else {
      this.statusBox.content = 'Press C to cancel selected job, R to retry failed job';
    }
    this.parent.screen.render();
  }

  private startRefresh(): void {
    this.refreshInterval = setInterval(() => {
      this.refreshJobs();
    }, 1000); // Refresh every second
  }

  private stopRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  private async refreshJobs(): Promise<void> {
    try {
      const jobs = this.jobEngine.getAllJobs();
      this.jobList.clearItems();
      
      if (jobs.length === 0) {
        this.jobList.addItem('No active jobs');
        return;
      }

      // Sort jobs by creation time (newest first)
      const sortedJobs = jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      for (const job of sortedJobs) {
        const status = this.getStatusIcon(job.status);
        const progress = job.progress ? ` (${job.progress.percentage || 0}%)` : '';
        const time = this.formatTime(job.createdAt);
        this.jobList.addItem(`${status} [${job.id.substring(0, 8)}] ${job.type} - ${job.status}${progress} (${time})`);
      }
      
      this.updateStatus();
    } catch (error) {
      this.logger.error('Failed to refresh jobs:', error);
    }
  }

  private getStatusIcon(status: string): string {
    switch (status) {
      case 'PENDING': return '⏳';
      case 'RUNNING': return '🔄';
      case 'PAUSED': return '⏸️';
      case 'COMPLETED': return '✅';
      case 'FAILED': return '❌';
      case 'CANCELED': return '🚫';
      default: return '❓';
    }
  }

  private formatTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'now';
  }

  public show(): void {
    this.parent.hidden = false;
    this.refreshJobs();
    this.jobList.focus();
    this.parent.screen.render();
  }

  public hide(): void {
    this.parent.hidden = true;
    this.parent.screen.render();
  }

  public toggle(): void {
    if (this.parent.hidden) {
      this.show();
    } else {
      this.hide();
    }
  }

  public destroy(): void {
    this.stopRefresh();
  }
}
