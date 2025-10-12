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
        fg: 'black',
        bg: 'white'
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
              fg: 'black',
              bg: 'white'
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
        fg: 'black',
        bg: 'white'
      },
      label: 'Configuration',
      keys: true,
      vi: true,
      mouse: true,
      scrollable: true,
      focusable: true
    });

    // Add key handling to form box
    this.formBox.key(['escape'], () => {
      this.hideConfigMenu();
    });

    // Configuration details are read-only, no navigation needed
    // Focus should remain on provider list for navigation

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
      
      // Keep focus on provider list for consistent key handling
      // The action keys are registered on mainBox, so focus should stay there
      if (this.providerList) {
        this.providerList.focus();
        this.screen.render();
      }
    });

    // Handle escape key globally
    this.mainBox.key(['escape'], () => {
      this.hideConfigMenu();
    });

    // Handle action keys ONLY on the main configuration box
    // This ensures consistent behavior regardless of focus
    this.mainBox.key(['e', 'c', 's', 't', 'd', 'E', 'C', 'S', 'T', 'D'], (ch, key) => {
      this.handleKeyPress(ch, key);
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
    
    // Create simple configuration display (read-only)
    let content = `Provider: ${provider.name}\n`;
    content += `Scheme: ${provider.scheme}\n`;
    content += `Status: ${provider.enabled ? '✓ Enabled' : '✗ Disabled'}\n\n`;

    // Show credentials section
    content += 'Credentials:\n';
    if (provider.credentials && Object.keys(provider.credentials).length > 0) {
      for (const [key, value] of Object.entries(provider.credentials)) {
        const displayValue = this.maskSensitiveData(key, value);
        const status = value ? '✓' : '✗';
        content += `  ${status} ${key}: ${displayValue}\n`;
      }
    } else {
      content += '  No credentials configured\n';
    }
    content += '\n';

    // Show settings section
    content += 'Settings:\n';
    if (provider.settings && Object.keys(provider.settings).length > 0) {
      for (const [key, value] of Object.entries(provider.settings)) {
        content += `  ${key}: ${value}\n`;
      }
    } else {
      content += '  No custom settings\n';
    }
    content += '\n';

    // Show validation status
    const validation = await this.configManager.validateProviderConfig(provider.scheme);
    content += 'Validation:\n';
    if (validation.valid) {
      content += '  ✓ Configuration is valid\n';
    } else {
      content += '  ✗ Configuration errors:\n';
      for (const error of validation.errors) {
        content += `    - ${error}\n`;
      }
    }
    content += '\n';

    content += 'Actions (use action keys):\n';
    content += '  E - Enable/Disable provider\n';
    content += '  C - Configure credentials\n';
    content += '  S - Configure settings\n';
    content += '  T - Test connection\n';
    content += '  D - Delete configuration\n';
    content += '\n';
    content += 'Use ↑↓ to navigate providers, action keys for operations, ESC to close';

    this.formBox.setContent(content);
    // Don't focus formBox - keep focus on provider list
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
    // Validate that we have the required components
    if (!this.mainBox || !this.currentProvider || !this.providerList) {
      return false;
    }

    // Process keys if we're in the configuration UI (mainBox is visible)
    // The keys are registered on mainBox, so they should work when mainBox is active
    if (!this.mainBox.visible) {
      return false;
    }

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

    const providerScheme = this.currentProvider.scheme;
    
    try {
      if (this.currentProvider.enabled) {
        await this.configManager.disableProvider(providerScheme);
        this.showSuccess(`${this.currentProvider.name} disabled`);
      } else {
        await this.configManager.enableProvider(providerScheme);
        this.showSuccess(`${this.currentProvider.name} enabled`);
      }
      
      await this.loadProviders();
      
      // Reload current provider and refresh form
      this.currentProvider = await this.configManager.getProviderConfig(providerScheme);
      if (this.currentProvider) {
        await this.showProviderForm();
      }
      
      // Focus remains on provider list for consistent key handling
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
      
      // Reload current provider to reflect saved state
      this.currentProvider = await this.configManager.getProviderConfig(this.currentProvider!.scheme);
      
      // Reload the main configuration
      await this.loadProviders();
      await this.showProviderForm();
      
      this.showSuccess('Credentials saved and provider enabled!');
      
      // Focus remains on provider list for consistent key handling
    } catch (error) {
      this.showError(`Failed to save credentials: ${(error as Error).message}`);
    }
  }

  private async promptForInput(prompt: string, defaultValue: string = ''): Promise<string> {
    return new Promise((resolve, reject) => {
      const dialog = blessed.box({
        parent: this.screen,
        top: 'center',
        left: 'center',
        width: '70%',
        height: 7,
        border: { type: 'line' },
        style: {
          border: { fg: 'green' },
          fg: 'black',
          bg: 'white'
        },
        label: 'Configure Credentials'
      });

      blessed.text({
        parent: dialog,
        top: 0,
        left: 1,
        content: prompt
      });

      const input = blessed.textbox({
        parent: dialog,
        top: 2,
        left: 1,
        width: '100%-2',
        height: 1,
        inputOnFocus: true,
        style: {
          fg: 'black',
          bg: 'white'
        },
        value: defaultValue
      });

      blessed.text({
        parent: dialog,
        bottom: 0,
        left: 1,
        content: 'Press Enter to confirm, ESC to cancel'
      });

      input.key(['enter'], () => {
        const value = input.getValue();
        dialog.detach();
        this.screen.render();
        resolve(value);
      });

      input.key(['escape'], () => {
        dialog.detach();
        this.screen.render();
        reject(new Error('Cancelled'));
      });

      dialog.focus();
      input.focus();
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
            
            // Focus remains on provider list for consistent key handling
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
      
      if (!validation.valid) {
        this.showError(`Configuration errors: ${validation.errors.join(', ')}`);
        return;
      }

      // Show testing dialog
      const testDialog = blessed.box({
        parent: this.screen,
        top: 'center',
        left: 'center',
        width: '60%',
        height: 8,
        border: { type: 'line' },
        style: {
          border: { fg: 'yellow' },
          fg: 'black',
          bg: 'white'
        },
        label: 'Testing Connection'
      });

      blessed.text({
        parent: testDialog,
        top: 0,
        left: 1,
        content: `Testing ${this.currentProvider.name}...`
      });

      blessed.text({
        parent: testDialog,
        top: 2,
        left: 1,
        content: 'Please wait...'
      });

      testDialog.focus();
      this.screen.render();

      // Perform actual connection test
      const testResult = await this.performConnectionTest(this.currentProvider.scheme);
      
      // Close test dialog
      testDialog.detach();
      this.screen.render();

      if (testResult.success) {
        this.showSuccess(`Connection test passed: ${testResult.message}`);
      } else {
        this.showError(`Connection test failed: ${testResult.message}`);
      }
      
      // Focus remains on provider list for consistent key handling

    } catch (error) {
      this.showError(`Test failed: ${(error as Error).message}`);
    }
  }

  private async performConnectionTest(scheme: string): Promise<{success: boolean, message: string}> {
    switch (scheme) {
      case 'file':
        return this.testFileProvider();
      case 's3':
        return this.testS3Provider();
      case 'gcs':
        return this.testGCSProvider();
      case 'az':
        return this.testAzureProvider();
      case 'aifs':
        return this.testAIFSProvider();
      default:
        return { success: false, message: 'Unknown provider type' };
    }
  }

  private async testFileProvider(): Promise<{success: boolean, message: string}> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const os = await import('os');
      
      const homeDir = os.homedir();
      const testFile = path.join(homeDir, '.aifs-test-file');
      
      // Test write
      await fs.writeFile(testFile, 'test');
      
      // Test read
      await fs.readFile(testFile, 'utf8');
      
      // Test delete
      await fs.unlink(testFile);
      
      return { success: true, message: 'File system access working correctly' };
    } catch (error) {
      return { success: false, message: `File system test failed: ${(error as Error).message}` };
    }
  }

  private async testS3Provider(): Promise<{success: boolean, message: string}> {
    try {
      const provider = await this.configManager.getProviderConfig('s3');
      if (!provider) {
        return { success: false, message: 'S3 provider not configured' };
      }

      const { S3Client, HeadBucketCommand } = await import('@aws-sdk/client-s3');
      
      const client = new S3Client({
        region: provider.credentials.region || 'us-east-1',
        credentials: {
          accessKeyId: provider.credentials.accessKeyId || '',
          secretAccessKey: provider.credentials.secretAccessKey || ''
        }
      });

      const command = new HeadBucketCommand({
        Bucket: provider.credentials.bucket || ''
      });

      await client.send(command);
      return { success: true, message: 'S3 connection successful' };
    } catch (error) {
      return { success: false, message: `S3 test failed: ${(error as Error).message}` };
    }
  }

  private async testGCSProvider(): Promise<{success: boolean, message: string}> {
    try {
      const provider = await this.configManager.getProviderConfig('gcs');
      if (!provider) {
        return { success: false, message: 'GCS provider not configured' };
      }

      // For GCS, we would typically test with @google-cloud/storage
      // This is a simplified test
      if (!provider.credentials.projectId || !provider.credentials.bucket) {
        return { success: false, message: 'GCS credentials incomplete' };
      }

      return { success: true, message: 'GCS configuration valid (connection test requires Google Cloud SDK)' };
    } catch (error) {
      return { success: false, message: `GCS test failed: ${(error as Error).message}` };
    }
  }

  private async testAzureProvider(): Promise<{success: boolean, message: string}> {
    try {
      const provider = await this.configManager.getProviderConfig('az');
      if (!provider) {
        return { success: false, message: 'Azure provider not configured' };
      }

      // For Azure, we would typically test with @azure/storage-blob
      // This is a simplified test
      if (!provider.credentials.containerName) {
        return { success: false, message: 'Azure container name required' };
      }

      if (!provider.credentials.connectionString && 
          (!provider.credentials.accountName || !provider.credentials.accountKey)) {
        return { success: false, message: 'Azure credentials incomplete' };
      }

      return { success: true, message: 'Azure configuration valid (connection test requires Azure SDK)' };
    } catch (error) {
      return { success: false, message: `Azure test failed: ${(error as Error).message}` };
    }
  }

  private async testAIFSProvider(): Promise<{success: boolean, message: string}> {
    try {
      const provider = await this.configManager.getProviderConfig('aifs');
      if (!provider) {
        return { success: false, message: 'AIFS provider not configured' };
      }

      if (!provider.credentials.endpoint) {
        return { success: false, message: 'AIFS endpoint required' };
      }

      // For AIFS, we would test gRPC connection
      // This is a simplified test
      const endpoint = provider.credentials.endpoint;
      if (!endpoint.includes(':')) {
        return { success: false, message: 'AIFS endpoint must include port (e.g., localhost:50052)' };
      }

      return { success: true, message: `AIFS endpoint ${endpoint} format valid (connection test requires gRPC client)` };
    } catch (error) {
      return { success: false, message: `AIFS test failed: ${(error as Error).message}` };
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
        fg: 'black',
        bg: 'white'
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
        fg: 'black',
        bg: 'white'
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
