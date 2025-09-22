# AIFS Server API Documentation

## Overview

This document describes the API endpoints provided by the AIFS server. The AIFS client communicates with these endpoints to perform operations on the AI-Native File System.

## Base URL

All API endpoints are relative to the base URL of the AIFS server, e.g., `https://api.aifs.example.com`.

## Authentication

All requests must include an API key in the `X-Api-Key` header:

```
X-Api-Key: your-api-key
```

## Response Format

All API responses follow a standard format:

```json
{
  "success": true,
  "data": { ... }
}
```

Or in case of an error:

```json
{
  "success": false,
  "error": "Error message"
}
```

## Endpoints

### List Objects

**GET /objects/list**

Lists objects in a namespace.

**Query Parameters:**

- `namespace` (required): The namespace to list objects from
- `prefix` (optional): Filter objects by prefix
- `delimiter` (optional): Character used to group objects (typically '/')
- `maxKeys` (optional): Maximum number of objects to return (default: 1000)
- `continuationToken` (optional): Token for pagination
- `semanticQuery` (optional): Query string for semantic search

**Response:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "name": "file1.txt",
        "path": "file1.txt",
        "size": 1024,
        "lastModified": "2023-01-01T00:00:00Z",
        "etag": "etag1",
        "checksum": "checksum1",
        "isDir": false,
        "metadata": {
          "contentType": "text/plain",
          "semanticTags": ["tag1", "tag2"],
          "embedding": [0.1, 0.2, 0.3]
        },
        "lineage": {
          "parents": ["parent1"],
          "children": ["child1"]
        },
        "snapshot": null
      }
    ],
    "nextContinuationToken": "token"
  }
}
```

### Get Object Metadata

**GET /objects/stat**

Gets metadata for an object.

**Query Parameters:**

- `namespace` (required): The namespace of the object
- `path` (required): The path of the object

**Response:**

```json
{
  "success": true,
  "data": {
    "name": "file1.txt",
    "path": "file1.txt",
    "size": 1024,
    "lastModified": "2023-01-01T00:00:00Z",
    "etag": "etag1",
    "checksum": "checksum1",
    "isDir": false,
    "metadata": {
      "contentType": "text/plain",
      "semanticTags": ["tag1", "tag2"],
      "embedding": [0.1, 0.2, 0.3]
    },
    "lineage": {
      "parents": ["parent1"],
      "children": ["child1"]
    },
    "snapshot": null
  }
}
```

### Download Object

**GET /objects/get**

Downloads an object.

**Query Parameters:**

- `namespace` (required): The namespace of the object
- `path` (required): The path of the object

**Response:**

The object content as a stream.

### Upload Object

**POST /objects/put**

Uploads an object.

**Form Data:**

- `namespace` (required): The namespace to upload to
- `path` (required): The path to upload to
- `file` (required): The file to upload
- `contentType` (optional): The content type of the file
- `semanticTags` (optional): JSON array of semantic tags
- `parents` (optional): JSON array of parent URIs

**Response:**

```json
{
  "success": true,
  "data": {
    "name": "file1.txt",
    "path": "file1.txt",
    "size": 1024,
    "lastModified": "2023-01-01T00:00:00Z",
    "etag": "etag1",
    "checksum": "checksum1",
    "isDir": false,
    "metadata": {
      "contentType": "text/plain",
      "semanticTags": ["tag1", "tag2"]
    }
  }
}
```

### Delete Object

**DELETE /objects/delete**

Deletes an object.

**Query Parameters:**

- `namespace` (required): The namespace of the object
- `path` (required): The path of the object
- `recursive` (optional): Whether to recursively delete directories (default: false)

**Response:**

```json
{
  "success": true,
  "data": null
}
```

### Copy Object

**POST /objects/copy**

Copies an object.

**Request Body:**

```json
{
  "sourceNamespace": "source-namespace",
  "sourcePath": "source-path",
  "destNamespace": "dest-namespace",
  "destPath": "dest-path",
  "preserveMetadata": true
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "name": "file1.txt",
    "path": "file1.txt",
    "size": 1024,
    "lastModified": "2023-01-01T00:00:00Z",
    "etag": "etag1",
    "checksum": "checksum1",
    "isDir": false
  }
}
```

### Move Object

**POST /objects/move**

Moves an object.

**Request Body:**

```json
{
  "sourceNamespace": "source-namespace",
  "sourcePath": "source-path",
  "destNamespace": "dest-namespace",
  "destPath": "dest-path"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "name": "file1.txt",
    "path": "file1.txt",
    "size": 1024,
    "lastModified": "2023-01-01T00:00:00Z",
    "etag": "etag1",
    "checksum": "checksum1",
    "isDir": false
  }
}
```

### Create Directory

**POST /objects/mkdir**

Creates a directory.

**Request Body:**

```json
{
  "namespace": "namespace",
  "path": "path/to/directory/",
  "recursive": true
}
```

**Response:**

```json
{
  "success": true,
  "data": null
}
```

## Error Codes

- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Invalid or missing API key
- `403 Forbidden`: Permission denied
- `404 Not Found`: Object not found
- `409 Conflict`: Object already exists
- `500 Internal Server Error`: Server error

## Pagination

For endpoints that return lists of objects, pagination is supported using the `continuationToken` parameter. The response includes a `nextContinuationToken` field if there are more results available.

## Semantic Search

The `/objects/list` endpoint supports semantic search through the `semanticQuery` parameter. This allows you to find objects based on their meaning rather than just their name or path.

## Lineage Tracking

Objects in AIFS can have parent-child relationships, which are represented in the `lineage` field of the object metadata. This allows you to track the history and dependencies of a file.

## Snapshots

AIFS supports creating point-in-time snapshots of your data. Snapshot-related endpoints will be added in a future version of the API.