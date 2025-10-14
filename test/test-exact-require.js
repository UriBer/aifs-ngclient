console.log('Testing exact require statement...');

try {
  const TuiApplication_js_1 = require('./packages/aifs-commander-tui/dist/TuiApplication.js');
  console.log('TuiApplication_js_1:', typeof TuiApplication_js_1);
  console.log('TuiApplication_js_1.TuiApplication:', typeof TuiApplication_js_1.TuiApplication);
  
  if (typeof TuiApplication_js_1.TuiApplication === 'function') {
    console.log('✅ TuiApplication is a function');
    const app = new TuiApplication_js_1.TuiApplication();
    console.log('✅ Constructor works');
  } else {
    console.log('❌ TuiApplication is not a function');
  }
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
}
