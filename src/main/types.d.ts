/**
 * Type declarations for Node.js globals and modules
 */

// Declare process global for Electron main process
declare const process: {
  env: Record<string, string | undefined>;
  platform: string;
  type: string;
  resourcesPath: string;
  on(event: string, listener: (...args: any[]) => void): void;
  once(event: string, listener: (...args: any[]) => void): void;
};

// Declare __dirname for CommonJS modules
declare const __dirname: string;

// Declare __filename for CommonJS modules
declare const __filename: string;