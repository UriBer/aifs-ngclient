import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export class TuiLogger {
  private config: any;
  private logLevel: string;
  private logFile: string;
  private maxFileSize: number;
  private maxFiles: number;
  private enableConsole: boolean;
  private enableFile: boolean;

  constructor(config: any) {
    this.config = config;
    this.logLevel = config.get('logging.level', 'info');
    this.logFile = path.join(os.homedir(), '.aifs-commander', 'tui.log');
    this.maxFileSize = this.parseSize(config.get('logging.maxFileSize', '10MB'));
    this.maxFiles = config.get('logging.maxFiles', 5);
    this.enableConsole = config.get('logging.enableConsole', true);
    this.enableFile = config.get('logging.enableFile', true);
  }

  private parseSize(sizeStr: string): number {
    const units: { [key: string]: number } = {
      'B': 1,
      'KB': 1024,
      'MB': 1024 * 1024,
      'GB': 1024 * 1024 * 1024
    };
    
    const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*([A-Z]+)$/i);
    if (!match) return 10 * 1024 * 1024; // Default 10MB
    
    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    
    return value * (units[unit] || 1);
  }

  private getLogLevelNumber(level: string): number {
    const levels: { [key: string]: number } = {
      'error': 0,
      'warn': 1,
      'info': 2,
      'debug': 3,
      'trace': 4
    };
    return levels[level.toLowerCase()] || 2;
  }

  private shouldLog(level: string): boolean {
    const currentLevel = this.getLogLevelNumber(this.logLevel);
    const messageLevel = this.getLogLevelNumber(level);
    return messageLevel <= currentLevel;
  }

  private formatMessage(level: string, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const formattedArgs = args.length > 0 ? ' ' + args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ') : '';
    
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${formattedArgs}`;
  }

  private async writeToFile(message: string): Promise<void> {
    if (!this.enableFile) return;
    
    try {
      await fs.mkdir(path.dirname(this.logFile), { recursive: true });
      await fs.appendFile(this.logFile, message + '\n', 'utf8');
      
      // Check if log rotation is needed
      await this.rotateLogIfNeeded();
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  private async rotateLogIfNeeded(): Promise<void> {
    try {
      const stats = await fs.stat(this.logFile);
      if (stats.size > this.maxFileSize) {
        await this.rotateLog();
      }
    } catch (error) {
      // Log file doesn't exist or can't be accessed
    }
  }

  private async rotateLog(): Promise<void> {
    try {
      // Move existing log files
      for (let i = this.maxFiles - 1; i > 0; i--) {
        const oldFile = `${this.logFile}.${i}`;
        const newFile = `${this.logFile}.${i + 1}`;
        
        try {
          await fs.access(oldFile);
          await fs.rename(oldFile, newFile);
        } catch {
          // File doesn't exist, continue
        }
      }
      
      // Move current log to .1
      await fs.rename(this.logFile, `${this.logFile}.1`);
      
      // Create new log file
      await fs.writeFile(this.logFile, '', 'utf8');
    } catch (error) {
      console.error('Failed to rotate log file:', error);
    }
  }

  public error(message: string, ...args: any[]): void {
    if (!this.shouldLog('error')) return;
    
    const formattedMessage = this.formatMessage('error', message, ...args);
    
    if (this.enableConsole) {
      console.error(formattedMessage);
    }
    
    this.writeToFile(formattedMessage);
  }

  public warn(message: string, ...args: any[]): void {
    if (!this.shouldLog('warn')) return;
    
    const formattedMessage = this.formatMessage('warn', message, ...args);
    
    if (this.enableConsole) {
      console.warn(formattedMessage);
    }
    
    this.writeToFile(formattedMessage);
  }

  public info(message: string, ...args: any[]): void {
    if (!this.shouldLog('info')) return;
    
    const formattedMessage = this.formatMessage('info', message, ...args);
    
    if (this.enableConsole) {
      console.log(formattedMessage);
    }
    
    this.writeToFile(formattedMessage);
  }

  public debug(message: string, ...args: any[]): void {
    if (!this.shouldLog('debug')) return;
    
    const formattedMessage = this.formatMessage('debug', message, ...args);
    
    if (this.enableConsole) {
      console.log(formattedMessage);
    }
    
    this.writeToFile(formattedMessage);
  }

  public trace(message: string, ...args: any[]): void {
    if (!this.shouldLog('trace')) return;
    
    const formattedMessage = this.formatMessage('trace', message, ...args);
    
    if (this.enableConsole) {
      console.log(formattedMessage);
    }
    
    this.writeToFile(formattedMessage);
  }

  public setLevel(level: string): void {
    this.logLevel = level;
  }

  public getLogFile(): string {
    return this.logFile;
  }

  public async clearLog(): Promise<void> {
    try {
      await fs.writeFile(this.logFile, '', 'utf8');
    } catch (error) {
      this.error('Failed to clear log file:', error);
    }
  }
}
