const { ConfigManager } = require('./packages/aifs-commander-tui/dist/ConfigManager.js');

async function checkConfig() {
  console.log('🔍 Checking saved configuration...\n');
  
  try {
    const configManager = new ConfigManager();
    const config = await configManager.loadConfig();
    
    console.log('📋 Current providers:');
    config.providers.forEach((provider, index) => {
      console.log(`  ${index + 1}. ${provider.name} (${provider.scheme}) - ${provider.enabled ? 'Enabled' : 'Disabled'}`);
      console.log(`     ID: ${provider.id}`);
      if (provider.credentials) {
        const credKeys = Object.keys(provider.credentials);
        console.log(`     Credentials: ${credKeys.join(', ')}`);
      }
    });
    
    console.log(`\n📊 Total providers: ${config.providers.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkConfig();
