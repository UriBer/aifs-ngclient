// App state reducer for Ink TUI

import { AppState, AppAction, PaneState } from '../types.js';

const initialPaneState: PaneState = {
  uri: process.env.HOME || '/',
  items: [],
  selectedIndex: 0,
  selectedItems: new Set(),
  provider: 'file',
  loading: false,
  error: undefined,
  scrollOffset: 0,
  filter: undefined,
};

export const initialState: AppState = {
  leftPane: { ...initialPaneState },
  rightPane: { ...initialPaneState },
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
    timestamp: Date.now(),
  },
  settings: {
    showHidden: false,
    sortBy: 'name',
    sortOrder: 'asc',
    viewMode: 'list',
  },
};

export function appReducer(state: AppState, action: AppAction): AppState {
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
        status: { ...action.payload, timestamp: Date.now() },
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
          scrollOffset: 0,
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

    case 'SELECT_ITEM':
      const selectPane = action.payload.pane === 'left' ? 'leftPane' : 'rightPane';
      const newIndex = Math.max(0, Math.min(state[selectPane].items.length - 1, action.payload.index));
      return {
        ...state,
        [selectPane]: {
          ...state[selectPane],
          selectedIndex: newIndex,
        },
      };

    case 'TOGGLE_SELECTION':
      const togglePane = action.payload.pane === 'left' ? 'leftPane' : 'rightPane';
      const newSelected = new Set(state[togglePane].selectedItems);
      if (newSelected.has(action.payload.item.uri)) {
        newSelected.delete(action.payload.item.uri);
      } else {
        newSelected.add(action.payload.item.uri);
      }
      return {
        ...state,
        [togglePane]: {
          ...state[togglePane],
          selectedItems: newSelected,
        },
      };

    case 'CLEAR_SELECTION':
      const clearPane = action.payload.pane === 'left' ? 'leftPane' : 'rightPane';
      return {
        ...state,
        [clearPane]: {
          ...state[clearPane],
          selectedItems: new Set(),
        },
      };

    case 'SET_FILTER':
      const filterPane = action.payload.pane === 'left' ? 'leftPane' : 'rightPane';
      return {
        ...state,
        [filterPane]: {
          ...state[filterPane],
          filter: action.payload.filter,
          selectedIndex: 0,
          scrollOffset: 0,
        },
      };

    case 'SET_SCROLL_OFFSET':
      const scrollPane = action.payload.pane === 'left' ? 'leftPane' : 'rightPane';
      return {
        ...state,
        [scrollPane]: {
          ...state[scrollPane],
          scrollOffset: Math.max(0, action.payload.offset),
        },
      };

    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
      };

    default:
      return state;
  }
}
