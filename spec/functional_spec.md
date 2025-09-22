# Functional Specification – Cross‑Cloud Object‑Management Client

## 1 Overview and Goals

The aim of the **Commander** client is to provide a user‑friendly, dual‑pane file manager (similar to classic Norton Commander) for managing data across disparate storage systems.  The application allows you to **create, list, view, upload, download, copy, move, rename and delete** objects across these providers:

* **Local file system** (`file://`) – regular files and directories on the user’s machine.
* **Amazon S3** (`s3://`) – objects stored in Amazon S3 buckets.  S3 objects can be up to 5 TB in size and copying objects smaller than 5 GB can be done in a single atomic operation【835615796489522†L680-L686】.
* **Google Cloud Storage** (`gcs://`) – objects in Google Cloud Storage buckets.  When both source and destination are in Cloud Storage, gsutil performs server‑side copy preserving metadata【941983187742112†L457-L466】; resumable uploads/downloads and checksum validation are built‑in【941983187742112†L457-L466】【941983187742112†L481-L489】.
* **Azure Blob Storage** (`az://`) – block/append/page blobs in an Azure storage account.  Copy operations are asynchronous by default; copying within the same account can complete synchronously【248994889106255†L448-L454】.  Operations support copying between blobs, replacing blobs, copying from the Azure File service, and promoting snapshots【248994889106255†L448-L469】.
* **AIFS via gRPC** (`aifs://`) – an AI‑centric file system accessible via a gRPC API.  AIFS exposes namespace/branch abstractions; assets can have snapshots and metadata such as BLAKE3 checksums and lineage.

The application runs as an **Electron** desktop app with a React/TypeScript renderer and a Node main process.  A provider‑abstraction layer implements CRUD operations for each storage backend.  The design emphasises **consistency** across providers, **extensibility** (new providers can be added without altering the UI), **performance** (parallel transfers and resumable uploads/downloads), and **integrity** (checksum validation).  The specification is written in a **test‑driven** style: every functional requirement includes acceptance tests to guide development.

## 2 Terminology and Entities

| Term            | Meaning |
|-----------------|---------|
| **Provider**    | One of the supported backends (file, S3, GCS, Azure, AIFS). Each provider implements the `IObjectStore` interface described in this specification. |
| **URI**         | A fully qualified object identifier, e.g. `s3://my-bucket/path/to/object.txt`. URIs are the primary way the user and the system identify resources. |
| **Object**      | An indivisible item stored in a provider: a file on the local file system, a blob in Azure, an object in S3/GCS, or an asset in AIFS. |
| **Directory**   | A container of objects.  Some providers (e.g. S3) are flat but emulate directories via prefixes and delimiters; in S3 the `CommonPrefixes` list enumerates pseudo‑directories【571753186976113†L1150-L1176】. |
| **Pane**        | One side of the dual‑pane UI.  Each pane shows the contents of a selected URI and allows navigation. |
| **Job**         | An asynchronous operation (copy, move, upload, download, delete).  The job engine executes jobs concurrently and reports progress. |
| **Metadata**    | Attributes associated with an object: size, last‑modified date, ETag/checksum, user‑defined metadata, etc.  In S3, copying objects up to 5 GB preserves metadata atomically【835615796489522†L680-L686】; in GCS, server‑side copying preserves metadata【941983187742112†L457-L466】. |

## 3 Functional Requirements

### 3.1 Provider Abstraction

#### FR‑1: Define a common interface

Implement an `IObjectStore` TypeScript interface with the following asynchronous methods:

* `scheme(): 'file'|'s3'|'gcs'|'az'|'aifs'` – returns the URI scheme.
* `list(uri: string, opts: {prefix?: string; delimiter?: string; pageToken?: string; pageSize?: number}): Promise<{items: Obj[]; nextPageToken?: string}>` – lists objects and pseudo‑directories.  For S3, the `CommonPrefixes` field lists keys that act like subdirectories【571753186976113†L1150-L1176】.  Pagination uses provider‑specific tokens.
* `stat(uri: string): Promise<Obj>` – returns metadata for a single object.
* `get(uri: string, destPath: string): Promise<void>` – downloads an object to a local path.
* `put(srcPath: string, destUri: string, opts?: {contentType?: string; metadata?: Record<string,string>}): Promise<Obj>` – uploads a local file to the provider.  GCS uploads larger than 2 MB must be resumable【941983187742112†L504-L520】.
* `delete(uri: string, recursive?: boolean): Promise<void>` – deletes an object or directory.
* `copy(srcUri: string, destUri: string): Promise<Obj>` – performs a server‑side copy when the source and destination share the same provider.  In S3, atomic copy is only permitted for objects ≤5 GB【835615796489522†L680-L686】.  GCS server‑side copy preserves metadata【941983187742112†L457-L466】.  Azure copy operations may be asynchronous【248994889106255†L448-L454】.
* `move(srcUri: string, destUri: string): Promise<Obj>` – default implementation: copy then delete.  Providers may override with native rename support.
* Optional `mkdir(uri: string): Promise<void>` – creates a directory if the provider supports it.
* `exists(uri: string): Promise<boolean>` – determines whether an object or directory exists.

Each provider implementation (FileProvider, S3Provider, GCSProvider, AzureProvider, AifsProvider) must handle URIs for that scheme, perform authentication, map the generic operations onto provider‑specific SDK calls, and propagate errors.

**Acceptance Tests**

1. **testInterfaceCompleteness** – Ensure that `IObjectStore` defines exactly the methods listed above.  The test fails if additional unapproved methods exist or required methods are missing.
2. **testEachProviderImplementsInterface** – For each provider class, create an instance and verify that the instance implements every `IObjectStore` method.  Use TypeScript compile‑time checks where possible; otherwise, at runtime assert that every method is defined and is of type function.

### 3.2 Listing and Navigation

#### FR‑2: List objects and directories

When a user navigates to a URI and requests a listing:

* The provider must return a sorted list of `Obj` instances representing files and directories.
* For S3, `list()` must interpret a delimiter (default `/`).  The response should include a `CommonPrefixes` list containing pseudo‑directories; each entry should be returned as an `Obj` with `isDir: true`【571753186976113†L1150-L1176】.
* Each `Obj` must include: `uri`, `name` (last path segment), `size` if known, `lastModified` if known, `etag` or `checksum` if available, and `isDir` flag.
* Pagination: if more items exist than `pageSize`, provide `nextPageToken`.  The UI must use this token to load additional pages.

**Acceptance Tests**

1. **testListS3Root** – Given an S3 bucket containing objects `a.txt`, `dir/b.txt`, call `list('s3://bucket/', {delimiter:'/'})`.  Expect two entries: one file (`a.txt` with `isDir=false`) and one directory (`dir/` with `isDir=true`).  Verify that the provider uses `CommonPrefixes` for directories【571753186976113†L1150-L1176】.
2. **testListS3Pagination** – Insert 1,500 objects into a test bucket.  Request `list()` with `pageSize=1000`.  Verify that `items.length===1000` and `nextPageToken` is returned.  Then request with the token and ensure the remaining 500 objects are returned and no further token.
3. **testListFileProvider** – For a local directory containing files and subdirectories, call `list('file:///path/')`.  Check that `isDir` is correctly set and metadata matches the local file system.
4. **testListAzureDirectories** – For Azure, ensure that pseudo‑directories (represented by virtual prefixes) are returned as directories.  Azure does not have a `CommonPrefixes` field; but listing with a prefix and delimiter should emulate directories.
5. **testListAifsBranches** – For AIFS, listing `aifs://namespace/` should return branches as directories; listing `aifs://namespace/branch/` should return assets.

#### FR‑3: Stat object

Calling `stat()` returns complete metadata about an object.  For S3, the `HeadObject` API should be used.  For directories, `stat()` should return `isDir=true` without requiring network calls (if the provider supports pseudo‑directories).  For AIFS, `stat()` must call the gRPC `GetAsset` or similar.

**Acceptance Tests**

1. **testStatExistingFile** – For each provider, create a known object (e.g. 100 byte file), call `stat(uri)`, and verify that size and lastModified are correct.
2. **testStatNonexistent** – Calling `stat()` on a non‑existent object must throw an error indicating not found.
3. **testStatDirectory** – For S3 and GCS, calling `stat()` on a prefix ending with `/` (e.g. `s3://bucket/dir/`) should not return file metadata but should set `isDir=true`.

### 3.3 Uploading and Downloading

#### FR‑4: Download objects

`get()` downloads an object to a local path.  For all providers:

* Ensure that downloads are streamed to disk to handle large objects.  Provide progress updates to the job engine.
* GCS downloads larger than 2 MB must be resumable using HTTP range requests; partial downloads should resume automatically after network failures【941983187742112†L504-L516】.
* After download completes, compute checksums (MD5 or BLAKE3) and compare to provider metadata where available.  For GCS, `gsutil cp` validates checksums and deletes the destination if they don’t match【941983187742112†L481-L487】; the client should implement similar behaviour.

**Acceptance Tests**

1. **testDownloadSmallFile** – Upload a small file (e.g. “hello.txt”) to each provider.  Call `get()` and verify the downloaded file contents match the original.
2. **testDownloadResumableGCS** – Upload a 10 MB file to GCS.  Begin `get()` and simulate a network interruption mid‑transfer.  On restart, the download must resume from the last completed byte and complete successfully.  After completion, verify that the downloaded file passes checksum validation.
3. **testDownloadProgressEvents** – Subscribe to job progress events while downloading a large file.  Verify that progress values increase monotonically and reach 100 % at completion.

#### FR‑5: Upload objects

Uploading (`put()`) takes a local file path and writes it to the provider.  Requirements:

* Use streaming uploads for large files; compute checksums locally (e.g. BLAKE3) and store them in provider metadata (e.g. S3 user metadata).  For AIFS, BLAKE3 checksums are required.
* In GCS, any upload >2 MB must be resumable; if the network fails, the operation should be resumable via the same call【941983187742112†L504-L517】.
* Provide content‑type and custom metadata options; if unspecified, infer content type via MIME detection.

**Acceptance Tests**

1. **testUploadWithMetadata** – Upload a file with custom metadata (`{"author":"test"}`) to each provider.  Then call `stat()` and verify that the metadata is preserved.
2. **testUploadResumableGCS** – Upload a large file (>10 MB) to GCS, intentionally interrupt the connection, then resume.  Verify that the upload completes and the file appears in the bucket.
3. **testUploadOverwrite** – Upload a file to a path that already exists.  The provider must overwrite the file by default unless an option to prevent overwrite is set.

### 3.4 Copying and Moving

#### FR‑6: Server‑side copy within the same provider

When both the source and destination are on the same provider, the client should issue a server‑side copy where supported:

* **S3:** use the `CopyObject` API.  Copying an object up to 5 GB is a single atomic operation; larger objects require multipart upload (UploadPartCopy)【835615796489522†L680-L686】.  The implementation must detect the object size via `stat()`.  If size ≤ 5 GB, call `CopyObject`.  Otherwise, perform a multipart copy or fallback to streaming copy.
* **GCS:** use the server‑side rewrite API or `copy` to preserve metadata.  When both URIs are in the same project, copying occurs “in the cloud” (i.e. without downloading) and preserves metadata【941983187742112†L457-L466】.  Fallback to streamed copy if cross‑provider.
* **Azure:** use the `Copy Blob` API.  Copy operations are scheduled asynchronously and may not start immediately【248994889106255†L448-L454】.  Copying within the same storage account can complete synchronously【248994889106255†L448-L454】.  The client must poll copy status until it reports success.  If the source ETag changes during the copy, the copy fails【248994889106255†L503-L511】.

**Acceptance Tests**

1. **testCopyS3Small** – Create an S3 object of 1 MB.  Call `copy(s3://bucket/src, s3://bucket/dest)`.  Verify that the destination object exists, has the same content, and metadata matches.  Ensure that the size is ≤5 GB, so the operation uses single call copy【835615796489522†L680-L686】.
2. **testCopyS3LargeFallback** – Create an S3 object of size >5 GB (use multipart upload).  Call `copy()`.  Because atomic copy is limited to 5 GB【835615796489522†L680-L686】, the provider should perform a multipart copy via UploadPartCopy or fallback to a streamed copy.  Verify the destination file matches the source.  Fail if the implementation erroneously calls `CopyObject` on a >5 GB object.
3. **testCopyGCSPreservesMetadata** – Upload an object with custom metadata and content type to GCS.  Call `copy(gcs://bucket/src, gcs://bucket/dest)`.  Verify that the destination object retains the metadata and that the copy was done server‑side (no data streamed through the client)【941983187742112†L457-L466】.
4. **testCopyAzureAsync** – Upload a blob to Azure, then call `copy(az://account/container/src, az://account/container/dest)`.  Verify that the operation returns immediately with a pending job and that the job engine polls the copy status until completion【248994889106255†L448-L454】.  Check that the destination blob appears and the source ETag hasn’t changed during the copy; if ETag changes, assert that the copy fails【248994889106255†L503-L511】.
5. **testCopyAifsNotSupported** – Attempt to call `copy()` on two AIFS URIs.  Because AIFS does not support server‑side copy, verify that the provider throws a not‑implemented error.

#### FR‑7: Cross‑provider copy and move

When the source and destination URIs belong to different providers, the copy should stream through the client:

1. Call `get()` on the source to download to a temporary file.
2. Call `put()` on the destination using the temporary file.
3. Delete the temporary file.

For `move()` across providers, perform the copy and then delete the source.  The job engine must display progress and handle large files by streaming.  Checksums should be validated after upload.

**Acceptance Tests**

1. **testCopyS3toGCS** – Upload a file to S3.  Copy it to GCS using the cross‑provider method.  Verify that the destination exists in GCS, matches the source content, and that the S3 object remains unchanged.
2. **testMoveAzureToFile** – Upload a file to Azure.  Move it to a local directory (`file://`).  Verify that the file appears locally and the original blob is deleted.
3. **testCopyGCSLargeToAzure** – Copy a 10 GB file from GCS to Azure.  The operation should stream data without loading the entire file into memory.  Progress should be reported.

### 3.5 Deletion and Directory Creation

#### FR‑8: Delete objects and directories

* `delete(uri, recursive=false)` removes a single object or an empty directory.  For directories, if `recursive` is false and the directory contains items, an error is thrown.  If `recursive` is true, delete all objects within the directory.
* For S3 and GCS, batch deletion should be used to efficiently remove multiple objects.  For Azure, use `DeleteBlob`.
* For AIFS, deletion must ensure that lineage or snapshot references are handled correctly (e.g. cannot delete a parent asset if it has children).

**Acceptance Tests**

1. **testDeleteFile** – Upload a file to each provider.  Call `delete(uri)` and verify that the file no longer exists.
2. **testDeleteNonEmptyDirectory** – Create a directory with files.  Call `delete(uri)` without `recursive` and expect an error.  Then call `delete(uri, true)` and verify that all files are removed.
3. **testDeleteAifsSnapshot** – Attempt to delete an AIFS asset that is referenced by a snapshot.  The provider should prevent deletion and return an error message.

#### FR‑9: Create directories

Provide an optional `mkdir(uri)` that creates a directory where the provider supports hierarchical namespaces (e.g. local file system, Azure hierarchical namespaces).  For providers without true directories (S3/GCS), creating a directory should create a zero‑byte object with the trailing `/` to allow listing and to serve as a directory marker.

**Acceptance Tests**

1. **testMkdirFileProvider** – Call `mkdir('file:///tmp/newdir')`.  Verify that the directory exists and is empty.
2. **testMkdirS3** – Call `mkdir('s3://bucket/newprefix/')`.  Verify that an object with key `newprefix/` exists so that listing shows the directory.
3. **testMkdirAifsBranch** – Creating an AIFS namespace/branch should be supported via `mkdir('aifs://namespace/branch/')`.  Verify that the branch appears when listing the namespace.

### 3.6 Job Engine and Progress Reporting

#### FR‑10: Asynchronous job processing

All long‑running operations (upload, download, copy, move, delete) should be executed as jobs.  The job engine must:

* Allow multiple jobs to run concurrently, with configurable concurrency limits.
* Provide per‑job and aggregate progress (bytes transferred and percentage).  Updates should be emitted via events for UI display.
* Support pausing and resuming jobs (especially for resumable uploads/downloads).
* Support cancelling a job; if cancelled, the operation should attempt to gracefully abort and clean up partial uploads (delete incomplete temporary objects).
* Persist job state so the UI can be restarted without losing progress.

**Acceptance Tests**

1. **testJobProgressEmission** – Start a large file copy.  Subscribe to progress events and verify that the progress value increases from 0 % to 100 %.  Ensure that progress events are emitted at least every second.
2. **testJobCancellation** – Start a download.  After some progress, cancel the job.  Verify that the download stops, partial data is removed, and the job state is marked as cancelled.
3. **testJobResume** – Interrupt the application during an upload.  Restart the app and verify that the job resumes from where it left off.

### 3.7 User Interface and Interaction

#### FR‑11: Dual‑pane layout

* The application window displays two side‑by‑side panes.  Each pane has an address bar showing the current URI and a listing of objects.  Users can type a URI into the address bar to navigate.
* Keyboard shortcuts follow Norton‑Commander conventions:
  * `Tab` – switch active pane.
  * `Enter` – open a selected directory or view a file.
  * `F3` – view file contents (read‑only preview).
  * `F4` – edit file (invoke system editor; optional in MVP).
  * `F5` – copy selected items to the other pane’s current path.
  * `F6` – move selected items to the other pane’s current path.
  * `F7` – create directory.
  * `F8` – delete selected items.
  * `F9` – open menu (e.g. settings, credentials, preferences).
  * `F10` – quit application.
* Selections can be toggled with the spacebar.  Selected items are included in the next copy/move/delete operation.
* A status bar shows current operations, transfer speed, estimated time, and error messages.

**Acceptance Tests**

1. **testTabSwitching** – Simulate pressing `Tab` and verify that the focus moves between panes.  The previously active pane should lose focus.
2. **testCopyShortcut** – Select a file in pane A, set pane B to a destination directory, press `F5`, and verify that a copy job is created and executed.
3. **testDeleteShortcut** – Select a file and press `F8`.  Confirm deletion.  Verify that the file is removed from the listing.

#### FR‑12: Context menu and drag‑and‑drop

* Right‑clicking on an object opens a context menu with actions: `Open`, `Copy`, `Move`, `Delete`, `Rename`, `Download`, `Properties`, `Generate presigned URL` (where supported).
* Dragging files from one pane to another triggers a copy; holding `Shift` triggers a move.  The UI must show a drop indicator.

**Acceptance Tests**

1. **testContextMenuActions** – Right‑click an object and trigger each action.  Verify that the corresponding operation (open, copy, delete…) runs.
2. **testDragAndDropCopy** – Drag a file from pane A to pane B.  Verify that it copies correctly.
3. **testDragAndDropMove** – Drag a file while holding `Shift`.  Verify that the file is moved (copied then deleted).

### 3.8 Authentication and Credentials

#### FR‑13: Credential storage and profiles

* Each provider requires credentials:
  * **S3:** access key ID and secret access key, optional session token.  Support reading credentials from standard locations (environment variables, `~/.aws/credentials`) and AWS SSO/STS.  Copy operations require read permission on the source and write permission on the destination【835615796489522†L740-L751】.
  * **GCS:** use Application Default Credentials (ADC) or service account JSON key.  Support specifying project ID.  Ensure resumable uploads use appropriate OAuth scopes.
  * **Azure:** support account key, shared access signatures (SAS), user delegation SAS.  Copy across accounts requires SAS tokens with read permission on the source【248994889106255†L492-L506】.
  * **AIFS:** support macaroon‑style capability tokens scoped to namespaces and branches.
* Credentials should be stored securely using the OS keychain (e.g. macOS Keychain, Windows Credential Manager, libsecret).  Never store plain secrets in configuration files.
* Users may create multiple profiles per provider (e.g. different AWS accounts) and switch profiles via the UI.

**Acceptance Tests**

1. **testMissingCredentials** – Attempt to list a bucket without credentials.  Expect an authentication error.  After providing credentials, the operation should succeed.
2. **testProfileSwitching** – Configure two AWS profiles pointing to different buckets.  Switch profiles via the UI and verify that lists and operations run under the selected profile.
3. **testAzureSASTokenCopy** – Provide an Azure SAS token with only read permission on the source blob.  Attempt a copy and verify that it fails due to insufficient permissions【248994889106255†L492-L506】.  Then provide a SAS token with read permission and verify that the copy succeeds.

### 3.9 Error Handling

#### FR‑14: Graceful error reporting

* The application must capture and display meaningful error messages for provider errors (e.g. 404 Not Found, 403 Access Denied, network errors, invalid credentials).  Do not expose raw stack traces.
* For S3 copy operations, note that a `200 OK` response may still contain an error if the copy fails mid‑transfer【835615796489522†L777-L806】.  The provider should detect embedded errors and retry or surface an error accordingly.
* Implement exponential backoff retries for transient errors.  Abort after configurable maximum retries.

**Acceptance Tests**

1. **testNotFoundError** – Attempt to download a non‑existent object.  Verify that the error message clearly indicates the object does not exist.
2. **testPermissionDenied** – Attempt to delete an object without permission.  Verify that the error message indicates insufficient permissions.
3. **testEmbeddedCopyError** – Simulate an S3 cross‑region copy that returns `200 OK` but contains an error (e.g. by disconnecting mid‑copy).  Ensure that the provider detects the embedded error and retries or reports failure【835615796489522†L777-L806】.

### 3.10 AIFS‑Specific Features

#### FR‑15: Namespace and branch navigation

AIFS introduces namespaces and branches analogous to Git branches.  The client must interpret URIs of the form `aifs://namespace/branch/` as directories.  Listing a namespace should show branches; listing a branch should show assets.

#### FR‑16: Asset operations

* `put()` should call the gRPC `PutAsset` streaming method.  Additional metadata (e.g. embeddings, tags) may be supplied.
* `get()` downloads the asset via gRPC streaming.
* `delete()` deletes the asset if no snapshots depend on it.
* Additional operations such as `vectorSearch()` may be added in future versions but are out of scope for this MVP.

**Acceptance Tests**

1. **testListAifsNamespace** – Create an AIFS namespace with branches `main` and `dev`.  Call `list('aifs://namespace/')` and verify that both branches appear as directories.
2. **testUploadAsset** – Upload a local file to `aifs://namespace/main/asset1`.  Verify that the asset appears when listing the branch and that metadata (checksum, size) are correct.
3. **testDeleteAssetWithSnapshot** – Create a snapshot of an asset, then attempt to delete the asset.  Expect a refusal because a snapshot references it.

## 4 Non‑Functional Requirements

### 4.1 Performance

* The client must handle objects up to 5 TB (S3 limit).  Copying objects larger than 5 GB on S3 must use multipart upload【835615796489522†L680-L686】.  Transfers should be streamed to avoid loading entire objects into memory.  Use concurrency to maximise throughput, e.g. multiple upload/download threads.
* For GCS, automatically use resumable transfers for files larger than 2 MB【941983187742112†L504-L517】.  Validate checksums after each operation【941983187742112†L481-L487】.
* For Azure, poll asynchronous copy operations until completion【248994889106255†L448-L454】.

### 4.2 Security

* All communications with providers must use HTTPS or gRPC TLS.  Never transmit access keys in the clear.
* Store credentials in OS keychain; encrypt any cached tokens.
* When displaying metadata, redact sensitive values (e.g. secret keys).

### 4.3 Usability and Accessibility

* The UI must be intuitive for users familiar with Norton Commander.  Provide tooltips and contextual help.
* Keyboard navigation is essential; all actions should be accessible via keyboard shortcuts.
* Support internationalisation (e.g. right‑to‑left languages) and dark/light themes.

### 4.4 Extensibility

* The provider abstraction must make it straightforward to add new storage backends.  New providers should implement `IObjectStore` and register themselves in a provider registry.
* UI components must not hard‑code provider names or behaviours.

### 4.5 Platform Support

* The client must run on macOS, Windows and Linux.  Use Electron with cross‑platform file APIs.  For packaging, use `electron-builder`.

## 5 Out‑of‑Scope Items

* **Partial object operations:** Range GET/PUT or patch operations are not supported in this release.
* **Object lifecycle management:** Rules like retention policies, lifecycle transitions, and version expiration are not configurable via the UI.
* **Presigned URL generation** beyond basic support (S3 only) is out of scope for this MVP.
* **Vector search** and **snapshot management** in AIFS are beyond the MVP; the provider may expose these features in a future version.
* **User management** – The application assumes a single user profile.  Multi‑user features are not addressed in this specification.

## 6 Test Plan and Tooling

### 6.1 Test Framework

* Use **Jest** (TypeScript) for unit tests.  Provide mocks for each provider’s SDK to avoid actual network calls.  For integration tests, use local instances (e.g. `minio` for S3, `gsutil` emulator for GCS, Azurite for Azure) or test environments with temporary buckets.
* For the UI, use **React Testing Library** and **Playwright** for end‑to‑end tests.  Simulate keyboard shortcuts and verify DOM updates.

### 6.2 Test Organisation

Tests should be grouped by functional area:

* `provider.test.ts` – Tests for `IObjectStore` implementations (listing, stat, get/put, copy/move/delete, mkdir).
* `crossProvider.test.ts` – Tests for cross‑provider operations.
* `jobEngine.test.ts` – Tests for job management, progress, cancellation and resume.
* `ui.test.tsx` – Tests for the React UI: keyboard shortcuts, drag‑and‑drop, context menus, error dialogs.
* `auth.test.ts` – Tests for credentials, profiles and permission errors.
* `aifs.test.ts` – Tests specific to AIFS features.

### 6.3 Sample Test Case (Illustrative)

Below is an example of how a test might be written for S3 copy operations.  It demonstrates the test‑driven style where the behaviour is specified up front.  The test uses mocks and citations indicate why certain constraints exist.

```typescript
describe('S3Provider.copy', () => {
  it('performs single‑call copy for objects ≤5 GB', async () => {
    // Arrange: create a mock S3 client.  The object size is 100 MB (≤5 GB).
    const s3Client = new MockS3Client({
      headObject: () => ({ ContentLength: 100 * 1024 * 1024 }),
      copyObject: jest.fn().mockResolvedValue({}),
    });
    const provider = new S3Provider(s3Client);
    // Act
    await provider.copy('s3://mybucket/src', 's3://mybucket/dest');
    // Assert: ensure copyObject was called exactly once and multipart copy wasn’t used.
    expect(s3Client.copyObject).toHaveBeenCalledTimes(1);
  });

  it('falls back to multipart copy for objects >5 GB', async () => {
    // Arrange: object size is 6 GB (>5 GB).  The provider should not call copyObject
    // because the AWS documentation states that objects larger than 5 GB cannot be
    // copied atomically【835615796489522†L680-L686】.
    const s3Client = new MockS3Client({
      headObject: () => ({ ContentLength: 6 * 1024 * 1024 * 1024 }),
      copyObject: jest.fn(),
      uploadPartCopy: jest.fn().mockResolvedValue({}),
      completeMultipartUpload: jest.fn().mockResolvedValue({}),
    });
    const provider = new S3Provider(s3Client);
    // Act
    await provider.copy('s3://mybucket/src', 's3://mybucket/dest');
    // Assert: multipart copy methods are used; copyObject is never called.
    expect(s3Client.copyObject).not.toHaveBeenCalled();
    expect(s3Client.uploadPartCopy).toHaveBeenCalled();
    expect(s3Client.completeMultipartUpload).toHaveBeenCalled();
  });
});
```

This example clarifies expected behaviour and ties it back to the documentation that limits single‑call copies to 5 GB【835615796489522†L680-L686】.

