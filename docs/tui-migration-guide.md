# Ink Migration Guide

## Overview

This guide provides a comprehensive roadmap for migrating the AIFS Commander TUI from blessed.js to Ink (React-based TUI library).

## Prerequisites

- Node.js 18+ and npm
- TypeScript knowledge
- React fundamentals (hooks, components, state management)
- Understanding of the current blessed.js implementation

## Migration Strategy

### Incremental Migration Approach

Rather than a complete rewrite, we'll migrate component by component while maintaining the existing blessed.js implementation in parallel.

## Phase 1: Environment Setup

### 1.1 Install Dependencies

```bash
npm install ink ink-text-input ink-select-input ink-spinner react @types/react
npm install --save-dev @types/node typescript tsx
```

### 1.2 Update TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

### 1.3 Create Migration Structure

```
src/
├── tui/                    # Existing blessed.js implementation
├── tui-ink/               # New Ink implementation
│   ├── components/        # React components
│   ├── hooks/            # Custom hooks
│   ├── providers/        # Context providers
│   └── utils/            # Utility functions
└── shared/               # Shared logic between implementations
```

## Phase 2: Core Component Migration

### 2.1 File Pane Component

**Current blessed.js approach:**
```typescript
// TuiApplication.ts
this.leftPane = blessed.list({
  parent: mainContainer,
  top: 0,
  left: 0,
  width: `${this.dividerPosition}%`,
  height: '100%',
  // ... configuration
});
```

**New Ink approach:**
```typescript
// components/FilePane.tsx
import React from 'react';
import { Box, Text, useInput } from 'ink';

interface FilePaneProps {
  pane: 'left' | 'right';
  state: PaneState;
  isActive: boolean;
  onNavigate: (uri: string) => void;
  onSelect: (index: number) => void;
  onToggleSelection: (item: FileItem) => void;
}

export function FilePane({ pane, state, isActive, onNavigate, onSelect, onToggleSelection }: FilePaneProps) {
  useInput((input: string, key: any) => {
    if (!isActive) return;
    // Handle keyboard input
  }, { isActive });

  return (
    <Box flexDirection="column" height="100%">
      {/* File list rendering */}
    </Box>
  );
}
```

### 2.2 State Management Migration

**Current approach:**
```typescript
// TuiApplication.ts
private leftPane: blessed.Widgets.ListElement | null = null;
private leftItems: FileItem[] = [];
private leftSelected: number = 0;
```

**New Ink approach:**
```typescript
// hooks/useFileBrowser.ts
import { useState, useReducer, useCallback } from 'react';

export function useFileBrowser() {
  const [state, dispatch] = useReducer(fileBrowserReducer, initialState);
  
  const navigateTo = useCallback(async (uri: string, pane: 'left' | 'right') => {
    dispatch({ type: 'SET_LOADING', payload: { pane, loading: true } });
    try {
      const items = await loadDirectory(uri, state[pane].provider);
      dispatch({ type: 'SET_ITEMS', payload: { pane, items } });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: { pane, error: error.message } });
    }
  }, [state]);

  return { state, navigateTo, dispatch };
}
```

### 2.3 Provider Integration

**Current approach:**
```typescript
// TuiApplication.ts
private providerManager: ProviderManager;
private leftProvider: string = 'file';
private rightProvider: string = 'file';
```

**New Ink approach:**
```typescript
// hooks/useProviderManager.ts
import { useCallback } from 'react';
import { ProviderManager } from '../../shared/ProviderManager.js';

export function useProviderManager() {
  const providerManager = new ProviderManager();
  
  const loadDirectory = useCallback(async (uri: string, provider: string) => {
    return await providerManager.loadDirectory(uri, provider);
  }, [providerManager]);

  const switchProvider = useCallback(async (provider: string, pane: 'left' | 'right') => {
    // Handle provider switching
  }, [providerManager]);

  return { loadDirectory, switchProvider };
}
```

## Phase 3: Advanced Features

### 3.1 Modal Dialogs

**Current blessed.js approach:**
```typescript
// TuiApplication.ts
private showModal(title: string, message: string) {
  const modal = blessed.box({
    parent: this.screen,
    // ... configuration
  });
}
```

**New Ink approach:**
```typescript
// components/Modal.tsx
import React from 'react';
import { Box, Text } from 'ink';

interface ModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export function Modal({ isOpen, title, message, onConfirm, onCancel }: ModalProps) {
  if (!isOpen) return null;

  return (
    <Box
      width="80%"
      height="60%"
      borderStyle="double"
      borderColor="blue"
      flexDirection="column"
    >
      {/* Modal content */}
    </Box>
  );
}
```

### 3.2 Progress Indicators

**Current blessed.js approach:**
```typescript
// TuiApplication.ts
private showProgress(message: string) {
  const progress = blessed.box({
    // ... configuration
  });
}
```

**New Ink approach:**
```typescript
// components/ProgressIndicator.tsx
import React from 'react';
import { Box, Text } from 'ink';

interface ProgressIndicatorProps {
  message: string;
  percentage?: number;
}

export function ProgressIndicator({ message, percentage }: ProgressIndicatorProps) {
  return (
    <Box
      width="60%"
      height="20%"
      borderStyle="single"
      borderColor="yellow"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
    >
      <Text color="yellow" bold>{message}</Text>
      {/* Progress bar rendering */}
    </Box>
  );
}
```

## Phase 4: Integration Points

### 4.1 Main Application Component

```typescript
// App.tsx
import React, { useReducer, useEffect } from 'react';
import { Box, useInput, useApp } from 'ink';
import { FilePane } from './components/FilePane.js';
import { StatusBar } from './components/StatusBar.js';
import { Modal } from './components/Modal.js';
import { ProgressIndicator } from './components/ProgressIndicator.js';
import { useFileBrowser } from './hooks/useFileBrowser.js';
import { useProviderManager } from './hooks/useProviderManager.js';

export function App() {
  const { state, navigateTo, dispatch } = useFileBrowser();
  const { loadDirectory, switchProvider } = useProviderManager();
  const { exit } = useApp();

  useInput((input: string, key: any) => {
    // Handle global keyboard input
  });

  useEffect(() => {
    // Load initial data
  }, []);

  return (
    <Box flexDirection="column" height="100%" width="100%">
      {/* Main content */}
      <Box flexDirection="row" flexGrow={1}>
        <FilePane
          pane="left"
          state={state.leftPane}
          isActive={state.currentPane === 'left'}
          onNavigate={(uri) => navigateTo(uri, 'left')}
          onSelect={(index) => dispatch({ type: 'SELECT_ITEM', payload: { pane: 'left', index } })}
          onToggleSelection={(item) => dispatch({ type: 'TOGGLE_SELECTION', payload: { pane: 'left', item } })}
        />
        <FilePane
          pane="right"
          state={state.rightPane}
          isActive={state.currentPane === 'right'}
          onNavigate={(uri) => navigateTo(uri, 'right')}
          onSelect={(index) => dispatch({ type: 'SELECT_ITEM', payload: { pane: 'right', index } })}
          onToggleSelection={(item) => dispatch({ type: 'TOGGLE_SELECTION', payload: { pane: 'right', item } })}
        />
      </Box>
      <StatusBar
        leftPane={state.leftPane}
        rightPane={state.rightPane}
        currentPane={state.currentPane}
      />
      {state.modal.isOpen && (
        <Modal
          isOpen={state.modal.isOpen}
          title={state.modal.title}
          message={state.modal.message}
          onConfirm={state.modal.onConfirm}
          onCancel={state.modal.onCancel}
        />
      )}
      {state.progress.isVisible && (
        <ProgressIndicator
          message={state.progress.message}
          percentage={state.progress.percentage}
        />
      )}
    </Box>
  );
}
```

### 4.2 Entry Point

```typescript
// index.tsx
#!/usr/bin/env node

import React from 'react';
import { render } from 'ink';
import { App } from './App.js';

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  help: args.includes('--help') || args.includes('-h'),
  version: args.includes('--version') || args.includes('-v'),
};

if (options.help) {
  console.log('AIFS Commander TUI - Ink Implementation');
  // ... help text
  process.exit(0);
}

if (options.version) {
  const pkg = require('../package.json');
  console.log(pkg.version);
  process.exit(0);
}

// Check if running in terminal
if (!process.stdout.isTTY) {
  console.error('AIFS Commander TUI requires a terminal environment');
  process.exit(1);
}

// Render the application
render(<App />);
```

## Phase 5: Testing Strategy

### 5.1 Unit Tests

```typescript
// __tests__/FilePane.test.tsx
import React from 'react';
import { render } from 'ink-testing-library';
import { FilePane } from '../components/FilePane.js';

describe('FilePane', () => {
  it('renders file list correctly', () => {
    const mockState = {
      items: [
        { name: 'test.txt', uri: '/test.txt', isDirectory: false, size: 1024 }
      ],
      selectedIndex: 0,
      selectedItems: new Set(),
      provider: 'file',
      loading: false
    };

    const { lastFrame } = render(
      <FilePane
        pane="left"
        state={mockState}
        isActive={true}
        onNavigate={jest.fn()}
        onSelect={jest.fn()}
        onToggleSelection={jest.fn()}
      />
    );

    expect(lastFrame()).toContain('test.txt');
  });
});
```

### 5.2 Integration Tests

```typescript
// __tests__/App.integration.test.tsx
import React from 'react';
import { render } from 'ink-testing-library';
import { App } from '../App.js';

describe('App Integration', () => {
  it('handles provider switching without refresh issues', async () => {
    const { lastFrame } = render(<App />);
    
    // Simulate provider switch
    // Verify no flickering or state inconsistencies
    expect(lastFrame()).toMatchSnapshot();
  });
});
```

## Phase 6: Deployment Strategy

### 6.1 Feature Flags

```typescript
// config/feature-flags.ts
export const FEATURE_FLAGS = {
  USE_INK_TUI: process.env.USE_INK_TUI === 'true',
  ENABLE_OLD_TUI: process.env.ENABLE_OLD_TUI === 'true',
};
```

### 6.2 A/B Testing

```typescript
// index.ts
import { FEATURE_FLAGS } from './config/feature-flags.js';

if (FEATURE_FLAGS.USE_INK_TUI) {
  // Use Ink implementation
  import('./tui-ink/index.js');
} else {
  // Use blessed.js implementation
  import('./tui/index.js');
}
```

## Migration Checklist

### Pre-Migration
- [ ] Set up Ink development environment
- [ ] Create component library structure
- [ ] Establish testing framework
- [ ] Train team on React patterns
- [ ] Create migration timeline

### Phase 1: Core Components
- [ ] FilePane component
- [ ] StatusBar component
- [ ] Basic state management
- [ ] Provider integration
- [ ] Keyboard input handling

### Phase 2: Advanced Features
- [ ] Modal dialogs
- [ ] Progress indicators
- [ ] File operations
- [ ] Search and filtering
- [ ] Configuration management

### Phase 3: Testing & Polish
- [ ] Unit tests for all components
- [ ] Integration tests
- [ ] Performance testing
- [ ] User acceptance testing
- [ ] Documentation updates

### Phase 4: Deployment
- [ ] Feature flag implementation
- [ ] A/B testing setup
- [ ] Gradual rollout
- [ ] Monitoring and metrics
- [ ] Rollback plan

## Common Pitfalls and Solutions

### 1. State Management Complexity
**Problem:** React state can become complex with nested objects
**Solution:** Use useReducer for complex state, custom hooks for business logic

### 2. Performance Issues
**Problem:** Re-rendering on every state change
**Solution:** Use useMemo and useCallback for expensive operations

### 3. Event Handling
**Problem:** Keyboard input conflicts between components
**Solution:** Use isActive prop to control which component handles input

### 4. Styling Limitations
**Problem:** Ink has limited styling options compared to blessed.js
**Solution:** Use Unicode characters and creative layouts

## Resources

- [Ink Documentation](https://github.com/vadimdemedes/ink)
- [React Hooks Guide](https://reactjs.org/docs/hooks-intro.html)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Terminal UI Best Practices](https://github.com/rothgar/awesome-tuis)

## Support

For questions or issues during migration:
- Create GitHub issues for technical problems
- Use team chat for quick questions
- Schedule code reviews for complex changes
- Maintain migration documentation
