export interface FileItem {
  name: string;
  isDirectory: boolean;
  size: number;
  mtime: Date;
}

export interface NavigationHistoryEntry {
  uri: string;
  selectedIndex: number;
}

export type PaneType = 'left' | 'right';

export interface TuiApplicationOptions {
  // Future configuration options can be added here
}
