# Troubleshooting Guide

## 🚨 Common Issues and Solutions

### Issue: "Preparing native dependencies" hangs during `npm start`

**Problem**: Electron Forge gets stuck at "Preparing native dependencies" and never finishes.

**Root Cause**: The `@electron-forge/plugin-auto-unpack-natives` plugin rebuilds all native modules, which can take a very long time or hang, especially with complex dependencies like:
- `@grpc/grpc-js`
- `@google-cloud/storage` 
- `@azure/storage-blob`
- `keytar`
- `blake3`

**Solutions**:

#### Solution 1: Disable Auto-Unpack Plugin (Recommended for Development)
```bash
# Edit forge.config.js and comment out the auto-unpack plugin:
plugins: [
  // {
  //   name: '@electron-forge/plugin-auto-unpack-natives',
  //   config: {},
  // },
  // ... other plugins
]
```

#### Solution 2: Use Simplified Dependencies
```bash
# Backup full package.json
cp package.json package-full.json

# Use simplified dependencies (already done)
cp package-simple.json package.json

# Clean install
rm -rf node_modules package-lock.json
npm install
```

#### Solution 3: Manual Native Module Rebuild
```bash
# If you need native modules, rebuild them manually
npx electron-rebuild
```

### Issue: App starts but shows blank screen

**Problem**: Electron app launches but shows empty window.

**Solutions**:
1. **Check console for errors**: Open DevTools (F12) and check for JavaScript errors
2. **Verify file paths**: Ensure `index.html` exists in the correct location
3. **Check preload script**: Verify `preload.js` is accessible
4. **Test with simple HTML**: Replace `index.html` with basic content

### Issue: AWS S3 operations fail with "Access Denied"

**Problem**: S3 operations return access denied errors.

**Solutions**:
1. **Configure AWS credentials**:
   ```bash
   aws configure
   ```

2. **Use environment variables**:
   ```bash
   export AWS_ACCESS_KEY_ID="your-key"
   export AWS_SECRET_ACCESS_KEY="your-secret"
   export AWS_REGION="us-east-1"
   ```

3. **Use encrypted app config**: Click "Configure AWS" in the app

### Issue: File operations don't work

**Problem**: Copy, move, delete operations fail.

**Solutions**:
1. **Check provider initialization**: Look for errors in console
2. **Verify permissions**: Ensure you have read/write access
3. **Test with local files first**: Try operations on local file system
4. **Check network connectivity**: For cloud providers

### Issue: Drag and drop doesn't work

**Problem**: Can't drag files between panes.

**Solutions**:
1. **Check browser compatibility**: Ensure modern browser features are supported
2. **Verify event listeners**: Check console for JavaScript errors
3. **Test with different file types**: Some files may not be draggable

### Issue: Keyboard shortcuts don't work

**Problem**: F5, F6, F7, F8 keys don't trigger operations.

**Solutions**:
1. **Check focus**: Ensure the app window has focus
2. **Test in different contexts**: Some keys may be captured by OS
3. **Verify event handlers**: Check console for errors

## 🔧 Development Tips

### Speeding Up Development
1. **Use simplified dependencies** during development
2. **Disable auto-unpack plugin** for faster startup
3. **Use hot reload** when available
4. **Test with minimal features** first

### Debugging
1. **Open DevTools**: F12 or Cmd+Option+I
2. **Check console logs**: Look for errors and warnings
3. **Inspect network**: Check for failed requests
4. **Test API calls**: Verify IPC communication

### Performance Optimization
1. **Lazy load directories**: Only load when needed
2. **Implement pagination**: For large file lists
3. **Use virtual scrolling**: For thousands of files
4. **Cache results**: Avoid repeated API calls

## 📋 Quick Fixes

### Reset Everything
```bash
# Kill all Electron processes
pkill -f electron

# Clean everything
rm -rf node_modules package-lock.json

# Restore full dependencies
cp package-full.json package.json

# Reinstall
npm install

# Start app
npm start
```

### Minimal Test
```bash
# Use simplified setup
cp package-simple.json package.json
rm -rf node_modules package-lock.json
npm install
npm start
```

### Check Status
```bash
# See if app is running
ps aux | grep -i electron | grep -v grep

# Check for errors in logs
tail -f ~/.npm/_logs/*.log
```

## 🆘 Still Having Issues?

1. **Check the console** for specific error messages
2. **Try the simplified setup** first
3. **Test with basic functionality** before adding features
4. **Check system requirements** (Node.js version, OS compatibility)
5. **Look for similar issues** in Electron Forge documentation

---

**Last Updated**: September 2024  
**Tested On**: macOS 14.6.0, Node.js 22.19.0, Electron 38.1.2
