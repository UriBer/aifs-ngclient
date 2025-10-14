// Feature flags for A/B testing between blessed.js and Ink TUI implementations

export interface FeatureFlags {
  USE_INK_TUI: boolean;
  ENABLE_OLD_TUI: boolean;
  ENABLE_DEBUG_MODE: boolean;
  ENABLE_PERFORMANCE_MONITORING: boolean;
  ENABLE_AUTO_REFRESH: boolean;
  ENABLE_HIDDEN_FILES: boolean;
  ENABLE_FILTERING: boolean;
  ENABLE_BATCH_OPERATIONS: boolean;
  ENABLE_PROGRESS_INDICATORS: boolean;
  ENABLE_MODAL_DIALOGS: boolean;
}

export class FeatureFlagManager {
  private static instance: FeatureFlagManager;
  private flags: FeatureFlags;

  private constructor() {
    this.flags = this.loadFlags();
  }

  public static getInstance(): FeatureFlagManager {
    if (!FeatureFlagManager.instance) {
      FeatureFlagManager.instance = new FeatureFlagManager();
    }
    return FeatureFlagManager.instance;
  }

  private loadFlags(): FeatureFlags {
    // Load from environment variables with defaults
    return {
      USE_INK_TUI: process.env.USE_INK_TUI === 'true' || process.env.NODE_ENV === 'development',
      ENABLE_OLD_TUI: process.env.ENABLE_OLD_TUI === 'true' || process.env.USE_INK_TUI !== 'true',
      ENABLE_DEBUG_MODE: process.env.DEBUG === '1' || process.env.NODE_ENV === 'development',
      ENABLE_PERFORMANCE_MONITORING: process.env.ENABLE_PERFORMANCE_MONITORING === 'true',
      ENABLE_AUTO_REFRESH: process.env.ENABLE_AUTO_REFRESH !== 'false',
      ENABLE_HIDDEN_FILES: process.env.ENABLE_HIDDEN_FILES === 'true',
      ENABLE_FILTERING: process.env.ENABLE_FILTERING !== 'false',
      ENABLE_BATCH_OPERATIONS: process.env.ENABLE_BATCH_OPERATIONS !== 'false',
      ENABLE_PROGRESS_INDICATORS: process.env.ENABLE_PROGRESS_INDICATORS !== 'false',
      ENABLE_MODAL_DIALOGS: process.env.ENABLE_MODAL_DIALOGS !== 'false',
    };
  }

  public getFlags(): FeatureFlags {
    return { ...this.flags };
  }

  public getFlag<K extends keyof FeatureFlags>(key: K): FeatureFlags[K] {
    return this.flags[key];
  }

  public setFlag<K extends keyof FeatureFlags>(key: K, value: FeatureFlags[K]): void {
    this.flags[key] = value;
  }

  public isEnabled(flag: keyof FeatureFlags): boolean {
    return this.flags[flag] === true;
  }

  public isDisabled(flag: keyof FeatureFlags): boolean {
    return this.flags[flag] === false;
  }

  public getTuiImplementation(): 'ink' | 'blessed' {
    return this.flags.USE_INK_TUI ? 'ink' : 'blessed';
  }

  public shouldUseInk(): boolean {
    return this.flags.USE_INK_TUI;
  }

  public shouldUseBlessed(): boolean {
    return this.flags.ENABLE_OLD_TUI;
  }

  public getDebugInfo(): object {
    return {
      flags: this.flags,
      implementation: this.getTuiImplementation(),
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    };
  }
}

// Export singleton instance
export const featureFlags = FeatureFlagManager.getInstance();
