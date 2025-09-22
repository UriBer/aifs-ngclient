import { Obj } from '../interfaces/IObjectStore';

/**
 * AifsObject extends the base object model with AIFS-specific properties.
 * It represents objects in the AI-Native File System with semantic, content-addressed,
 * and versioned storage capabilities.
 */
export class AifsObject {
  /**
   * Creates an AIFS asset object.
   * 
   * @param uri The URI of the asset
   * @param name The name of the asset
   * @param size The size of the asset in bytes
   * @param lastModified The last modified timestamp
   * @param checksum BLAKE3 checksum of the asset
   * @param metadata Additional metadata
   * @param semanticTags Semantic tags associated with the asset
   * @param contentType Content type of the asset
   * @returns A new Obj representing an asset
   */
  static asset(
    uri: string,
    name: string,
    size: number,
    lastModified?: Date,
    checksum?: string,
    metadata?: Record<string, any>,
    semanticTags?: string[],
    contentType?: string
  ): Obj {
    return {
      uri,
      name,
      size,
      lastModified,
      checksum,
      isDir: false,
      metadata: {
        ...metadata,
        semanticTags,
        contentType
      }
    };
  }
  
  /**
   * Creates an AIFS namespace or branch object.
   * 
   * @param uri The URI of the namespace or branch
   * @param name The name of the namespace or branch
   * @param metadata Additional metadata
   * @returns A new Obj representing a namespace or branch
   */
  static namespace(
    uri: string,
    name: string,
    metadata?: Record<string, any>
  ): Obj {
    return {
      uri,
      name,
      size: 0,
      isDir: true,
      metadata: metadata || {}
    };
  }
  
  /**
   * Creates an AIFS snapshot object.
   * 
   * @param uri The URI of the snapshot
   * @param name The name of the snapshot
   * @param createdAt When the snapshot was created
   * @param description Description of the snapshot
   * @param metadata Additional metadata
   * @returns A new Obj representing a snapshot
   */
  static snapshot(
    uri: string,
    name: string,
    createdAt: Date,
    description: string,
    metadata?: Record<string, any>
  ): Obj {
    return {
      uri,
      name,
      size: 0,
      lastModified: createdAt,
      isDir: true,
      metadata: {
        ...metadata,
        snapshot: {
          id: name,
          createdAt,
          description
        }
      }
    };
  }
}