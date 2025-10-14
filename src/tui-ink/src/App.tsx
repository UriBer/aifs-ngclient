import React, { useReducer, useCallback, useEffect } from 'react';
import { Box, useInput, useApp } from 'ink';
import { FilePane } from './components/FilePane.js';
import { StatusBar } from './components/StatusBar.js';
import { Modal } from './components/Modal.js';
import { ProgressIndicator } from './components/ProgressIndicator.js';
import { useFileBrowser } from './hooks/useFileBrowser.js';
import { appReducer, initialState } from './state/appReducer.js';
import { AppState } from './types.js';

export function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { exit } = useApp();
  const { loadDirectory, switchProvider } = useFileBrowser();

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
            type: 'help',
            title: 'Help',
            message: 'Keyboard shortcuts',
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
      case 'f':
        if (key.ctrl || key.meta) {
          showFilterDialog();
        }
        break;
      case 'h':
        if (key.ctrl || key.meta) {
          toggleHiddenFiles();
        }
        break;
    }

    // Handle arrow keys for divider adjustment
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
  }, []);

  return (
    <Box flexDirection="column" height="100%" width="100%">
      {/* Main content area */}
      <Box flexDirection="row" flexGrow={1}>
        {/* Left pane */}
        <Box width={`${state.dividerPosition}%`} borderStyle="single" borderColor="gray">
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
        <Box width={`${100 - state.dividerPosition}%`} borderStyle="single" borderColor="gray">
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
