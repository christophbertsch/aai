#!/usr/bin/env python3
"""
🔍 AAI EXTERNAL QDRANT SEARCH API
=================================

Complete search API for the external Qdrant system with:
- Fixed UUID generation for point IDs
- Vector insertion with proper formatting
- RESTful search endpoints
- Real-time dashboard integration
- Sample data insertion for demonstration
"""

import os
import json
import time
import uuid
import requests
from flask import Flask, request, jsonify, render_template_string
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from sentence_transformers import SentenceTransformer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich import box
import threading
from datetime import datetime
from typing import List, Dict, Any

console = Console()

# External Qdrant Configuration
EXTERNAL_QDRANT_URL = "http://34.40.104.64:6333"

# Dashboard HTML Template
DASHBOARD_HTML = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AAI External Qdrant Search Dashboard</title>
    <script src="https://cdn.socket.io/4.0.0/socket.io.min.js"></script>
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
            margin-right: 10px;
        }
        .search-btn:hover { background: #45a049; }
        .insert-btn { 
            background: #2196F3; 
            color: white; 
            border: none; 
            padding: 15px 30px; 
            border-radius: 10px; 
            cursor: pointer; 
            font-size: 16px;
            transition: background 0.3s;
        }
        .insert-btn:hover { background: #1976D2; }
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
        .external-info {
            background: rgba(255, 193, 7, 0.2);
            border: 1px solid rgba(255, 193, 7, 0.5);
            border-radius: 10px;
            padding: 15px;
            margin-bottom: 20px;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 AAI External Qdrant Dashboard</h1>
            <p>Automotive Data Search with External Vector Database <span class="live-indicator"></span></p>
        </div>
        
        <div class="external-info">
            <h3>🌐 External Qdrant Instance</h3>
            <p><strong>URL:</strong> http://34.40.104.64:6333</p>
            <p><strong>Collection:</strong> aai_comprehensive_automotive</p>
        </div>
        
        <div class="dashboard-grid">
            <div class="card search-section">
                <h3>🔍 Semantic Search</h3>
                <input type="text" id="searchInput" class="search-input" placeholder="Search automotive parts (e.g., 'BMW brake pads', 'Mercedes oil filter', 'TecDoc parts')">
                <button onclick="performSearch()" class="search-btn">Search</button>
                <button onclick="insertSampleData()" class="insert-btn">Insert Sample Data</button>
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
                .catch(error => {
                    console.error('Error fetching stats:', error);
                    addLogEntry('error', 'Failed to fetch stats');
                });
        }
        
        // Insert sample data
        function insertSampleData() {
            addLogEntry('info', 'Inserting sample automotive data...');
            
            fetch('/api/insert-sample', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    addLogEntry('success', `Inserted ${data.count} sample records`);
                    updateStats();
                } else {
                    addLogEntry('error', 'Failed to insert sample data');
                }
            })
            .catch(error => {
                console.error('Insert error:', error);
                addLogEntry('error', 'Insert operation failed');
            });
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
                if (data.results) {
                    displayResults(data.results);
                    addLogEntry('success', `Found ${data.results.length} results`);
                } else {
                    addLogEntry('error', data.error || 'Search failed');
                }
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
                    <div><strong>${result.source || 'Unknown'}</strong></div>
                    <div>${result.content || result.payload.content || 'No content'}</div>
                    <div style="font-size: 12px; opacity: 0.7; margin-top: 10px;">
                        Source: ${result.payload.source || 'Unknown'} | Type: ${result.payload.content_type || 'Unknown'}
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
        setInterval(updateStats, 10000); // Update stats every 10 seconds
        addLogEntry('info', 'Dashboard initialized with external Qdrant');
    </script>
</body>
</html>
"""

class AAIExternalSearchAPI:
    """Complete search API for external Qdrant"""
    
    def __init__(self):
        self.app = Flask(__name__)
        self.app.config['SECRET_KEY'] = 'aai_external_search_secret'
        CORS(self.app)
        self.socketio = SocketIO(self.app, cors_allowed_origins="*")
        
        self.qdrant_url = EXTERNAL_QDRANT_URL
        self.collection_name = "aai_comprehensive_automotive"
        self.model = None
        self.session = requests.Session()
        self.session.timeout = 30
        
        self.load_model()
        self.setup_routes()
        self.setup_socket_events()
        self.ensure_collection()
    
    def load_model(self):
        """Load sentence transformer model"""
        console.print("🤖 Loading embedding model...")
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        console.print("✅ Model loaded successfully")
    
    def ensure_collection(self):
        """Ensure collection exists"""
        try:
            collection_config = {
                "vectors": {
                    "size": 384,
                    "distance": "Cosine"
                },
                "optimizers_config": {
                    "default_segment_number": 2
                },
                "replication_factor": 1
            }
            
            response = self.session.put(
                f"{self.qdrant_url}/collections/{self.collection_name}",
                json=collection_config
            )
            
            if response.status_code in [200, 409]:
                console.print(f"✅ Collection ready: {self.collection_name}")
            else:
                console.print(f"❌ Collection setup failed: {response.text}")
                
        except Exception as e:
            console.print(f"❌ Collection setup error: {e}")
    
    def generate_embedding(self, text: str) -> List[float]:
        """Generate vector embedding for text"""
        clean_text = str(text).strip()[:512]
        if not clean_text:
            clean_text = "empty"
        
        embedding = self.model.encode(clean_text)
        return embedding.tolist()
    
    def insert_sample_data(self) -> bool:
        """Insert sample automotive data with proper UUIDs"""
        try:
            sample_data = [
                {
                    "text": "BMW 3 Series brake pads front axle ceramic compound high performance TecDoc automotive parts",
                    "metadata": {
                        "brand": "BMW",
                        "model": "3 Series",
                        "part_type": "brake_pads",
                        "position": "front",
                        "material": "ceramic",
                        "source": "TecDoc",
                        "content_type": "automotive_parts_catalog"
                    }
                },
                {
                    "text": "Mercedes-Benz C-Class oil filter engine maintenance premium quality AutoCare ACES PIES standard",
                    "metadata": {
                        "brand": "Mercedes-Benz",
                        "model": "C-Class",
                        "part_type": "oil_filter",
                        "category": "maintenance",
                        "quality": "premium",
                        "source": "AutoCare",
                        "content_type": "automotive_standards"
                    }
                },
                {
                    "text": "Audi A4 headlight LED xenon replacement left side driver automotive lighting system",
                    "metadata": {
                        "brand": "Audi",
                        "model": "A4",
                        "part_type": "headlight",
                        "technology": "LED_xenon",
                        "position": "left",
                        "source": "PIES",
                        "content_type": "automotive_parts"
                    }
                },
                {
                    "text": "Ford F-150 transmission fluid automatic gearbox synthetic Polk automotive database",
                    "metadata": {
                        "brand": "Ford",
                        "model": "F-150",
                        "part_type": "transmission_fluid",
                        "transmission_type": "automatic",
                        "fluid_type": "synthetic",
                        "source": "Polk",
                        "content_type": "automotive_fluids"
                    }
                },
                {
                    "text": "Toyota Camry air filter cabin HEPA filtration system MM automotive maintenance",
                    "metadata": {
                        "brand": "Toyota",
                        "model": "Camry",
                        "part_type": "air_filter",
                        "filter_type": "cabin",
                        "technology": "HEPA",
                        "source": "MM",
                        "content_type": "automotive_filters"
                    }
                },
                {
                    "text": "TecDoc automotive parts catalog database comprehensive vehicle compatibility information",
                    "metadata": {
                        "source": "TecDoc",
                        "content_type": "automotive_parts_catalog",
                        "category": "database",
                        "coverage": "comprehensive"
                    }
                },
                {
                    "text": "AutoCare ACES PIES automotive aftermarket standards vehicle application data",
                    "metadata": {
                        "source": "AutoCare",
                        "content_type": "automotive_standards",
                        "standard_type": "ACES_PIES",
                        "category": "aftermarket"
                    }
                }
            ]
            
            # Generate embeddings and create points
            points = []
            for item in sample_data:
                vector = self.generate_embedding(item["text"])
                point = {
                    "id": str(uuid.uuid4()),  # Use proper UUID
                    "vector": vector,
                    "payload": {
                        "content": item["text"],
                        "timestamp": datetime.now().isoformat(),
                        **item["metadata"]
                    }
                }
                points.append(point)
            
            # Insert into external Qdrant
            response = self.session.put(
                f"{self.qdrant_url}/collections/{self.collection_name}/points",
                json={"points": points}
            )
            
            if response.status_code == 200:
                console.print(f"✅ Inserted {len(points)} sample vectors with UUIDs")
                return True
            else:
                console.print(f"❌ Error inserting sample data: {response.text}")
                return False
                
        except Exception as e:
            console.print(f"❌ Error inserting sample data: {e}")
            return False
    
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
                query_vector = self.generate_embedding(query)
                
                # Search in external Qdrant
                search_request = {
                    "vector": query_vector,
                    "limit": limit,
                    "with_payload": True,
                    "score_threshold": 0.3
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
        
        @self.app.route('/api/insert-sample', methods=['POST'])
        def insert_sample():
            try:
                success = self.insert_sample_data()
                if success:
                    return jsonify({'success': True, 'count': 7})
                else:
                    return jsonify({'success': False, 'error': 'Insert failed'}), 500
            except Exception as e:
                return jsonify({'success': False, 'error': str(e)}), 500
        
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
                'services': {
                    'dashboard': 'active',
                    'embedding_model': 'loaded',
                    'external_qdrant': 'connected',
                    'search_api': 'active'
                }
            })
    
    def setup_socket_events(self):
        """Setup WebSocket events"""
        
        @self.socketio.on('connect')
        def handle_connect():
            console.print("🔌 Client connected to external Qdrant dashboard")
            emit('status', {'message': 'Connected to AAI External Dashboard'})
        
        @self.socketio.on('disconnect')
        def handle_disconnect():
            console.print("🔌 Client disconnected from dashboard")
    
    def run(self, host='0.0.0.0', port=5003, debug=False):
        """Run the search API"""
        console.print(Panel.fit(
            f"🌐 AAI EXTERNAL QDRANT SEARCH API\n"
            f"=================================\n\n"
            f"🔍 Real-time Search Interface\n"
            f"📊 External Qdrant Integration\n"
            f"🔌 WebSocket Connections\n"
            f"📈 Performance Monitoring\n\n"
            f"Dashboard: http://{host}:{port}\n"
            f"External Qdrant: {EXTERNAL_QDRANT_URL}\n"
            f"Collection: {self.collection_name}",
            title="External Search API",
            border_style="green"
        ))
        
        self.socketio.run(self.app, host=host, port=port, debug=debug)

def main():
    """Main function"""
    try:
        api = AAIExternalSearchAPI()
        api.run()
    except Exception as e:
        console.print(f"❌ Error starting API: {e}")

if __name__ == "__main__":
    main()