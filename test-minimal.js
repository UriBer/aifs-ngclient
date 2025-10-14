const TuiApplication_js_1 = require('./packages/aifs-commander-tui/dist/TuiApplication.js');

console.log('Testing minimal TUI initialization...');

try {
  const app = new TuiApplication_js_1.TuiApplication({
    configPath: null
  });
  console.log('✅ TuiApplication created successfully');
  
  // Test the start method
  app.start().then(() => {
    console.log('✅ TUI started successfully');
  }).catch((error) => {
    console.error('❌ Error starting TUI:', error.message);
  });
  
} catch (error) {
  console.error('❌ Error creating TuiApplication:', error.message);
  console.error(error.stack);
}
