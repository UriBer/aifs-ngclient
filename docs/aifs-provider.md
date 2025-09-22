# AIFS Provider Implementation

## Overview

The AI-Native File System (AIFS) provider implements the `IObjectStore` interface to provide a client for interacting with the AIFS server. AIFS is a semantic, content-addressed, versioned storage fabric that treats *meaning*—not directory paths—as the primary lookup key.

## Key Features

### Semantic Search

AIFS supports semantic search through vector embeddings. When listing objects, you can provide a semantic query to find objects based on their meaning rather than just their name or path.

```typescript
const results = await provider.list('aifs://my-namespace/', {
  semanticQuery: 'machine learning models for image classification'
});
```

### Content-Addressed Storage

Files in AIFS are identified by their content hash using the BLAKE3 algorithm. This ensures that identical files are only stored once, and that files can be verified for integrity.

```typescript
// The checksum is automatically calculated during upload
await provider.put('/path/to/local/file.txt', 'aifs://my-namespace/file.txt');

// The checksum is verified during download
await provider.get('aifs://my-namespace/file.txt', '/path/to/local/destination.txt');
```

### Lineage Tracking

AIFS tracks the relationships between files, allowing you to see the history and dependencies of a file.

```typescript
// Upload a file with parent references
await provider.put('/path/to/model.pkl', 'aifs://my-namespace/models/model-v2.pkl', {
  parents: ['aifs://my-namespace/models/model-v1.pkl']
});

// Get a file's metadata including lineage information
const metadata = await provider.stat('aifs://my-namespace/models/model-v2.pkl');
console.log(metadata.lineage.parents); // ['aifs://my-namespace/models/model-v1.pkl']
console.log(metadata.lineage.children); // []  (if no children yet)
```

### Snapshot Support

AIFS supports creating point-in-time snapshots of your data, allowing you to capture the state of your files at a specific moment.

```typescript
// Create a snapshot (API not yet implemented in the provider)
// Future implementation will look something like this:
// await provider.createSnapshot('aifs://my-namespace/', 'my-snapshot', 'Description of my snapshot');
```

## Implementation Details

### AifsObject Model

The `AifsObject` class extends the base `Obj` interface to include AIFS-specific properties:

- `semanticTags`: Array of strings representing semantic tags associated with the object
- `embedding`: Optional vector embedding for semantic search
- `lineage`: Object containing parent and child references
- `snapshot`: Object containing snapshot information

### URI Format

AIFS URIs follow the format `aifs://<namespace>/<path>`. The namespace is a logical grouping of objects, similar to an S3 bucket.

### API Endpoints

The AIFS provider communicates with the AIFS server using the following endpoints:

- `/objects/list`: List objects in a namespace
- `/objects/stat`: Get metadata for an object
- `/objects/get`: Download an object
- `/objects/put`: Upload an object
- `/objects/delete`: Delete an object
- `/objects/copy`: Copy an object
- `/objects/move`: Move an object
- `/objects/mkdir`: Create a directory

### Checksum Calculation

The AIFS provider uses the BLAKE3 algorithm for calculating checksums. This is done using the `ChecksumUtils` class, which provides methods for calculating and verifying checksums.

## Error Handling

The AIFS provider includes robust error handling for common scenarios:

- Object not found (404)
- Permission denied
- Invalid namespace or path
- Checksum validation failures
- Network errors

## Future Enhancements

- Implement snapshot creation and management
- Add support for batch operations
- Improve performance for large file transfers
- Add support for resumable uploads
- Implement client-side caching