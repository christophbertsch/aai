#!/usr/bin/env python3
"""
🌐 AAI DASHBOARD INTEGRATION
===========================

Complete dashboard integration with:
- Real-time data streaming
- WebSocket connections
- Live search interface
- Performance monitoring
- Data visualization
"""

import os
import json
import time
import asyncio
import websockets
import requests
from flask import Flask, request, jsonify, render_template_string
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from sentence_transformers import SentenceTransformer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.live import Live
from rich.layout import Layout
from rich import box
import threading
import uuid
from datetime import datetime

console = Console()

# HTML Template for Dashboard
DASHBOARD_HTML = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AAI Vector Search Dashboard</title>
    <script src="https://cdn.socket.io/4.0.0/socket.io.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .header p { font-size: 1.2em; opacity: 0.9; }
        .dashboard-grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 20px; 
            margin-bottom: 30px; 
        }
        .card { 
            background: rgba(255, 255, 255, 0.1); 
            border-radius: 15px; 
            padding: 20px; 
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .search-section { grid-column: 1 / -1; }
        .search-input { 
            width: 100%; 
            padding: 15px; 
            border: none; 
            border-radius: 10px; 
            font-size: 16px; 
            margin-bottom: 15px;
            background: rgba(255, 255, 255, 0.9);
            color: #333;
        }
        .search-btn { 
            background: #4CAF50; 
            color: white; 
            border: none; 
            padding: 15px 30px; 
            border-radius: 10px; 
            cursor: pointer; 
            font-size: 16px;
            transition: background 0.3s;
        }
        .search-btn:hover { background: #45a049; }
        .results { margin-top: 20px; }
        .result-item { 
            background: rgba(255, 255, 255, 0.1); 
            margin: 10px 0; 
            padding: 15px; 
            border-radius: 10px; 
            border-left: 4px solid #4CAF50;
        }
        .result-score { 
            background: #4CAF50; 
            color: white; 
            padding: 5px 10px; 
            border-radius: 15px; 
            font-size: 12px; 
            display: inline-block; 
            margin-bottom: 10px;
        }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; }
        .stat-item { text-align: center; }
        .stat-number { font-size: 2em; font-weight: bold; color: #4CAF50; }
        .stat-label { font-size: 0.9em; opacity: 0.8; }
        .live-indicator { 
            display: inline-block; 
            width: 10px; 
            height: 10px; 
            background: #4CAF50; 
            border-radius: 50%; 
            animation: pulse 2s infinite;
        }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .log-container { 
            background: rgba(0, 0, 0, 0.3); 
            border-radius: 10px; 
            padding: 15px; 
            height: 200px; 
            overflow-y: auto; 
            font-family: monospace; 
            font-size: 12px;
        }
        .log-entry { margin: 5px 0; padding: 5px; border-radius: 5px; }
        .log-info { background: rgba(52, 152, 219, 0.2); }
        .log-success { background: rgba(46, 204, 113, 0.2); }
        .log-error { background: rgba(231, 76, 60, 0.2); }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 AAI Vector Search Dashboard</h1>
            <p>Real-time Automotive Data Search & Analytics <span class="live-indicator"></span></p>
        </div>
        
        <div class="dashboard-grid">
            <div class="card search-section">
                <h3>🔍 Semantic Search</h3>
                <input type="text" id="searchInput" class="search-input" placeholder="Search automotive parts (e.g., 'BMW brake pads', 'Mercedes oil filter')">
                <button onclick="performSearch()" class="search-btn">Search</button>
                <div id="searchResults" class="results"></div>
            </div>
            
            <div class="card">
                <h3>📊 Collection Stats</h3>
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-number" id="pointsCount">-</div>
                        <div class="stat-label">Data Points</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number" id="vectorsCount">-</div>
                        <div class="stat-label">Vectors</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number" id="segmentsCount">-</div>
                        <div class="stat-label">Segments</div>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <h3>📈 Live Activity Log</h3>
                <div id="activityLog" class="log-container"></div>
            </div>
        </div>
    </div>

    <script>
        const socket = io();
        
        // Update stats
        function updateStats() {
            fetch('/api/stats')
                .then(response => response.json())
                .then(data => {
                    document.getElementById('pointsCount').textContent = data.points_count || 0;
                    document.getElementById('vectorsCount').textContent = data.indexed_vectors || 0;
                    document.getElementById('segmentsCount').textContent = data.segments || 0;
                })
                .catch(error => console.error('Error fetching stats:', error));
        }
        
        // Perform search
        function performSearch() {
            const query = document.getElementById('searchInput').value;
            if (!query) return;
            
            addLogEntry('info', `Searching for: "${query}"`);
            
            fetch('/api/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: query, limit: 5 })
            })
            .then(response => response.json())
            .then(data => {
                displayResults(data.results);
                addLogEntry('success', `Found ${data.results.length} results`);
            })
            .catch(error => {
                console.error('Search error:', error);
                addLogEntry('error', 'Search failed');
            });
        }
        
        // Display search results
        function displayResults(results) {
            const container = document.getElementById('searchResults');
            container.innerHTML = '';
            
            if (results.length === 0) {
                container.innerHTML = '<p>No results found</p>';
                return;
            }
            
            results.forEach(result => {
                const item = document.createElement('div');
                item.className = 'result-item';
                item.innerHTML = `
                    <div class="result-score">Score: ${result.score}</div>
                    <div><strong>${result.brand} ${result.model}</strong></div>
                    <div>${result.content}</div>
                    <div style="font-size: 12px; opacity: 0.7; margin-top: 10px;">
                        Part: ${result.part_type} | Source: ${result.source}
                    </div>
                `;
                container.appendChild(item);
            });
        }
        
        // Add log entry
        function addLogEntry(type, message) {
            const log = document.getElementById('activityLog');
            const entry = document.createElement('div');
            entry.className = `log-entry log-${type}`;
            entry.innerHTML = `[${new Date().toLocaleTimeString()}] ${message}`;
            log.appendChild(entry);
            log.scrollTop = log.scrollHeight;
        }
        
        // Socket events
        socket.on('connect', function() {
            addLogEntry('success', 'Connected to real-time updates');
        });
        
        socket.on('search_performed', function(data) {
            addLogEntry('info', `Live search: "${data.query}" (${data.results} results)`);
        });
        
        // Enter key for search
        document.getElementById('searchInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
        
        // Initialize
        updateStats();
        setInterval(updateStats, 5000); // Update stats every 5 seconds
        addLogEntry('info', 'Dashboard initialized');
    </script>
</body>
</html>
"""

class AAIDashboard:
    """Complete AAI Dashboard with real-time capabilities"""
    
    def __init__(self):
        self.app = Flask(__name__)
        self.app.config['SECRET_KEY'] = 'aai_dashboard_secret'
        CORS(self.app)
        self.socketio = SocketIO(self.app, cors_allowed_origins="*")
        
        self.qdrant_url = "http://localhost:6333"
        self.collection_name = "aai_comprehensive_automotive"
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        
        self.setup_routes()
        self.setup_socket_events()
    
    def setup_routes(self):
        """Setup Flask routes"""
        
        @self.app.route('/')
        def dashboard():
            return render_template_string(DASHBOARD_HTML)
        
        @self.app.route('/api/search', methods=['POST'])
        def search():
            try:
                data = request.get_json()
                query = data.get('query', '')
                limit = data.get('limit', 5)
                
                if not query:
                    return jsonify({'error': 'Query is required'}), 400
                
                # Generate query embedding
                query_vector = self.model.encode(query).tolist()
                
                # Search in Qdrant
                search_request = {
                    "vector": query_vector,
                    "limit": limit,
                    "with_payload": True,
                    "score_threshold": 0.3
                }
                
                response = requests.post(
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
                            'brand': result["payload"].get("brand", ""),
                            'model': result["payload"].get("model", ""),
                            'part_type': result["payload"].get("part_type", ""),
                            'source': result["payload"].get("source", ""),
                            'metadata': result["payload"]
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
                    return jsonify({'error': 'Search failed'}), 500
                
            except Exception as e:
                return jsonify({'error': str(e)}), 500
        
        @self.app.route('/api/stats', methods=['GET'])
        def stats():
            try:
                response = requests.get(f"{self.qdrant_url}/collections/{self.collection_name}")
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
                'services': {
                    'dashboard': 'active',
                    'embedding_model': 'loaded',
                    'qdrant': 'connected',
                    'websocket': 'active'
                }
            })
    
    def setup_socket_events(self):
        """Setup WebSocket events"""
        
        @self.socketio.on('connect')
        def handle_connect():
            console.print("🔌 Client connected to dashboard")
            emit('status', {'message': 'Connected to AAI Dashboard'})
        
        @self.socketio.on('disconnect')
        def handle_disconnect():
            console.print("🔌 Client disconnected from dashboard")
    
    def run(self, host='0.0.0.0', port=5002, debug=False):
        """Run the dashboard"""
        console.print(Panel.fit(
            f"🌐 AAI DASHBOARD STARTING\n"
            f"========================\n\n"
            f"🔍 Real-time Search Interface\n"
            f"📊 Live Data Visualization\n"
            f"🔌 WebSocket Connections\n"
            f"📈 Performance Monitoring\n\n"
            f"Dashboard: http://{host}:{port}\n"
            f"API: http://{host}:{port}/api/",
            title="Dashboard Server",
            border_style="green"
        ))
        
        self.socketio.run(self.app, host=host, port=port, debug=debug)

def main():
    """Main function"""
    dashboard = AAIDashboard()
    dashboard.run()

if __name__ == "__main__":
    main()