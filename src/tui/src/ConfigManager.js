import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
export class ConfigManager {
    constructor() {
        this.configDir = path.join(os.homedir(), '.aifs-commander');
        this.configFile = path.join(this.configDir, 'config.enc');
        this.encryptionKey = this.getOrCreateEncryptionKey();
    }
    getOrCreateEncryptionKey() {
        const keyFile = path.join(this.configDir, '.key');
        try {
            // Try to read existing key
            const key = fsSync.readFileSync(keyFile, 'utf8');
            return key;
        }
        catch (error) {
            // Generate new key if none exists
            const key = crypto.randomBytes(32).toString('hex');
            fsSync.mkdirSync(this.configDir, { recursive: true });
            fsSync.writeFileSync(keyFile, key, { mode: 0o600 }); // Read-only for owner
            return key;
        }
    }
    encrypt(data) {
        const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    }
    decrypt(encryptedData) {
        const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
        const parts = encryptedData.split(':');
        if (parts.length !== 2) {
            throw new Error('Invalid encrypted data format');
        }
        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = parts[1];
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    async loadConfig() {
        try {
            const encryptedData = await fs.readFile(this.configFile, 'utf8');
            const decryptedData = this.decrypt(encryptedData);
            const config = JSON.parse(decryptedData);
            // Validate config structure
            if (!config.providers || !Array.isArray(config.providers)) {
                throw new Error('Invalid config structure');
            }
            // Migration: Add IDs to providers that don't have them
            let needsSave = false;
            config.providers = config.providers.map(provider => {
                if (!provider.id) {
                    needsSave = true;
                    return {
                        ...provider,
                        id: `${provider.scheme}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                    };
                }
                return provider;
            });
            // Save migrated config
            if (needsSave) {
                await this.saveConfig(config);
            }
            return config;
        }
        catch (error) {
            // Return default config if file doesn't exist or is corrupted
            return this.getDefaultConfig();
        }
    }
    async saveConfig(config) {
        try {
            await fs.mkdir(this.configDir, { recursive: true });
            config.lastUpdated = Date.now();
            config.version = '1.0.0';
            const jsonData = JSON.stringify(config, null, 2);
            const encryptedData = this.encrypt(jsonData);
            await fs.writeFile(this.configFile, encryptedData, { mode: 0o600 });
        }
        catch (error) {
            throw new Error(`Failed to save config: ${error.message}`);
        }
    }
    getDefaultConfig() {
        return {
            providers: [
                {
                    id: 'file-default',
                    name: 'Local File System',
                    scheme: 'file',
                    enabled: true,
                    credentials: {},
                    settings: {}
                },
                {
                    id: 's3-default',
                    name: 'Amazon S3',
                    scheme: 's3',
                    enabled: false,
                    credentials: {
                        accessKeyId: '',
                        secretAccessKey: '',
                        region: 'us-east-1',
                        bucket: ''
                    },
                    settings: {
                        endpoint: '',
                        useSSL: true
                    }
                },
                {
                    id: 'gcs-default',
                    name: 'Google Cloud Storage',
                    scheme: 'gcs',
                    enabled: false,
                    credentials: {
                        projectId: '',
                        keyFilename: '',
                        bucket: ''
                    },
                    settings: {
                        location: 'US'
                    }
                },
                {
                    id: 'az-default',
                    name: 'Azure Blob Storage',
                    scheme: 'az',
                    enabled: false,
                    credentials: {
                        connectionString: '',
                        accountName: '',
                        accountKey: '',
                        containerName: ''
                    },
                    settings: {
                        endpoint: ''
                    }
                },
                {
                    id: 'aifs-default',
                    name: 'AIFS',
                    scheme: 'aifs',
                    enabled: false,
                    credentials: {
                        endpoint: 'localhost:50052',
                        authToken: ''
                    },
                    settings: {
                        timeout: 30000,
                        retries: 3
                    }
                }
            ],
            lastUpdated: Date.now(),
            version: '1.0.0'
        };
    }
    async getProviderConfig(scheme) {
        const config = await this.loadConfig();
        return config.providers.find(p => p.scheme === scheme) || null;
    }
    async getProviderConfigById(id) {
        const config = await this.loadConfig();
        return config.providers.find(p => p.id === id) || null;
    }
    async updateProviderConfig(scheme, updates) {
        const config = await this.loadConfig();
        const providerIndex = config.providers.findIndex(p => p.scheme === scheme);
        if (providerIndex === -1) {
            throw new Error(`Provider ${scheme} not found`);
        }
        // Merge with existing configuration, especially credentials
        const existingProvider = config.providers[providerIndex];
        config.providers[providerIndex] = {
            ...existingProvider,
            ...updates,
            credentials: {
                ...existingProvider.credentials,
                ...(updates.credentials || {})
            },
            settings: {
                ...existingProvider.settings,
                ...(updates.settings || {})
            }
        };
        await this.saveConfig(config);
    }
    async updateProviderConfigById(id, updates) {
        const config = await this.loadConfig();
        const providerIndex = config.providers.findIndex(p => p.id === id);
        if (providerIndex === -1) {
            throw new Error(`Provider ${id} not found`);
        }
        // Merge with existing configuration, especially credentials
        const existingProvider = config.providers[providerIndex];
        config.providers[providerIndex] = {
            ...existingProvider,
            ...updates,
            credentials: {
                ...existingProvider.credentials,
                ...(updates.credentials || {})
            },
            settings: {
                ...existingProvider.settings,
                ...(updates.settings || {})
            }
        };
        await this.saveConfig(config);
    }
    async enableProvider(scheme) {
        await this.updateProviderConfig(scheme, { enabled: true });
    }
    async disableProvider(scheme) {
        await this.updateProviderConfig(scheme, { enabled: false });
    }
    async setProviderCredentials(scheme, credentials) {
        await this.updateProviderConfig(scheme, { credentials });
    }
    async setProviderSettings(scheme, settings) {
        await this.updateProviderConfig(scheme, { settings });
    }
    async getEnabledProviders() {
        const config = await this.loadConfig();
        return config.providers.filter(p => p.enabled);
    }
    async deleteProviderConfig(scheme) {
        const config = await this.loadConfig();
        config.providers = config.providers.filter(p => p.scheme !== scheme);
        await this.saveConfig(config);
    }
    async deleteProviderConfigById(id) {
        const config = await this.loadConfig();
        config.providers = config.providers.filter(p => p.id !== id);
        await this.saveConfig(config);
    }
    async validateProviderConfig(scheme) {
        const provider = await this.getProviderConfig(scheme);
        if (!provider) {
            return { valid: false, errors: [`Provider ${scheme} not found`] };
        }
        const errors = [];
        switch (scheme) {
            case 's3':
                if (!provider.credentials.accessKeyId)
                    errors.push('Access Key ID is required');
                if (!provider.credentials.secretAccessKey)
                    errors.push('Secret Access Key is required');
                if (!provider.credentials.region)
                    errors.push('Region is required');
                if (!provider.credentials.bucket)
                    errors.push('Bucket name is required');
                break;
            case 'gcs':
                if (!provider.credentials.projectId)
                    errors.push('Project ID is required');
                if (!provider.credentials.bucket)
                    errors.push('Bucket name is required');
                break;
            case 'az':
                if (!provider.credentials.connectionString &&
                    (!provider.credentials.accountName || !provider.credentials.accountKey)) {
                    errors.push('Either connection string or account name/key is required');
                }
                if (!provider.credentials.containerName)
                    errors.push('Container name is required');
                break;
            case 'aifs':
                if (!provider.credentials.endpoint)
                    errors.push('Endpoint is required');
                break;
        }
        return { valid: errors.length === 0, errors };
    }
}
//# sourceMappingURL=ConfigManager.js.map