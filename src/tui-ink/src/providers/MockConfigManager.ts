// Mock ConfigManager for Ink TUI - simplified version

export class MockConfigManager {
  constructor() {
    // Initialize mock config manager
  }

  async getProviderConfig(provider: string): Promise<any> {
    // Return mock config or null
    return null;
  }

  async saveProviderConfig(provider: string, config: any): Promise<void> {
    // Mock save operation
    console.log(`Mock: Saved config for provider ${provider}`);
  }
}
