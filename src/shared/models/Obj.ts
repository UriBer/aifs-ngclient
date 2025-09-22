import { Obj } from '../interfaces/IObjectStore';

/**
 * Base implementation of the Obj interface.
 */
export class BaseObj {
  /**
   * Creates a directory object.
   * 
   * @param uri The URI of the directory
   * @param name The name of the directory
   * @param lastModified The last modified timestamp
   * @param metadata Additional metadata
   * @returns A new Obj representing a directory
   */
  static directory(
    uri: string,
    name: string,
    lastModified?: Date,
    metadata?: Record<string, any>
  ): Obj {
    return {
      uri,
      name,
      size: 0,
      lastModified,
      etag: undefined,
      checksum: undefined,
      isDir: true,
      metadata: metadata || {}
    };
  }

  /**
   * Creates a file object.
   * 
   * @param uri The URI of the file
   * @param name The name of the file
   * @param size The size of the file in bytes
   * @param lastModified The last modified timestamp
   * @param etag The ETag if available
   * @param checksum The checksum if available
   * @param metadata Additional metadata
   * @returns A new Obj representing a file
   */
  static file(
    uri: string,
    name: string,
    size: number,
    lastModified?: Date,
    etag?: string,
    checksum?: string,
    metadata?: Record<string, any>
  ): Obj {
    return {
      uri,
      name,
      size,
      lastModified,
      etag,
      checksum,
      isDir: false,
      metadata: metadata || {}
    };
  }
}