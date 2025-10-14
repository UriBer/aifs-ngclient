# TUI Library Evaluation Criteria

## Current Issues with blessed.js

Based on the user's feedback and image analysis, the current blessed.js implementation has the following refresh/redraw issues:

1. **Provider State Mismatch**: Status bar shows incorrect provider information (e.g., "Local File System" when actually using cloud providers)
2. **Inconsistent State Display**: UI elements don't reflect the actual application state
3. **Copy Operation Errors**: Status messages show errors that don't match the actual operation
4. **Screen Refresh Problems**: Partial redraws, flickering, and incomplete updates during provider switching

## Evaluation Criteria

### 1. Refresh/Redraw Performance Requirements

**Critical Requirements:**
- Zero flickering during provider switching
- Consistent state synchronization across all UI components
- Smooth redraws during rapid navigation
- Proper handling of terminal resize events
- No visual artifacts during modal operations

**Performance Metrics:**
- Refresh rate: >30 FPS during navigation
- Input latency: <50ms for key presses
- Memory usage: Stable over time (no leaks)
- State update propagation: <100ms

### 2. State Management Needs

**Current Architecture:**
- Dual-pane file browser with independent state per pane
- Provider switching affects both panes
- Navigation history per pane
- Selection state management
- Configuration state persistence

**Requirements:**
- Centralized state management with predictable updates
- Reactive UI updates when state changes
- State synchronization between components
- Undo/redo capability for operations
- State persistence and restoration

### 3. Required Features

**Core Features:**
- Dual-pane file browser layout
- Provider switching (file, S3, GCS, Azure, AIFS)
- File operations (copy, move, delete, rename)
- Navigation (up, down, enter, back)
- Selection (single, multiple)
- Search and filtering

**Advanced Features:**
- Modal windows for confirmations and input
- Progress indicators for long operations
- Terminal writing/overlay mode
- Configuration management UI
- Error handling and recovery
- Keyboard shortcuts and help system

### 4. TypeScript Support and Type Safety

**Requirements:**
- Full TypeScript support
- Type-safe component props
- Type-safe state management
- IntelliSense support
- Compile-time error checking
- Generic type support for reusable components

### 5. Migration Complexity Assessment

**Current Codebase:**
- ~2,370 lines in TuiApplication.ts
- Complex blessed.js widget hierarchy
- Custom event handling system
- Provider integration layer
- State management system

**Migration Considerations:**
- API compatibility with existing code
- Learning curve for new paradigm
- Refactoring effort required
- Testing and validation time
- Risk of introducing new bugs

## Candidate Libraries Research

### Ink (React-based TUI)

**Package:** `ink`, `ink-text-input`, `ink-select-input`, `ink-spinner`, `ink-modal`

**Pros:**
- React component model with virtual DOM (solves refresh issues)
- Excellent state management with hooks (useState, useReducer, useContext)
- TypeScript support with full type safety
- Declarative UI approach
- Rich ecosystem of components
- Built-in input handling with `useInput`
- Automatic re-rendering on state changes
- Component composition and reusability
- Hot reloading support in development

**Cons:**
- Different paradigm from blessed (declarative vs imperative)
- Requires significant refactoring of existing code
- Learning curve for team unfamiliar with React
- May have performance overhead for very large lists
- Less control over low-level terminal operations

**Refresh Issue Resolution:**
- Virtual DOM ensures only changed components re-render
- State changes automatically trigger UI updates
- No manual screen.render() calls needed
- Built-in diffing algorithm prevents unnecessary redraws

### terminal-kit

**Package:** `terminal-kit`

**Pros:**
- Rich widget set with built-in components
- Similar imperative API to blessed
- Built-in progress bars and menus
- Good TypeScript support
- Efficient rendering with ScreenBuffer
- Low-level terminal control
- Event-driven architecture
- Good documentation and examples

**Cons:**
- Less active community and maintenance
- Some documentation gaps
- May have similar refresh issues as blessed
- Less modern development experience
- Limited component ecosystem

**Refresh Issue Resolution:**
- ScreenBuffer provides better control over rendering
- Event-driven updates may reduce refresh issues
- Built-in widgets handle state internally
- Manual refresh control available

### blessed alternatives: neo-blessed, blessed-contrib

**Packages:** `neo-blessed`, `blessed-contrib`

**Pros:**
- Drop-in replacements for blessed
- Minimal refactoring required
- Familiar API and concepts
- Active maintenance and bug fixes
- Additional widgets and components

**Cons:**
- May inherit same refresh issues as blessed
- Limited improvements over original blessed
- Not addressing root cause of refresh problems
- Less modern development experience

**Refresh Issue Resolution:**
- May have bug fixes for specific refresh issues
- Better maintained than original blessed
- But fundamentally same rendering approach

## Evaluation Methodology

### Phase 1: Documentation and Research
- Document current issues and requirements
- Research candidate libraries
- Create evaluation criteria

### Phase 2: Proof-of-Concept Implementation
- Create working POCs for top candidates
- Implement core features (dual-pane, provider switching, modals, progress)
- Integrate with existing ProviderManager and StateManager

### Phase 3: Performance Testing
- Benchmark refresh performance
- Test state synchronization
- Measure memory usage and input latency
- Document refresh issue resolution

### Phase 4: Migration Planning
- Create migration guide for chosen library
- Document component mapping
- Estimate migration effort
- Plan incremental migration strategy

### Phase 5: Final Recommendation
- Compare all candidates side-by-side
- Provide data-backed recommendation
- Document next steps for implementation

## Success Criteria

The chosen library must:
1. **Eliminate refresh issues** - No flickering, state mismatches, or visual artifacts
2. **Maintain performance** - Smooth operation with large directories and rapid navigation
3. **Support required features** - Modals, progress indicators, terminal writing
4. **Enable maintainable code** - Type safety, good developer experience
5. **Allow reasonable migration** - Not require complete rewrite of existing code

## Next Steps

1. Set up evaluation workspace with separate POC directories
2. Implement Ink proof-of-concept with core features
3. Implement terminal-kit proof-of-concept with same features
4. Run performance benchmarks and comparison tests
5. Document results and provide final recommendation
