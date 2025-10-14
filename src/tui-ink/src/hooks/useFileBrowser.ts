// Custom hook for file browser state management with real provider integration

import { useCallback, useState, useEffect } from 'react';
import { FileItem } from '../types.js';
import { ProviderManager } from '../providers/ProviderManager.js';
import { StateManager } from '../providers/StateManager.js';
import { ConfigManager } from '../providers/ConfigManager.js';

export function useFileBrowser() {
  const [providerManager] = useState(() => new ProviderManager());
  const [stateManager] = useState(() => new StateManager());
  const [configManager] = useState(() => new ConfigManager());
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize providers on mount
  useEffect(() => {
    const initializeProviders = async () => {
      try {
        // ProviderManager doesn't have initializeProviders method, it's initialized in constructor
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize providers:', error);
        setIsInitialized(true); // Continue anyway
      }
    };
    initializeProviders();
  }, [providerManager]);

  const loadDirectory = useCallback(async (uri: string, provider: string): Promise<FileItem[]> => {
    if (!isInitialized) {
      throw new Error('Providers not initialized yet');
    }

    try {
      const result = await providerManager.list(uri);
      return result.items.map((item: any) => ({
        name: item.name,
        uri: item.uri,
        isDirectory: item.isDirectory,
        size: item.size || 0,
        lastModified: item.lastModified,
        permissions: item.permissions,
        owner: item.owner,
        group: item.group,
      }));
    } catch (error) {
      console.error(`Failed to load directory ${uri} with provider ${provider}:`, error);
      throw error;
    }
  }, [providerManager, isInitialized]);

  const switchProvider = useCallback(async (provider: string): Promise<void> => {
    if (!isInitialized) {
      throw new Error('Providers not initialized yet');
    }

    try {
      // Validate provider configuration
      const providerInfo = providerManager.getProviderInfo(provider);
      if (!providerInfo || !providerInfo.available) {
        throw new Error(`Provider ${provider} is not available or not configured`);
      }
      
      // Update provider state
      providerManager.setCurrentProvider(provider);
    } catch (error) {
      console.error(`Failed to switch to provider ${provider}:`, error);
      throw error;
    }
  }, [providerManager, isInitialized]);

  const copyFile = useCallback(async (sourceUri: string, destUri: string): Promise<void> => {
    if (!isInitialized) {
      throw new Error('Providers not initialized yet');
    }

    try {
      await providerManager.copy(sourceUri, destUri);
    } catch (error) {
      console.error(`Failed to copy file from ${sourceUri} to ${destUri}:`, error);
      throw error;
    }
  }, [providerManager, isInitialized]);

  const moveFile = useCallback(async (sourceUri: string, destUri: string): Promise<void> => {
    if (!isInitialized) {
      throw new Error('Providers not initialized yet');
    }

    try {
      await providerManager.move(sourceUri, destUri);
    } catch (error) {
      console.error(`Failed to move file from ${sourceUri} to ${destUri}:`, error);
      throw error;
    }
  }, [providerManager, isInitialized]);

  const deleteFile = useCallback(async (uri: string): Promise<void> => {
    if (!isInitialized) {
      throw new Error('Providers not initialized yet');
    }

    try {
      await providerManager.delete(uri);
    } catch (error) {
      console.error(`Failed to delete file ${uri}:`, error);
      throw error;
    }
  }, [providerManager, isInitialized]);

  const createDirectory = useCallback(async (uri: string): Promise<void> => {
    if (!isInitialized) {
      throw new Error('Providers not initialized yet');
    }

    try {
      await providerManager.mkdir(uri);
    } catch (error) {
      console.error(`Failed to create directory ${uri}:`, error);
      throw error;
    }
  }, [providerManager, isInitialized]);

  const renameFile = useCallback(async (uri: string, newName: string): Promise<void> => {
    if (!isInitialized) {
      throw new Error('Providers not initialized yet');
    }

    try {
      // ProviderManager doesn't have rename, use move instead
      const parentDir = uri.substring(0, uri.lastIndexOf('/'));
      const newUri = `${parentDir}/${newName}`;
      await providerManager.move(uri, newUri);
    } catch (error) {
      console.error(`Failed to rename file ${uri} to ${newName}:`, error);
      throw error;
    }
  }, [providerManager, isInitialized]);

  const getProviderInfo = useCallback((provider: string) => {
    return providerManager.getProviderInfo(provider);
  }, [providerManager]);

  const getAvailableProviders = useCallback(() => {
    return providerManager.getAllProviders();
  }, [providerManager]);

  const loadState = useCallback(async () => {
    try {
      return await stateManager.loadState();
    } catch (error) {
      console.error('Failed to load state:', error);
      return null;
    }
  }, [stateManager]);

  const saveState = useCallback(async (leftUri: string, rightUri: string, leftSelectedIndex: number, rightSelectedIndex: number) => {
    try {
      await stateManager.saveState(leftUri, rightUri, leftSelectedIndex, rightSelectedIndex);
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  }, [stateManager]);

  return {
    loadDirectory,
    switchProvider,
    copyFile,
    moveFile,
    deleteFile,
    createDirectory,
    renameFile,
    getProviderInfo,
    getAvailableProviders,
    loadState,
    saveState,
    isInitialized,
  };
}
