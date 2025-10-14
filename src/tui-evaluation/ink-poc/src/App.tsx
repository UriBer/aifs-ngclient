import React, { useState, useReducer, useCallback, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { FilePane } from './components/FilePane.js';
import { StatusBar } from './components/StatusBar.js';
import { Modal } from './components/Modal.js';
import { ProgressIndicator } from './components/ProgressIndicator.js';
import { useProviderManager } from './hooks/useProviderManager.js';

// Types
export interface FileItem {
  name: string;
  uri: string;
  isDirectory: boolean;
  size: number;
  lastModified?: Date;
}

export interface PaneState {
  uri: string;
  items: FileItem[];
  selectedIndex: number;
  selectedItems: Set<string>;
  provider: string;
  loading: boolean;
  error?: string;
}

export interface AppState {
  leftPane: PaneState;
  rightPane: PaneState;
  currentPane: 'left' | 'right';
  dividerPosition: number;
  modal: {
    isOpen: boolean;
    type?: 'confirm' | 'input' | 'progress';
    title?: string;
    message?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  };
  progress: {
    isVisible: boolean;
    message: string;
    percentage?: number;
  };
  status: {
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
  };
}

// Action types
type AppAction =
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
  | { type: 'SET_ERROR'; payload: { pane: 'left' | 'right'; error?: string } };

// Initial state
const initialState: AppState = {
  leftPane: {
    uri: process.env.HOME || '/',
    items: [],
    selectedIndex: 0,
    selectedItems: new Set(),
    provider: 'file',
    loading: false,
  },
  rightPane: {
    uri: process.env.HOME || '/',
    items: [],
    selectedIndex: 0,
    selectedItems: new Set(),
    provider: 'file',
    loading: false,
  },
  currentPane: 'left',
  dividerPosition: 50,
  modal: {
    isOpen: false,
  },
  progress: {
    isVisible: false,
    message: '',
  },
  status: {
    message: 'AIFS Commander TUI - Press F1 for help, F10 to quit',
    type: 'info',
  },
};

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LEFT_PANE':
      return {
        ...state,
        leftPane: { ...state.leftPane, ...action.payload },
      };
    case 'SET_RIGHT_PANE':
      return {
        ...state,
        rightPane: { ...state.rightPane, ...action.payload },
      };
    case 'SET_CURRENT_PANE':
      return {
        ...state,
        currentPane: action.payload,
      };
    case 'SET_DIVIDER_POSITION':
      return {
        ...state,
        dividerPosition: Math.max(20, Math.min(80, action.payload)),
      };
    case 'OPEN_MODAL':
      return {
        ...state,
        modal: { ...action.payload, isOpen: true },
      };
    case 'CLOSE_MODAL':
      return {
        ...state,
        modal: { isOpen: false },
      };
    case 'SHOW_PROGRESS':
      return {
        ...state,
        progress: { ...action.payload, isVisible: true },
      };
    case 'HIDE_PROGRESS':
      return {
        ...state,
        progress: { isVisible: false, message: '' },
      };
    case 'SET_STATUS':
      return {
        ...state,
        status: action.payload,
      };
    case 'LOAD_DIRECTORY':
      const pane = action.payload.pane === 'left' ? 'leftPane' : 'rightPane';
      return {
        ...state,
        [pane]: {
          ...state[pane],
          uri: action.payload.uri,
          provider: action.payload.provider,
          loading: true,
          error: undefined,
        },
      };
    case 'SET_LOADING':
      const targetPane = action.payload.pane === 'left' ? 'leftPane' : 'rightPane';
      return {
        ...state,
        [targetPane]: {
          ...state[targetPane],
          loading: action.payload.loading,
        },
      };
    case 'SET_ERROR':
      const errorPane = action.payload.pane === 'left' ? 'leftPane' : 'rightPane';
      return {
        ...state,
        [errorPane]: {
          ...state[errorPane],
          error: action.payload.error,
          loading: false,
        },
      };
    default:
      return state;
  }
}

// Main App component
export function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { exit } = useApp();
  const { loadDirectory, switchProvider } = useProviderManager();

  // Handle keyboard input
  useInput((input: string, key: any) => {
    if (state.modal.isOpen) {
      handleModalInput(input, key);
      return;
    }

    switch (input) {
      case 'q':
      case 'Q':
        if (key.ctrl || key.meta) {
          exit();
        }
        break;
      case 'tab':
        dispatch({
          type: 'SET_CURRENT_PANE',
          payload: state.currentPane === 'left' ? 'right' : 'left',
        });
        break;
      case 'f1':
        dispatch({
          type: 'OPEN_MODAL',
          payload: {
            isOpen: true,
            type: 'confirm',
            title: 'Help',
            message: 'Keyboard shortcuts:\n\nTab: Switch panes\nEnter: Open directory\nBackspace: Go up\nF1: Help\nF10: Quit\nCtrl+Q: Quit',
            onConfirm: () => dispatch({ type: 'CLOSE_MODAL' }),
          },
        });
        break;
      case 'f10':
        exit();
        break;
      case 'p':
        if (key.ctrl || key.meta) {
          showProviderMenu();
        }
        break;
      case 'r':
        if (key.ctrl || key.meta) {
          refreshCurrentPane();
        }
        break;
    }

    // Handle arrow keys for navigation
    if (key.leftArrow) {
      dispatch({
        type: 'SET_DIVIDER_POSITION',
        payload: state.dividerPosition - 5,
      });
    } else if (key.rightArrow) {
      dispatch({
        type: 'SET_DIVIDER_POSITION',
        payload: state.dividerPosition + 5,
      });
    }
  });

  const handleModalInput = (input: string, key: { return?: boolean; escape?: boolean }) => {
    if (input === 'y' || input === 'Y' || key.return) {
      state.modal.onConfirm?.();
    } else if (input === 'n' || input === 'N' || key.escape) {
      state.modal.onCancel?.();
    }
  };

  const showProviderMenu = () => {
    dispatch({
      type: 'OPEN_MODAL',
      payload: {
        isOpen: true,
        type: 'confirm',
        title: 'Switch Provider',
        message: 'Choose provider:\n\n1. Local File System\n2. AWS S3\n3. Google Cloud Storage\n4. Azure Blob Storage\n\nPress number to select',
        onConfirm: () => dispatch({ type: 'CLOSE_MODAL' }),
      },
    });
  };

  const refreshCurrentPane = useCallback(async () => {
    const currentPaneState = state.currentPane === 'left' ? state.leftPane : state.rightPane;
    
    dispatch({
      type: 'SET_LOADING',
      payload: { pane: state.currentPane, loading: true },
    });

    try {
      const items = await loadDirectory(currentPaneState.uri, currentPaneState.provider);
      dispatch({
        type: state.currentPane === 'left' ? 'SET_LEFT_PANE' : 'SET_RIGHT_PANE',
        payload: { items, loading: false, error: undefined },
      });
      dispatch({
        type: 'SET_STATUS',
        payload: {
          message: `Loaded ${items.length} items from ${currentPaneState.provider}`,
          type: 'success',
        },
      });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: {
          pane: state.currentPane,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      dispatch({
        type: 'SET_STATUS',
        payload: {
          message: `Error loading directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
          type: 'error',
        },
      });
    }
  }, [state.currentPane, state.leftPane, state.rightPane, loadDirectory]);

  // Load initial directories
  useEffect(() => {
    const loadInitialData = async () => {
      dispatch({
        type: 'SHOW_PROGRESS',
        payload: { isVisible: true, message: 'Loading initial directories...' },
      });

      try {
        // Load left pane
        const leftItems = await loadDirectory(state.leftPane.uri, state.leftPane.provider);
        dispatch({
          type: 'SET_LEFT_PANE',
          payload: { items: leftItems, loading: false },
        });

        // Load right pane
        const rightItems = await loadDirectory(state.rightPane.uri, state.rightPane.provider);
        dispatch({
          type: 'SET_RIGHT_PANE',
          payload: { items: rightItems, loading: false },
        });

        dispatch({
          type: 'HIDE_PROGRESS',
        });

        dispatch({
          type: 'SET_STATUS',
          payload: {
            message: 'AIFS Commander TUI - Ready',
            type: 'success',
          },
        });
      } catch (error) {
        dispatch({
          type: 'HIDE_PROGRESS',
        });
        dispatch({
          type: 'SET_STATUS',
          payload: {
            message: `Error loading initial data: ${error instanceof Error ? error.message : 'Unknown error'}`,
            type: 'error',
          },
        });
      }
    };

    loadInitialData();
  }, []);

  return (
    <Box flexDirection="column" height="100%" width="100%">
      {/* Status messages */}
      {state.status.message && (
        <Box marginBottom={1}>
          <Text color={state.status.type === 'error' ? 'red' : state.status.type === 'success' ? 'green' : 'white'}>
            {state.status.message}
          </Text>
        </Box>
      )}

      {/* Main content area */}
      <Box flexDirection="row" flexGrow={1}>
        {/* Left pane */}
        <Box width={`${state.dividerPosition}%`} borderStyle="single" borderColor="gray">
          <FilePane
            pane="left"
            state={state.leftPane}
            isActive={state.currentPane === 'left'}
            onNavigate={(uri) => {
              dispatch({
                type: 'LOAD_DIRECTORY',
                payload: { pane: 'left', uri, provider: state.leftPane.provider },
              });
            }}
            onSelect={(index) => {
              dispatch({
                type: 'SET_LEFT_PANE',
                payload: { selectedIndex: index },
              });
            }}
            onToggleSelection={(item) => {
              const newSelected = new Set(state.leftPane.selectedItems);
              if (newSelected.has(item.uri)) {
                newSelected.delete(item.uri);
              } else {
                newSelected.add(item.uri);
              }
              dispatch({
                type: 'SET_LEFT_PANE',
                payload: { selectedItems: newSelected },
              });
            }}
          />
        </Box>

        {/* Right pane */}
        <Box width={`${100 - state.dividerPosition}%`} borderStyle="single" borderColor="gray">
          <FilePane
            pane="right"
            state={state.rightPane}
            isActive={state.currentPane === 'right'}
            onNavigate={(uri) => {
              dispatch({
                type: 'LOAD_DIRECTORY',
                payload: { pane: 'right', uri, provider: state.rightPane.provider },
              });
            }}
            onSelect={(index) => {
              dispatch({
                type: 'SET_RIGHT_PANE',
                payload: { selectedIndex: index },
              });
            }}
            onToggleSelection={(item) => {
              const newSelected = new Set(state.rightPane.selectedItems);
              if (newSelected.has(item.uri)) {
                newSelected.delete(item.uri);
              } else {
                newSelected.add(item.uri);
              }
              dispatch({
                type: 'SET_RIGHT_PANE',
                payload: { selectedItems: newSelected },
              });
            }}
          />
        </Box>
      </Box>

      {/* Status bar */}
      <StatusBar
        leftPane={state.leftPane}
        rightPane={state.rightPane}
        currentPane={state.currentPane}
      />

      {/* Modal */}
      {state.modal.isOpen && (
        <Modal
          type={state.modal.type}
          title={state.modal.title}
          message={state.modal.message}
          onConfirm={state.modal.onConfirm}
          onCancel={state.modal.onCancel}
        />
      )}

      {/* Progress indicator */}
      {state.progress.isVisible && (
        <ProgressIndicator
          message={state.progress.message}
          percentage={state.progress.percentage}
        />
      )}
    </Box>
  );
}
