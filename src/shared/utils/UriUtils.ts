/**
 * Utility functions for working with URIs across different providers.
 */

/**
 * Parses a URI into its components.
 * 
 * @param uri The URI to parse
 * @returns The parsed URI components
 */
export function parseUri(uri: string): ParsedUri {
  // Match URI pattern: scheme://authority/path
  const match = uri.match(/^([a-z]+):\/\/([^\/]+)(?:\/(.*))?$/);
  if (!match) {
    throw new Error(`Invalid URI format: ${uri}`);
  }

  const [, scheme, authority, path = ''] = match;
  
  // Validate scheme is one of the supported providers
  if (!['file', 's3', 'gcs', 'az', 'aifs'].includes(scheme)) {
    throw new Error(`Unsupported scheme: ${scheme}`);
  }

  return {
    scheme: scheme as 'file' | 's3' | 'gcs' | 'az' | 'aifs',
    authority,
    path
  };
}

/**
 * Builds a URI from its components.
 * 
 * @param components The URI components
 * @returns The constructed URI
 */
export function buildUri(components: ParsedUri): string {
  const { scheme, authority, path } = components;
  return `${scheme}://${authority}${path ? '/' + path : ''}`;
}

/**
 * Gets the parent URI of the given URI.
 * 
 * @param uri The URI to get the parent of
 * @returns The parent URI
 */
export function getParentUri(uri: string): string {
  const parsed = parseUri(uri);
  
  // If path is empty or just a slash, the parent is the root of the authority
  if (!parsed.path || parsed.path === '/') {
    return buildUri({ ...parsed, path: '' });
  }
  
  // Remove trailing slash if present
  const normalizedPath = parsed.path.endsWith('/') 
    ? parsed.path.slice(0, -1) 
    : parsed.path;
  
  // Find the last slash in the path
  const lastSlashIndex = normalizedPath.lastIndexOf('/');
  
  // If no slash found, parent is the root
  if (lastSlashIndex === -1) {
    return buildUri({ ...parsed, path: '' });
  }
  
  // Extract the parent path
  const parentPath = normalizedPath.substring(0, lastSlashIndex);
  return buildUri({ ...parsed, path: parentPath });
}

/**
 * Gets the name (last path segment) from a URI.
 * 
 * @param uri The URI to extract the name from
 * @returns The name (last path segment)
 */
export function getNameFromUri(uri: string): string {
  const parsed = parseUri(uri);
  
  // If path is empty, use the authority as the name
  if (!parsed.path) {
    return parsed.authority;
  }
  
  // Remove trailing slash if present
  const normalizedPath = parsed.path.endsWith('/') 
    ? parsed.path.slice(0, -1) 
    : parsed.path;
  
  // Find the last slash in the path
  const lastSlashIndex = normalizedPath.lastIndexOf('/');
  
  // If no slash found, the name is the entire path
  if (lastSlashIndex === -1) {
    return normalizedPath;
  }
  
  // Extract the name (last path segment)
  return normalizedPath.substring(lastSlashIndex + 1);
}

/**
 * Checks if a URI represents a directory.
 * 
 * @param uri The URI to check
 * @returns True if the URI represents a directory
 */
export function isDirectoryUri(uri: string): boolean {
  const parsed = parseUri(uri);
  return !parsed.path || parsed.path.endsWith('/');
}

/**
 * Ensures a URI ends with a trailing slash (for directories).
 * 
 * @param uri The URI to ensure has a trailing slash
 * @returns The URI with a trailing slash
 */
export function ensureTrailingSlash(uri: string): string {
  if (uri.endsWith('/')) {
    return uri;
  }
  return uri + '/';
}

/**
 * Joins path segments to a base URI.
 * 
 * @param baseUri The base URI
 * @param segments Path segments to join
 * @returns The joined URI
 */
export function joinUri(baseUri: string, ...segments: string[]): string {
  const parsed = parseUri(baseUri);
  
  // Start with the base path, removing trailing slash if present
  let path = parsed.path;
  if (path.endsWith('/')) {
    path = path.slice(0, -1);
  }
  
  // Join all segments, ensuring proper slash handling
  for (const segment of segments) {
    // Remove leading and trailing slashes from segment
    const normalizedSegment = segment.replace(/^\/|\/$/, '');
    if (normalizedSegment) {
      path = path ? `${path}/${normalizedSegment}` : normalizedSegment;
    }
  }
  
  return buildUri({ ...parsed, path });
}

/**
 * Parsed URI components.
 */
export interface ParsedUri {
  /** The URI scheme (file, s3, gcs, az, aifs) */
  scheme: 'file' | 's3' | 'gcs' | 'az' | 'aifs';
  
  /** The authority part (e.g., bucket name, host) */
  authority: string;
  
  /** The path part */
  path: string;
}