# 🚀 AAI Cloud Backend Deployment Guide

## 🎯 Overview

Deploy the AAI backend to the cloud so the frontend at https://aai-lyart.vercel.app can connect to our real data and external Qdrant.

## 📁 Files Created

### Backend Files:
- `aai_cloud_backend.py` - Cloud-ready Flask backend
- `requirements.txt` - Python dependencies
- `vercel.json` - Vercel deployment configuration
- `render.yaml` - Render deployment configuration

### Frontend Updates:
- Updated `frontend_app/src/services/api.js` to use cloud backend
- Added `frontend_app/src/config/connections.js` for configuration

## 🌐 Deployment Options

### Option 1: Vercel (Recommended)

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Add cloud backend for AAI system"
   git push origin main
   ```

2. **Deploy to Vercel**:
   - Go to https://vercel.com
   - Import your GitHub repository
   - Vercel will automatically detect the `vercel.json` configuration
   - Deploy!

3. **Update Frontend**:
   - After deployment, update the backend URL in `frontend_app/src/services/api.js`
   - Replace `https://aai-cloud-backend.vercel.app/api` with your actual Vercel URL
   - Redeploy the frontend

### Option 2: Render

1. **Push to GitHub** (same as above)

2. **Deploy to Render**:
   - Go to https://render.com
   - Create new Web Service
   - Connect your GitHub repository
   - Render will use the `render.yaml` configuration
   - Deploy!

3. **Update Frontend** (same as above)

## 🔧 Configuration

### Environment Variables:
- `QDRANT_URL`: http://34.40.104.64:6333
- `COLLECTION_NAME`: aai_comprehensive_automotive
- `MODEL_NAME`: all-MiniLM-L6-v2

### External Connections:
- ✅ **External Qdrant**: http://34.40.104.64:6333 (already operational)
- ✅ **Real Data**: 249 automotive data points (already loaded)
- ✅ **Frontend**: https://aai-lyart.vercel.app (already deployed)

## 📡 API Endpoints

Once deployed, your cloud backend will provide:

- `GET /` - Backend documentation and status
- `GET /api/health` - Health check
- `GET /api/stats` - Collection statistics from external Qdrant
- `POST /api/search` - Search automotive data
- `GET /api/collections` - List collections

## 🎯 Complete Architecture After Deployment

```
🌐 Frontend (Vercel)
https://aai-lyart.vercel.app
         ↕️
🚀 Cloud Backend (Vercel/Render)
https://your-backend.vercel.app/api
         ↕️
🗄️ External Qdrant
http://34.40.104.64:6333
         ↕️
📊 Real AAI Data (249 points)
TecDoc, AutoCare, MM, IA, Polk, PIES
```

## 🔍 Testing After Deployment

1. **Test Backend**:
   ```bash
   curl https://your-backend.vercel.app/api/health
   curl https://your-backend.vercel.app/api/stats
   ```

2. **Test Search**:
   ```bash
   curl -X POST https://your-backend.vercel.app/api/search \
     -H "Content-Type: application/json" \
     -d '{"query": "TecDoc automotive parts", "limit": 5}'
   ```

3. **Test Frontend**:
   - Visit https://aai-lyart.vercel.app
   - Try searching for automotive parts
   - Check that real data is returned

## 🎉 Expected Results

After successful deployment:

✅ **Frontend connects to cloud backend**  
✅ **Backend connects to external Qdrant**  
✅ **Real automotive data searchable**  
✅ **249 data points accessible**  
✅ **All 6 data sources available** (TecDoc, AutoCare, MM, IA, Polk, PIES)  
✅ **Production-ready system**  

## 🚨 Important Notes

1. **Update Frontend URL**: After backend deployment, update the API URL in the frontend
2. **CORS Configuration**: Backend is configured to allow all origins for cloud deployment
3. **Model Loading**: The sentence transformer model will be downloaded on first request
4. **Timeout Settings**: Configured for cloud platform limitations
5. **External Qdrant**: Must remain accessible from cloud platforms

## 🔧 Local Development

For local development, you can still run:
```bash
python aai_cloud_backend.py
```

This will start the backend on http://localhost:5005 and connect to the same external Qdrant.

## 📞 Support

If you encounter issues:
1. Check the deployment logs in Vercel/Render dashboard
2. Verify external Qdrant is accessible: http://34.40.104.64:6333/dashboard
3. Test API endpoints individually
4. Check CORS settings if frontend can't connect

---

**Ready to deploy! 🚀**