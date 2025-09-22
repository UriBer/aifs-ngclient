console.log('Node version:', process.version);
console.log('Platform:', process.platform);
console.log('Architecture:', process.arch);

try {
  const electron = require('electron');
  console.log('Electron module loaded successfully');
  console.log('Electron module type:', typeof electron);
  console.log('Electron module:', electron);
  
  if (typeof electron === 'object' && electron !== null) {
    console.log('Electron keys:', Object.keys(electron));
    console.log('App property:', electron.app);
  } else {
    console.log('Electron is not an object, it is:', typeof electron);
  }
} catch (error) {
  console.error('Error loading electron module:', error);
}

app.whenReady().then(() => {
  console.log('App is ready!');
  app.quit();
});
