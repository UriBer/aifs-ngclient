console.log('🔍 Debugging import issue...\n');

try {
  console.log('1. Testing direct require...');
  const TuiApp = require('./packages/aifs-commander-tui/dist/TuiApplication.js');
  console.log('TuiApp:', typeof TuiApp);
  console.log('TuiApp.TuiApplication:', typeof TuiApp.TuiApplication);
  
  console.log('\n2. Testing destructured import...');
  const { TuiApplication } = require('./packages/aifs-commander-tui/dist/TuiApplication.js');
  console.log('TuiApplication:', typeof TuiApplication);
  
  console.log('\n3. Testing constructor...');
  const app = new TuiApplication();
  console.log('✅ Constructor works');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
}
