import React from 'react';
import { render } from 'ink-testing-library';
import { FilePane } from '../src/components/FilePane.js';
import { PaneState } from '../src/types.js';

const mockPaneState: PaneState = {
  uri: '/test',
  items: [
    {
      name: 'test.txt',
      uri: '/test/test.txt',
      isDirectory: false,
      size: 1024,
      lastModified: new Date(),
    },
    {
      name: 'testdir',
      uri: '/test/testdir',
      isDirectory: true,
      size: 4096,
      lastModified: new Date(),
    },
  ],
  selectedIndex: 0,
  selectedItems: new Set(),
  provider: 'file',
  loading: false,
  error: undefined,
  scrollOffset: 0,
  filter: undefined,
};

const mockHandlers = {
  onNavigate: jest.fn(),
  onSelect: jest.fn(),
  onToggleSelection: jest.fn(),
  onScroll: jest.fn(),
  onFilter: jest.fn(),
};

describe('FilePane Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders file list correctly', () => {
    const { lastFrame } = render(
      <FilePane
        pane="left"
        state={mockPaneState}
        isActive={true}
        {...mockHandlers}
      />
    );

    const output = lastFrame();
    expect(output).toContain('Left Pane');
    expect(output).toContain('test.txt');
    expect(output).toContain('testdir');
  });

  it('shows loading state', () => {
    const loadingState = { ...mockPaneState, loading: true };
    
    const { lastFrame } = render(
      <FilePane
        pane="left"
        state={loadingState}
        isActive={true}
        {...mockHandlers}
      />
    );

    const output = lastFrame();
    expect(output).toContain('Loading...');
  });

  it('shows error state', () => {
    const errorState = { ...mockPaneState, error: 'Test error' };
    
    const { lastFrame } = render(
      <FilePane
        pane="left"
        state={errorState}
        isActive={true}
        {...mockHandlers}
      />
    );

    const output = lastFrame();
    expect(output).toContain('Error: Test error');
  });

  it('displays provider information', () => {
    const { lastFrame } = render(
      <FilePane
        pane="left"
        state={mockPaneState}
        isActive={true}
        {...mockHandlers}
      />
    );

    const output = lastFrame();
    expect(output).toContain('📁 file');
  });

  it('shows selected items count', () => {
    const stateWithSelection = {
      ...mockPaneState,
      selectedItems: new Set(['/test/test.txt']),
    };
    
    const { lastFrame } = render(
      <FilePane
        pane="left"
        state={stateWithSelection}
        isActive={true}
        {...mockHandlers}
      />
    );

    const output = lastFrame();
    expect(output).toContain('1 selected');
  });

  it('handles empty file list', () => {
    const emptyState = { ...mockPaneState, items: [] };
    
    const { lastFrame } = render(
      <FilePane
        pane="left"
        state={emptyState}
        isActive={true}
        {...mockHandlers}
      />
    );

    const output = lastFrame();
    expect(output).toContain('No items found');
  });

  it('shows filter when active', () => {
    const filteredState = { ...mockPaneState, filter: 'test' };
    
    const { lastFrame } = render(
      <FilePane
        pane="left"
        state={filteredState}
        isActive={true}
        {...mockHandlers}
      />
    );

    const output = lastFrame();
    expect(output).toContain('Filter: test');
  });
});
