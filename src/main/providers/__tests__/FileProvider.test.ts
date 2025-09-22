import { FileProvider } from '../FileProvider';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
    stat: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    unlink: jest.fn(),
    rmdir: jest.fn(),
    mkdir: jest.fn(),
    access: jest.fn(),
  },
}));

describe('FileProvider', () => {
  let provider: FileProvider;
  
  beforeEach(() => {
    provider = new FileProvider();
    jest.clearAllMocks();
  });
  
  describe('list', () => {
    it('should list files and directories', async () => {
      // Mock implementation
      const mockFiles = ['file1.txt', 'file2.txt', 'dir1'];
      const mockStats = [
        { isDirectory: () => false, size: 100, mtime: new Date() },
        { isDirectory: () => false, size: 200, mtime: new Date() },
        { isDirectory: () => true, size: 0, mtime: new Date() },
      ];
      
      // Setup mocks
      (fs.promises.readdir as jest.Mock).mockResolvedValue(mockFiles);
      (fs.promises.stat as jest.Mock).mockImplementation((filePath) => {
        const index = mockFiles.indexOf(path.basename(filePath));
        return Promise.resolve(mockStats[index]);
      });
      
      // Execute
      const result = await provider.list('file:///test/path');
      
      // Verify
      expect(fs.promises.readdir).toHaveBeenCalledWith('/test/path');
      expect(result.items.length).toBe(3);
      expect(result.items[0].name).toBe('file1.txt');
      expect(result.items[0].isDirectory).toBe(false);
      expect(result.items[2].name).toBe('dir1');
      expect(result.items[2].isDirectory).toBe(true);
    });
  });
  
  describe('stat', () => {
    it('should return object stats', async () => {
      // Mock implementation
      const mockStat = { isDirectory: () => false, size: 100, mtime: new Date() };
      
      // Setup mocks
      (fs.promises.stat as jest.Mock).mockResolvedValue(mockStat);
      
      // Execute
      const result = await provider.stat('file:///test/path/file.txt');
      
      // Verify
      expect(fs.promises.stat).toHaveBeenCalledWith('/test/path/file.txt');
      expect(result.name).toBe('file.txt');
      expect(result.isDirectory).toBe(false);
      expect(result.size).toBe(100);
    });
  });
  
  describe('exists', () => {
    it('should return true if file exists', async () => {
      // Setup mocks
      (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
      
      // Execute
      const result = await provider.exists('file:///test/path/file.txt');
      
      // Verify
      expect(fs.promises.access).toHaveBeenCalledWith('/test/path/file.txt');
      expect(result).toBe(true);
    });
    
    it('should return false if file does not exist', async () => {
      // Setup mocks
      (fs.promises.access as jest.Mock).mockRejectedValue(new Error('File not found'));
      
      // Execute
      const result = await provider.exists('file:///test/path/file.txt');
      
      // Verify
      expect(fs.promises.access).toHaveBeenCalledWith('/test/path/file.txt');
      expect(result).toBe(false);
    });
  });
});