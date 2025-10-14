const { TuiApplication } = require('./packages/aifs-commander-tui/dist/TuiApplication.js');

console.log('TuiApplication:', typeof TuiApplication);
console.log('TuiApplication constructor:', TuiApplication);

try {
  const app = new TuiApplication();
  console.log('✅ TuiApplication created successfully');
} catch (error) {
  console.error('❌ Error creating TuiApplication:', error.message);
}
