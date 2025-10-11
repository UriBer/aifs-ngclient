import blessed from 'blessed';
import { ConfigManager, ProviderConfig } from './ConfigManager.js';

export class ConfigUI {
  private screen: blessed.Widgets.Screen;
  private configManager: ConfigManager;
  private mainBox: blessed.Widgets.BoxElement | null = null;
  private providerList: blessed.Widgets.ListElement | null = null;
  private formBox: blessed.Widgets.BoxElement | null = null;
  private currentProvider: ProviderConfig | null = null;

  constructor(screen: blessed.Widgets.Screen) {
    this.screen = screen;
    this.configManager = new ConfigManager();
  }

  async showConfigMenu(): Promise<void> {
    if (this.mainBox) {
      this.mainBox.detach();
    }

    // Hide the main TUI elements
    this.hideMainTUI();

    this.mainBox = blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: 'blue'
        },
        fg: 'white',
        bg: 'black'
      },
      label: 'Provider Configuration',
      keys: true,
      vi: true,
      mouse: true
    });

    // Create provider list
    this.providerList = blessed.list({
      parent: this.mainBox,
      top: 1,
      left: 1,
      width: '40%',
      height: '100%-2',
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: 'gray'
        },
        selected: {
          bg: 'blue',
          fg: 'white'
        },
        item: {
          fg: 'white',
          bg: 'black'
        }
      },
      keys: true,
      vi: true,
      mouse: true,
      scrollable: true,
      label: 'Providers'
    });

    // Create form area
    this.formBox = blessed.box({
      parent: this.mainBox,
      top: 1,
      left: '42%',
      width: '58%',
      height: '100%-2',
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: 'gray'
        },
        fg: 'white',
        bg: 'black'
      },
      label: 'Configuration',
      keys: true,
      vi: true,
      mouse: true,
      scrollable: true
    });

    // Add key handling to form box
    this.formBox.key(['escape'], () => {
      this.hideConfigMenu();
    });

    this.formBox.key(['e', 'c', 's', 't', 'd', 'E', 'C', 'S', 'T', 'D'], (ch, key) => {
      this.handleKeyPress(ch, key);
    });

    // Also handle keys on the provider list (case insensitive)
    this.providerList.key(['e', 'c', 's', 't', 'd', 'E', 'C', 'S', 'T', 'D'], (ch, key) => {
      this.handleKeyPress(ch, key);
    });

    // Load providers
    await this.loadProviders();

    // Handle provider selection
    this.providerList.on('select', async (_item, index) => {
      const config = await this.configManager.loadConfig();
      
      // Define all available providers in the same order as loadProviders
      const allProviders = [
        { name: 'Local File System', scheme: 'file' },
        { name: 'Amazon S3', scheme: 's3' },
        { name: 'Google Cloud Storage', scheme: 'gcs' },
        { name: 'Azure Blob Storage', scheme: 'az' },
        { name: 'AIFS', scheme: 'aifs' }
      ];

      const selectedProvider = allProviders[index];
      
      // Find or create the provider config
      let providerConfig = config.providers.find(p => p.scheme === selectedProvider.scheme);
      if (!providerConfig) {
        // Create a new provider config if it doesn't exist
        providerConfig = {
          name: selectedProvider.name,
          scheme: selectedProvider.scheme,
          enabled: false,
          credentials: {},
          settings: {}
        };
      }
      
      this.currentProvider = providerConfig;
      await this.showProviderForm();
    });

    // Handle escape key globally
    this.mainBox.key(['escape'], () => {
      this.hideConfigMenu();
    });

    // Handle key presses in the main configuration box
    this.mainBox.key(['e', 'c', 's', 't', 'd'], (ch, key) => {
      this.handleKeyPress(ch, key);
    });

    // Also handle keys on the provider list
    this.providerList.key(['escape'], () => {
      this.hideConfigMenu();
    });

    this.providerList.focus();
    this.screen.render();
  }

  private async loadProviders(): Promise<void> {
    if (!this.providerList) return;

    const config = await this.configManager.loadConfig();
    this.providerList.clearItems();

    // Define all available providers
    const allProviders = [
      { name: 'Local File System', scheme: 'file' },
      { name: 'Amazon S3', scheme: 's3' },
      { name: 'Google Cloud Storage', scheme: 'gcs' },
      { name: 'Azure Blob Storage', scheme: 'az' },
      { name: 'AIFS', scheme: 'aifs' }
    ];

    // Create a map of configured providers for quick lookup
    const configuredProviders = new Map();
    for (const provider of config.providers) {
      configuredProviders.set(provider.scheme, provider);
    }

    // Add all providers to the list
    for (const provider of allProviders) {
      const configured = configuredProviders.get(provider.scheme);
      const status = configured?.enabled ? '✓' : '✗';
      this.providerList.addItem(`${status} ${provider.name}`);
    }
  }

  private async showProviderForm(): Promise<void> {
    if (!this.formBox || !this.currentProvider) return;

    this.formBox.setContent(''); // Clear previous content

    const provider = this.currentProvider;
    let content = `Provider: ${provider.name}\n`;
    content += `Scheme: ${provider.scheme}\n`;
    content += `Status: ${provider.enabled ? 'Enabled' : 'Disabled'}\n\n`;

    if (provider.credentials && Object.keys(provider.credentials).length > 0) {
      content += 'Credentials:\n';
      for (const [key, value] of Object.entries(provider.credentials)) {
        const displayValue = this.maskSensitiveData(key, value);
        content += `  ${key}: ${displayValue}\n`;
      }
      content += '\n';
    }

    if (provider.settings && Object.keys(provider.settings).length > 0) {
      content += 'Settings:\n';
      for (const [key, value] of Object.entries(provider.settings)) {
        content += `  ${key}: ${value}\n`;
      }
      content += '\n';
    }

    content += 'Actions:\n';
    content += '  E - Enable/Disable provider\n';
    content += '  C - Configure credentials\n';
    content += '  S - Configure settings\n';
    content += '  T - Test connection\n';
    content += '  D - Delete configuration\n';
    content += '\n';
    content += 'Press ESC to close, or use the actions above.';

    this.formBox.setContent(content);
    this.screen.render();
  }

  private maskSensitiveData(key: string, value: string): string {
    const sensitiveKeys = ['secret', 'key', 'token', 'password', 'auth'];
    const isSensitive = sensitiveKeys.some(sensitive => 
      key.toLowerCase().includes(sensitive)
    );
    
    if (isSensitive && value.length > 0) {
      return '*'.repeat(Math.min(value.length, 8));
    }
    
    return value;
  }

  public hideConfigMenu(): void {
    if (this.mainBox) {
      this.mainBox.detach();
      this.mainBox = null;
      this.providerList = null;
      this.formBox = null;
      this.currentProvider = null;
      
      // Show the main TUI elements again
      this.showMainTUI();
      
      this.screen.render();
      
      // Re-enable main TUI key handling
      // This will be handled by the escape handler in TuiApplication
    }
  }

  private hideMainTUI(): void {
    // Store references to main TUI elements
    const leftPane = this.screen.children.find(child => 
      child.type === 'list' && (child as any).name === 'leftPane'
    ) as blessed.Widgets.Node;
    const rightPane = this.screen.children.find(child => 
      child.type === 'list' && (child as any).name === 'rightPane'
    ) as blessed.Widgets.Node;
    const statusBar = this.screen.children.find(child => 
      child.type === 'box' && (child as any).name === 'statusBar'
    ) as blessed.Widgets.Node;

    // Hide main TUI elements
    if (leftPane) (leftPane as any).hide();
    if (rightPane) (rightPane as any).hide();
    if (statusBar) (statusBar as any).hide();
  }

  private showMainTUI(): void {
    // Show main TUI elements
    const leftPane = this.screen.children.find(child => 
      child.type === 'list' && (child as any).name === 'leftPane'
    ) as blessed.Widgets.Node;
    const rightPane = this.screen.children.find(child => 
      child.type === 'list' && (child as any).name === 'rightPane'
    ) as blessed.Widgets.Node;
    const statusBar = this.screen.children.find(child => 
      child.type === 'box' && (child as any).name === 'statusBar'
    ) as blessed.Widgets.Node;

    if (leftPane) (leftPane as any).show();
    if (rightPane) (rightPane as any).show();
    if (statusBar) (statusBar as any).show();
  }

  // Handle key presses in the configuration UI
  handleKeyPress(_ch: string, key: any): boolean {
    if (!this.mainBox || !this.currentProvider) return false;

    // Handle both uppercase and lowercase keys
    const keyName = key.name.toLowerCase();
    
    switch (keyName) {
      case 'e':
        this.toggleProvider();
        return true;
      case 'c':
        this.configureCredentials();
        return true;
      case 's':
        this.configureSettings();
        return true;
      case 't':
        this.testConnection();
        return true;
      case 'd':
        this.deleteConfiguration();
        return true;
    }

    return false;
  }

  private async toggleProvider(): Promise<void> {
    if (!this.currentProvider) return;

    try {
      if (this.currentProvider.enabled) {
        await this.configManager.disableProvider(this.currentProvider.scheme);
      } else {
        await this.configManager.enableProvider(this.currentProvider.scheme);
      }
      
      await this.loadProviders();
      await this.showProviderForm();
    } catch (error) {
      this.showError(`Failed to toggle provider: ${(error as Error).message}`);
    }
  }

  private async configureCredentials(): Promise<void> {
    if (!this.currentProvider) return;

    const provider = this.currentProvider;
    const credentialFields = this.getCredentialFields(provider.scheme);
    
    if (credentialFields.length === 0) {
      this.showError('No credentials to configure for this provider');
      return;
    }

    // Show a multi-field configuration form
    await this.showCredentialForm(credentialFields);
  }

  private getCredentialFields(scheme: string): Array<{key: string, label: string, required: boolean, currentValue: string}> {
    const provider = this.currentProvider!;
    const fields: Array<{key: string, label: string, required: boolean, currentValue: string}> = [];

    switch (scheme) {
      case 's3':
        fields.push(
          { key: 'accessKeyId', label: 'AWS Access Key ID', required: true, currentValue: provider.credentials.accessKeyId || '' },
          { key: 'secretAccessKey', label: 'AWS Secret Access Key', required: true, currentValue: provider.credentials.secretAccessKey || '' },
          { key: 'region', label: 'AWS Region', required: true, currentValue: provider.credentials.region || 'us-east-1' },
          { key: 'bucket', label: 'S3 Bucket Name', required: true, currentValue: provider.credentials.bucket || '' }
        );
        break;
      case 'gcs':
        fields.push(
          { key: 'projectId', label: 'GCS Project ID', required: true, currentValue: provider.credentials.projectId || '' },
          { key: 'keyFilename', label: 'Key File Path', required: false, currentValue: provider.credentials.keyFilename || '' },
          { key: 'bucket', label: 'GCS Bucket Name', required: true, currentValue: provider.credentials.bucket || '' }
        );
        break;
      case 'az':
        fields.push(
          { key: 'connectionString', label: 'Connection String', required: false, currentValue: provider.credentials.connectionString || '' },
          { key: 'accountName', label: 'Account Name', required: false, currentValue: provider.credentials.accountName || '' },
          { key: 'accountKey', label: 'Account Key', required: false, currentValue: provider.credentials.accountKey || '' },
          { key: 'containerName', label: 'Container Name', required: true, currentValue: provider.credentials.containerName || '' }
        );
        break;
      case 'aifs':
        fields.push(
          { key: 'endpoint', label: 'AIFS Endpoint', required: true, currentValue: provider.credentials.endpoint || 'localhost:50052' },
          { key: 'authToken', label: 'Auth Token', required: false, currentValue: provider.credentials.authToken || '' }
        );
        break;
    }

    return fields;
  }

  private async showCredentialForm(fields: Array<{key: string, label: string, required: boolean, currentValue: string}>): Promise<void> {
    // Use a simpler approach with sequential prompts
    await this.configureCredentialsSequentially(fields);
  }

  private async configureCredentialsSequentially(fields: Array<{key: string, label: string, required: boolean, currentValue: string}>): Promise<void> {
    const credentials: Record<string, string> = {};
    
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      const required = field.required ? ' (required)' : ' (optional)';
      
      try {
        const value = await this.promptForInput(`${field.label}${required}:`, field.currentValue || '');
        credentials[field.key] = value;
      } catch (error) {
        // User cancelled
        return;
      }
    }

    try {
      // Save credentials
      await this.configManager.setProviderCredentials(this.currentProvider!.scheme, credentials);
      
      // Enable the provider
      await this.configManager.enableProvider(this.currentProvider!.scheme);
      
      // Reload the main configuration
      await this.loadProviders();
      await this.showProviderForm();
      
      this.showSuccess('Credentials saved and provider enabled!');
    } catch (error) {
      this.showError(`Failed to save credentials: ${(error as Error).message}`);
    }
  }

  private async promptForInput(prompt: string, defaultValue: string = ''): Promise<string> {
    return new Promise((resolve, reject) => {
      const inputBox = blessed.prompt({
        parent: this.screen,
        top: 'center',
        left: 'center',
        width: '60%',
        height: 'shrink',
        border: {
          type: 'line'
        },
        style: {
          border: {
            fg: 'green'
          },
          fg: 'white',
          bg: 'black'
        },
        label: 'Configure Credentials',
        keys: true,
        vi: true,
        mouse: true
      });

      inputBox.input(prompt, defaultValue, (err: any, value: any) => {
        inputBox.detach();
        this.screen.render();

        if (err) {
          reject(err);
        } else if (value === null || value === undefined) {
          reject(new Error('Cancelled'));
        } else {
          resolve(value || '');
        }
      });

      inputBox.focus();
      this.screen.render();
    });
  }


  private async configureSettings(): Promise<void> {
    // For now, just show a message
    this.showError('Settings configuration not yet implemented');
  }


  private async deleteConfiguration(): Promise<void> {
    if (!this.currentProvider) return;
    
    try {
      // Show confirmation dialog
      const confirmed = await this.showConfirmation(
        `Delete configuration for ${this.currentProvider.name}?`,
        'This will remove all saved credentials and settings for this provider.'
      );
      
      if (confirmed) {
        await this.configManager.deleteProviderConfig(this.currentProvider.scheme);
        await this.loadProviders();
        await this.showProviderForm();
        this.showSuccess(`Configuration for ${this.currentProvider.name} deleted`);
      }
    } catch (error) {
      this.showError(`Failed to delete configuration: ${(error as Error).message}`);
    }
  }

  private async showConfirmation(title: string, message: string): Promise<boolean> {
    return new Promise((resolve) => {
      const confirmBox = blessed.box({
        parent: this.screen,
        top: 'center',
        left: 'center',
        width: '50%',
        height: 'shrink',
        border: {
          type: 'line'
        },
        style: {
          border: {
            fg: 'yellow'
          },
          fg: 'white',
          bg: 'black'
        },
        label: title,
        content: `${message}\n\nPress Y to confirm, N to cancel`,
        keys: true,
        vi: true,
        mouse: true
      });

      const handleKey = (ch: string, key: any) => {
        if (key.name === 'y' || ch === 'y' || ch === 'Y') {
          confirmBox.detach();
          this.screen.render();
          resolve(true);
        } else if (key.name === 'n' || ch === 'n' || ch === 'N' || key.name === 'escape') {
          confirmBox.detach();
          this.screen.render();
          resolve(false);
        }
      };

      confirmBox.on('keypress', handleKey);
      confirmBox.focus();
      this.screen.render();
    });
  }

  private async testConnection(): Promise<void> {
    if (!this.currentProvider) return;

    try {
      const validation = await this.configManager.validateProviderConfig(this.currentProvider.scheme);
      
      if (validation.valid) {
        this.showError('Connection test not yet implemented');
      } else {
        this.showError(`Configuration errors: ${validation.errors.join(', ')}`);
      }
    } catch (error) {
      this.showError(`Test failed: ${(error as Error).message}`);
    }
  }


  private showError(message: string): void {
    const errorBox = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: '50%',
      height: 'shrink',
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: 'red'
        },
        fg: 'white',
        bg: 'red'
      },
      content: `Error: ${message}`,
      keys: true,
      vi: true,
      mouse: true
    });

    errorBox.key(['escape', 'enter', 'space'], () => {
      errorBox.detach();
      this.screen.render();
    });

    errorBox.focus();
    this.screen.render();
  }

  private showSuccess(message: string): void {
    const successBox = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: '50%',
      height: 'shrink',
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: 'green'
        },
        fg: 'white',
        bg: 'green'
      },
      content: `Success: ${message}`,
      keys: true,
      vi: true,
      mouse: true
    });

    successBox.key(['escape', 'enter', 'space'], () => {
      successBox.detach();
      this.screen.render();
    });

    successBox.focus();
    this.screen.render();

    // Auto-close after 3 seconds
    setTimeout(() => {
      successBox.detach();
      this.screen.render();
    }, 3000);
  }
}
