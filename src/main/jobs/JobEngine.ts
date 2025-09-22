import { IJobEngine, Job, JobDefinition, JobStatus, JobType, JobProgress } from '../../shared/interfaces/IJobEngine';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const mkdir = promisify(fs.mkdir);

/**
 * Implementation of the IJobEngine interface for managing asynchronous operations.
 */
export class JobEngine implements IJobEngine {
  private jobs: Map<string, Job> = new Map();
  private runningJobs: Set<string> = new Set();
  private eventEmitter: EventEmitter = new EventEmitter();
  private maxConcurrentJobs: number;
  private persistencePath?: string;
  
  /**
   * Creates a new JobEngine instance.
   * 
   * @param options Configuration options for the job engine
   */
  constructor(options?: {
    maxConcurrentJobs?: number;
    persistencePath?: string;
  }) {
    this.maxConcurrentJobs = options?.maxConcurrentJobs || 5;
    this.persistencePath = options?.persistencePath;
    
    // Initialize persistence directory if specified
    if (this.persistencePath) {
      this.initPersistence().catch(err => {
        console.error('Failed to initialize job persistence:', err);
      });
    }
  }
  
  /**
   * Initializes the persistence directory.
   */
  private async initPersistence(): Promise<void> {
    if (!this.persistencePath) return;
    
    try {
      await mkdir(this.persistencePath, { recursive: true });
      await this.loadPersistedJobs();
    } catch (error) {
      console.error('Error initializing persistence directory:', error);
      throw error;
    }
  }
  
  /**
   * Loads persisted jobs from disk.
   */
  private async loadPersistedJobs(): Promise<void> {
    if (!this.persistencePath) return;
    
    try {
      const jobsFile = path.join(this.persistencePath, 'jobs.json');
      
      // Check if the file exists
      if (!fs.existsSync(jobsFile)) return;
      
      const data = await readFile(jobsFile, 'utf8');
      const jobs: Job[] = JSON.parse(data);
      
      // Restore jobs to the map
      for (const job of jobs) {
        // Only restore jobs that are not completed or failed
        if (job.status !== JobStatus.COMPLETED && job.status !== JobStatus.FAILED) {
          // Mark interrupted jobs as failed
          if (job.status === JobStatus.RUNNING) {
            job.status = JobStatus.FAILED;
            job.error = 'Job was interrupted';
          }
        }
        
        this.jobs.set(job.id, job);
      }
    } catch (error) {
      console.error('Error loading persisted jobs:', error);
    }
  }
  
  /**
   * Persists the current jobs to disk.
   */
  private async persistJobs(): Promise<void> {
    if (!this.persistencePath) return;
    
    try {
      const jobsFile = path.join(this.persistencePath, 'jobs.json');
      const jobsArray = Array.from(this.jobs.values());
      await writeFile(jobsFile, JSON.stringify(jobsArray, null, 2), 'utf8');
    } catch (error) {
      console.error('Error persisting jobs:', error);
    }
  }
  
  /**
   * Creates a new job.
   * 
   * @param definition The job definition
   * @returns The created job
   */
  createJob(definition: JobDefinition): Job {
    const id = this.generateJobId();
    const job: Job = {
      id,
      type: definition.type,
      name: this.getJobName(definition),
      description: this.getJobDescription(definition),
      status: JobStatus.PENDING,
      progress: {
        current: 0,
        total: 100,
        message: 'Pending...'
      },
      source: definition.source,
      destination: definition.destination,
      options: definition.options,
      createdAt: new Date(),
      current: false,
      cancelable: true,
      pausable: true,
      resumable: false
    };
    
    this.jobs.set(id, job);
    this.persistJobs();
    this.eventEmitter.emit('job:created', job);
    
    // Try to start the job immediately if possible
    this.processQueue();
    
    return job;
  }
  
  /**
   * Generates a unique job ID.
   * 
   * @returns A unique job ID
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Generates a human-readable name for a job based on its definition.
   * 
   * @param definition The job definition
   * @returns A human-readable job name
   */
  private getJobName(definition: JobDefinition): string {
    const typeMap: Record<JobType, string> = {
      [JobType.UPLOAD]: 'Upload',
      [JobType.DOWNLOAD]: 'Download',
      [JobType.COPY]: 'Copy',
      [JobType.MOVE]: 'Move',
      [JobType.DELETE]: 'Delete',
      [JobType.MKDIR]: 'Create Directory'
    };
    
    const actionName = typeMap[definition.type] || definition.type;
    const sourceName = this.getFileNameFromPath(definition.source);
    
    return `${actionName} ${sourceName}`;
  }
  
  /**
   * Generates a description for a job based on its definition.
   * 
   * @param definition The job definition
   * @returns A job description
   */
  private getJobDescription(definition: JobDefinition): string {
    switch (definition.type) {
      case JobType.UPLOAD:
        return `Uploading ${this.getFileNameFromPath(definition.source)} to ${definition.destination}`;
      case JobType.DOWNLOAD:
        return `Downloading ${this.getFileNameFromPath(definition.source)} to ${definition.destination}`;
      case JobType.COPY:
        return `Copying ${this.getFileNameFromPath(definition.source)} to ${definition.destination}`;
      case JobType.MOVE:
        return `Moving ${this.getFileNameFromPath(definition.source)} to ${definition.destination}`;
      case JobType.DELETE:
        return `Deleting ${this.getFileNameFromPath(definition.source)}`;
      case JobType.MKDIR:
        return `Creating directory ${definition.source}`;
      default:
        return `${definition.type} operation on ${this.getFileNameFromPath(definition.source)}`;
    }
  }
  
  /**
   * Extracts the file name from a path.
   * 
   * @param filePath The file path
   * @returns The file name
   */
  private getFileNameFromPath(filePath: string): string {
    if (!filePath) return 'Unknown';
    
    // Handle URI-style paths
    if (filePath.includes('://')) {
      const parts = filePath.split('/');
      return parts[parts.length - 1] || 'Unknown';
    }
    
    // Handle regular file paths
    return path.basename(filePath) || 'Unknown';
  }
  
  /**
   * Processes the job queue, starting jobs if possible.
   */
  private processQueue(): void {
    // Check if we can start more jobs
    if (this.runningJobs.size >= this.maxConcurrentJobs) return;
    
    // Find pending jobs
    const pendingJobs = Array.from(this.jobs.values())
      .filter(job => job.status === JobStatus.PENDING)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    
    // Start jobs until we reach the concurrency limit
    for (const job of pendingJobs) {
      if (this.runningJobs.size >= this.maxConcurrentJobs) break;
      
      this.startJob(job.id);
    }
  }
  
  /**
   * Starts a job with the given ID.
   * 
   * @param jobId The ID of the job to start
   * @returns Promise that resolves when the job starts
   */
  async startJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== JobStatus.PENDING) {
      throw new Error(`Job ${jobId} not found or not pending`);
    }
    
    // Update job status
    job.status = JobStatus.RUNNING;
    job.startedAt = new Date();
    job.current = true;
    job.progress = {
      current: 0,
      total: 100,
      message: 'Starting...'
    };
    
    this.runningJobs.add(jobId);
    this.persistJobs();
    this.eventEmitter.emit('job:started', job);
  }
  
  /**
   * Updates the progress of a job.
   * 
   * @param jobId The ID of the job to update
   * @param progress The progress update
   * @returns True if the job was updated, false otherwise
   */
  updateJobProgress(jobId: string, progress: Partial<JobProgress>): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== JobStatus.RUNNING) return false;
    
    // Update job progress
    job.progress = {
      ...job.progress,
      ...progress
    };
    job.updatedAt = new Date();
    
    this.persistJobs();
    this.eventEmitter.emit('job:progress', job);
    
    return true;
  }
  
  /**
   * Completes a job with the given result.
   * 
   * @param jobId The ID of the job to complete
   * @param result The job result
   * @returns True if the job was completed, false otherwise
   */
  completeJob(jobId: string, result?: any): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== JobStatus.RUNNING) return false;
    
    // Update job status
    job.status = JobStatus.COMPLETED;
    job.updatedAt = new Date();
    job.completedAt = new Date();
    job.result = result;
    job.progress = { current: 100, total: 100, message: 'Completed' };
    
    this.runningJobs.delete(jobId);
    this.persistJobs();
    this.eventEmitter.emit('job:completed', job);
    
    // Process the queue to start any pending jobs
    this.processQueue();
    
    return true;
  }
  
  /**
   * Fails a job with the given error.
   * 
   * @param jobId The ID of the job to fail
   * @param error The error message or object
   * @returns True if the job was failed, false otherwise
   */
  failJob(jobId: string, error: string | Error): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== JobStatus.RUNNING) return false;
    
    // Update job status
    job.status = JobStatus.FAILED;
    job.updatedAt = new Date();
    job.completedAt = new Date();
    job.error = error instanceof Error ? error.message : error;
    
    this.runningJobs.delete(jobId);
    this.persistJobs();
    this.eventEmitter.emit('job:failed', job);
    
    // Process the queue to start any pending jobs
    this.processQueue();
    
    return true;
  }
  
  /**
   * Pauses a running job.
   * 
   * @param jobId The ID of the job to pause
   * @returns Promise that resolves when the job is paused
   */
  async pauseJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== JobStatus.RUNNING) {
      throw new Error(`Job ${jobId} not found or not running`);
    }
    
    job.status = JobStatus.PAUSED;
    job.updatedAt = new Date();
    this.runningJobs.delete(jobId);
    this.persistJobs();
    this.eventEmitter.emit('job:paused', job);
  }
  
  /**
   * Resumes a paused job.
   * 
   * @param jobId The ID of the job to resume
   * @returns Promise that resolves when the job is resumed
   */
  async resumeJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== JobStatus.PAUSED) {
      throw new Error(`Job ${jobId} not found or not paused`);
    }
    
    job.status = JobStatus.RUNNING;
    job.updatedAt = new Date();
    this.runningJobs.add(jobId);
    this.persistJobs();
    this.eventEmitter.emit('job:resumed', job);
  }
  
  /**
   * Cancels a job.
   * 
   * @param jobId The ID of the job to cancel
   * @returns Promise that resolves when the job is cancelled
   */
  async cancelJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job || (job.status !== JobStatus.PENDING && job.status !== JobStatus.RUNNING)) {
      throw new Error(`Job ${jobId} not found or cannot be cancelled`);
    }
    if (!job.cancelable) {
      throw new Error(`Job ${jobId} cannot be cancelled`);
    }
    
    // Check if job was running before canceling
    const wasRunning = job.status === JobStatus.RUNNING;
    
    // Update job status
    job.status = JobStatus.CANCELED;
    job.updatedAt = new Date();
    job.completedAt = new Date();
    
    if (wasRunning) {
      this.runningJobs.delete(jobId);
    }
    
    this.persistJobs();
    this.eventEmitter.emit('job:canceled', job);
    
    // Process the queue to start any pending jobs
    this.processQueue();
  }
  
  /**
   * Gets a job by ID.
   * 
   * @param jobId The ID of the job to get
   * @returns The job, or undefined if not found
   */
  getJob(jobId: string): Job | undefined {
    return this.jobs.get(jobId);
  }
  
  /**
   * Gets the current status of a job.
   * 
   * @param jobId The ID of the job to get status for
   * @returns The current job status
   */
  getJobStatus(jobId: string): JobStatus {
    const job = this.jobs.get(jobId);
    return job ? job.status : JobStatus.PENDING;
  }
  
  /**
   * Gets all jobs in the system.
   * 
   * @returns Array of all jobs
   */
  getAllJobs(): Job[] {
    return Array.from(this.jobs.values());
  }
  
  /**
   * Subscribes to job progress events.
   * 
   * @param callback Function to call when job progress changes
   * @returns Unsubscribe function
   */
  subscribeToProgress(callback: (progress: JobProgress) => void): () => void {
    const listener = (job: Job) => callback(job.progress);
    this.eventEmitter.on('job:progress', listener);
    return () => this.eventEmitter.off('job:progress', listener);
  }
  
  /**
   * Sets the maximum number of concurrent jobs.
   * 
   * @param limit The maximum number of concurrent jobs
   */
  setConcurrencyLimit(limit: number): void {
    this.maxConcurrentJobs = limit;
    this.processQueue();
  }
  
  /**
   * Persists the current job state to storage.
   * 
   * @returns Promise that resolves when state is persisted
   */
  async persistState(): Promise<void> {
    await this.persistJobs();
  }
  
  /**
   * Restores job state from storage.
   * 
   * @returns Promise that resolves when state is restored
   */
  async restoreState(): Promise<void> {
    await this.loadPersistedJobs();
  }
  
  /**
   * Lists all jobs, optionally filtered by status.
   * 
   * @param filter Optional filter criteria
   * @returns Array of jobs matching the filter
   */
  listJobs(filter?: {
    status?: JobStatus;
    type?: JobType;
    limit?: number;
    offset?: number;
  }): Job[] {
    let jobs = Array.from(this.jobs.values());
    
    // Apply status filter
    if (filter?.status !== undefined) {
      jobs = jobs.filter(job => job.status === filter.status);
    }
    
    // Apply type filter
    if (filter?.type !== undefined) {
      jobs = jobs.filter(job => job.type === filter.type);
    }
    
    // Sort by creation time (newest first)
    jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    // Apply pagination
    if (filter?.offset !== undefined || filter?.limit !== undefined) {
      const offset = filter?.offset || 0;
      const limit = filter?.limit || jobs.length;
      jobs = jobs.slice(offset, offset + limit);
    }
    
    return jobs;
  }
  
  /**
   * Clears completed, failed, or canceled jobs.
   * 
   * @param olderThan Optional date to only clear jobs older than this date
   * @returns The number of jobs cleared
   */
  clearFinishedJobs(olderThan?: Date): number {
    let count = 0;
    const finishedStatuses = [JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELED];
    
    for (const [id, job] of this.jobs.entries()) {
      if (finishedStatuses.includes(job.status)) {
        if (!olderThan || (job.updatedAt && job.updatedAt < olderThan)) {
          this.jobs.delete(id);
          count++;
        }
      }
    }
    
    if (count > 0) {
      this.persistJobs();
    }
    
    return count;
  }
  
  /**
   * Sets the maximum number of concurrent jobs.
   * 
   * @param max The maximum number of concurrent jobs
   */
  setMaxConcurrentJobs(max: number): void {
    this.maxConcurrentJobs = max;
    this.processQueue(); // Try to start more jobs if the limit was increased
  }
  
  /**
   * Gets the current number of running jobs.
   * 
   * @returns The number of running jobs
   */
  getRunningJobCount(): number {
    return this.runningJobs.size;
  }
  
  /**
   * Gets the maximum number of concurrent jobs.
   * 
   * @returns The maximum number of concurrent jobs
   */
  getMaxConcurrentJobs(): number {
    return this.maxConcurrentJobs;
  }
  
  /**
   * Subscribes to job events.
   * 
   * @param event The event to subscribe to
   * @param listener The event listener
   */
  on(event: 'job:created' | 'job:started' | 'job:progress' | 'job:completed' | 'job:failed' | 'job:canceled', listener: (job: Job) => void): void {
    this.eventEmitter.on(event, listener);
  }
  
  /**
   * Unsubscribes from job events.
   * 
   * @param event The event to unsubscribe from
   * @param listener The event listener to remove
   */
  off(event: 'job:created' | 'job:started' | 'job:progress' | 'job:completed' | 'job:failed' | 'job:canceled', listener: (job: Job) => void): void {
    this.eventEmitter.off(event, listener);
  }
}