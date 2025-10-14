// Custom hook for file operations

import { useCallback, useState } from 'react';
import { FileItem } from '../types.js';
import { useFileBrowser } from './useFileBrowser.js';

export interface FileOperationState {
  isRunning: boolean;
  currentOperation: string | null;
  progress: number;
  currentFile: string | null;
  error: string | null;
}

export function useFileOperations() {
  const { copyFile, moveFile, deleteFile, createDirectory, renameFile } = useFileBrowser();
  const [state, setState] = useState<FileOperationState>({
    isRunning: false,
    currentOperation: null,
    progress: 0,
    currentFile: null,
    error: null,
  });

  const copyFiles = useCallback(async (sources: FileItem[], destination: string) => {
    setState({
      isRunning: true,
      currentOperation: 'copy',
      progress: 0,
      currentFile: null,
      error: null,
    });

    try {
      for (let i = 0; i < sources.length; i++) {
        const source = sources[i];
        setState(prev => ({
          ...prev,
          currentFile: source.name,
          progress: (i / sources.length) * 100,
        }));

        await copyFile(source.uri, `${destination}/${source.name}`);
      }

      setState({
        isRunning: false,
        currentOperation: null,
        progress: 100,
        currentFile: null,
        error: null,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        isRunning: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
      throw error;
    }
  }, [copyFile]);

  const moveFiles = useCallback(async (sources: FileItem[], destination: string) => {
    setState({
      isRunning: true,
      currentOperation: 'move',
      progress: 0,
      currentFile: null,
      error: null,
    });

    try {
      for (let i = 0; i < sources.length; i++) {
        const source = sources[i];
        setState(prev => ({
          ...prev,
          currentFile: source.name,
          progress: (i / sources.length) * 100,
        }));

        await moveFile(source.uri, `${destination}/${source.name}`);
      }

      setState({
        isRunning: false,
        currentOperation: null,
        progress: 100,
        currentFile: null,
        error: null,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        isRunning: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
      throw error;
    }
  }, [moveFile]);

  const deleteFiles = useCallback(async (items: FileItem[]) => {
    setState({
      isRunning: true,
      currentOperation: 'delete',
      progress: 0,
      currentFile: null,
      error: null,
    });

    try {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        setState(prev => ({
          ...prev,
          currentFile: item.name,
          progress: (i / items.length) * 100,
        }));

        await deleteFile(item.uri);
      }

      setState({
        isRunning: false,
        currentOperation: null,
        progress: 100,
        currentFile: null,
        error: null,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        isRunning: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
      throw error;
    }
  }, [deleteFile]);

  const createDir = useCallback(async (parentUri: string, name: string) => {
    setState({
      isRunning: true,
      currentOperation: 'create',
      progress: 0,
      currentFile: name,
      error: null,
    });

    try {
      const newDirUri = `${parentUri}/${name}`;
      await createDirectory(newDirUri);

      setState({
        isRunning: false,
        currentOperation: null,
        progress: 100,
        currentFile: null,
        error: null,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        isRunning: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
      throw error;
    }
  }, [createDirectory]);

  const renameItem = useCallback(async (item: FileItem, newName: string) => {
    setState({
      isRunning: true,
      currentOperation: 'rename',
      progress: 0,
      currentFile: item.name,
      error: null,
    });

    try {
      await renameFile(item.uri, newName);

      setState({
        isRunning: false,
        currentOperation: null,
        progress: 100,
        currentFile: null,
        error: null,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        isRunning: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
      throw error;
    }
  }, [renameFile]);

  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null,
    }));
  }, []);

  return {
    ...state,
    copyFiles,
    moveFiles,
    deleteFiles,
    createDirectory: createDir,
    renameFile: renameItem,
    clearError,
  };
}
