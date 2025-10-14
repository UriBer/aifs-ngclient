import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
export class StateManager {
    constructor() {
        this.state = null;
        // Store state in user's home directory
        const homeDir = os.homedir();
        const configDir = path.join(homeDir, '.aifs-commander');
        this.stateFile = path.join(configDir, 'tui-state.json');
    }
    async loadState() {
        try {
            // Ensure config directory exists
            const configDir = path.dirname(this.stateFile);
            await fs.mkdir(configDir, { recursive: true });
            const data = await fs.readFile(this.stateFile, 'utf-8');
            this.state = JSON.parse(data);
            // Check if state is not too old (e.g., within 7 days)
            const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
            if (this.state.lastUsed < sevenDaysAgo) {
                return null;
            }
            // Verify directories still exist
            try {
                await fs.access(this.state.leftUri);
                await fs.access(this.state.rightUri);
                return this.state;
            }
            catch {
                return null;
            }
        }
        catch (error) {
            // File doesn't exist or is invalid, use defaults
            return null;
        }
    }
    async saveState(leftUri, rightUri, leftSelectedIndex, rightSelectedIndex) {
        try {
            const state = {
                leftUri,
                rightUri,
                leftSelectedIndex,
                rightSelectedIndex,
                lastUsed: Date.now()
            };
            // Ensure config directory exists
            const configDir = path.dirname(this.stateFile);
            await fs.mkdir(configDir, { recursive: true });
            await fs.writeFile(this.stateFile, JSON.stringify(state, null, 2), 'utf-8');
            this.state = state;
        }
        catch (error) {
            console.warn('Failed to save TUI state:', error.message);
        }
    }
    getDefaultState() {
        const homeDir = os.homedir();
        return {
            leftUri: homeDir,
            rightUri: homeDir,
            leftSelectedIndex: 0,
            rightSelectedIndex: 0,
            lastUsed: Date.now()
        };
    }
}
//# sourceMappingURL=StateManager.js.map