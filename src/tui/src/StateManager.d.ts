export interface TuiState {
    leftUri: string;
    rightUri: string;
    leftSelectedIndex: number;
    rightSelectedIndex: number;
    lastUsed: number;
}
export declare class StateManager {
    private stateFile;
    private state;
    constructor();
    loadState(): Promise<TuiState | null>;
    saveState(leftUri: string, rightUri: string, leftSelectedIndex: number, rightSelectedIndex: number): Promise<void>;
    getDefaultState(): TuiState;
}
//# sourceMappingURL=StateManager.d.ts.map