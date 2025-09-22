/**
 * IJobEngine interface defines the contract for the job management system.
 * It handles asynchronous operations like upload, download, copy, move, and delete.
 */
export interface IJobEngine {
  /**
   * Creates a new job and adds it to the job queue.
   * 
   * @param job The job to create
   * @returns The created job instance
   */
  createJob(job: JobDefinition): Job;
  
  /**
   * Starts a job that was previously created.
   * 
   * @param jobId The ID of the job to start
   * @returns Promise that resolves when the job starts
   */
  startJob(jobId: string): Promise<void>;
  
  /**
   * Pauses a running job.
   * 
   * @param jobId The ID of the job to pause
   * @returns Promise that resolves when the job is paused
   */
  pauseJob(jobId: string): Promise<void>;
  
  /**
   * Resumes a paused job.
   * 
   * @param jobId The ID of the job to resume
   * @returns Promise that resolves when the job is resumed
   */
  resumeJob(jobId: string): Promise<void>;
  
  /**
   * Cancels a job and cleans up any partial resources.
   * 
   * @param jobId The ID of the job to cancel
   * @returns Promise that resolves when the job is cancelled
   */
  cancelJob(jobId: string): Promise<void>;
  
  /**
   * Gets the current status of a job.
   * 
   * @param jobId The ID of the job to get status for
   * @returns The current job status
   */
  getJobStatus(jobId: string): JobStatus;
  
  /**
   * Gets all jobs in the system.
   * 
   * @returns Array of all jobs
   */
  getAllJobs(): Job[];
  
  /**
   * Subscribes to job progress events.
   * 
   * @param callback Function to call when job progress changes
   * @returns Unsubscribe function
   */
  subscribeToProgress(callback: (progress: JobProgress) => void): () => void;
  
  /**
   * Sets the maximum number of concurrent jobs.
   * 
   * @param limit The maximum number of concurrent jobs
   */
  setConcurrencyLimit(limit: number): void;
  
  /**
   * Persists the current job state to storage.
   * 
   * @returns Promise that resolves when state is persisted
   */
  persistState(): Promise<void>;
  
  /**
   * Restores job state from storage.
   * 
   * @returns Promise that resolves when state is restored
   */
  restoreState(): Promise<void>;
}

/**
 * Represents a job in the system.
 */
export interface Job {
  /** Unique identifier for the job */
  id: string;
  
  /** Human-readable name of the job */
  name: string;
  
  /** Description of what the job does */
  description: string;
  
  /** The type of operation this job performs */
  type: JobType;
  
  /** Current status of the job */
  status: JobStatus;
  
  /** Progress information for the job */
  progress: JobProgress;
  
  /** Source URI or path for the operation */
  source: string;
  
  /** Destination URI or path for the operation */
  destination?: string;
  
  /** Additional options for the job */
  options?: Record<string, any>;
  
  /** Timestamp when the job was created */
  createdAt: Date;
  
  /** Timestamp when the job was started */
  startedAt?: Date;
  
  /** Timestamp when the job completed or failed */
  completedAt?: Date;
  
  /** Timestamp when the job was last updated */
  updatedAt?: Date;
  
  /** Error information if the job failed */
  error?: string;
  
  /** Result of the job if completed successfully */
  result?: any;
  
  /** Whether the job is currently running */
  current: boolean;
  
  /** Whether the job can be cancelled */
  cancelable: boolean;
  
  /** Whether the job can be paused */
  pausable: boolean;
  
  /** Whether the job can be resumed */
  resumable: boolean;
}

/**
 * Definition for creating a new job.
 */
export interface JobDefinition {
  /** The type of operation this job performs */
  type: JobType;
  
  /** Source URI or path for the operation */
  source: string;
  
  /** Destination URI or path for the operation */
  destination?: string;
  
  /** Additional options for the job */
  options?: Record<string, any>;
}

/**
 * Types of jobs supported by the system.
 */
export enum JobType {
  UPLOAD = 'upload',
  DOWNLOAD = 'download',
  COPY = 'copy',
  MOVE = 'move',
  DELETE = 'delete',
  MKDIR = 'mkdir'
}

/**
 * Possible statuses for a job.
 */
export enum JobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELED = 'canceled',
  CANCELLED = 'cancelled'
}

/**
 * Progress information for a job.
 */
export interface JobProgress {
  /** Current progress value */
  current: number;
  
  /** Total progress value */
  total: number;
  
  /** Progress message */
  message: string;
  
  /** Transfer speed in bytes per second */
  speed?: number;
  
  /** Estimated time remaining in seconds */
  estimatedTimeRemaining?: number;
}