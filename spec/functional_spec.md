# Functional Specification – Cross‑Cloud Object‑Management Client

## 1 Overview and Goals

The aim of the *AIFS Commander** client is to provide a user‑friendly, dual‑pane file manager and data manager (similar to classic Norton Commander) for managing data across disparate storage systems and databases. The application allows you to **create, list, view, upload, download, copy, move, rename and delete** objects across these providers:

* **Local file system** (`file://`) – regular files and directories on the user’s machine.
* **Amazon S3** (`s3://`) – objects stored in Amazon S3 buckets.  S3 objects can be up to 5 TB in size and copying objects smaller than 5 GB can be done in a single atomic operation【835615796489522†L680-L686】.
* **Google Cloud Storage** (`gcs://`) – objects in Google Cloud Storage buckets.  When both source and destination are in Cloud Storage, gsutil performs server‑side copy preserving metadata【941983187742112†L457-L466】; resumable uploads/downloads and checksum validation are built‑in【941983187742112†L457-L466】【941983187742112†L481-L489】.
* **Azure Blob Storage** (`az://`) – block/append/page blobs in an Azure storage account.  Copy operations are asynchronous by default; copying within the same account can complete synchronously【248994889106255†L448-L454】.  Operations support copying between blobs, replacing blobs, copying from the Azure File service, and promoting snapshots【248994889106255†L448-L469】.
* **AIFS via gRPC** (`aifs://`) – an AI‑centric file system accessible via a gRPC API.  AIFS exposes namespace/branch abstractions; assets can have snapshots and metadata such as BLAKE3 checksums and lineage.


### 3.20 Database and Data Warehouse Providers

#### FR‑26: Database Provider Support

The application shall support database and data warehouse providers as specialized object stores:

**Supported Database Providers:**
* **Google BigQuery** (`bigquery://`) – Tables, views, datasets, and query results
* **Amazon Redshift** (`redshift://`) – Tables, views, clusters, and query results  
* **Azure Synapse** (`synapse://`) – Tables, views, workspaces, and query results
* **Oracle Autonomous Data Warehouse** (`autonomous://`) – Tables, views, and query results
* **Snowflake** (`snowflake://`) – Tables, views, databases, and query results
* **Databricks SQL** (`databricks://`) – Tables, views, catalogs, and query results

**Data Pipeline Providers:**
* **Google Dataform** (`dataform://`) – Workflows, repositories, and compilation results
* **dbt (Data Build Tool)** (`dbt://`) – Models, tests, documentation, and run results
* **Google Cloud Composer** (`composer://`) – DAGs, tasks, and workflow executions
* **Azure Data Factory** (`datafactory://`) – Pipelines, datasets, and run results
* **Google Data Integration/Data Flow** (`dataflow://`) – Jobs, templates, and execution results
* **Prefect** (`prefect://`) – Flows, tasks, and run results
* **Dagster** (`dagster://`) – Assets, jobs, and run results
* **Databricks Workflows** (`databricks-workflows://`) – Jobs, tasks, and run results

**Database Object Types:**
* **Tables**: Structured data with schema information
* **Views**: Virtual tables based on queries
* **Datasets/Databases**: Containers for tables and views
* **Queries**: SQL query definitions and results
* **Schemas**: Table structure and metadata
* **Indexes**: Database indexes and constraints
* **Stored Procedures**: Database functions and procedures
* **Triggers**: Database triggers and event handlers

**Database Operations:**
* **List**: List tables, views, datasets, and other database objects
* **Query**: Execute SQL queries and return results
* **Schema**: Retrieve table schemas and metadata
* **Export**: Export table data to various formats (CSV, JSON, Parquet)
* **Import**: Import data from files into database tables
* **Compare**: Compare table schemas and data between databases
* **Sync**: Synchronize data between different database providers

**Acceptance Tests**

1. **testBigQueryConnection** – Connect to BigQuery and list datasets and tables
2. **testRedshiftQuery** – Execute SQL query on Redshift and return results
3. **testSnowflakeExport** – Export Snowflake table data to CSV format
4. **testDatabricksWorkflow** – List and execute Databricks workflows
5. **testDbtModels** – List dbt models and their dependencies
6. **testDataformCompilation** – Compile Dataform workflows and view results
7. **testCrossDatabaseSync** – Sync table data between different database providers
8. **testDatabaseSchemaComparison** – Compare schemas between different databases

#### FR‑27: Data Pipeline Management

The application shall provide comprehensive data pipeline management capabilities:

**Pipeline Operations:**
* **List Pipelines**: List all available pipelines and their status
* **Execute Pipelines**: Run pipelines with parameter configuration
* **Monitor Execution**: Real-time monitoring of pipeline execution
* **View Results**: Display pipeline execution results and logs
* **Schedule Pipelines**: Configure pipeline scheduling and triggers
* **Pipeline Dependencies**: Manage pipeline dependencies and execution order

**Pipeline Types:**
* **ETL Pipelines**: Extract, Transform, Load data processing
* **Data Quality Pipelines**: Data validation and quality checks
* **ML Pipelines**: Machine learning model training and inference
* **Analytics Pipelines**: Data analysis and reporting workflows
* **Data Migration**: Data transfer between different systems
* **Real-time Pipelines**: Streaming data processing workflows

**Pipeline Monitoring:**
* **Execution Status**: Real-time status of pipeline executions
* **Performance Metrics**: Execution time, resource usage, and throughput
* **Error Handling**: Error detection, logging, and notification
* **Retry Logic**: Automatic retry for failed pipeline steps
* **Alerting**: Notifications for pipeline failures and completions

**Acceptance Tests**

1. **testPipelineExecution** – Execute a data pipeline and monitor its progress
2. **testPipelineScheduling** – Schedule a pipeline to run at specific times
3. **testPipelineDependencies** – Verify pipeline dependencies are respected
4. **testPipelineMonitoring** – Monitor pipeline execution in real-time
5. **testPipelineErrorHandling** – Handle pipeline failures gracefully
6. **testPipelineResults** – View and export pipeline execution results

#### FR‑28: Database Schema Management

The application shall provide database schema management capabilities:

**Schema Operations:**
* **Schema Discovery**: Automatically discover database schemas
* **Schema Comparison**: Compare schemas between different databases
* **Schema Migration**: Migrate schemas between database providers
* **Schema Validation**: Validate schema consistency and integrity
* **Schema Documentation**: Generate and maintain schema documentation

**Schema Types:**
* **Table Schemas**: Column definitions, data types, and constraints
* **View Schemas**: View definitions and dependencies
* **Index Schemas**: Index definitions and performance metrics
* **Relationship Schemas**: Foreign key relationships and dependencies
* **Permission Schemas**: Access control and permission definitions

**Schema Tools:**
* **Schema Diff**: Visual differences between schema versions
* **Schema Merge**: Merge schema changes from different sources
* **Schema Backup**: Backup and restore schema definitions
* **Schema Versioning**: Track schema changes over time
* **Schema Validation**: Validate schema against business rules

**Acceptance Tests**

1. **testSchemaDiscovery** – Automatically discover database schemas
2. **testSchemaComparison** – Compare schemas between databases
3. **testSchemaMigration** – Migrate schemas between providers
4. **testSchemaValidation** – Validate schema consistency
5. **testSchemaDocumentation** – Generate schema documentation

#### FR‑29: Data Quality and Governance

The application shall provide data quality and governance capabilities:

**Data Quality Features:**
* **Data Profiling**: Analyze data quality and statistics
* **Data Validation**: Validate data against business rules
* **Data Cleansing**: Identify and fix data quality issues
* **Data Monitoring**: Continuous monitoring of data quality
* **Data Lineage**: Track data flow and transformations

**Governance Features:**
* **Data Catalog**: Centralized catalog of data assets
* **Metadata Management**: Manage data metadata and documentation
* **Access Control**: Control access to data assets
* **Compliance**: Ensure compliance with data regulations
* **Audit Trail**: Track all data access and modifications

**Quality Metrics:**
* **Completeness**: Percentage of non-null values
* **Accuracy**: Data accuracy against reference data
* **Consistency**: Data consistency across systems
* **Timeliness**: Data freshness and update frequency
* **Validity**: Data validity against defined rules

**Acceptance Tests**

1. **testDataProfiling** – Profile data quality and generate statistics
2. **testDataValidation** – Validate data against business rules
3. **testDataLineage** – Track data lineage and transformations
4. **testDataCatalog** – Manage centralized data catalog
5. **testDataGovernance** – Implement data governance policies


The application is plugin first app, the app can be divided into blocks that runs plugins inside, it should manage plugin failure and hold it in sandboox so if plugin fail there will be graceful error not app crash or stuck.
the app plugins are in two panes right and left by default like in norton commander, yet it can be divded to 3 4 and more panes horizontally or vertically 

the app will run in two flavours - shell version similar to norton commander
an **Electron** desktop app with a React/TypeScript renderer and a Node main process. 
the two will have same functionalities and as similar as possible look and feel.

 A provider‑abstraction layer implements CRUD operations for each storage backend.  
 The design emphasises **consistency** across providers, **extensibility** (new providers can be added without altering the UI), **performance** (parallel transfers and resumable uploads/downloads), and **integrity** (checksum validation).  The specification is written in a **test‑driven** style: every functional requirement includes acceptance tests to guide development.

## 2 Terminology and Entities

| Term            | Meaning |
|-----------------|---------|
| **Provider**    | One of the supported backends (file, S3, GCS, Azure, AIFS, BigQuery, Redshift, Synapse, Autonomous DW, Snowflake, Databricks, Dataform, dbt, Composer, Data Factory, Data Flow, Prefect, Dagster, Databricks Workflows). Each provider implements the `IObjectStore` interface described in this specification. |
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

* `scheme(): 'file'|'s3'|'gcs'|'az'|'aifs'|'bigquery'|'redshift'|'synapse'|'autonomous'|'snowflake'|'databricks'|'dataform'|'dbt'|'composer'|'datafactory'|'dataflow'|'prefect'|'dagster'|'databricks-workflows'` – returns the URI scheme.
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

### 3.10 AIFS‑Specific Features

#### FR‑15: Namespace and branch navigation

AIFS introduces namespaces and branches analogous to Git branches.  The client must interpret URIs of the form `aifs://namespace/branch/` as directories.  Listing a namespace should show branches; listing a branch should show assets.

#### FR‑16: Asset operations

* `put()` should call the gRPC `PutAsset` streaming method.  Additional metadata (e.g. embeddings, tags) may be supplied.
* `get()` downloads the asset via gRPC streaming.
* `delete()` deletes the asset if no snapshots depend on it.
* Additional operations such as `vectorSearch()` may be added in future versions but are out of scope for this MVP.

**Acceptance Tests**

1. **testListAifsNamespace** – Create an AIFS namespace with branches `main` and `dev`.  Call `list('aifs://namespace/')` and verify that both branches appear as directories.
2. **testUploadAsset** – Upload a local file to `aifs://namespace/main/asset1`.  Verify that the asset appears when listing the branch and that metadata (checksum, size) are correct.
3. **testDeleteAssetWithSnapshot** – Create a snapshot of an asset, then attempt to delete the asset.  Expect a refusal because a snapshot references it.

### 3.11 Plugin System Architecture

#### FR‑17: Plugin System Architecture

The application shall implement a process-level plugin architecture where:

**Plugin Isolation:**
* Each provider plugin runs in a separate Node.js process
* Plugins communicate with the main application via secure message passing
* Plugin crashes are isolated and don't affect the main application
* Plugins have limited access to system resources (CPU, memory, network)

**Plugin Lifecycle:**
* `install` – Plugin is downloaded and installed to the plugin directory
* `activate` – Plugin is loaded and initialized
* `deactivate` – Plugin is stopped but remains installed
* `uninstall` – Plugin is completely removed from the system

**Plugin Communication:**
* Use secure IPC channels for plugin-to-main communication
* Message passing protocol supports: commands, responses, events, errors
* Plugins can only access resources through the main application's API
* All plugin communication is logged for security and debugging

**Plugin Security:**
* Plugins run with minimal privileges
* No direct file system access outside designated directories
* Network access only through approved channels
* Plugin code is sandboxed and cannot access main application memory

**Acceptance Tests**

1. **testPluginIsolation** – Crash a plugin process and verify main app continues running
2. **testPluginCommunication** – Verify plugins can only communicate through approved channels
3. **testPluginLifecycle** – Test install, activate, deactivate, uninstall cycle
4. **testPluginSecurity** – Verify plugins cannot access unauthorized resources

### 3.12 Multi-Pane Layout System

#### FR‑18: Multi-Pane Layout System

The application shall support flexible pane arrangements:

**Pane Layouts:**
* **Side-by-Side**: Two panes horizontally (default)
* **Split Views**: Panes can be split horizontally or vertically
* **Grid Layout**: Multiple panes in grid arrangement (2x2, 3x3, etc.)
* **Tabbed Panes**: Panes can be organized in tabs

**Pane Navigation:**
* `Tab` key moves focus clockwise through panes
* `Shift+Tab` moves focus counter-clockwise
* Focus indicator clearly shows active pane
* Each pane maintains its own navigation state

**Pane Persistence:**
* Pane arrangements persist across application sessions
* Each pane remembers its last visited URI
* Pane view modes (list, grid, tree) are preserved
* Pane-specific settings are maintained

**View Modes:**
* **List View**: Traditional file list with details
* **Grid View**: Icon-based layout with thumbnails
* **Tree View**: Hierarchical directory structure
* **Preview View**: File content preview with metadata

**Acceptance Tests**

1. **testPaneNavigation** – Verify Tab key moves focus correctly
2. **testPanePersistence** – Verify pane state is restored on restart
3. **testViewModes** – Verify all view modes work correctly
4. **testPaneSplitting** – Verify panes can be split and resized

### 3.13 Terminal User Interface (TUI)

#### FR‑19: Terminal User Interface

The application shall provide a TUI version with identical functionality:

**TUI Framework:**
* Use cross-platform terminal libraries (blessed.js, ink, or similar)
* Support Linux, Windows, and macOS terminals
* Handle terminal resizing and color schemes
* Support both monochrome and color terminals

**TUI Features:**
* Identical keyboard shortcuts as desktop version
* Same provider support as desktop version
* Real-time progress indicators in terminal
* Terminal-based file preview and editing

**TUI Limitations:**
* No drag-and-drop support
* Limited graphical file previews
* Text-based progress indicators only
* Terminal size limitations for large file lists

**Cross-Platform Support:**
* Windows: PowerShell, Command Prompt, Windows Terminal
* Linux: bash, zsh, fish shells
* macOS: Terminal.app, iTerm2

**Acceptance Tests**

1. **testTUICompatibility** – Verify TUI works on all supported terminals
2. **testTUIProviders** – Verify all providers work in TUI mode
3. **testTUIKeyboard** – Verify keyboard shortcuts work in TUI
4. **testTUIPreview** – Verify file preview works in TUI

### 3.14 Configuration Management

#### FR‑20: Configuration Management

The application shall implement comprehensive configuration management:

**Configuration Storage:**
* **Format**: JSON with encryption
* **Location**: Platform-specific settings directory
* **Encryption**: AES-256 encryption with user password
* **Backup**: Automatic configuration backup on changes

**Configuration Structure:**
```json
{
  "version": "1.0.0",
  "settings": {
    "ui": {
      "theme": "dark",
      "paneLayout": "side-by-side",
      "viewMode": "list"
    },
    "performance": {
      "maxConcurrentJobs": 5,
      "memoryLimit": "2GB",
      "networkThrottle": "100MB/s"
    },
    "logging": {
      "level": "info",
      "maxFileSize": "10MB",
      "maxFiles": 5
    },
    "providers": {
      "s3": { "profiles": [...] },
      "gcs": { "profiles": [...] },
      "bigquery": { "profiles": [...] },
      "redshift": { "profiles": [...] },
      "snowflake": { "profiles": [...] },
      "databricks": { "profiles": [...] }
    },
    "databases": {
      "connectionPooling": true,
      "maxConnections": 10,
      "queryTimeout": 300,
      "schemaCache": true
    },
    "pipelines": {
      "maxConcurrentRuns": 5,
      "defaultTimeout": 3600,
      "retryAttempts": 3,
      "monitoringEnabled": true
    }
  }
}
```

**Environment Variables:**
* Support environment variable overrides
* Priority: CLI args > env vars > config file > defaults
* Secure handling of sensitive environment variables

**Settings Persistence:**
* Settings sync between desktop and TUI versions
* Configuration migration for version updates
* Validation of configuration on startup

**Acceptance Tests**

1. **testConfigEncryption** – Verify configuration is properly encrypted
2. **testConfigMigration** – Verify configuration migrates between versions
3. **testEnvOverrides** – Verify environment variables override config
4. **testSettingsSync** – Verify settings sync between desktop and TUI

### 3.15 Logging and Monitoring

#### FR‑21: Logging and Monitoring

The application shall implement comprehensive logging and monitoring:

**Logging Levels:**
* **ERROR**: Critical errors that prevent operation
* **WARN**: Warning conditions that don't prevent operation
* **INFO**: General information about application flow
* **DEBUG**: Detailed information for debugging
* **TRACE**: Very detailed information for troubleshooting

**Log Files:**
* **Application Log**: General application events and errors
* **Command History**: All user commands and operations
* **Performance Log**: Performance metrics and timing data
* **Security Log**: Authentication and authorization events

**Log Configuration:**
```json
{
  "logging": {
    "level": "info",
    "maxFileSize": "10MB",
    "maxFiles": 5,
    "enableConsole": true,
    "enableFile": true,
    "enableRemote": false
  }
}
```

**Performance Metrics:**
* Transfer speeds and throughput
* Memory usage and garbage collection
* Network latency and retry counts
* Job completion times and success rates

**Acceptance Tests**

1. **testLogRotation** – Verify log files rotate when size limit reached
2. **testLogLevels** – Verify different log levels are handled correctly
3. **testPerformanceMetrics** – Verify performance data is collected
4. **testCommandHistory** – Verify all commands are logged

### 3.16 Advanced File Operations

#### FR‑22: Advanced File Operations

The application shall support comprehensive file operations:

**File Preview Support:**
* **Text Files**: CSV, SQL, MD, TXT with syntax highlighting
* **Data Files**: Parquet, BigQuery tables, Redshift, Synapse
* **Large Files**: Support for terabyte-sized files with streaming
* **Binary Files**: Hex view for binary files

**Batch Operations:**
* **Select All**: Select all items in current pane
* **Invert Selection**: Invert current selection
* **Select by Filter**: Select items matching filter criteria
* **Select by Type**: Select files by extension or type

**Undo/Redo System:**
* **History Log**: All operations logged for undo/redo
* **Operation Tracking**: Track file operations for rollback
* **State Management**: Maintain application state for undo
* **Limitations**: Some operations (network transfers) cannot be undone

**File Comparison:**
* **Side-by-Side**: Compare two files side-by-side
* **Diff View**: Show differences between files
* **Synchronization**: Sync directories between providers
* **Conflict Resolution**: Handle merge conflicts during sync

**Acceptance Tests**

1. **testFilePreview** – Verify all supported file types can be previewed
2. **testBatchOperations** – Verify batch selection and operations work
3. **testUndoRedo** – Verify undo/redo works for supported operations
4. **testFileComparison** – Verify file comparison and sync work

### 3.17 Security and Permissions

#### FR‑23: Security and Permissions

The application shall implement comprehensive security measures:

**File Permissions:**
* **Cross-Provider**: Handle permissions consistently across providers
* **ACL Support**: Support Access Control Lists where available
* **Permission Mapping**: Map permissions between different provider systems
* **Permission Validation**: Validate permissions before operations

**Encryption:**
* **At Rest**: Encrypt sensitive data in configuration files
* **In Transit**: Use TLS/SSL for all network communications
* **Key Management**: Secure key storage and rotation
* **Data Protection**: Protect user data from unauthorized access

**Audit Logging:**
* **Security Events**: Log all security-related events
* **Access Control**: Track access to sensitive resources
* **Authentication**: Log authentication attempts and failures
* **Authorization**: Track permission changes and access grants

**Security Features:**
* **Credential Management**: Secure storage of provider credentials
* **Session Management**: Secure session handling and timeout
* **Input Validation**: Validate all user inputs and file operations
* **Error Handling**: Secure error messages that don't leak information

**Database Security:**
* **Connection Security**: Encrypted connections to all database providers
* **Credential Rotation**: Automatic rotation of database credentials
* **Query Sanitization**: Prevent SQL injection attacks
* **Access Logging**: Log all database access and queries
* **Data Masking**: Mask sensitive data in logs and previews
* **Role-Based Access**: Implement role-based access control for database operations

**Acceptance Tests**

1. **testPermissionHandling** – Verify permissions are handled correctly
2. **testEncryption** – Verify data is encrypted at rest and in transit
3. **testAuditLogging** – Verify security events are logged
4. **testCredentialSecurity** – Verify credentials are stored securely

### 3.18 Performance and Scalability

#### FR‑24: Performance and Scalability

The application shall handle large-scale operations efficiently:

**Memory Management:**
* **Configurable Limits**: Set memory usage limits in configuration
* **Garbage Collection**: Optimize garbage collection for large operations
* **Memory Swapping**: Support configurable memory swapping
* **Resource Monitoring**: Monitor memory usage and alert on limits

**Network Management:**
* **Bandwidth Throttling**: Configurable network speed limits
* **Connection Pooling**: Reuse connections for efficiency
* **Retry Logic**: Intelligent retry with exponential backoff
* **Timeout Handling**: Configurable timeouts for operations

**Concurrent Operations:**
* **Configurable Limits**: Set maximum concurrent operations
* **Queue Management**: Intelligent job queuing and prioritization
* **Resource Allocation**: Fair resource allocation across operations
* **Performance Monitoring**: Track and optimize performance metrics

**Large File Support:**
* **Streaming**: Stream large files without loading into memory
* **Chunked Operations**: Break large operations into manageable chunks
* **Progress Tracking**: Real-time progress for large operations
* **Resume Support**: Resume interrupted large operations

**Database Performance:**
* **Query Optimization**: Optimize database queries for performance
* **Connection Pooling**: Efficient connection management for databases
* **Caching**: Cache frequently accessed database schemas and metadata
* **Parallel Queries**: Execute multiple database queries in parallel
* **Data Streaming**: Stream large datasets without memory issues
* **Index Management**: Manage database indexes for optimal performance

**Acceptance Tests**

1. **testMemoryLimits** – Verify memory limits are enforced
2. **testNetworkThrottling** – Verify bandwidth throttling works
3. **testConcurrentLimits** – Verify concurrent operation limits
4. **testLargeFileSupport** – Verify terabyte files are handled efficiently

### 3.19 User Experience and Accessibility

#### FR‑25: User Experience and Accessibility

The application shall provide excellent user experience:

**Onboarding:**
* **First-Time Setup**: Simple wizard for initial configuration
* **Provider Setup**: Guided setup for each provider
* **Credential Management**: Secure credential entry and storage
* **Tutorial**: Interactive tutorial for new users

**Help System:**
* **Comprehensive Documentation**: Complete user manual and API docs
* **Contextual Help**: Help available for each feature
* **Keyboard Shortcuts**: Complete keyboard shortcut reference
* **Video Tutorials**: Video guides for complex operations

**Accessibility:**
* **Screen Reader Support**: Full screen reader compatibility
* **Keyboard Navigation**: Complete keyboard navigation support
* **High Contrast**: Support for high contrast themes
* **Font Scaling**: Support for different font sizes

**Internationalization:**
* **RTL Support**: Right-to-left language support
* **LTR Support**: Left-to-right language support
* **Hebrew Support**: Full Hebrew language support
* **Complex Encodings**: Support for complex character encodings
* **Unicode**: Full Unicode support for all languages

**Database User Experience:**
* **Query Builder**: Visual query builder for non-technical users
* **Schema Explorer**: Intuitive database schema exploration
* **Data Preview**: Rich data preview with formatting and filtering
* **Query History**: Track and reuse previous queries
* **Result Export**: Export query results to various formats
* **Database Documentation**: Auto-generated database documentation
* **Data Lineage Visualization**: Visual representation of data flow

**Acceptance Tests**

1. **testOnboarding** – Verify first-time setup works smoothly
2. **testAccessibility** – Verify accessibility features work
3. **testInternationalization** – Verify RTL and complex encodings work
4. **testHelpSystem** – Verify help system is comprehensive
5. **testDatabaseConnection** – Verify database connections work correctly
6. **testQueryExecution** – Verify database queries execute properly
7. **testSchemaManagement** – Verify schema operations work correctly
8. **testPipelineExecution** – Verify data pipelines execute successfully
9. **testDataQuality** – Verify data quality features work
10. **testCrossDatabaseSync** – Verify cross-database synchronization works

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

### 4.4 Extensibility

* The provider abstraction must make it straightforward to add new storage backends.  New providers should implement `IObjectStore` and register themselves in a provider registry.
* UI components must not hard‑code provider names or behaviours.
* Database providers must support standard SQL operations and schema introspection.
* Pipeline providers must support standard workflow execution and monitoring interfaces.

### 4.5 Database and Data Warehouse Performance

* **Query Performance**: Database queries must execute efficiently with proper indexing and optimization.
* **Data Transfer**: Large dataset transfers must use streaming and chunked operations.
* **Concurrent Queries**: Support multiple concurrent database queries with connection pooling.
* **Schema Operations**: Schema comparison and migration must handle large schemas efficiently.
* **Pipeline Execution**: Data pipelines must execute with proper resource management and monitoring.

### 4.6 Data Governance and Compliance

* **Data Lineage**: Track data flow and transformations across all providers.
* **Access Control**: Implement fine-grained access control for database objects.
* **Audit Logging**: Log all database operations and data access for compliance.
* **Data Encryption**: Encrypt sensitive data in transit and at rest.
* **Compliance**: Support GDPR, HIPAA, and other data protection regulations.

### 4.7 Platform Support

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

### 6.2 Test Organisation

Tests should be grouped by functional area:

* `provider.test.ts` – Tests for `IObjectStore` implementations (listing, stat, get/put, copy/move/delete, mkdir).
* `crossProvider.test.ts` – Tests for cross‑provider operations.
* `jobEngine.test.ts` – Tests for job management, progress, cancellation and resume.
* `ui.test.tsx` – Tests for the React UI: keyboard shortcuts, drag‑and‑drop, context menus, error dialogs.
* `auth.test.ts` – Tests for credentials, profiles and permission errors.
* `aifs.test.ts` – Tests specific to AIFS features.
* `plugin.test.ts` – Tests for plugin system architecture, isolation, and communication.
* `pane.test.ts` – Tests for multi-pane layout, navigation, and persistence.
* `tui.test.ts` – Tests for terminal user interface functionality.
* `config.test.ts` – Tests for configuration management, encryption, and migration.
* `logging.test.ts` – Tests for logging, monitoring, and performance metrics.
* `fileOps.test.ts` – Tests for advanced file operations, preview, and batch operations.
* `security.test.ts` – Tests for security, permissions, and audit logging.
* `performance.test.ts` – Tests for performance, scalability, and large file handling.
* `accessibility.test.ts` – Tests for accessibility features and internationalization.
* `database.test.ts` – Tests for database providers (BigQuery, Redshift, Synapse, etc.).
* `pipeline.test.ts` – Tests for data pipeline management (Dataform, dbt, Composer, etc.).
* `schema.test.ts` – Tests for database schema management and comparison.
* `dataQuality.test.ts` – Tests for data quality and governance features.

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

This example clarifies expected behaviour and ties it back to the documentation that limits single‑call copies to 5 GB【835615796489522†L680-L686】.

## 7 Implementation Phases

### 7.1 Phase 1: Core Foundation (MVP)
**Duration**: 8-10 weeks

**Core Features:**
* Basic dual-pane file browser (FR-11)
* Provider abstraction layer (FR-1)
* File system and S3 providers (FR-2 to FR-7)
* Basic job engine (FR-10)
* Simple configuration management (FR-20)
* Basic error handling (FR-14)

**Deliverables:**
* Working Electron application
* File and S3 provider implementations
* Basic UI with keyboard shortcuts
* Job progress tracking
* Configuration persistence

### 7.2 Phase 2: Plugin Architecture (FR-17)
**Duration**: 6-8 weeks

**Core Features:**
* Process-level plugin isolation
* Secure plugin communication
* Plugin lifecycle management
* Provider plugins for GCS, Azure, AIFS
* Plugin security sandboxing

**Deliverables:**
* Plugin system architecture
* All provider plugins
* Plugin management UI
* Security audit and testing

### 7.8 Phase 8: Database and Data Warehouse Providers (FR-26, FR-27, FR-28, FR-29)
**Duration**: 10-12 weeks

**Core Features:**
* Database provider implementations (BigQuery, Redshift, Synapse, Autonomous DW, Snowflake, Databricks)
* Data pipeline management (Dataform, dbt, Composer, Data Factory, Data Flow, Prefect, Dagster)
* Database schema management and comparison
* Data quality and governance features
* Cross-database synchronization

**Deliverables:**
* All database provider plugins
* Pipeline management system
* Schema management tools
* Data quality monitoring
* Cross-database operations

### 7.3 Phase 3: Advanced UI (FR-18, FR-19)
**Duration**: 6-8 weeks

**Core Features:**
* Multi-pane layout system
* Terminal User Interface (TUI)
* Advanced view modes (list, grid, tree)
* Pane persistence and navigation
* Cross-platform terminal support

**Deliverables:**
* Flexible pane arrangements
* Working TUI version
* View mode implementations
* Navigation improvements

### 7.4 Phase 4: Advanced Operations (FR-22)
**Duration**: 8-10 weeks

**Core Features:**
* File preview system
* Batch operations
* Undo/redo functionality
* File comparison and sync
* Large file support (terabyte+)

**Deliverables:**
* Preview system for multiple file types
* Batch operation tools
* History and undo system
* File comparison tools

### 7.5 Phase 5: Security & Performance (FR-23, FR-24)
**Duration**: 6-8 weeks

**Core Features:**
* Security and permissions system
* Performance optimization
* Memory management
* Network throttling
* Audit logging

**Deliverables:**
* Security implementation
* Performance monitoring
* Resource management
* Audit trail system

### 7.6 Phase 6: User Experience (FR-25)
**Duration**: 4-6 weeks

**Core Features:**
* Onboarding system
* Help and documentation
* Accessibility features
* Internationalization
* User experience polish

**Deliverables:**
* Complete user onboarding
* Comprehensive help system
* Accessibility compliance
* Multi-language support

### 7.7 Phase 7: Logging & Monitoring (FR-21)
**Duration**: 4-6 weeks

**Core Features:**
* Comprehensive logging system
* Performance metrics
* Command history
* Log rotation and management
* Monitoring dashboard

**Deliverables:**
* Logging infrastructure
* Performance monitoring
* Command history system
* Monitoring tools

## 8 Risk Assessment and Mitigation

### 8.1 Technical Risks

**High Risk:**
* **Plugin Security**: Process isolation complexity
  - *Mitigation*: Use proven IPC libraries, extensive security testing
* **Large File Handling**: Memory and performance issues
  - *Mitigation*: Streaming architecture, chunked operations
* **Cross-Platform TUI**: Terminal compatibility issues
  - *Mitigation*: Use mature TUI libraries, extensive testing

**Medium Risk:**
* **Provider Integration**: Complex authentication and APIs
  - *Mitigation*: Use official SDKs, comprehensive error handling
* **Performance**: Concurrent operations and resource management
  - *Mitigation*: Configurable limits, monitoring, optimization

**Low Risk:**
* **UI/UX**: User interface complexity
  - *Mitigation*: Iterative design, user testing
* **Configuration**: Complex configuration management
  - *Mitigation*: Simple JSON format, migration tools

### 8.2 Project Risks

**High Risk:**
* **Scope Creep**: Feature additions during development
  - *Mitigation*: Strict phase boundaries, change control process
* **Resource Constraints**: Development team capacity
  - *Mitigation*: Realistic timelines, priority management

**Medium Risk:**
* **Technology Dependencies**: Third-party library issues
  - *Mitigation*: Dependency management, fallback options
* **Testing Complexity**: Comprehensive testing across platforms
  - *Mitigation*: Automated testing, CI/CD pipeline

## 9 Success Criteria

### 9.1 Functional Success
* All functional requirements (FR-1 to FR-25) implemented and tested
* All acceptance tests passing
* Performance targets met (terabyte file support, concurrent operations)
* Security requirements satisfied

### 9.2 Technical Success
* Code coverage > 80%
* Zero critical security vulnerabilities
* Cross-platform compatibility (Windows, macOS, Linux)
* Plugin system working with all providers

### 9.3 User Experience Success
* Intuitive user interface
* Comprehensive help system
* Accessibility compliance
* Multi-language support
* Positive user feedback

### 9.4 Database and Data Warehouse Success
* All database providers working correctly
* Data pipelines executing successfully
* Schema management working across providers
* Data quality monitoring operational
* Cross-database operations working
* Performance targets met for database operations
* Security requirements satisfied for database access

## 10 Post-MVP Roadmap

### 10.1 Future Enhancements
* **Vector Search**: AIFS vector search capabilities
* **Snapshot Management**: Advanced AIFS snapshot features
* **Cloud Integration**: Additional cloud providers
* **Enterprise Features**: SSO, LDAP integration
* **API Development**: REST API for external integrations
* **Advanced Analytics**: Machine learning integration for data analysis
* **Real-time Processing**: Streaming data processing capabilities
* **Data Virtualization**: Virtual data layer across multiple sources
* **Advanced Governance**: Enhanced data governance and compliance features

### 10.2 Community Features
* **Plugin Marketplace**: Third-party plugin distribution
* **Theme System**: Customizable UI themes
* **Scripting Support**: Automation and scripting capabilities
* **Collaboration**: Multi-user features and sharing
* **Database Templates**: Pre-built database schemas and configurations
* **Pipeline Templates**: Reusable data pipeline templates
* **Query Library**: Shared query library and best practices
* **Data Models**: Common data models and schemas

### 10.3 Performance Improvements
* **Caching System**: Intelligent caching for better performance
* **Compression**: Data compression for network transfers
* **Parallel Processing**: Advanced parallel operation support
* **Machine Learning**: Intelligent operation optimization
* **Query Optimization**: Advanced query optimization and indexing
* **Data Partitioning**: Intelligent data partitioning strategies
* **Connection Pooling**: Advanced connection management
* **Data Streaming**: Real-time data streaming capabilities

