// Test setup for Ink TUI

// Mock process.env for tests
process.env.HOME = '/home/test';
process.env.NODE_ENV = 'test';

// Mock console methods to avoid noise in tests
const mockConsole = {
  log: () => {},
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

global.console = {
  ...console,
  ...mockConsole,
};

// Mock process.exit to prevent tests from exiting
const originalExit = process.exit;
process.exit = () => { throw new Error('process.exit called'); };
