const { TuiApplication } = require('./packages/aifs-commander-tui/dist/TuiApplication.js');
const { CliCredentialManager } = require('./packages/aifs-commander-tui/dist/CliCredentialManager.js');

async function testAutoConfig() {
  console.log('🧪 Testing Auto-Configuration...\n');
  
  try {
    // Test CLI credential detection
    console.log('1. Testing CLI credential detection...');
    const cliManager = new CliCredentialManager();
    await cliManager.loadAllCredentials();
    
    console.log('AWS credentials:', cliManager.hasAwsCredentials());
    console.log('GCP credentials:', cliManager.hasGcpCredentials());
    console.log('Azure credentials:', cliManager.hasAzureCredentials());
    
    const creds = cliManager.getCredentials();
    console.log('AWS creds available:', !!creds.aws);
    console.log('GCP creds available:', !!creds.gcp);
    console.log('Azure creds available:', !!creds.azure);
    
    if (creds.aws) {
      console.log('AWS region:', creds.aws.region);
    }
    if (creds.gcp) {
      console.log('GCP project:', creds.gcp.projectId);
    }
    
    // Test TUI application auto-config
    console.log('\n2. Testing TUI auto-configuration...');
    process.env.AUTO_CONFIGURE_CLI = '1';
    
    const app = new TuiApplication();
    console.log('TUI application created');
    
    // Test the auto-configuration method directly
    console.log('Testing auto-configuration method directly...');
    await app.autoConfigureProvidersFromCli();
    
    console.log('\n✅ Auto-configuration test completed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

testAutoConfig();
