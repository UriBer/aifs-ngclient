export interface ProviderConfig {
    id: string;
    name: string;
    scheme: string;
    enabled: boolean;
    credentials: Record<string, string>;
    settings: Record<string, any>;
}
export interface AppConfig {
    providers: ProviderConfig[];
    lastUpdated: number;
    version: string;
}
export declare class ConfigManager {
    private configDir;
    private configFile;
    private encryptionKey;
    constructor();
    private getOrCreateEncryptionKey;
    private encrypt;
    private decrypt;
    loadConfig(): Promise<AppConfig>;
    saveConfig(config: AppConfig): Promise<void>;
    private getDefaultConfig;
    getProviderConfig(scheme: string): Promise<ProviderConfig | null>;
    getProviderConfigById(id: string): Promise<ProviderConfig | null>;
    updateProviderConfig(scheme: string, updates: Partial<ProviderConfig>): Promise<void>;
    updateProviderConfigById(id: string, updates: Partial<ProviderConfig>): Promise<void>;
    enableProvider(scheme: string): Promise<void>;
    disableProvider(scheme: string): Promise<void>;
    setProviderCredentials(scheme: string, credentials: Record<string, string>): Promise<void>;
    setProviderSettings(scheme: string, settings: Record<string, any>): Promise<void>;
    getEnabledProviders(): Promise<ProviderConfig[]>;
    deleteProviderConfig(scheme: string): Promise<void>;
    deleteProviderConfigById(id: string): Promise<void>;
    validateProviderConfig(scheme: string): Promise<{
        valid: boolean;
        errors: string[];
    }>;
}
//# sourceMappingURL=ConfigManager.d.ts.map