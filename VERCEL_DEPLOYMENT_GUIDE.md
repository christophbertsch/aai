# Vercel Deployment Guide for AAI Data Import System

## 🚨 Current Issue: 404 NOT_FOUND

The 404 error you're seeing indicates that the Vercel deployment is not properly configured. Here's how to fix it:

## 🔧 Step-by-Step Fix

### 1. **Verify Project Structure**
Make sure your Vercel project is pointing to the correct directory:
- **Root Directory**: `/frontend_app` (not the repository root)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 2. **Update Vercel Project Settings**
In your Vercel dashboard (https://vercel.com/dashboard):

1. Go to your project settings
2. Navigate to **General** → **Build & Output Settings**
3. Set the following:
   ```
   Framework Preset: Vite
   Root Directory: frontend_app
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   ```

### 3. **Environment Variables**
Add these environment variables in Vercel:
```
NODE_ENV=production
```

### 4. **Redeploy**
After updating the settings:
1. Go to **Deployments** tab
2. Click **Redeploy** on the latest deployment
3. Or push a new commit to trigger automatic deployment

## 📁 Current Project Structure

```
/workspace/
├── frontend_app/                 ← This should be your Vercel root
│   ├── dist/                    ← Build output
│   ├── src/                     ← Source code
│   ├── package.json             ← Dependencies
│   ├── vite.config.js           ← Vite config
│   ├── vercel.json              ← Vercel config
│   └── ...
├── aai_import_system.py         ← Backend (separate deployment)
└── ...
```

## 🌐 Alternative: Manual Deployment

If the automatic deployment fails, you can deploy manually:

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Deploy from frontend_app directory**:
   ```bash
   cd frontend_app
   vercel --prod
   ```

## 🔄 Backend Integration

The frontend is configured to work with mock data when the backend is unavailable. To connect to a real backend:

1. **Deploy the Python backend** (e.g., on Railway, Heroku, or DigitalOcean)
2. **Update the API URL** in `/frontend_app/src/services/api.js`:
   ```javascript
   const API_BASE_URL = process.env.NODE_ENV === 'production' 
     ? 'https://your-actual-backend-url.com/api'  // ← Update this
     : 'http://localhost:5000/api';
   ```

## 🎯 Expected Result

After fixing the deployment, you should see:
- ✅ Dashboard with system statistics
- ✅ Import page with file selection
- ✅ Search functionality with multiple agents
- ✅ Analytics with charts and metrics

## 🐛 Troubleshooting

### Common Issues:

1. **404 on routes**: Make sure `vercel.json` has the correct routing rules
2. **Build fails**: Check that all dependencies are in `package.json`
3. **Blank page**: Check browser console for JavaScript errors
4. **API errors**: Verify the backend URL and CORS settings

### Debug Steps:

1. **Check build logs** in Vercel dashboard
2. **Verify file structure** in the deployment
3. **Test locally** with `npm run build && npm run preview`
4. **Check browser console** for errors

## 📞 Support

If you continue to have issues:
1. Check the Vercel deployment logs
2. Verify the project settings match the guide above
3. Try redeploying with the correct root directory

The frontend is fully functional and ready for deployment - it just needs the correct Vercel configuration!