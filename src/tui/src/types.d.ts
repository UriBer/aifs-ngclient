export interface FileItem {
    name: string;
    isDirectory: boolean;
    size: number;
    mtime: Date;
    uri: string;
}
export interface NavigationHistoryEntry {
    uri: string;
    selectedIndex: number;
}
export type PaneType = 'left' | 'right';
export interface TuiApplicationOptions {
}
export interface ProviderInfo {
    name: string;
    scheme: string;
    displayName: string;
}
//# sourceMappingURL=types.d.ts.map