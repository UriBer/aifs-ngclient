// Mock StateManager for Ink TUI - simplified version

export interface TuiState {
  leftUri: string;
  rightUri: string;
  leftSelectedIndex: number;
  rightSelectedIndex: number;
  lastUsed: number;
}

export class MockStateManager {
  private state: TuiState | null = null;

  constructor() {
    // Initialize with default state
  }

  async loadState(): Promise<TuiState | null> {
    // Return mock state or null
    return this.state;
  }

  async saveState(leftUri: string, rightUri: string, leftSelectedIndex: number, rightSelectedIndex: number): Promise<void> {
    this.state = {
      leftUri,
      rightUri,
      leftSelectedIndex,
      rightSelectedIndex,
      lastUsed: Date.now()
    };
  }

  getDefaultState(): TuiState {
    const homeDir = process.env.HOME || '/';
    return {
      leftUri: homeDir,
      rightUri: homeDir,
      leftSelectedIndex: 0,
      rightSelectedIndex: 0,
      lastUsed: Date.now()
    };
  }
}
