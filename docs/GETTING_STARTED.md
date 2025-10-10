# Getting Started with AIFS Client

## 🚀 Quick Start (2 minutes)

### Option 1: Automated Setup
```bash
# Run the setup script
./setup.sh

# Start the application
cd working-electron-app
npm start
```

### Option 2: Manual Setup
```bash
# Navigate to the working directory
cd working-electron-app

# Install dependencies
npm install

# Start the application
npm start
```

## 🎯 What You'll See

When the application starts, you'll see:
- A clean interface with "AIFS Client" title
- Four test buttons for S3 operations and configuration
- A status area showing operation results
- A file list area for displaying results
- Security dialogs for credential management

## 🔧 Testing AWS S3 (Optional)

### 1. Set up AWS Credentials

**Option A: Environment Variables (Most Secure)**
```bash
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_REGION="us-east-1"
```

**Option B: AWS CLI Configuration**
```bash
aws configure
```

**Option C: Encrypted App Configuration (New!)**
1. Click "Configure AWS" in the app
2. Set a master password
3. Enter your AWS credentials
4. Credentials are encrypted and stored securely

### 2. Test S3 Operations
Click the buttons in the app:
- **"Test S3 Connection"** - Tests basic connectivity
- **"List S3 Buckets"** - Lists your S3 buckets
- **"Create Test Bucket"** - Creates a test bucket
- **"Configure AWS"** - Opens secure credential dialog

### 3. Check Results
- Success messages appear in the status area
- Error messages show what went wrong
- Open browser console (F12) for detailed logs

## 🐛 Troubleshooting

### App Won't Start
- Make sure you're in the `working-electron-app` directory
- Run `npm install` to install dependencies
- Check that Node.js v16+ is installed

### S3 Operations Fail
- Verify AWS credentials with `aws configure`
- Check that your AWS account has S3 permissions
- Ensure the region is set correctly

### Need Help?
- Check the main README.md for detailed documentation
- Open browser console (F12) for error details
- All operations are logged for debugging

## 🎉 Success!

If you see the AIFS Client window with test buttons, you're all set! The application is working correctly and ready for cloud storage operations.
