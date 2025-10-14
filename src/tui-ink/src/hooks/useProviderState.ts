// Custom hook for provider state management

import { useCallback, useState, useEffect } from 'react';
import { ProviderManager } from '../providers/ProviderManager.js';
import { StateManager } from '../providers/StateManager.js';
import { ConfigManager } from '../providers/ConfigManager.js';

export interface ProviderState {
  currentProvider: string;
  availableProviders: string[];
  providerConfigs: Map<string, any>;
  isInitialized: boolean;
}

export function useProviderState() {
  const [providerManager] = useState(() => new ProviderManager());
  const [stateManager] = useState(() => new StateManager());
  const [configManager] = useState(() => new ConfigManager());
  const [state, setState] = useState<ProviderState>({
    currentProvider: 'file',
    availableProviders: ['file'],
    providerConfigs: new Map(),
    isInitialized: false,
  });

  // Initialize providers on mount
  useEffect(() => {
    const initializeProviders = async () => {
      try {
        // Load saved state
        const savedState = await stateManager.loadState();
        
        // Get available providers
        const allProviders = providerManager.getAllProviders();
        const availableProviders = allProviders.map(p => p.name);
        
        // Load provider configurations
        const providerConfigs = new Map();
        for (const provider of availableProviders) {
          try {
            const config = await configManager.getProviderConfig(provider);
            if (config) {
              providerConfigs.set(provider, config);
            }
          } catch (error) {
            console.warn(`Failed to load config for provider ${provider}:`, error);
          }
        }

        setState({
          currentProvider: 'file', // Default to file provider
          availableProviders,
          providerConfigs,
          isInitialized: true,
        });
      } catch (error) {
        console.error('Failed to initialize provider state:', error);
        setState(prev => ({ ...prev, isInitialized: true }));
      }
    };

    initializeProviders();
  }, [providerManager, stateManager, configManager]);

  const switchProvider = useCallback(async (provider: string) => {
    if (!state.isInitialized) {
      throw new Error('Provider state not initialized yet');
    }

    try {
      // Validate provider is available
      if (!state.availableProviders.includes(provider)) {
        throw new Error(`Provider ${provider} is not available`);
      }

      // Test connection - ProviderManager doesn't have testConnection method
      // Skip for now
      
      // Update current provider
      providerManager.setCurrentProvider(provider);
      
      setState(prev => ({
        ...prev,
        currentProvider: provider,
      }));

      // Save state
      await stateManager.saveState('', '', 0, 0);
    } catch (error) {
      console.error(`Failed to switch to provider ${provider}:`, error);
      throw error;
    }
  }, [state.isInitialized, state.availableProviders, providerManager, stateManager]);

  const configureProvider = useCallback(async (provider: string, config: any) => {
    try {
      // ConfigManager doesn't have saveProviderConfig, skip for now
      console.warn('Provider configuration not implemented yet');
      
      // Update local config
      setState(prev => {
        const newConfigs = new Map(prev.providerConfigs);
        newConfigs.set(provider, config);
        return {
          ...prev,
          providerConfigs: newConfigs,
        };
      });
    } catch (error) {
      console.error(`Failed to configure provider ${provider}:`, error);
      throw error;
    }
  }, [configManager]);

  const testProviderConnection = useCallback(async (provider: string) => {
    try {
      // ProviderManager doesn't have testConnection, skip for now
      console.warn('Provider connection testing not implemented yet');
      return true;
    } catch (error) {
      console.error(`Failed to test connection for provider ${provider}:`, error);
      throw error;
    }
  }, [providerManager]);

  const getProviderConfig = useCallback((provider: string) => {
    return state.providerConfigs.get(provider);
  }, [state.providerConfigs]);

  const isProviderConfigured = useCallback((provider: string) => {
    return state.providerConfigs.has(provider);
  }, [state.providerConfigs]);

  return {
    ...state,
    switchProvider,
    configureProvider,
    testProviderConnection,
    getProviderConfig,
    isProviderConfigured,
  };
}
