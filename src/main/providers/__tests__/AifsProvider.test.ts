import { AifsProvider } from '../AifsProvider';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AifsObject } from '../../../shared/models/AifsObject';
import { ChecksumUtils } from '../../utils/ChecksumUtils';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock fs
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  createWriteStream: jest.fn(),
  existsSync: jest.fn(),
  unlinkSync: jest.fn(),
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock ChecksumUtils
jest.mock('../../utils/ChecksumUtils', () => ({
  ChecksumUtils: {
    calculateBlake3Checksum: jest.fn().mockResolvedValue('mock-checksum'),
    verifyChecksum: jest.fn().mockResolvedValue(true),
  },
}));

// Mock pipeline
jest.mock('stream/promises', () => ({
  pipeline: jest.fn().mockResolvedValue(undefined),
}));

describe('AifsProvider', () => {
  let provider: AifsProvider;
  const mockEndpoint = 'https://api.aifs.example.com';
  const mockApiKey = 'test-api-key';
  const tempDir = os.tmpdir();
  
  beforeEach(() => {
    jest.clearAllMocks();
    provider = new AifsProvider({ endpoint: mockEndpoint, apiKey: mockApiKey });
    
    // Default axios mock implementation
    mockedAxios.create.mockReturnValue(mockedAxios as any);
    
    // Mock the parseAifsUri method to return expected values
    jest.spyOn(provider as any, 'parseAifsUri').mockImplementation((uri: string) => {
      const parts = uri.replace('aifs://', '').split('/');
      return {
        namespace: parts[0],
        path: parts.slice(1).join('/')
      };
    });
  });
  
  describe('scheme', () => {
    it('returns aifs as the scheme', () => {
      expect(provider.scheme()).toBe('aifs');
    });
  });
  
  describe('list', () => {
    it('lists objects in a namespace', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            items: [
              {
                name: 'file1.txt',
                path: 'file1.txt',
                size: 1024,
                lastModified: '2023-01-01T00:00:00Z',
                etag: 'etag1',
                checksum: 'checksum1',
                isDir: false,
                metadata: {
                  contentType: 'text/plain',
                  semanticTags: ['tag1', 'tag2'],
                  embedding: [0.1, 0.2, 0.3],
                },
                lineage: {
                  parents: ['parent1'],
                  children: ['child1'],
                },
                snapshot: null,
              },
              {
                name: 'dir1',
                path: 'dir1/',
                size: 0,
                lastModified: '2023-01-01T00:00:00Z',
                etag: 'etag2',
                checksum: null,
                isDir: true,
                metadata: {},
                lineage: null,
                snapshot: null,
              },
            ],
            nextContinuationToken: null,
          },
        },
      };
      
      mockedAxios.get.mockResolvedValueOnce(mockResponse);
      
      const result = await provider.list('aifs://test-namespace/');
      
      expect(mockedAxios.get).toHaveBeenCalledWith('/objects/list', {
        params: {
          namespace: 'test-namespace',
          prefix: '',
          delimiter: '/',
          maxKeys: 1000,
          continuationToken: undefined,
          semanticQuery: undefined,
        },
      });
      
      expect(result.items.length).toBe(2);
      expect(result.items[0]).toBeInstanceOf(AifsObject);
      expect(result.items[0].name).toBe('file1.txt');
      expect(result.items[0].isDir).toBe(false);
      expect((result.items[0] as AifsObject).semanticTags).toEqual(['tag1', 'tag2']);
      expect(result.items[1].name).toBe('dir1');
      expect(result.items[1].isDir).toBe(true);
    });
    
    it('supports semantic search', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            items: [],
            nextContinuationToken: null,
          },
        },
      };
      
      mockedAxios.get.mockResolvedValueOnce(mockResponse);
      
      await provider.list('aifs://test-namespace/', {
        semanticQuery: 'test query',
      });
      
      expect(mockedAxios.get).toHaveBeenCalledWith('/objects/list', {
        params: {
          namespace: 'test-namespace',
          prefix: '',
          delimiter: '/',
          maxKeys: 1000,
          continuationToken: undefined,
          semanticQuery: 'test query',
        },
      });
    });
  });
  
  describe('stat', () => {
    it('gets metadata for an object', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            name: 'file1.txt',
            path: 'file1.txt',
            size: 1024,
            lastModified: '2023-01-01T00:00:00Z',
            etag: 'etag1',
            checksum: 'checksum1',
            isDir: false,
            metadata: {
              contentType: 'text/plain',
              semanticTags: ['tag1', 'tag2'],
              embedding: [0.1, 0.2, 0.3],
            },
            lineage: {
              parents: ['parent1'],
              children: ['child1'],
            },
            snapshot: null,
          },
        },
      };
      
      mockedAxios.get.mockResolvedValueOnce(mockResponse);
      
      const result = await provider.stat('aifs://test-namespace/file1.txt');
      
      expect(mockedAxios.get).toHaveBeenCalledWith('/objects/stat', {
        params: {
          namespace: 'test-namespace',
          path: 'file1.txt',
        },
      });
      
      expect(result).toBeInstanceOf(AifsObject);
      expect(result.name).toBe('file1.txt');
      expect(result.size).toBe(1024);
      expect(result.checksum).toBe('checksum1');
      expect(result.isDir).toBe(false);
      expect((result as AifsObject).semanticTags).toEqual(['tag1', 'tag2']);
      expect((result as AifsObject).lineage?.parents).toEqual(['parent1']);
    });
    
    it('handles not found errors', async () => {
      const mockError = {
        response: {
          status: 404,
          data: {
            success: false,
            error: 'Object not found',
          },
        },
      };
      
      mockedAxios.get.mockRejectedValueOnce(mockError);
      
      await expect(provider.stat('aifs://test-namespace/nonexistent')).rejects.toThrow('Object not found');
    });
  });
  
  describe('put', () => {
    it('uploads a file with metadata', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            name: 'file1.txt',
            path: 'file1.txt',
            size: 1024,
            lastModified: '2023-01-01T00:00:00Z',
            etag: 'etag1',
            checksum: 'mock-checksum',
            isDir: false,
            metadata: {
              contentType: 'text/plain',
              semanticTags: ['tag1', 'tag2'],
            },
          },
        },
      };
      
      mockedAxios.post.mockResolvedValueOnce(mockResponse);
      
      const sourcePath = path.join(tempDir, 'test-file.txt');
      const destUri = 'aifs://test-namespace/file1.txt';
      
      // Mock fs.existsSync to return true
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      
      // Mock fs.statSync to return file stats
      jest.spyOn(fs, 'statSync').mockReturnValueOnce({
        size: 1024,
        isDirectory: () => false,
      } as any);
      
      // Mock form-data
      const mockFormData = {
        append: jest.fn(),
      };
      jest.mock('form-data', () => {
        return function() {
          return mockFormData;
        };
      });
      
      await provider.put(sourcePath, destUri, {
        semanticTags: ['tag1', 'tag2'],
        contentType: 'text/plain',
      });
      
      expect(ChecksumUtils.calculateBlake3Checksum).toHaveBeenCalledWith(sourcePath);
      expect(mockedAxios.post).toHaveBeenCalled();
      expect(mockedAxios.post).toHaveBeenCalled();
    });
  });
  
  describe('get', () => {
    it('downloads a file and validates checksum', async () => {
      // Mock stat response
      const mockStatResponse = {
        data: {
          success: true,
          data: {
            name: 'file1.txt',
            path: 'file1.txt',
            size: 1024,
            lastModified: '2023-01-01T00:00:00Z',
            etag: 'etag1',
            checksum: 'checksum1',
            isDir: false,
          },
        },
      };
      
      // Mock get response
      const mockGetResponse = {
        data: 'mock-stream',
      };
      
      mockedAxios.get.mockResolvedValueOnce(mockStatResponse);
      mockedAxios.get.mockResolvedValueOnce(mockGetResponse);
      
      const destPath = path.join(tempDir, 'downloaded-file.txt');
      
      // Mock createWriteStream
      const mockWriteStream = {};
      (fs.createWriteStream as jest.Mock).mockReturnValueOnce(mockWriteStream);
      
      await provider.get('aifs://test-namespace/file1.txt', destPath);
      
      expect(fs.promises.mkdir).toHaveBeenCalledWith(path.dirname(destPath), { recursive: true });
      expect(fs.createWriteStream).toHaveBeenCalledWith(destPath);
      expect(ChecksumUtils.verifyChecksum).toHaveBeenCalledWith(destPath, 'checksum1', 'blake3');
    });
  });
  
  describe('copy', () => {
    it('performs server-side copy within the same namespace', async () => {
      // Mock stat response
      const mockStatResponse = {
        data: {
          success: true,
          data: {
            name: 'file1.txt',
            path: 'file1.txt',
            size: 1024,
            isDir: false,
          },
        },
      };
      
      // Mock copy response
      const mockCopyResponse = {
        data: {
          success: true,
          data: {},
        },
      };
      
      mockedAxios.get.mockResolvedValueOnce(mockStatResponse);
      mockedAxios.post.mockResolvedValueOnce(mockCopyResponse);
      
      await provider.copy('aifs://test-namespace/file1.txt', 'aifs://test-namespace/file2.txt');
      
      expect(mockedAxios.post).toHaveBeenCalledWith('/objects/copy', {
        sourceNamespace: 'test-namespace',
        sourcePath: 'file1.txt',
        destNamespace: 'test-namespace',
        destPath: 'file2.txt',
        preserveMetadata: true,
      });
    });
  });
  
  describe('move', () => {
    it('performs server-side move within the same namespace', async () => {
      // Mock stat response
      const mockStatResponse = {
        data: {
          success: true,
          data: {
            name: 'file1.txt',
            path: 'file1.txt',
            size: 1024,
            isDir: false,
          },
        },
      };
      
      // Mock move response
      const mockMoveResponse = {
        data: {
          success: true,
          data: {},
        },
      };
      
      mockedAxios.get.mockResolvedValueOnce(mockStatResponse);
      mockedAxios.post.mockResolvedValueOnce(mockMoveResponse);
      
      await provider.move('aifs://test-namespace/file1.txt', 'aifs://test-namespace/file2.txt');
      
      expect(mockedAxios.post).toHaveBeenCalledWith('/objects/move', {
        sourceNamespace: 'test-namespace',
        sourcePath: 'file1.txt',
        destNamespace: 'test-namespace',
        destPath: 'file2.txt',
      });
    });
  });
  
  describe('delete', () => {
    it('deletes an object', async () => {
      // Mock stat response
      const mockStatResponse = {
        data: {
          success: true,
          data: {
            name: 'file1.txt',
            path: 'file1.txt',
            size: 1024,
            isDir: false,
          },
        },
      };
      
      // Mock delete response
      const mockDeleteResponse = {
        data: {
          success: true,
          data: null,
        },
      };
      
      mockedAxios.get.mockResolvedValueOnce(mockStatResponse);
      mockedAxios.delete.mockResolvedValueOnce(mockDeleteResponse);
      
      await provider.delete('aifs://test-namespace/file1.txt');
      
      expect(mockedAxios.delete).toHaveBeenCalledWith('/objects/delete', {
        params: {
          namespace: 'test-namespace',
          path: 'file1.txt',
          recursive: false,
        },
      });
    });
    
    it('requires recursive flag for non-empty directories', async () => {
      // Mock stat response for directory
      const mockStatResponse = {
        data: {
          success: true,
          data: {
            name: 'dir1',
            path: 'dir1/',
            size: 0,
            isDir: true,
          },
        },
      };
      
      // Mock list response with items
      const mockListResponse = {
        data: {
          success: true,
          data: {
            items: [{ name: 'file1.txt' }],
            nextContinuationToken: null,
          },
        },
      };
      
      mockedAxios.get.mockResolvedValueOnce(mockStatResponse);
      mockedAxios.get.mockResolvedValueOnce(mockListResponse);
      
      await expect(provider.delete('aifs://test-namespace/dir1/')).rejects.toThrow(
        'Cannot delete non-empty directory'
      );
      
      // Test with recursive flag
      const mockDeleteResponse = {
        data: {
          success: true,
          data: null,
        },
      };
      mockedAxios.delete.mockResolvedValueOnce(mockDeleteResponse);
      await provider.delete('aifs://test-namespace/dir1/', true);
    });
  });
  
  describe('mkdir', () => {
    it('creates a directory', async () => {
      // Mock stat error (directory doesn't exist)
      const mockStatError = {
        response: {
          status: 404,
          data: {
            success: false,
            error: 'Object not found',
          },
        },
        message: 'Object not found',
      };
      
      // Mock mkdir response
      const mockMkdirResponse = {
        data: {
          success: true,
          data: null,
        },
      };
      
      mockedAxios.get.mockRejectedValueOnce(mockStatError);
      mockedAxios.post.mockResolvedValueOnce(mockMkdirResponse);
      
      await provider.mkdir('aifs://test-namespace/new-dir/');
      
      expect(mockedAxios.post).toHaveBeenCalledWith('/objects/mkdir', {
        namespace: 'test-namespace',
        path: 'new-dir/',
        recursive: true,
      });
    });
    
    it('does nothing if directory already exists', async () => {
      // Mock stat response for existing directory
      const mockStatResponse = {
        data: {
          success: true,
          data: {
            name: 'dir1',
            path: 'dir1/',
            size: 0,
            isDir: true,
          },
        },
      };
      
      mockedAxios.get.mockResolvedValueOnce(mockStatResponse);
      
      await provider.mkdir('aifs://test-namespace/dir1/');
      
      // Post should not be called
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });
  });
  
  describe('exists', () => {
    it('returns true if object exists', async () => {
      // Mock stat response
      const mockStatResponse = {
        data: {
          success: true,
          data: {
            name: 'file1.txt',
            path: 'file1.txt',
            isDir: false,
          },
        },
      };
      
      mockedAxios.get.mockResolvedValueOnce(mockStatResponse);
      
      const result = await provider.exists('aifs://test-namespace/file1.txt');
      
      expect(result).toBe(true);
    });
    
    it('returns false if object does not exist', async () => {
      // Mock stat error
      const mockStatError = {
        response: {
          status: 404,
          data: {
            success: false,
            error: 'Object not found',
          },
        },
        message: 'Object not found',
      };
      
      mockedAxios.get.mockRejectedValueOnce(mockStatError);
      
      const result = await provider.exists('aifs://test-namespace/nonexistent');
      
      expect(result).toBe(false);
    });
  });
});