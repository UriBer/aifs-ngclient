const TuiApplication_js_1 = require('./packages/aifs-commander-tui/dist/TuiApplication.js');

console.log('TuiApplication_js_1:', typeof TuiApplication_js_1);
console.log('TuiApplication_js_1.TuiApplication:', typeof TuiApplication_js_1.TuiApplication);
console.log('Keys:', Object.keys(TuiApplication_js_1));

try {
  const app = new TuiApplication_js_1.TuiApplication();
  console.log('✅ Constructor works');
} catch (error) {
  console.error('❌ Error:', error.message);
}
