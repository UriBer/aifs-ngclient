// Types for Ink TUI implementation

export interface FileItem {
  name: string;
  uri: string;
  isDirectory: boolean;
  size: number;
  lastModified?: Date;
  permissions?: string;
  owner?: string;
  group?: string;
}

export interface PaneState {
  uri: string;
  items: FileItem[];
  selectedIndex: number;
  selectedItems: Set<string>;
  provider: string;
  loading: boolean;
  error?: string;
  scrollOffset: number;
  filter?: string;
}

export interface AppState {
  leftPane: PaneState;
  rightPane: PaneState;
  currentPane: 'left' | 'right';
  dividerPosition: number;
  modal: {
    isOpen: boolean;
    type?: 'confirm' | 'input' | 'progress' | 'help' | 'provider';
    title?: string;
    message?: string;
    inputValue?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
    onSubmit?: (value: string) => void;
  };
  progress: {
    isVisible: boolean;
    message: string;
    percentage?: number;
    operation?: string;
  };
  status: {
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    timestamp: number;
  };
  settings: {
    showHidden: boolean;
    sortBy: 'name' | 'size' | 'date' | 'type';
    sortOrder: 'asc' | 'desc';
    viewMode: 'list' | 'grid';
  };
}

export type AppAction =
  | { type: 'SET_LEFT_PANE'; payload: Partial<PaneState> }
  | { type: 'SET_RIGHT_PANE'; payload: Partial<PaneState> }
  | { type: 'SET_CURRENT_PANE'; payload: 'left' | 'right' }
  | { type: 'SET_DIVIDER_POSITION'; payload: number }
  | { type: 'OPEN_MODAL'; payload: AppState['modal'] }
  | { type: 'CLOSE_MODAL' }
  | { type: 'SHOW_PROGRESS'; payload: AppState['progress'] }
  | { type: 'HIDE_PROGRESS' }
  | { type: 'SET_STATUS'; payload: AppState['status'] }
  | { type: 'LOAD_DIRECTORY'; payload: { pane: 'left' | 'right'; uri: string; provider: string } }
  | { type: 'SET_LOADING'; payload: { pane: 'left' | 'right'; loading: boolean } }
  | { type: 'SET_ERROR'; payload: { pane: 'left' | 'right'; error?: string } }
  | { type: 'SELECT_ITEM'; payload: { pane: 'left' | 'right'; index: number } }
  | { type: 'TOGGLE_SELECTION'; payload: { pane: 'left' | 'right'; item: FileItem } }
  | { type: 'CLEAR_SELECTION'; payload: { pane: 'left' | 'right' } }
  | { type: 'SET_FILTER'; payload: { pane: 'left' | 'right'; filter: string } }
  | { type: 'SET_SCROLL_OFFSET'; payload: { pane: 'left' | 'right'; offset: number } }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppState['settings']> }
  | { type: 'COPY_FILES'; payload: { sources: FileItem[]; destination: string } }
  | { type: 'MOVE_FILES'; payload: { sources: FileItem[]; destination: string } }
  | { type: 'DELETE_FILES'; payload: { items: FileItem[] } }
  | { type: 'RENAME_FILE'; payload: { item: FileItem; newName: string } }
  | { type: 'CREATE_DIRECTORY'; payload: { parentUri: string; name: string } };

export interface ProviderInfo {
  name: string;
  scheme: string;
  displayName: string;
  icon: string;
  isAvailable: boolean;
  isConfigured: boolean;
  credentials?: any;
}

export interface FileOperation {
  type: 'copy' | 'move' | 'delete' | 'rename' | 'create';
  source: string;
  destination?: string;
  items: FileItem[];
  progress: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
}

export interface KeyboardShortcut {
  key: string;
  description: string;
  action: () => void;
  category: 'navigation' | 'selection' | 'operations' | 'view' | 'help';
}

export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    background: string;
    foreground: string;
    border: string;
    selected: string;
    disabled: string;
  };
  icons: {
    file: string;
    directory: string;
    symlink: string;
    executable: string;
    archive: string;
    image: string;
    video: string;
    audio: string;
    document: string;
    code: string;
  };
  providers: {
    file: string;
    s3: string;
    gcs: string;
    az: string;
    aifs: string;
    unknown: string;
  };
}

export interface Config {
  theme: Theme;
  shortcuts: KeyboardShortcut[];
  providers: ProviderInfo[];
  defaultProvider: string;
  autoRefresh: boolean;
  refreshInterval: number;
  maxFileSize: number;
  showHiddenFiles: boolean;
  confirmDeletions: boolean;
  enableLogging: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}
