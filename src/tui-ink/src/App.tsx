import React, { useReducer, useCallback, useEffect } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { FilePane } from './components/FilePane.js';
import { StatusBar } from './components/StatusBar.js';
import { Modal } from './components/Modal.js';
import { ProgressIndicator } from './components/ProgressIndicator.js';
import { useFileBrowser } from './hooks/useFileBrowser.js';
import { useFileOperations } from './hooks/useFileOperations.js';
import { appReducer, initialState } from './state/appReducer.js';
import { AppState, FileItem } from './types.js';

export function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { exit } = useApp();
  const { loadDirectory, switchProvider, loadState, saveState, isInitialized } = useFileBrowser();
  const { copyFiles, moveFiles, deleteFiles, createDirectory, renameFile, isRunning: operationRunning } = useFileOperations();

  // Use Ink's built-in input handling
  useInput((input, key) => {
    console.log('Input received:', JSON.stringify(input), 'Key:', key);
    
    // Handle function keys - Ink doesn't have direct function key properties
    // We'll handle them through the input string
    if (input === 'f1') {
      console.log('F1 detected!');
      dispatch({
        type: 'OPEN_MODAL',
        payload: {
          isOpen: true,
          type: 'help',
          title: 'Help',
          message: 'Keyboard shortcuts',
        },
      });
      return;
    }

    if (input === 'f10') {
      console.log('F10 detected!');
      exit();
      return;
    }

    if (input === 'f5') {
      console.log('F5 detected!');
      handleCopyFiles();
      return;
    }

    if (input === 'f6') {
      console.log('F6 detected!');
      handleMoveFiles();
      return;
    }

    if (input === 'f7') {
      console.log('F7 detected!');
      handleCreateDirectory();
      return;
    }

    if (input === 'f8') {
      console.log('F8 detected!');
      handleDeleteFiles();
      return;
    }

    // Handle Tab key
    if (key.tab) {
      console.log('Tab detected!');
      dispatch({
        type: 'SET_CURRENT_PANE',
        payload: state.currentPane === 'left' ? 'right' : 'left',
      });
      return;
    }

    // Handle Enter key
    if (key.return) {
      console.log('Enter detected!');
      const currentPaneState = state.currentPane === 'left' ? state.leftPane : state.rightPane;
      const filteredItems = currentPaneState.filter ? 
        currentPaneState.items.filter(item => 
          item.name.toLowerCase().includes(currentPaneState.filter!.toLowerCase())
        ) : currentPaneState.items;
      
      if (filteredItems[currentPaneState.selectedIndex]?.isDirectory) {
        handleNavigate(filteredItems[currentPaneState.selectedIndex].uri);
      }
      return;
    }

    // Handle arrow keys
    if (key.upArrow) {
      console.log('Up arrow detected!');
      const currentPaneState = state.currentPane === 'left' ? state.leftPane : state.rightPane;
      const newIndex = Math.max(0, currentPaneState.selectedIndex - 1);
      dispatch({
        type: 'SELECT_ITEM',
        payload: { pane: state.currentPane, index: newIndex },
      });
      return;
    }

    if (key.downArrow) {
      console.log('Down arrow detected!');
      const currentPaneState = state.currentPane === 'left' ? state.leftPane : state.rightPane;
      const filteredItems = currentPaneState.filter ? 
        currentPaneState.items.filter(item => 
          item.name.toLowerCase().includes(currentPaneState.filter!.toLowerCase())
        ) : currentPaneState.items;
      const newIndex = Math.min(filteredItems.length - 1, currentPaneState.selectedIndex + 1);
      dispatch({
        type: 'SELECT_ITEM',
        payload: { pane: state.currentPane, index: newIndex },
      });
      return;
    }

    // Handle Space key for selection
    if (input === ' ') {
      console.log('Space detected!');
      const currentPaneState = state.currentPane === 'left' ? state.leftPane : state.rightPane;
      const filteredItems = currentPaneState.filter ? 
        currentPaneState.items.filter(item => 
          item.name.toLowerCase().includes(currentPaneState.filter!.toLowerCase())
        ) : currentPaneState.items;
      
      if (filteredItems[currentPaneState.selectedIndex]) {
        dispatch({
          type: 'TOGGLE_SELECTION',
          payload: { pane: state.currentPane, item: filteredItems[currentPaneState.selectedIndex] },
        });
      }
      return;
    }

    // Handle other keys
    if (input === 'h') {
      console.log('H key detected!');
      // Go up directory
      const currentPaneState = state.currentPane === 'left' ? state.leftPane : state.rightPane;
      const currentUri = currentPaneState.uri;
      const parentUri = currentUri.split('/').slice(0, -1).join('/') || '/';
      if (parentUri !== currentUri) {
        handleNavigate(parentUri);
      }
      return;
    }

    if (input === 'j') {
      console.log('J key detected!');
      const currentPaneState = state.currentPane === 'left' ? state.leftPane : state.rightPane;
      const filteredItems = currentPaneState.filter ? 
        currentPaneState.items.filter(item => 
          item.name.toLowerCase().includes(currentPaneState.filter!.toLowerCase())
        ) : currentPaneState.items;
      const newIndex = Math.min(filteredItems.length - 1, currentPaneState.selectedIndex + 1);
      dispatch({
        type: 'SELECT_ITEM',
        payload: { pane: state.currentPane, index: newIndex },
      });
      return;
    }

    if (input === 'k') {
      console.log('K key detected!');
      const currentPaneState = state.currentPane === 'left' ? state.leftPane : state.rightPane;
      const newIndex = Math.max(0, currentPaneState.selectedIndex - 1);
      dispatch({
        type: 'SELECT_ITEM',
        payload: { pane: state.currentPane, index: newIndex },
      });
      return;
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
        type: 'provider',
        title: 'Switch Provider',
        message: 'Choose provider',
      },
    });
  };

  const showFilterDialog = () => {
    dispatch({
      type: 'OPEN_MODAL',
      payload: {
        isOpen: true,
        type: 'input',
        title: 'Filter Files',
        message: 'Enter filter text:',
        inputValue: '',
        onSubmit: (value: string) => {
          dispatch({
            type: 'SET_FILTER',
            payload: { pane: state.currentPane, filter: value },
          });
          dispatch({ type: 'CLOSE_MODAL' });
        },
        onCancel: () => dispatch({ type: 'CLOSE_MODAL' }),
      },
    });
  };

  const toggleHiddenFiles = () => {
    dispatch({
      type: 'UPDATE_SETTINGS',
      payload: { showHidden: !state.settings.showHidden },
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
          timestamp: Date.now(),
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
          timestamp: Date.now(),
        },
      });
    }
  }, [state.currentPane, state.leftPane, state.rightPane, loadDirectory]);

  const handleNavigate = useCallback(async (uri: string) => {
    dispatch({
      type: 'LOAD_DIRECTORY',
      payload: { pane: state.currentPane, uri, provider: state[state.currentPane === 'left' ? 'leftPane' : 'rightPane'].provider },
    });

    try {
      const items = await loadDirectory(uri, state[state.currentPane === 'left' ? 'leftPane' : 'rightPane'].provider);
      dispatch({
        type: state.currentPane === 'left' ? 'SET_LEFT_PANE' : 'SET_RIGHT_PANE',
        payload: { items, loading: false, error: undefined },
      });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: {
          pane: state.currentPane,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }, [state.currentPane, state.leftPane, state.rightPane, loadDirectory]);

  const handleSelect = useCallback((index: number) => {
    dispatch({
      type: 'SELECT_ITEM',
      payload: { pane: state.currentPane, index },
    });
  }, [state.currentPane]);

  const handleToggleSelection = useCallback((item: any) => {
    dispatch({
      type: 'TOGGLE_SELECTION',
      payload: { pane: state.currentPane, item },
    });
  }, [state.currentPane]);

  const handleScroll = useCallback((offset: number) => {
    dispatch({
      type: 'SET_SCROLL_OFFSET',
      payload: { pane: state.currentPane, offset },
    });
  }, [state.currentPane]);

  const handleFilter = useCallback((filter: string) => {
    dispatch({
      type: 'SET_FILTER',
      payload: { pane: state.currentPane, filter },
    });
  }, [state.currentPane]);

  const handleCopyFiles = useCallback(() => {
    const currentPaneState = state.currentPane === 'left' ? state.leftPane : state.rightPane;
    const selectedItems = Array.from(currentPaneState.selectedItems)
      .map(uri => currentPaneState.items.find(item => item.uri === uri))
      .filter(Boolean) as FileItem[];

    if (selectedItems.length === 0) {
      dispatch({
        type: 'SET_STATUS',
        payload: {
          message: 'No files selected for copying',
          type: 'warning',
          timestamp: Date.now(),
        },
      });
      return;
    }

    const otherPaneUri = state.currentPane === 'left' ? state.rightPane.uri : state.leftPane.uri;
    
    dispatch({
      type: 'OPEN_MODAL',
      payload: {
        isOpen: true,
        type: 'confirm',
        title: 'Copy Files',
        message: `Copy ${selectedItems.length} item(s) to ${otherPaneUri}?`,
        onConfirm: async () => {
          try {
            await copyFiles(selectedItems, otherPaneUri);
            dispatch({ type: 'CLOSE_MODAL' });
            dispatch({
              type: 'SET_STATUS',
              payload: {
                message: `Copied ${selectedItems.length} item(s) successfully`,
                type: 'success',
                timestamp: Date.now(),
              },
            });
            // Refresh both panes
            refreshCurrentPane();
          } catch (error) {
            dispatch({
              type: 'SET_STATUS',
              payload: {
                message: `Failed to copy files: ${error instanceof Error ? error.message : 'Unknown error'}`,
                type: 'error',
                timestamp: Date.now(),
              },
            });
          }
        },
        onCancel: () => dispatch({ type: 'CLOSE_MODAL' }),
      },
    });
  }, [state.currentPane, state.leftPane, state.rightPane, copyFiles, refreshCurrentPane]);

  const handleMoveFiles = useCallback(() => {
    const currentPaneState = state.currentPane === 'left' ? state.leftPane : state.rightPane;
    const selectedItems = Array.from(currentPaneState.selectedItems)
      .map(uri => currentPaneState.items.find(item => item.uri === uri))
      .filter(Boolean) as FileItem[];

    if (selectedItems.length === 0) {
      dispatch({
        type: 'SET_STATUS',
        payload: {
          message: 'No files selected for moving',
          type: 'warning',
          timestamp: Date.now(),
        },
      });
      return;
    }

    const otherPaneUri = state.currentPane === 'left' ? state.rightPane.uri : state.leftPane.uri;
    
    dispatch({
      type: 'OPEN_MODAL',
      payload: {
        isOpen: true,
        type: 'confirm',
        title: 'Move Files',
        message: `Move ${selectedItems.length} item(s) to ${otherPaneUri}?`,
        onConfirm: async () => {
          try {
            await moveFiles(selectedItems, otherPaneUri);
            dispatch({ type: 'CLOSE_MODAL' });
            dispatch({
              type: 'SET_STATUS',
              payload: {
                message: `Moved ${selectedItems.length} item(s) successfully`,
                type: 'success',
                timestamp: Date.now(),
              },
            });
            // Refresh both panes
            refreshCurrentPane();
          } catch (error) {
            dispatch({
              type: 'SET_STATUS',
              payload: {
                message: `Failed to move files: ${error instanceof Error ? error.message : 'Unknown error'}`,
                type: 'error',
                timestamp: Date.now(),
              },
            });
          }
        },
        onCancel: () => dispatch({ type: 'CLOSE_MODAL' }),
      },
    });
  }, [state.currentPane, state.leftPane, state.rightPane, moveFiles, refreshCurrentPane]);

  const handleDeleteFiles = useCallback(() => {
    const currentPaneState = state.currentPane === 'left' ? state.leftPane : state.rightPane;
    const selectedItems = Array.from(currentPaneState.selectedItems)
      .map(uri => currentPaneState.items.find(item => item.uri === uri))
      .filter(Boolean) as FileItem[];

    if (selectedItems.length === 0) {
      dispatch({
        type: 'SET_STATUS',
        payload: {
          message: 'No files selected for deletion',
          type: 'warning',
          timestamp: Date.now(),
        },
      });
      return;
    }
    
    dispatch({
      type: 'OPEN_MODAL',
      payload: {
        isOpen: true,
        type: 'confirm',
        title: 'Delete Files',
        message: `Delete ${selectedItems.length} item(s)? This action cannot be undone.`,
        onConfirm: async () => {
          try {
            await deleteFiles(selectedItems);
            dispatch({ type: 'CLOSE_MODAL' });
            dispatch({
              type: 'SET_STATUS',
              payload: {
                message: `Deleted ${selectedItems.length} item(s) successfully`,
                type: 'success',
                timestamp: Date.now(),
              },
            });
            // Refresh current pane
            refreshCurrentPane();
          } catch (error) {
            dispatch({
              type: 'SET_STATUS',
              payload: {
                message: `Failed to delete files: ${error instanceof Error ? error.message : 'Unknown error'}`,
                type: 'error',
                timestamp: Date.now(),
              },
            });
          }
        },
        onCancel: () => dispatch({ type: 'CLOSE_MODAL' }),
      },
    });
  }, [state.currentPane, state.leftPane, state.rightPane, deleteFiles, refreshCurrentPane]);

  const handleCreateDirectory = useCallback(() => {
    const currentPaneState = state.currentPane === 'left' ? state.leftPane : state.rightPane;
    
    dispatch({
      type: 'OPEN_MODAL',
      payload: {
        isOpen: true,
        type: 'input',
        title: 'Create Directory',
        message: 'Enter directory name:',
        inputValue: '',
        onSubmit: async (name: string) => {
          if (!name.trim()) {
            dispatch({
              type: 'SET_STATUS',
              payload: {
                message: 'Directory name cannot be empty',
                type: 'error',
                timestamp: Date.now(),
              },
            });
            return;
          }

          try {
            await createDirectory(currentPaneState.uri, name.trim());
            dispatch({ type: 'CLOSE_MODAL' });
            dispatch({
              type: 'SET_STATUS',
              payload: {
                message: `Created directory "${name.trim()}" successfully`,
                type: 'success',
                timestamp: Date.now(),
              },
            });
            // Refresh current pane
            refreshCurrentPane();
          } catch (error) {
            dispatch({
              type: 'SET_STATUS',
              payload: {
                message: `Failed to create directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
                type: 'error',
                timestamp: Date.now(),
              },
            });
          }
        },
        onCancel: () => dispatch({ type: 'CLOSE_MODAL' }),
      },
    });
  }, [state.currentPane, state.leftPane, state.rightPane, createDirectory, refreshCurrentPane]);

  // Load initial directories and saved state
  useEffect(() => {
    const loadInitialData = async () => {
      dispatch({
        type: 'SHOW_PROGRESS',
        payload: { isVisible: true, message: 'Loading initial directories...' },
      });

      try {
        // Load saved state first
        const savedState = await loadState();
        if (savedState) {
          // Restore saved state
          dispatch({
            type: 'SET_LEFT_PANE',
            payload: {
              uri: savedState.leftUri,
              provider: 'file', // Default to file provider
              selectedIndex: savedState.leftSelectedIndex || 0,
            },
          });
          dispatch({
            type: 'SET_RIGHT_PANE',
            payload: {
              uri: savedState.rightUri,
              provider: 'file', // Default to file provider
              selectedIndex: savedState.rightSelectedIndex || 0,
            },
          });
        }

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
            timestamp: Date.now(),
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
            timestamp: Date.now(),
          },
        });
      }
    };

    loadInitialData();
  }, [loadState, loadDirectory]);

  // Calculate explicit height for better terminal fitting
  const terminalRows = process.stdout.rows || 24;
  const titleBarRows = 3; // Title bar + margins
  const statusBarRows = 2; // Status bar + margins
  const paneHeight = Math.max(10, terminalRows - titleBarRows - statusBarRows);

  return (
    <Box flexDirection="column" height={terminalRows} width="100%">
      {/* Title bar */}
      <Box borderStyle="single" borderColor="blue" padding={1} marginBottom={1}>
        <Text color="blue" bold>
          AIFS Commander TUI - Press F1 for help, Tab to switch panes
        </Text>
      </Box>

      {/* Main content area with explicit height */}
      <Box flexDirection="row" height={paneHeight}>
        {/* Left pane */}
        <Box 
          width={`${state.dividerPosition}%`} 
          borderStyle="single" 
          borderColor={state.currentPane === 'left' ? 'blue' : 'gray'}
          marginRight={1}
        >
          <FilePane
            pane="left"
            state={state.leftPane}
            isActive={state.currentPane === 'left'}
            onNavigate={handleNavigate}
            onSelect={handleSelect}
            onToggleSelection={handleToggleSelection}
            onScroll={handleScroll}
            onFilter={handleFilter}
          />
        </Box>

        {/* Right pane */}
        <Box 
          width={`${100 - state.dividerPosition}%`} 
          borderStyle="single" 
          borderColor={state.currentPane === 'right' ? 'blue' : 'gray'}
        >
          <FilePane
            pane="right"
            state={state.rightPane}
            isActive={state.currentPane === 'right'}
            onNavigate={handleNavigate}
            onSelect={handleSelect}
            onToggleSelection={handleToggleSelection}
            onScroll={handleScroll}
            onFilter={handleFilter}
          />
        </Box>
      </Box>

      {/* Status bar */}
      <StatusBar
        leftPane={state.leftPane}
        rightPane={state.rightPane}
        currentPane={state.currentPane}
        statusMessage={state.status.message}
        statusType={state.status.type}
      />

      {/* Modal */}
      <Modal
        isOpen={state.modal.isOpen}
        type={state.modal.type}
        title={state.modal.title}
        message={state.modal.message}
        inputValue={state.modal.inputValue}
        onConfirm={state.modal.onConfirm}
        onCancel={state.modal.onCancel}
        onSubmit={state.modal.onSubmit}
      />

      {/* Progress indicator */}
      <ProgressIndicator
        isVisible={state.progress.isVisible}
        message={state.progress.message}
        percentage={state.progress.percentage}
        operation={state.progress.operation}
      />
    </Box>
  );
}
