import { FileItem } from './types.js';
export interface ProviderInfo {
    name: string;
    scheme: string;
    displayName: string;
    description: string;
    available: boolean;
}
export declare class ProviderManager {
    private currentProvider;
    private providers;
    constructor();
    private initializeProviders;
    getCurrentProvider(): string;
    getAllProviders(): ProviderInfo[];
    getProviderInfo(scheme: string): ProviderInfo | undefined;
    setProviderAvailable(scheme: string, available: boolean): void;
    setCurrentProvider(scheme: string): void;
    list(uri: string): Promise<{
        items: FileItem[];
        nextPageToken?: string;
    }>;
    private listS3;
    private listGCS;
    private listAzure;
    private listAIFS;
    copy(srcUri: string, destUri: string): Promise<void>;
    private copyDirectory;
    move(srcUri: string, destUri: string): Promise<void>;
    delete(uri: string): Promise<void>;
    mkdir(uri: string): Promise<void>;
}
//# sourceMappingURL=ProviderManager.d.ts.map