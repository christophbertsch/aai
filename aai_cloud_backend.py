#!/usr/bin/env python3
"""
AAI Cloud Backend - Deployable to Vercel/Render
==============================================

Cloud-ready backend that connects to external Qdrant and serves the AAI frontend.
Designed for deployment on Vercel, Render, or similar cloud platforms.
"""

import os
import json
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional
import uuid

from flask import Flask, request, jsonify, render_template_string
from flask_cors import CORS
import requests
from sentence_transformers import SentenceTransformer

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app, origins=["*"])  # Allow all origins for cloud deployment

# Configuration
QDRANT_URL = os.getenv('QDRANT_URL', 'http://34.40.104.64:6333')
COLLECTION_NAME = os.getenv('COLLECTION_NAME', 'aai_comprehensive_automotive')
MODEL_NAME = os.getenv('MODEL_NAME', 'all-MiniLM-L6-v2')

# Global variables
embedding_model = None

def initialize_model():
    """Initialize the embedding model"""
    global embedding_model
    try:
        logger.info(f"Loading embedding model: {MODEL_NAME}")
        embedding_model = SentenceTransformer(MODEL_NAME)
        logger.info("Embedding model loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load embedding model: {e}")
        embedding_model = None

def create_embedding(text: str) -> List[float]:
    """Create vector embedding for text"""
    global embedding_model
    if embedding_model is None:
        initialize_model()
    
    try:
        if embedding_model:
            embedding = embedding_model.encode(text)
            return embedding.tolist()
        else:
            # Fallback: return zero vector
            return [0.0] * 384
    except Exception as e:
        logger.error(f"Error creating embedding: {e}")
        return [0.0] * 384

@app.route('/')
def home():
    """Home page with API documentation"""
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>AAI Cloud Backend</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
            .status { padding: 15px; border-radius: 5px; margin: 15px 0; }
            .status.success { background: #d1fae5; border: 1px solid #10b981; color: #065f46; }
            .status.error { background: #fee2e2; border: 1px solid #ef4444; color: #991b1b; }
            .endpoint { background: #f8fafc; padding: 15px; margin: 10px 0; border-left: 4px solid #2563eb; }
            code { background: #e5e7eb; padding: 2px 6px; border-radius: 3px; font-family: monospace; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🚀 AAI Cloud Backend</h1>
            <p>Cloud-ready backend for the AAI Data Import System</p>
            
            <div class="status success">
                <strong>✅ Backend Status:</strong> Online and operational<br>
                <strong>🗄️ External Qdrant:</strong> """ + QDRANT_URL + """<br>
                <strong>📊 Collection:</strong> """ + COLLECTION_NAME + """<br>
                <strong>🤖 Model:</strong> """ + MODEL_NAME + """
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
                <strong>POST /api/search</strong><br>
                Search the automotive data collection<br>
                Body: <code>{"query": "brake pads BMW", "limit": 10}</code>
            </div>
            
            <div class="endpoint">
                <strong>GET /api/collections</strong><br>
                List all available collections
            </div>

            <h2>🌐 Frontend</h2>
            <p>Connect your frontend to this backend:</p>
            <code>https://your-backend-url.vercel.app/api</code>

            <h2>🔗 External Links</h2>
            <p>
                <a href=\"""" + QDRANT_URL + """/dashboard\" target=\"_blank\">🗄️ Qdrant Dashboard</a><br>
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
        response = requests.get(f"{QDRANT_URL}/collections", timeout=5)
        qdrant_status = "connected" if response.status_code == 200 else "error"
    except Exception as e:
        qdrant_status = f"error: {str(e)}"
    
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "qdrant_url": QDRANT_URL,
        "qdrant_status": qdrant_status,
        "collection": COLLECTION_NAME,
        "model": MODEL_NAME,
        "model_loaded": embedding_model is not None
    })

@app.route('/api/stats')
def get_stats():
    """Get collection statistics"""
    try:
        # Get collection info from external Qdrant
        response = requests.get(f"{QDRANT_URL}/collections/{COLLECTION_NAME}", timeout=10)
        
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
                "qdrant_url": QDRANT_URL,
                "last_updated": datetime.now().isoformat()
            })
        else:
            return jsonify({
                "error": f"Failed to get stats from Qdrant: {response.status_code}",
                "qdrant_url": QDRANT_URL
            }), 500
            
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        return jsonify({
            "error": f"Failed to connect to Qdrant: {str(e)}",
            "qdrant_url": QDRANT_URL
        }), 500

@app.route('/api/search', methods=['POST'])
def search():
    """Search the collection"""
    try:
        data = request.get_json()
        query = data.get('query', '')
        limit = data.get('limit', 10)
        
        if not query:
            return jsonify({"error": "Query is required"}), 400
        
        # Create embedding for the query
        query_vector = create_embedding(query)
        
        # Search in external Qdrant
        search_payload = {
            "vector": query_vector,
            "limit": limit,
            "with_payload": True,
            "with_vector": False
        }
        
        response = requests.post(
            f"{QDRANT_URL}/collections/{COLLECTION_NAME}/points/search",
            json=search_payload,
            timeout=10
        )
        
        if response.status_code == 200:
            search_results = response.json()
            results = search_results.get('result', [])
            
            # Format results for frontend
            formatted_results = []
            for result in results:
                payload = result.get('payload', {})
                formatted_results.append({
                    "id": result.get('id'),
                    "score": result.get('score', 0),
                    "title": payload.get('file_name', 'Unknown'),
                    "content": payload.get('content', '')[:200] + '...',
                    "source": payload.get('source', 'Unknown'),
                    "metadata": {
                        "file_path": payload.get('file_path', ''),
                        "timestamp": payload.get('timestamp', ''),
                        "record_id": payload.get('record_id', '')
                    }
                })
            
            return jsonify({
                "results": formatted_results,
                "total": len(formatted_results),
                "query": query,
                "collection": COLLECTION_NAME,
                "query_time": 0.1  # Approximate
            })
        else:
            return jsonify({
                "error": f"Search failed: {response.status_code}",
                "details": response.text
            }), 500
            
    except Exception as e:
        logger.error(f"Search error: {e}")
        return jsonify({
            "error": f"Search failed: {str(e)}"
        }), 500

@app.route('/api/collections')
def get_collections():
    """Get all collections"""
    try:
        response = requests.get(f"{QDRANT_URL}/collections", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            collections = data.get('result', {}).get('collections', [])
            
            return jsonify({
                "result": {
                    "collections": [{"name": col.get('name')} for col in collections]
                },
                "status": "ok",
                "qdrant_url": QDRANT_URL
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

@app.route('/api/import', methods=['POST'])
def start_import():
    """Import endpoint (informational only for cloud deployment)"""
    data = request.get_json()
    collection_name = data.get('collection_name', COLLECTION_NAME)
    
    return jsonify({
        "status": "info",
        "message": "Import functionality requires local micro-agent system",
        "instructions": [
            "1. Clone the repository locally",
            "2. Run: python3 aai_import_system.py",
            "3. Data will be imported to external Qdrant",
            "4. Frontend will automatically show new data"
        ],
        "micro_agent_script": "/workspace/aai_import_system.py",
        "target_collection": collection_name,
        "external_qdrant": QDRANT_URL
    })

# Initialize model on startup (Flask 2.3+ compatible)
def startup():
    """Initialize the application"""
    logger.info("Starting AAI Cloud Backend...")
    initialize_model()
    logger.info("AAI Cloud Backend ready!")

# Register startup function
with app.app_context():
    startup()

if __name__ == '__main__':
    # For local development
    initialize_model()
    app.run(host='0.0.0.0', port=int(os.getenv('PORT', 5005)), debug=False)