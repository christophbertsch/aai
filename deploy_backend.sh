#!/bin/bash

echo "🚀 AAI Cloud Backend Deployment Script"
echo "======================================"

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Not in a git repository. Initializing..."
    git init
    git add .
    git commit -m "Initial commit: AAI Cloud Backend"
fi

echo "📁 Files ready for deployment:"
echo "  ✅ aai_cloud_backend.py - Cloud backend"
echo "  ✅ requirements.txt - Dependencies"
echo "  ✅ vercel.json - Vercel config"
echo "  ✅ render.yaml - Render config"

echo ""
echo "🌐 Deployment Options:"
echo ""
echo "1️⃣  VERCEL (Recommended):"
echo "   - Go to https://vercel.com"
echo "   - Import this GitHub repository"
echo "   - Vercel will auto-detect vercel.json"
echo "   - Deploy!"
echo ""
echo "2️⃣  RENDER:"
echo "   - Go to https://render.com"
echo "   - Create new Web Service"
echo "   - Connect this GitHub repository"
echo "   - Use render.yaml configuration"
echo ""
echo "3️⃣  RAILWAY:"
echo "   - Go to https://railway.app"
echo "   - Deploy from GitHub"
echo "   - Set environment variables manually"
echo ""

echo "🔧 Environment Variables to Set:"
echo "  QDRANT_URL=http://34.40.104.64:6333"
echo "  COLLECTION_NAME=aai_comprehensive_automotive"
echo "  MODEL_NAME=all-MiniLM-L6-v2"

echo ""
echo "📡 After deployment, update frontend API URL in:"
echo "  frontend_app/src/services/api.js"
echo "  Replace: https://aai-cloud-backend.vercel.app/api"
echo "  With: https://YOUR-ACTUAL-BACKEND-URL.vercel.app/api"

echo ""
echo "✅ External Qdrant Status:"
python3 -c "
import requests
try:
    response = requests.get('http://34.40.104.64:6333/collections/aai_comprehensive_automotive', timeout=5)
    if response.status_code == 200:
        data = response.json()
        print(f'  🗄️  Connected: {data.get(\"result\", {}).get(\"points_count\", 0)} data points ready')
    else:
        print(f'  ⚠️  Status: {response.status_code}')
except Exception as e:
    print(f'  ❌ Error: {e}')
"

echo ""
echo "🎯 Ready to deploy! Choose your platform and follow the steps above."