import * as fs from 'fs/promises';
import * as path from 'path';
import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3';
import { Storage } from '@google-cloud/storage';
import { BlobServiceClient } from '@azure/storage-blob';
export class ProviderManager {
    constructor() {
        this.currentProvider = 'file';
        this.providers = new Map();
        this.initializeProviders();
    }
    initializeProviders() {
        this.providers.set('file', {
            name: 'file',
            scheme: 'file',
            displayName: 'Local File System',
            description: 'Local file system access',
            available: true
        });
        this.providers.set('s3', {
            name: 's3',
            scheme: 's3',
            displayName: 'Amazon S3',
            description: 'Amazon Simple Storage Service',
            available: false // Will be enabled when credentials are configured
        });
        this.providers.set('gcs', {
            name: 'gcs',
            scheme: 'gcs',
            displayName: 'Google Cloud Storage',
            description: 'Google Cloud Storage',
            available: false // Will be enabled when credentials are configured
        });
        this.providers.set('az', {
            name: 'az',
            scheme: 'az',
            displayName: 'Azure Blob Storage',
            description: 'Microsoft Azure Blob Storage',
            available: false // Will be enabled when credentials are configured
        });
        this.providers.set('aifs', {
            name: 'aifs',
            scheme: 'aifs',
            displayName: 'AIFS',
            description: 'AI-centric File System',
            available: false // Will be enabled when endpoint is configured
        });
    }
    getCurrentProvider() {
        return this.currentProvider;
    }
    getAllProviders() {
        return Array.from(this.providers.values());
    }
    getProviderInfo(scheme) {
        return this.providers.get(scheme);
    }
    setProviderAvailable(scheme, available) {
        const provider = this.providers.get(scheme);
        if (provider) {
            provider.available = available;
        }
    }
    setCurrentProvider(scheme) {
        if (!this.providers.has(scheme)) {
            throw new Error(`Provider ${scheme} not found`);
        }
        const provider = this.providers.get(scheme);
        if (!provider.available) {
            throw new Error(`Provider ${provider.displayName} is not available. Please configure credentials.`);
        }
        this.currentProvider = scheme;
    }
    async list(uri) {
        try {
            // Handle different URI schemes
            if (uri.startsWith('s3://')) {
                return await this.listS3(uri);
            }
            else if (uri.startsWith('gcs://')) {
                return await this.listGCS(uri);
            }
            else if (uri.startsWith('az://')) {
                return await this.listAzure(uri);
            }
            else if (uri.startsWith('aifs://')) {
                return await this.listAIFS(uri);
            }
            else {
                // Handle file system URIs
                const localPath = uri.startsWith('file://') ? uri.replace('file://', '') : uri;
                const stats = await fs.stat(localPath);
                if (!stats.isDirectory()) {
                    throw new Error('Not a directory');
                }
                const entries = await fs.readdir(localPath, { withFileTypes: true, encoding: 'utf8' });
                const items = [];
                for (const entry of entries) {
                    try {
                        const fullPath = path.join(localPath, entry.name);
                        const stats = await fs.stat(fullPath);
                        // Decode the file name properly
                        let decodedName = entry.name;
                        try {
                            // Remove any leading question marks that might be from encoding issues
                            decodedName = decodedName.replace(/^\?+\s*/, '');
                            // Try to decode URL-encoded characters
                            if (decodedName.includes('%')) {
                                decodedName = decodeURIComponent(decodedName);
                            }
                            // Handle other common encoding issues
                            // If the name looks like it might be double-encoded, try decoding again
                            if (decodedName.includes('%') && decodedName.match(/%[0-9A-Fa-f]{2}/)) {
                                try {
                                    decodedName = decodeURIComponent(decodedName);
                                }
                                catch (e) {
                                    // If double decoding fails, keep the single decoded version
                                }
                            }
                            // Clean up any remaining encoding artifacts
                            decodedName = decodedName.replace(/^\?+\s*/, '');
                            // Keep the full decoded name - let the TUI handle truncation if needed
                            // The TUI will handle display truncation with ... if the name is too long
                        }
                        catch (decodeError) {
                            // If decoding fails, use the original name but clean it up
                            decodedName = entry.name.replace(/^\?+\s*/, '');
                            console.warn('Failed to decode filename:', entry.name, decodeError);
                        }
                        items.push({
                            name: decodedName,
                            isDirectory: entry.isDirectory(),
                            size: stats.size,
                            mtime: stats.mtime,
                            uri: `file://${path.resolve(fullPath)}`
                        });
                    }
                    catch (statError) {
                        // Skip files we can't access
                        continue;
                    }
                }
                // Sort: directories first, then files
                items.sort((a, b) => {
                    if (a.isDirectory && !b.isDirectory)
                        return -1;
                    if (!a.isDirectory && b.isDirectory)
                        return 1;
                    return a.name.localeCompare(b.name);
                });
                return { items, nextPageToken: undefined };
            }
        }
        catch (error) {
            throw new Error(`Cannot read directory: ${error.message}`);
        }
    }
    async listS3(uri) {
        try {
            // Create S3 client with default credentials
            const s3Client = new S3Client({});
            // Parse the S3 URI
            const s3Uri = uri.replace('s3://', '');
            const parts = s3Uri.split('/');
            const bucketName = parts[0];
            const prefix = parts.slice(1).join('/');
            if (!bucketName) {
                // List all buckets
                const command = new ListBucketsCommand({});
                const response = await s3Client.send(command);
                const items = [];
                if (response.Buckets) {
                    for (const bucket of response.Buckets) {
                        if (bucket.Name) {
                            items.push({
                                name: `${bucket.Name}/`,
                                isDirectory: true,
                                size: 0,
                                mtime: bucket.CreationDate || new Date(),
                                uri: `s3://${bucket.Name}/`
                            });
                        }
                    }
                }
                return { items };
            }
            else {
                // List objects in bucket
                const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
                const command = new ListObjectsV2Command({
                    Bucket: bucketName,
                    Prefix: prefix,
                    Delimiter: '/',
                    MaxKeys: 1000
                });
                const response = await s3Client.send(command);
                const items = [];
                // Add common prefixes (directories)
                if (response.CommonPrefixes) {
                    for (const commonPrefix of response.CommonPrefixes) {
                        if (commonPrefix.Prefix) {
                            const name = commonPrefix.Prefix.replace(prefix, '').replace(/\/$/, '');
                            if (name) {
                                items.push({
                                    name: `${name}/`,
                                    isDirectory: true,
                                    size: 0,
                                    mtime: new Date(),
                                    uri: `s3://${bucketName}/${commonPrefix.Prefix}`
                                });
                            }
                        }
                    }
                }
                // Add objects (files)
                if (response.Contents) {
                    for (const object of response.Contents) {
                        if (object.Key && object.Key !== prefix) {
                            const name = object.Key.replace(prefix, '');
                            if (name && !name.includes('/')) {
                                items.push({
                                    name: name,
                                    isDirectory: false,
                                    size: object.Size || 0,
                                    mtime: object.LastModified || new Date(),
                                    uri: `s3://${bucketName}/${object.Key}`
                                });
                            }
                        }
                    }
                }
                return { items };
            }
        }
        catch (error) {
            console.error('S3 list error:', error);
            return {
                items: [
                    {
                        name: `Error: ${error.message}`,
                        isDirectory: false,
                        size: 0,
                        mtime: new Date(),
                        uri: 's3://error/'
                    }
                ]
            };
        }
    }
    async listGCS(_uri) {
        try {
            // Create GCS client with default credentials
            const storage = new Storage({});
            // List all buckets
            const [buckets] = await storage.getBuckets();
            const items = [];
            for (const bucket of buckets) {
                items.push({
                    name: `${bucket.name}/`,
                    isDirectory: true,
                    size: 0,
                    mtime: bucket.metadata.timeCreated ? new Date(bucket.metadata.timeCreated) : new Date(),
                    uri: `gcs://${bucket.name}/`
                });
            }
            return { items };
        }
        catch (error) {
            console.error('GCS list error:', error);
            // Check if it's a permission error
            const errorMessage = error.message;
            if (errorMessage.includes('permission') || errorMessage.includes('access') || errorMessage.includes('403')) {
                return {
                    items: [
                        {
                            name: 'Permission Error: Insufficient GCP permissions',
                            isDirectory: false,
                            size: 0,
                            mtime: new Date(),
                            uri: 'gcs://error/'
                        },
                        {
                            name: 'Please check your GCP credentials and permissions',
                            isDirectory: false,
                            size: 0,
                            mtime: new Date(),
                            uri: 'gcs://error/'
                        }
                    ]
                };
            }
            return {
                items: [
                    {
                        name: `Error: ${errorMessage}`,
                        isDirectory: false,
                        size: 0,
                        mtime: new Date(),
                        uri: 'gcs://error/'
                    }
                ]
            };
        }
    }
    async listAzure(_uri) {
        try {
            // Create Azure client with default credentials
            const blobServiceClient = new BlobServiceClient(process.env.AZURE_STORAGE_ACCOUNT_URL || 'https://yourstorageaccount.blob.core.windows.net');
            // List all containers
            const containers = blobServiceClient.listContainers();
            const items = [];
            for await (const container of containers) {
                items.push({
                    name: `${container.name}/`,
                    isDirectory: true,
                    size: 0,
                    mtime: container.properties.lastModified || new Date(),
                    uri: `az://${container.name}/`
                });
            }
            return { items };
        }
        catch (error) {
            console.error('Azure list error:', error);
            return {
                items: [
                    {
                        name: `Error: ${error.message}`,
                        isDirectory: false,
                        size: 0,
                        mtime: new Date(),
                        uri: 'az://error/'
                    }
                ]
            };
        }
    }
    async listAIFS(_uri) {
        // For now, return a placeholder - this would need the actual AIFS provider
        return {
            items: [
                {
                    name: 'aifs-directory1/',
                    isDirectory: true,
                    size: 0,
                    mtime: new Date(),
                    uri: 'aifs://directory1/'
                }
            ]
        };
    }
    async copy(srcUri, destUri) {
        const srcPath = srcUri.startsWith('file://') ? srcUri.replace('file://', '') : srcUri;
        const destPath = destUri.startsWith('file://') ? destUri.replace('file://', '') : destUri;
        try {
            const srcStats = await fs.stat(srcPath);
            if (srcStats.isDirectory()) {
                // Copy directory recursively
                await this.copyDirectory(srcPath, destPath);
            }
            else {
                // Copy file
                const destDir = path.dirname(destPath);
                await fs.mkdir(destDir, { recursive: true });
                await fs.copyFile(srcPath, destPath);
            }
        }
        catch (error) {
            throw new Error(`Copy failed: ${error.message}`);
        }
    }
    async copyDirectory(srcDir, destDir) {
        await fs.mkdir(destDir, { recursive: true });
        const entries = await fs.readdir(srcDir, { withFileTypes: true });
        for (const entry of entries) {
            const srcPath = path.join(srcDir, entry.name);
            const destPath = path.join(destDir, entry.name);
            if (entry.isDirectory()) {
                await this.copyDirectory(srcPath, destPath);
            }
            else {
                await fs.copyFile(srcPath, destPath);
            }
        }
    }
    async move(srcUri, destUri) {
        const srcPath = srcUri.startsWith('file://') ? srcUri.replace('file://', '') : srcUri;
        const destPath = destUri.startsWith('file://') ? destUri.replace('file://', '') : destUri;
        try {
            await fs.rename(srcPath, destPath);
        }
        catch (error) {
            throw new Error(`Move failed: ${error.message}`);
        }
    }
    async delete(uri) {
        const filePath = uri.startsWith('file://') ? uri.replace('file://', '') : uri;
        try {
            const stats = await fs.stat(filePath);
            if (stats.isDirectory()) {
                // Delete directory recursively
                await fs.rm(filePath, { recursive: true, force: true });
            }
            else {
                // Delete file
                await fs.unlink(filePath);
            }
        }
        catch (error) {
            throw new Error(`Delete failed: ${error.message}`);
        }
    }
    async mkdir(uri) {
        const dirPath = uri.startsWith('file://') ? uri.replace('file://', '') : uri;
        try {
            await fs.mkdir(dirPath, { recursive: true });
        }
        catch (error) {
            throw new Error(`Mkdir failed: ${error.message}`);
        }
    }
}
//# sourceMappingURL=ProviderManager.js.map