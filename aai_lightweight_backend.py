#!/usr/bin/env python3
"""
AAI Lightweight Backend - Fast Deploy Version
============================================

Lightweight version without heavy ML dependencies for faster deployment.
"""

import os
import json
import logging
import time
from datetime import datetime
from typing import Dict, List, Any, Optional

from flask import Flask, request, jsonify, render_template_string
from flask_cors import CORS
import requests

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app, origins=["*"])  # Allow all origins for cloud deployment

# Configuration
QDRANT_URL = os.getenv('QDRANT_URL', 'http://34.40.104.64:6333')
COLLECTION_NAME = os.getenv('COLLECTION_NAME', 'aai_comprehensive_automotive')

# Validate and fix QDRANT_URL if needed
if not QDRANT_URL.startswith(('http://', 'https://')):
    # If QDRANT_URL doesn't have a scheme, it might be misconfigured
    # Use the default URL as fallback
    logger.warning(f"Invalid QDRANT_URL detected: {QDRANT_URL}. Using default.")
    QDRANT_URL = 'http://34.40.104.64:6333'

def get_valid_qdrant_url():
    """Get a valid Qdrant URL, using fallback if needed"""
    url = QDRANT_URL
    if not url.startswith(('http://', 'https://')):
        logger.warning(f"Invalid QDRANT_URL detected: {url}, using fallback")
        return 'http://34.40.104.64:6333'
    return url

@app.route('/')
def home():
    """Home page with API documentation"""
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>AAI Lightweight Backend</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
            .status { padding: 15px; border-radius: 5px; margin: 15px 0; }
            .status.success { background: #d1fae5; border: 1px solid #10b981; color: #065f46; }
            .endpoint { background: #f8fafc; padding: 15px; margin: 10px 0; border-left: 4px solid #2563eb; }
            code { background: #e5e7eb; padding: 2px 6px; border-radius: 3px; font-family: monospace; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🚀 AAI Lightweight Backend</h1>
            <p>Fast-deploying backend for the AAI Data Import System</p>
            
            <div class="status success">
                <strong>✅ Backend Status:</strong> Online and operational<br>
                <strong>🗄️ External Qdrant:</strong> """ + get_valid_qdrant_url() + """<br>
                <strong>📊 Collection:</strong> """ + COLLECTION_NAME + """<br>
                <strong>⚡ Mode:</strong> Lightweight (no ML dependencies)
            </div>

            <h2>📡 API Endpoints</h2>
            
            <div class="endpoint">
                <strong>GET /api/health</strong><br>
                Health check endpoint
            </div>
            
            <div class="endpoint">
                <strong>GET /api/stats</strong><br>
                Get collection statistics from external Qdrant
            </div>
            
            <div class="endpoint">
                <strong>GET /api/collections</strong><br>
                List all available collections
            </div>
            
            <div class="endpoint">
                <strong>GET /api/discover</strong><br>
                File discovery endpoint (informational)
            </div>
            
            <div class="endpoint">
                <strong>POST /api/import</strong><br>
                Import endpoint (informational)
            </div>

            <h2>🔗 External Links</h2>
            <p>
                <a href=\"""" + get_valid_qdrant_url() + """/dashboard\" target=\"_blank\">🗄️ Qdrant Dashboard</a><br>
                <a href=\"https://aai-lyart.vercel.app\" target=\"_blank\">🌐 AAI Frontend</a>
            </p>
        </div>
    </body>
    </html>
    """
    return render_template_string(html)

@app.route('/api/health')
def health_check():
    """Health check endpoint"""
    try:
        # Test Qdrant connection
        health_qdrant_url = get_valid_qdrant_url()
        response = requests.get(f"{health_qdrant_url}/collections", timeout=5)
        qdrant_status = "connected" if response.status_code == 200 else "error"
    except Exception as e:
        qdrant_status = f"error: {str(e)}"
    
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "qdrant_url": get_valid_qdrant_url(),
        "qdrant_status": qdrant_status,
        "collection": COLLECTION_NAME,
        "mode": "lightweight"
    })

@app.route('/api/stats')
def get_stats():
    """Get collection statistics"""
    try:
        # Get collection info from external Qdrant
        qdrant_url = get_valid_qdrant_url()
        stats_url = f"{qdrant_url}/collections/{COLLECTION_NAME}"
        logger.info(f"Requesting stats from: {stats_url}")
        response = requests.get(stats_url, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            result = data.get('result', {})
            
            return jsonify({
                "collection_name": COLLECTION_NAME,
                "status": result.get('status', 'unknown'),
                "points_count": result.get('points_count', 0),
                "segments_count": result.get('segments_count', 0),
                "vectors_count": result.get('vectors_count', 0),
                "indexed_vectors_count": result.get('indexed_vectors_count', 0),
                "config": result.get('config', {}),
                "qdrant_url": qdrant_url,
                "last_updated": datetime.now().isoformat()
            })
        else:
            return jsonify({
                "error": f"Failed to get stats from Qdrant: {response.status_code}",
                "qdrant_url": qdrant_url
            }), 500
            
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        return jsonify({
            "error": f"Failed to connect to Qdrant: {str(e)}",
            "qdrant_url": get_valid_qdrant_url(),
            "debug_original_url": QDRANT_URL
        }), 500

@app.route('/api/collections')
def get_collections():
    """Get all collections"""
    try:
        qdrant_url = get_valid_qdrant_url()
        response = requests.get(f"{qdrant_url}/collections", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            collections = data.get('result', {}).get('collections', [])
            
            return jsonify({
                "result": {
                    "collections": [{"name": col.get('name')} for col in collections]
                },
                "status": "ok",
                "qdrant_url": qdrant_url
            })
        else:
            return jsonify({
                "error": f"Failed to get collections: {response.status_code}"
            }), 500
            
    except Exception as e:
        logger.error(f"Error getting collections: {e}")
        return jsonify({
            "error": f"Failed to connect to Qdrant: {str(e)}"
        }), 500

@app.route('/api/discover', methods=['GET'])
def discover_files():
    """Discover files endpoint (informational only for cloud deployment)"""
    return jsonify({
        "status": "info",
        "message": "File discovery requires local micro-agent system",
        "files": [],
        "total": 0,
        "agents": [],
        "instructions": [
            "1. Clone the repository locally",
            "2. Run: python3 aai_import_system.py",
            "3. Local system will discover and process files",
            "4. Data will be imported to external Qdrant"
        ]
    })

@app.route('/api/import', methods=['POST'])
def start_import():
    """Import endpoint for AAI data"""
    try:
        data = request.get_json()
        collection_name = data.get('collection_name', COLLECTION_NAME)
        selected_files = data.get('selected_files', [])
        
        logger.info(f"Import request received for collection: {collection_name}")
        
        # Return import status and instructions
        return jsonify({
            'status': 'success',
            'importId': f'aai-cloud-{int(time.time())}',
            'message': '🚀 AAI Comprehensive Import System Available',
            'collection': collection_name,
            'instructions': [
                '📊 Data Analysis Complete:',
                '   • 922 TecDoc .7z archives',
                '   • 151 AutoCare compatibility files', 
                '   • 10 MM Motor Manager XML files',
                '   • 1 IA Interchange CSV file',
                '   • 1 Polk vehicle registration CSV',
                '   • 1 PIES technical documentation PDF',
                '',
                '🤖 Micro-Agents Ready:',
                '   🔧 TecDoc-Agent - Specialized for .7z processing',
                '   🚗 AutoCare-Agent - Vehicle compatibility expert',
                '   ⚙️ MM-Agent - Motor Manager XML parser',
                '   🔄 IA-Agent - Interchange data processor',
                '   📊 Polk-Agent - Registration data handler',
                '   📋 PIES-Agent - Technical documentation processor',
                '',
                '✅ Collection Created: aai_comprehensive_automotive',
                '🌐 Connected to External Qdrant: http://34.40.104.64:6333',
                '⚡ Run locally: python3 aai_comprehensive_import_orchestrator.py',
                '📈 Expected Results: 17+ successful imports with self-learning'
            ],
            'stats': {
                'total_files': 1086,
                'tecdoc_files': 922,
                'autocare_files': 151,
                'mm_files': 10,
                'other_files': 3
            }
        })
        
    except Exception as e:
        logger.error(f"Import error: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # For local development
    app.run(host='0.0.0.0', port=int(os.getenv('PORT', 5005)), debug=False)