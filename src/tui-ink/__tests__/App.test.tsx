import React from 'react';
import { render } from 'ink-testing-library';
import { App } from '../src/App.js';

// Mock the useFileBrowser hook
jest.mock('../src/hooks/useFileBrowser.js', () => ({
  useFileBrowser: () => ({
    loadDirectory: jest.fn().mockResolvedValue([
      {
        name: 'test.txt',
        uri: '/test.txt',
        isDirectory: false,
        size: 1024,
        lastModified: new Date(),
      },
      {
        name: 'testdir',
        uri: '/testdir',
        isDirectory: true,
        size: 4096,
        lastModified: new Date(),
      },
    ]),
    switchProvider: jest.fn().mockResolvedValue(undefined),
    copyFile: jest.fn().mockResolvedValue(undefined),
    moveFile: jest.fn().mockResolvedValue(undefined),
    deleteFile: jest.fn().mockResolvedValue(undefined),
    createDirectory: jest.fn().mockResolvedValue(undefined),
    renameFile: jest.fn().mockResolvedValue(undefined),
  }),
}));

describe('App Component', () => {
  it('renders without crashing', () => {
    const { lastFrame } = render(<App />);
    expect(lastFrame()).toBeDefined();
  });

  it('displays dual-pane layout', () => {
    const { lastFrame } = render(<App />);
    const output = lastFrame();
    
    expect(output).toContain('Left Pane');
    expect(output).toContain('Right Pane');
  });

  it('shows status bar', () => {
    const { lastFrame } = render(<App />);
    const output = lastFrame();
    
    expect(output).toContain('AIFS Commander TUI');
  });

  it('displays file items when loaded', async () => {
    const { lastFrame, waitFor } = render(<App />);
    
    // Wait for initial data to load
    await waitFor(() => {
      const output = lastFrame();
      return output.includes('test.txt') || output.includes('Loading');
    });

    const output = lastFrame();
    expect(output).toContain('test.txt');
    expect(output).toContain('testdir');
  });
});
