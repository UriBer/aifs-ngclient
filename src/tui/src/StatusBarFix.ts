// Status Bar Fix for TUI Application
// This module specifically fixes the status bar refresh issues

export class StatusBarFix {
  private static instance: StatusBarFix;

  static getInstance(): StatusBarFix {
    if (!StatusBarFix.instance) {
      StatusBarFix.instance = new StatusBarFix();
    }
    return StatusBarFix.instance;
  }

  /**
   * Fixes status bar provider information display
   */
  fixStatusBarProviderInfo(tuiApp: any): void {
    try {
      console.log('🔧 Fixing status bar provider information...');
      
      // Force provider state synchronization
      this.syncProviderState(tuiApp);
      
      // Update status bar with correct information
      this.updateStatusBar(tuiApp);
      
      console.log('✅ Status bar provider information fixed');
    } catch (error) {
      console.error('Error fixing status bar:', error);
    }
  }

  /**
   * Synchronizes provider state with actual provider manager state
   */
  private syncProviderState(tuiApp: any): void {
    try {
      // Get current provider from provider manager
      const currentProvider = tuiApp.providerManager?.getCurrentProvider?.() || 'file';
      
      // Check if providers are out of sync
      if (tuiApp.leftProvider !== currentProvider) {
        console.log(`🔄 Syncing left provider: ${tuiApp.leftProvider} -> ${currentProvider}`);
        tuiApp.leftProvider = currentProvider;
      }
      
      if (tuiApp.rightProvider !== currentProvider) {
        console.log(`🔄 Syncing right provider: ${tuiApp.rightProvider} -> ${currentProvider}`);
        tuiApp.rightProvider = currentProvider;
      }

      // Validate and fix URI consistency
      this.validateAndFixUris(tuiApp);
      
    } catch (error) {
      console.error('Error syncing provider state:', error);
    }
  }

  /**
   * Validates and fixes URI consistency with provider types
   */
  private validateAndFixUris(tuiApp: any): void {
    // Fix left pane URI
    if (tuiApp.leftProvider === 'file') {
      if (!tuiApp.leftUri.startsWith('file://') && !tuiApp.leftUri.startsWith('/')) {
        console.log(`🔧 Fixing left URI: ${tuiApp.leftUri} -> file://${tuiApp.leftUri}`);
        tuiApp.leftUri = `file://${tuiApp.leftUri}`;
      }
    } else {
      // Cloud provider
      if (!tuiApp.leftUri.includes('://')) {
        console.log(`🔧 Fixing left URI: ${tuiApp.leftUri} -> ${tuiApp.leftProvider}://${tuiApp.leftUri}`);
        tuiApp.leftUri = `${tuiApp.leftProvider}://${tuiApp.leftUri}`;
      }
    }

    // Fix right pane URI
    if (tuiApp.rightProvider === 'file') {
      if (!tuiApp.rightUri.startsWith('file://') && !tuiApp.rightUri.startsWith('/')) {
        console.log(`🔧 Fixing right URI: ${tuiApp.rightUri} -> file://${tuiApp.rightUri}`);
        tuiApp.rightUri = `file://${tuiApp.rightUri}`;
      }
    } else {
      // Cloud provider
      if (!tuiApp.rightUri.includes('://')) {
        console.log(`🔧 Fixing right URI: ${tuiApp.rightUri} -> ${tuiApp.rightProvider}://${tuiApp.rightUri}`);
        tuiApp.rightUri = `${tuiApp.rightProvider}://${tuiApp.rightUri}`;
      }
    }
  }

  /**
   * Updates status bar with correct provider information
   */
  private updateStatusBar(tuiApp: any): void {
    try {
      if (!tuiApp.statusBar) return;

      // Get provider information
      const leftProviderInfo = tuiApp.providerManager?.getProviderInfo?.(tuiApp.leftProvider);
      const rightProviderInfo = tuiApp.providerManager?.getProviderInfo?.(tuiApp.rightProvider);
      
      // Create status bar content with correct provider information
      const leftInfo = `Left [${leftProviderInfo?.displayName || tuiApp.leftProvider}]: ${tuiApp.leftUri}`;
      const rightInfo = `Right [${rightProviderInfo?.displayName || tuiApp.rightProvider}]: ${tuiApp.rightUri}`;
      
      // Get current selection info
      const currentPane = tuiApp.currentPane;
      const items = currentPane === 'left' ? tuiApp.leftItems : tuiApp.rightItems;
      const selectedIndex = currentPane === 'left' ? tuiApp.leftSelected : tuiApp.rightSelected;
      const selectedItems = currentPane === 'left' ? tuiApp.leftSelectedItems : tuiApp.rightSelectedItems;
      
      let selectionInfo = '';
      if (items.length > 0) {
        const hasParentEntry = (currentPane === 'left' ? tuiApp.leftUri : tuiApp.rightUri) !== '/' && (currentPane === 'left' ? tuiApp.leftUri : tuiApp.rightUri) !== '';
        const isParentEntry = hasParentEntry && selectedIndex === 0;
        
        if (isParentEntry) {
          selectionInfo = 'DIR .. (parent directory)';
        } else {
          const actualIndex = hasParentEntry ? selectedIndex - 1 : selectedIndex;
          if (actualIndex >= 0 && actualIndex < items.length) {
            const item = items[actualIndex];
            const size = item.size ? this.formatFileSize(item.size) : '';
            const type = item.isDirectory ? 'DIR' : 'FILE';
            const displayName = this.truncateFileName(item.name, 25);
            selectionInfo = `${type} ${size} ${displayName}`;
          }
        }
      }
      
      // Add selection count
      const selectionCount = selectedItems.size;
      const selectionText = selectionCount > 0 ? ` | Selected: ${selectionCount}` : '';
      
      const overlayStatus = tuiApp.overlayMode ? 'Overlay' : 'Full';
      tuiApp.statusBar.content = `${leftInfo} | ${rightInfo} | ${selectionInfo}${selectionText} | Press P for provider, F9 for config, F1 for help, F12 for ${overlayStatus} mode, F10 to quit`;
      
      // Force render
      if (tuiApp.screen) {
        tuiApp.screen.render();
      }
      
    } catch (error) {
      console.error('Error updating status bar:', error);
    }
  }

  /**
   * Formats file size for display
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Truncates filename for display
   */
  private truncateFileName(name: string, maxLength: number): string {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength - 3) + '...';
  }
}
