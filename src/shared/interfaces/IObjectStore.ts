/**
 * IObjectStore interface defines the common operations that all storage providers must implement.
 * This interface is the core abstraction for the Commander client, allowing uniform access to
 * different storage backends (file system, S3, GCS, Azure, AIFS).
 */
export interface IObjectStore {
  /**
   * Returns the URI scheme for this provider.
   */
  scheme(): 'file' | 's3' | 'gcs' | 'az' | 'aifs' | 'bigquery' | 'redshift' | 'synapse' | 'autonomous' | 'snowflake' | 'databricks' | 'dataform' | 'dbt' | 'composer' | 'datafactory' | 'dataflow' | 'prefect' | 'dagster' | 'databricks-workflows';

  /**
   * Lists objects and pseudo-directories at the specified URI.
   * 
   * @param uri The URI to list objects from
   * @param opts Options for listing (prefix, delimiter, pagination)
   * @returns Promise resolving to a list of objects and optional next page token
   */
  list(uri: string, opts?: {
    prefix?: string;
    delimiter?: string;
    pageToken?: string;
    pageSize?: number;
  }): Promise<{ items: Obj[]; nextPageToken?: string }>;

  /**
   * Returns metadata for a single object.
   * 
   * @param uri The URI of the object to get metadata for
   * @returns Promise resolving to the object metadata
   */
  stat(uri: string): Promise<Obj>;

  /**
   * Downloads an object to a local path.
   * 
   * @param uri The URI of the object to download
   * @param destPath The local file path to download to
   * @returns Promise that resolves when download completes
   */
  get(uri: string, destPath: string): Promise<void>;

  /**
   * Uploads a local file to the provider.
   * 
   * @param srcPath The local file path to upload
   * @param destUri The destination URI to upload to
   * @param opts Optional parameters (content type, metadata)
   * @returns Promise resolving to the uploaded object metadata
   */
  put(srcPath: string, destUri: string, opts?: {
    contentType?: string;
    metadata?: Record<string, string>;
  }): Promise<Obj>;

  /**
   * Deletes an object or directory.
   * 
   * @param uri The URI of the object or directory to delete
   * @param recursive If true, recursively delete all objects in a directory
   * @returns Promise that resolves when deletion completes
   */
  delete(uri: string, recursive?: boolean): Promise<void>;

  /**
   * Performs a server-side copy when source and destination share the same provider.
   * 
   * @param srcUri The source URI to copy from
   * @param destUri The destination URI to copy to
   * @returns Promise resolving to the copied object metadata
   */
  copy(srcUri: string, destUri: string): Promise<Obj>;

  /**
   * Moves an object from source to destination.
   * Default implementation: copy then delete.
   * 
   * @param srcUri The source URI to move from
   * @param destUri The destination URI to move to
   * @returns Promise resolving to the moved object metadata
   */
  move(srcUri: string, destUri: string): Promise<Obj>;

  /**
   * Creates a directory if the provider supports it.
   * For providers without true directories (S3/GCS), creates a zero-byte object with trailing /.
   * 
   * @param uri The URI of the directory to create
   * @returns Promise that resolves when directory creation completes
   */
  mkdir(uri: string): Promise<void>;

  /**
   * Checks if an object or directory exists.
   * 
   * @param uri The URI to check existence for
   * @returns Promise resolving to true if the object exists, false otherwise
   */
  exists(uri: string): Promise<boolean>;
}

/**
 * Obj represents a file or directory in a storage provider.
 */
export interface Obj {
  /** The full URI of the object */
  uri: string;
  
  /** The name of the object (last path segment) */
  name: string;
  
  /** The size of the object in bytes, if known */
  size?: number;
  
  /** The last modified timestamp, if available */
  lastModified?: Date;
  
  /** ETag or checksum if available */
  etag?: string;
  
  /** BLAKE3 checksum if available */
  checksum?: string;
  
  /** Whether this object represents a directory */
  isDir: boolean;
  
  /** Additional metadata associated with the object */
  metadata?: Record<string, any>;
}