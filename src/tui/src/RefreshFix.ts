// Refresh Fix for TUI Application
// This module provides comprehensive fixes for refresh issues in the TUI

export interface RefreshFixOptions {
  forceProviderSync: boolean;
  clearStateOnError: boolean;
  validateProviderState: boolean;
}

export class RefreshFix {
  private static instance: RefreshFix;
  private options: RefreshFixOptions;

  constructor(options: Partial<RefreshFixOptions> = {}) {
    this.options = {
      forceProviderSync: true,
      clearStateOnError: true,
      validateProviderState: true,
      ...options
    };
  }

  static getInstance(): RefreshFix {
    if (!RefreshFix.instance) {
      RefreshFix.instance = new RefreshFix();
    }
    return RefreshFix.instance;
  }

  /**
   * Fixes provider state synchronization issues
   */
  fixProviderStateSync(tuiApp: any): void {
    // Force synchronization of provider state
    if (this.options.forceProviderSync) {
      this.syncProviderState(tuiApp);
    }

    // Validate provider state consistency
    if (this.options.validateProviderState) {
      this.validateProviderState(tuiApp);
    }
  }

  /**
   * Synchronizes provider state with actual provider manager state
   */
  private syncProviderState(tuiApp: any): void {
    try {
      // Get current provider from provider manager
      const currentProvider = tuiApp.providerManager?.getCurrentProvider?.() || 'file';
      
      // Update left and right provider if they're out of sync
      if (tuiApp.leftProvider !== currentProvider) {
        console.log(`Syncing left provider: ${tuiApp.leftProvider} -> ${currentProvider}`);
        tuiApp.leftProvider = currentProvider;
      }
      
      if (tuiApp.rightProvider !== currentProvider) {
        console.log(`Syncing right provider: ${tuiApp.rightProvider} -> ${currentProvider}`);
        tuiApp.rightProvider = currentProvider;
      }

      // Force status bar update
      if (tuiApp.updateStatus) {
        tuiApp.updateStatus();
      }
    } catch (error) {
      console.error('Error syncing provider state:', error);
    }
  }

  /**
   * Validates provider state consistency
   */
  private validateProviderState(tuiApp: any): void {
    try {
      // Check if provider info matches actual state
      const leftProviderInfo = tuiApp.providerManager?.getProviderInfo?.(tuiApp.leftProvider);
      const rightProviderInfo = tuiApp.providerManager?.getProviderInfo?.(tuiApp.rightProvider);

      if (!leftProviderInfo && tuiApp.leftProvider !== 'file') {
        console.warn(`Left provider ${tuiApp.leftProvider} not found, resetting to file`);
        tuiApp.leftProvider = 'file';
        tuiApp.leftUri = tuiApp.leftUri.startsWith('file://') ? tuiApp.leftUri : `file://${tuiApp.leftUri}`;
      }

      if (!rightProviderInfo && tuiApp.rightProvider !== 'file') {
        console.warn(`Right provider ${tuiApp.rightProvider} not found, resetting to file`);
        tuiApp.rightProvider = 'file';
        tuiApp.rightUri = tuiApp.rightUri.startsWith('file://') ? tuiApp.rightUri : `file://${tuiApp.rightUri}`;
      }

      // Check URI consistency with provider
      this.validateUriConsistency(tuiApp);

    } catch (error) {
      console.error('Error validating provider state:', error);
    }
  }

  /**
   * Validates URI consistency with provider type
   */
  private validateUriConsistency(tuiApp: any): void {
    // Check left pane URI consistency
    if (tuiApp.leftProvider === 'file' && !tuiApp.leftUri.startsWith('file://') && !tuiApp.leftUri.startsWith('/')) {
      console.warn('Left URI inconsistent with file provider, fixing...');
      tuiApp.leftUri = tuiApp.leftUri.startsWith('file://') ? tuiApp.leftUri : `file://${tuiApp.leftUri}`;
    }

    // Check right pane URI consistency
    if (tuiApp.rightProvider === 'file' && !tuiApp.rightUri.startsWith('file://') && !tuiApp.rightUri.startsWith('/')) {
      console.warn('Right URI inconsistent with file provider, fixing...');
      tuiApp.rightUri = tuiApp.rightUri.startsWith('file://') ? tuiApp.rightUri : `file://${tuiApp.rightUri}`;
    }

    // Check cloud provider URI consistency
    const cloudProviders = ['s3', 'gcs', 'az', 'aifs'];
    if (cloudProviders.includes(tuiApp.leftProvider) && !tuiApp.leftUri.includes('://')) {
      console.warn(`Left URI inconsistent with ${tuiApp.leftProvider} provider, fixing...`);
      tuiApp.leftUri = `${tuiApp.leftProvider}://${tuiApp.leftUri}`;
    }

    if (cloudProviders.includes(tuiApp.rightProvider) && !tuiApp.rightUri.includes('://')) {
      console.warn(`Right URI inconsistent with ${tuiApp.rightProvider} provider, fixing...`);
      tuiApp.rightUri = `${tuiApp.rightProvider}://${tuiApp.rightUri}`;
    }
  }

  /**
   * Clears state on error to prevent inconsistent state
   */
  clearStateOnError(tuiApp: any): void {
    if (this.options.clearStateOnError) {
      try {
        // Clear selections
        tuiApp.leftSelectedItems?.clear();
        tuiApp.rightSelectedItems?.clear();

        // Reset to safe state
        tuiApp.leftProvider = 'file';
        tuiApp.rightProvider = 'file';
        tuiApp.leftUri = tuiApp.leftUri.startsWith('file://') ? tuiApp.leftUri : `file://${tuiApp.leftUri}`;
        tuiApp.rightUri = tuiApp.rightUri.startsWith('file://') ? tuiApp.rightUri : `file://${tuiApp.rightUri}`;

        // Force refresh
        if (tuiApp.updateStatus) {
          tuiApp.updateStatus();
        }

        console.log('State cleared and reset to safe values');
      } catch (error) {
        console.error('Error clearing state:', error);
      }
    }
  }

  /**
   * Applies all refresh fixes
   */
  applyFixes(tuiApp: any): void {
    console.log('🔧 Applying refresh fixes...');
    
    this.fixProviderStateSync(tuiApp);
    
    // Force a complete refresh
    if (tuiApp.scheduleRender) {
      tuiApp.scheduleRender(() => {
        console.log('Refresh fix applied successfully');
      });
    }
  }
}
