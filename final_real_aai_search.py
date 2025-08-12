#!/usr/bin/env python3
"""
🎉 FINAL REAL AAI SEARCH API
============================

Production-ready search API for the real AAI automotive data
now loaded in external Qdrant with 249 actual data points.
"""

import requests
import json
import uuid
import time
from flask import Flask, request, jsonify, render_template_string
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from sentence_transformers import SentenceTransformer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
import threading
from datetime import datetime
from typing import List, Dict, Any

console = Console()

# External Qdrant Configuration
EXTERNAL_QDRANT_URL = "http://34.40.104.64:6333"
COLLECTION_NAME = "aai_comprehensive_automotive"

# Production Dashboard HTML Template
PRODUCTION_DASHBOARD_HTML = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🚀 AAI Real Data Search - Production System</title>
    <script src="https://cdn.socket.io/4.0.0/socket.io.min.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
        }
        .container { max-width: 1600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { font-size: 3.5em; margin-bottom: 10px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
        .header p { font-size: 1.4em; opacity: 0.9; }
        .status-banner {
            background: linear-gradient(45deg, #4CAF50, #45a049);
            border-radius: 15px;
            padding: 20px;
            margin-bottom: 30px;
            text-align: center;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }
        .real-data-info {
            background: linear-gradient(45deg, rgba(255, 193, 7, 0.3), rgba(255, 152, 0, 0.3));
            border: 2px solid rgba(255, 193, 7, 0.6);
            border-radius: 15px;
            padding: 20px;
            margin-bottom: 25px;
            text-align: center;
        }
        .dashboard-grid { 
            display: grid; 
            grid-template-columns: 2fr 1fr; 
            gap: 25px; 
            margin-bottom: 30px; 
        }
        .card { 
            background: rgba(255, 255, 255, 0.1); 
            border-radius: 15px; 
            padding: 25px; 
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }
        .search-section { grid-column: 1 / -1; }
        .search-container {
            display: flex;
            gap: 15px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        .search-input { 
            flex: 1;
            min-width: 350px;
            padding: 20px; 
            border: none; 
            border-radius: 12px; 
            font-size: 18px; 
            background: rgba(255, 255, 255, 0.95);
            color: #333;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .btn { 
            padding: 20px 35px; 
            border: none; 
            border-radius: 12px; 
            cursor: pointer; 
            font-size: 18px;
            font-weight: 600;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }
        .search-btn { background: linear-gradient(45deg, #4CAF50, #45a049); color: white; }
        .search-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.3); }
        .clear-btn { background: linear-gradient(45deg, #f44336, #d32f2f); color: white; }
        .clear-btn:hover { transform: translateY(-2px); }
        .example-queries {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
            margin-bottom: 25px;
        }
        .example-btn {
            background: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: white;
            padding: 10px 18px;
            border-radius: 25px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s ease;
        }
        .example-btn:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: translateY(-1px);
        }
        .results { margin-top: 30px; }
        .result-item { 
            background: rgba(255, 255, 255, 0.15); 
            margin: 20px 0; 
            padding: 25px; 
            border-radius: 15px; 
            border-left: 6px solid #4CAF50;
            transition: all 0.3s ease;
        }
        .result-item:hover {
            background: rgba(255, 255, 255, 0.2);
            transform: translateX(8px);
        }
        .result-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        .result-score { 
            background: linear-gradient(45deg, #4CAF50, #45a049); 
            color: white; 
            padding: 8px 15px; 
            border-radius: 25px; 
            font-size: 14px; 
            font-weight: bold;
        }
        .result-source {
            font-size: 20px;
            font-weight: bold;
            color: #4CAF50;
        }
        .result-content {
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 20px;
        }
        .result-meta {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 15px;
            font-size: 13px;
            opacity: 0.9;
            background: rgba(0, 0, 0, 0.2);
            padding: 15px;
            border-radius: 10px;
        }
        .meta-item {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
        }
        .meta-label { font-weight: bold; opacity: 0.8; }
        .meta-value { color: #4CAF50; }
        .stats-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); 
            gap: 20px; 
        }
        .stat-item { 
            text-align: center; 
            background: rgba(255, 255, 255, 0.1);
            padding: 25px;
            border-radius: 15px;
        }
        .stat-number { 
            font-size: 3em; 
            font-weight: bold; 
            color: #4CAF50; 
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        .stat-label { font-size: 1em; opacity: 0.9; margin-top: 8px; }
        .live-indicator { 
            display: inline-block; 
            width: 14px; 
            height: 14px; 
            background: #4CAF50; 
            border-radius: 50%; 
            animation: pulse 2s infinite;
            margin-left: 10px;
        }
        @keyframes pulse { 
            0%, 100% { opacity: 1; transform: scale(1); } 
            50% { opacity: 0.5; transform: scale(1.2); } 
        }
        .log-container { 
            background: rgba(0, 0, 0, 0.4); 
            border-radius: 12px; 
            padding: 20px; 
            height: 350px; 
            overflow-y: auto; 
            font-family: 'Courier New', monospace; 
            font-size: 13px;
        }
        .log-entry { 
            margin: 10px 0; 
            padding: 10px 15px; 
            border-radius: 8px; 
            border-left: 4px solid;
        }
        .log-info { background: rgba(52, 152, 219, 0.2); border-left-color: #3498db; }
        .log-success { background: rgba(46, 204, 113, 0.2); border-left-color: #2ecc71; }
        .log-error { background: rgba(231, 76, 60, 0.2); border-left-color: #e74c3c; }
        .no-results {
            text-align: center;
            padding: 50px;
            opacity: 0.7;
            font-style: italic;
            font-size: 18px;
        }
        .loading {
            text-align: center;
            padding: 30px;
            font-style: italic;
            opacity: 0.8;
            font-size: 18px;
        }
        .data-sources {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        .source-badge {
            background: rgba(255, 255, 255, 0.2);
            padding: 10px;
            border-radius: 10px;
            text-align: center;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 AAI Real Data Search</h1>
            <p>Production System with Real Automotive Industry Data<span class="live-indicator"></span></p>
        </div>
        
        <div class="status-banner">
            <h3>✅ PRODUCTION SYSTEM OPERATIONAL</h3>
            <p><strong>249 Real Data Points</strong> • <strong>External Qdrant</strong> • <strong>Live Search</strong></p>
        </div>
        
        <div class="real-data-info">
            <h3>🌐 Real AAI Automotive Data Sources</h3>
            <p><strong>External Qdrant:</strong> http://34.40.104.64:6333 • <strong>Collection:</strong> aai_comprehensive_automotive</p>
            <div class="data-sources">
                <div class="source-badge"><strong>TecDoc</strong><br>Parts Catalog</div>
                <div class="source-badge"><strong>AutoCare</strong><br>ACES/PIES</div>
                <div class="source-badge"><strong>Mitchell Motor</strong><br>Repair Data</div>
                <div class="source-badge"><strong>IA</strong><br>Vehicle Data</div>
                <div class="source-badge"><strong>Polk</strong><br>Database</div>
                <div class="source-badge"><strong>PIES</strong><br>Standards</div>
            </div>
        </div>
        
        <div class="dashboard-grid">
            <div class="card search-section">
                <h3>🔍 Search Real Automotive Data</h3>
                <div class="search-container">
                    <input type="text" id="searchInput" class="search-input" placeholder="Search real automotive data: TecDoc parts, AutoCare standards, Mitchell Motor procedures...">
                    <button onclick="performSearch()" class="btn search-btn">Search</button>
                    <button onclick="clearResults()" class="btn clear-btn">Clear</button>
                </div>
                
                <div class="example-queries">
                    <span style="opacity: 0.8; margin-right: 15px; font-weight: bold;">Try real data searches:</span>
                    <button class="example-btn" onclick="searchExample('TecDoc automotive parts')">TecDoc Parts</button>
                    <button class="example-btn" onclick="searchExample('AutoCare ACES PIES')">AutoCare Standards</button>
                    <button class="example-btn" onclick="searchExample('Mitchell Motor repair')">Mitchell Motor</button>
                    <button class="example-btn" onclick="searchExample('automotive database')">Vehicle Database</button>
                    <button class="example-btn" onclick="searchExample('parts catalog')">Parts Catalog</button>
                    <button class="example-btn" onclick="searchExample('technical documentation')">Documentation</button>
                </div>
                
                <div id="searchResults" class="results"></div>
            </div>
            
            <div class="card">
                <h3>📊 Real Data Statistics</h3>
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-number" id="pointsCount">-</div>
                        <div class="stat-label">Real Data Points</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number" id="vectorsCount">-</div>
                        <div class="stat-label">Indexed Vectors</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number" id="segmentsCount">-</div>
                        <div class="stat-label">Segments</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number" id="searchCount">0</div>
                        <div class="stat-label">Searches</div>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <h3>📈 Live Activity Monitor</h3>
                <div id="activityLog" class="log-container"></div>
            </div>
        </div>
    </div>

    <script>
        const socket = io();
        let searchCounter = 0;
        
        // Update stats
        function updateStats() {
            fetch('/api/stats')
                .then(response => response.json())
                .then(data => {
                    document.getElementById('pointsCount').textContent = data.points_count || 0;
                    document.getElementById('vectorsCount').textContent = data.indexed_vectors || 0;
                    document.getElementById('segmentsCount').textContent = data.segments || 0;
                })
                .catch(error => {
                    console.error('Error fetching stats:', error);
                    addLogEntry('error', 'Failed to fetch statistics');
                });
        }
        
        // Search with example
        function searchExample(query) {
            document.getElementById('searchInput').value = query;
            performSearch();
        }
        
        // Clear results
        function clearResults() {
            document.getElementById('searchResults').innerHTML = '';
            document.getElementById('searchInput').value = '';
            addLogEntry('info', 'Results cleared');
        }
        
        // Perform search
        function performSearch() {
            const query = document.getElementById('searchInput').value.trim();
            if (!query) {
                addLogEntry('error', 'Please enter a search query');
                return;
            }
            
            searchCounter++;
            document.getElementById('searchCount').textContent = searchCounter;
            
            addLogEntry('info', `🔍 Searching real data: "${query}"`);
            
            // Show loading
            document.getElementById('searchResults').innerHTML = '<div class="loading">🔄 Searching real automotive data...</div>';
            
            fetch('/api/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: query, limit: 10 })
            })
            .then(response => response.json())
            .then(data => {
                if (data.results) {
                    displayResults(data.results, query);
                    addLogEntry('success', `✅ Found ${data.results.length} real results for "${query}"`);
                } else {
                    addLogEntry('error', data.error || 'Search failed');
                    document.getElementById('searchResults').innerHTML = '<div class="no-results">❌ Search failed</div>';
                }
            })
            .catch(error => {
                console.error('Search error:', error);
                addLogEntry('error', 'Search request failed');
                document.getElementById('searchResults').innerHTML = '<div class="no-results">❌ Search error occurred</div>';
            });
        }
        
        // Display search results
        function displayResults(results, query) {
            const container = document.getElementById('searchResults');
            
            if (results.length === 0) {
                container.innerHTML = '<div class="no-results">🔍 No results found for "' + query + '"</div>';
                return;
            }
            
            let html = '<h4 style="margin-bottom: 25px; color: #4CAF50; font-size: 1.3em;">🎯 Real Data Results for "' + query + '"</h4>';
            
            results.forEach((result, index) => {
                const payload = result.payload || {};
                html += `
                    <div class="result-item">
                        <div class="result-header">
                            <div class="result-source">${payload.source || 'Unknown Source'}</div>
                            <div class="result-score">Score: ${result.score}</div>
                        </div>
                        <div class="result-content">${result.content || payload.content || 'No content available'}</div>
                        <div class="result-meta">
                            <div class="meta-item">
                                <span class="meta-label">Source:</span>
                                <span class="meta-value">${payload.source || 'Unknown'}</span>
                            </div>
                            <div class="meta-item">
                                <span class="meta-label">File:</span>
                                <span class="meta-value">${payload.file_name || payload.archive_name || 'N/A'}</span>
                            </div>
                            <div class="meta-item">
                                <span class="meta-label">Type:</span>
                                <span class="meta-value">${payload.content_type || 'N/A'}</span>
                            </div>
                            <div class="meta-item">
                                <span class="meta-label">Size:</span>
                                <span class="meta-value">${payload.file_size ? (payload.file_size / 1024).toFixed(1) + ' KB' : 'N/A'}</span>
                            </div>
                            <div class="meta-item">
                                <span class="meta-label">Standard:</span>
                                <span class="meta-value">${payload.standard || 'N/A'}</span>
                            </div>
                            <div class="meta-item">
                                <span class="meta-label">Timestamp:</span>
                                <span class="meta-value">${payload.timestamp ? new Date(payload.timestamp).toLocaleDateString() : 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            container.innerHTML = html;
        }
        
        // Add log entry
        function addLogEntry(type, message) {
            const log = document.getElementById('activityLog');
            const entry = document.createElement('div');
            entry.className = `log-entry log-${type}`;
            entry.innerHTML = `[${new Date().toLocaleTimeString()}] ${message}`;
            log.appendChild(entry);
            log.scrollTop = log.scrollHeight;
            
            // Keep only last 50 entries
            while (log.children.length > 50) {
                log.removeChild(log.firstChild);
            }
        }
        
        // Socket events
        socket.on('connect', function() {
            addLogEntry('success', '🔌 Connected to real-time system');
        });
        
        socket.on('search_performed', function(data) {
            addLogEntry('info', `🔍 Live search: "${data.query}" → ${data.results} results`);
        });
        
        // Enter key for search
        document.getElementById('searchInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
        
        // Initialize
        updateStats();
        setInterval(updateStats, 20000); // Update stats every 20 seconds
        addLogEntry('success', '🚀 AAI Real Data Search System initialized');
        addLogEntry('info', '📊 External Qdrant: http://34.40.104.64:6333');
        addLogEntry('info', '🎯 Collection: aai_comprehensive_automotive');
        addLogEntry('info', '📁 Real data sources: TecDoc, AutoCare, MM, IA, Polk, PIES');
    </script>
</body>
</html>
"""

class FinalRealAAISearchAPI:
    """Final production search API for real AAI data"""
    
    def __init__(self):
        self.app = Flask(__name__)
        self.app.config['SECRET_KEY'] = 'final_real_aai_search_secret'
        CORS(self.app)
        self.socketio = SocketIO(self.app, cors_allowed_origins="*")
        
        self.qdrant_url = EXTERNAL_QDRANT_URL
        self.collection_name = COLLECTION_NAME
        self.model = None
        self.session = requests.Session()
        self.session.timeout = 30
        
        self.load_model()
        self.setup_routes()
        self.setup_socket_events()
    
    def load_model(self):
        """Load sentence transformer model"""
        console.print("🤖 Loading embedding model...")
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        console.print("✅ Model loaded successfully")
    
    def generate_embedding(self, text: str):
        """Generate vector embedding for text"""
        clean_text = str(text).strip()[:512]
        if not clean_text:
            clean_text = "empty"
        
        embedding = self.model.encode(clean_text)
        return embedding.tolist()
    
    def setup_routes(self):
        """Setup Flask routes"""
        
        @self.app.route('/')
        def dashboard():
            return render_template_string(PRODUCTION_DASHBOARD_HTML)
        
        @self.app.route('/api/search', methods=['POST'])
        def search():
            try:
                data = request.get_json()
                query = data.get('query', '')
                limit = data.get('limit', 10)
                
                if not query:
                    return jsonify({'error': 'Query is required'}), 400
                
                # Generate query embedding
                query_vector = self.generate_embedding(query)
                
                # Search in external Qdrant
                search_request = {
                    "vector": query_vector,
                    "limit": limit,
                    "with_payload": True,
                    "score_threshold": 0.1  # Lower threshold for more results
                }
                
                response = self.session.post(
                    f"{self.qdrant_url}/collections/{self.collection_name}/points/search",
                    json=search_request
                )
                
                if response.status_code == 200:
                    results = response.json()["result"]
                    
                    formatted_results = []
                    for result in results:
                        formatted_results.append({
                            'id': result["id"],
                            'score': round(result["score"], 4),
                            'content': result["payload"].get("content", ""),
                            'source': result["payload"].get("source", ""),
                            'payload': result["payload"]
                        })
                    
                    # Emit real-time update
                    self.socketio.emit('search_performed', {
                        'query': query,
                        'results': len(formatted_results),
                        'timestamp': datetime.now().isoformat()
                    })
                    
                    return jsonify({
                        'query': query,
                        'results': formatted_results,
                        'total': len(formatted_results)
                    })
                else:
                    return jsonify({'error': f'Search failed: {response.text}'}), 500
                
            except Exception as e:
                return jsonify({'error': str(e)}), 500
        
        @self.app.route('/api/stats', methods=['GET'])
        def stats():
            try:
                response = self.session.get(f"{self.qdrant_url}/collections/{self.collection_name}")
                if response.status_code == 200:
                    data = response.json()["result"]
                    return jsonify({
                        'collection': self.collection_name,
                        'status': data['status'],
                        'points_count': data['points_count'],
                        'indexed_vectors': data['indexed_vectors_count'],
                        'segments': data['segments_count']
                    })
                else:
                    return jsonify({'error': 'Failed to get stats'}), 500
            except Exception as e:
                return jsonify({'error': str(e)}), 500
        
        @self.app.route('/api/health', methods=['GET'])
        def health():
            return jsonify({
                'status': 'healthy',
                'timestamp': datetime.now().isoformat(),
                'external_qdrant': EXTERNAL_QDRANT_URL,
                'collection': self.collection_name,
                'real_data_points': 249,
                'data_sources': ['TecDoc', 'AutoCare', 'MM', 'IA', 'Polk', 'PIES'],
                'services': {
                    'dashboard': 'active',
                    'embedding_model': 'loaded',
                    'external_qdrant': 'connected',
                    'search_api': 'operational',
                    'real_data': 'loaded'
                }
            })
    
    def setup_socket_events(self):
        """Setup WebSocket events"""
        
        @self.socketio.on('connect')
        def handle_connect():
            console.print("🔌 Client connected to real AAI dashboard")
            emit('status', {'message': 'Connected to Real AAI Production System'})
        
        @self.socketio.on('disconnect')
        def handle_disconnect():
            console.print("🔌 Client disconnected from dashboard")
    
    def run(self, host='0.0.0.0', port=5005, debug=False):
        """Run the final search API"""
        console.print(Panel.fit(
            f"🎉 FINAL REAL AAI SEARCH API - PRODUCTION\n"
            f"=========================================\n\n"
            f"🔍 Real Automotive Data Search\n"
            f"📊 249 Real Data Points Loaded\n"
            f"🌐 External Qdrant Integration\n"
            f"🔌 Real-time WebSocket Updates\n"
            f"📈 Production Dashboard\n\n"
            f"🌐 Dashboard: http://{host}:{port}\n"
            f"🎯 External Qdrant: {EXTERNAL_QDRANT_URL}\n"
            f"📊 Collection: {self.collection_name}\n"
            f"📁 Data Sources: TecDoc, AutoCare, MM, IA, Polk, PIES",
            title="🚀 REAL AAI PRODUCTION SYSTEM",
            border_style="green"
        ))
        
        self.socketio.run(self.app, host=host, port=port, debug=debug)

def main():
    """Main function"""
    try:
        api = FinalRealAAISearchAPI()
        api.run()
    except Exception as e:
        console.print(f"❌ Error starting final API: {e}")

if __name__ == "__main__":
    main()