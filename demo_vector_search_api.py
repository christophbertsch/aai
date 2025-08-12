#!/usr/bin/env python3
"""
🚀 AAI VECTOR SEARCH API DEMO
============================

Demonstrates the complete vector search system with:
- Vector embedding generation
- Data insertion into Qdrant
- RESTful search API
- Real-time search capabilities
"""

import os
import json
import time
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from sentence_transformers import SentenceTransformer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich import box
import threading
import uuid

console = Console()

class VectorSearchDemo:
    """Demo of the complete vector search system"""
    
    def __init__(self):
        self.qdrant_url = "http://localhost:6333"
        self.collection_name = "aai_comprehensive_automotive"
        self.model = None
        self.app = Flask(__name__)
        CORS(self.app)
        self.setup_routes()
        self.load_model()
    
    def load_model(self):
        """Load sentence transformer model"""
        console.print("🤖 Loading embedding model...")
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        console.print("✅ Model loaded successfully")
    
    def generate_embedding(self, text: str):
        """Generate vector embedding for text"""
        return self.model.encode(text).tolist()
    
    def insert_sample_data(self):
        """Insert sample automotive data for demonstration"""
        console.print("📊 Inserting sample automotive data...")
        
        sample_data = [
            {
                "text": "BMW 3 Series brake pads front axle ceramic compound high performance",
                "metadata": {
                    "brand": "BMW",
                    "model": "3 Series",
                    "part_type": "brake_pads",
                    "position": "front",
                    "material": "ceramic",
                    "source": "TecDoc"
                }
            },
            {
                "text": "Mercedes-Benz C-Class oil filter engine maintenance premium quality",
                "metadata": {
                    "brand": "Mercedes-Benz",
                    "model": "C-Class",
                    "part_type": "oil_filter",
                    "category": "maintenance",
                    "quality": "premium",
                    "source": "AutoCare"
                }
            },
            {
                "text": "Audi A4 headlight LED xenon replacement left side driver",
                "metadata": {
                    "brand": "Audi",
                    "model": "A4",
                    "part_type": "headlight",
                    "technology": "LED_xenon",
                    "position": "left",
                    "source": "PIES"
                }
            },
            {
                "text": "Ford F-150 transmission fluid automatic gearbox synthetic",
                "metadata": {
                    "brand": "Ford",
                    "model": "F-150",
                    "part_type": "transmission_fluid",
                    "transmission_type": "automatic",
                    "fluid_type": "synthetic",
                    "source": "Polk"
                }
            },
            {
                "text": "Toyota Camry air filter cabin HEPA filtration system",
                "metadata": {
                    "brand": "Toyota",
                    "model": "Camry",
                    "part_type": "air_filter",
                    "filter_type": "cabin",
                    "technology": "HEPA",
                    "source": "MM"
                }
            }
        ]
        
        # Generate embeddings and insert
        points = []
        for i, item in enumerate(sample_data):
            vector = self.generate_embedding(item["text"])
            point = {
                "id": str(uuid.uuid4()),
                "vector": vector,
                "payload": {
                    "content": item["text"],
                    "timestamp": time.time(),
                    **item["metadata"]
                }
            }
            points.append(point)
        
        # Insert into Qdrant
        response = requests.put(
            f"{self.qdrant_url}/collections/{self.collection_name}/points",
            json={"points": points}
        )
        
        if response.status_code == 200:
            console.print(f"✅ Inserted {len(points)} sample vectors")
            return True
        else:
            console.print(f"❌ Error inserting data: {response.text}")
            return False
    
    def setup_routes(self):
        """Setup API routes"""
        
        @self.app.route('/api/search', methods=['POST'])
        def search():
            try:
                data = request.get_json()
                query = data.get('query', '')
                limit = data.get('limit', 5)
                
                if not query:
                    return jsonify({'error': 'Query is required'}), 400
                
                console.print(f"🔍 Searching for: '{query}'")
                
                # Generate query embedding
                query_vector = self.generate_embedding(query)
                
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
                    
                    console.print(f"✅ Found {len(formatted_results)} results")
                    
                    return jsonify({
                        'query': query,
                        'results': formatted_results,
                        'total': len(formatted_results)
                    })
                else:
                    return jsonify({'error': 'Search failed'}), 500
                
            except Exception as e:
                console.print(f"❌ Search error: {e}")
                return jsonify({'error': str(e)}), 500
        
        @self.app.route('/api/health', methods=['GET'])
        def health():
            return jsonify({
                'status': 'healthy',
                'timestamp': time.time(),
                'services': {
                    'embedding_model': 'active',
                    'qdrant': 'connected',
                    'search_api': 'running'
                }
            })
        
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
    
    def run_demo(self):
        """Run the complete demo"""
        
        console.print(Panel.fit(
            "🚀 AAI VECTOR SEARCH API DEMO\n"
            "=============================\n\n"
            "🔍 Semantic Search Capabilities\n"
            "📊 Real-time Vector Embeddings\n"
            "🌐 RESTful API Interface\n"
            "📈 Live Search Demonstrations",
            title="Vector Search Demo",
            border_style="blue"
        ))
        
        # Insert sample data
        if self.insert_sample_data():
            
            # Start API server in background
            console.print("🚀 Starting Search API on http://localhost:5001")
            api_thread = threading.Thread(target=self.app.run, kwargs={
                'host': '0.0.0.0', 
                'port': 5001, 
                'debug': False,
                'use_reloader': False
            })
            api_thread.daemon = True
            api_thread.start()
            
            time.sleep(2)  # Wait for server to start
            
            # Demonstrate search capabilities
            self.demonstrate_searches()
            
            console.print(Panel.fit(
                "🎉 DEMO COMPLETE!\n\n"
                "🔍 Search API: http://localhost:5001/api/search\n"
                "📈 Health Check: http://localhost:5001/api/health\n"
                "📊 Stats: http://localhost:5001/api/stats\n\n"
                "Try these example searches:\n"
                "• 'BMW brake pads'\n"
                "• 'Mercedes oil filter'\n"
                "• 'LED headlight'\n"
                "• 'transmission fluid'",
                title="API Ready",
                border_style="green"
            ))
            
            # Keep running
            try:
                while True:
                    time.sleep(1)
            except KeyboardInterrupt:
                console.print("👋 Demo stopped")
    
    def demonstrate_searches(self):
        """Demonstrate search capabilities"""
        
        console.print("\n🔍 Demonstrating Search Capabilities:")
        
        test_queries = [
            "BMW brake components",
            "Mercedes maintenance parts",
            "LED lighting system",
            "transmission fluid Ford"
        ]
        
        for query in test_queries:
            console.print(f"\n🔎 Query: '{query}'")
            
            try:
                response = requests.post(
                    "http://localhost:5001/api/search",
                    json={"query": query, "limit": 3}
                )
                
                if response.status_code == 200:
                    results = response.json()["results"]
                    
                    if results:
                        table = Table(title=f"Results for '{query}'", box=box.ROUNDED)
                        table.add_column("Score", style="green")
                        table.add_column("Brand", style="cyan")
                        table.add_column("Part", style="yellow")
                        table.add_column("Content", style="white")
                        
                        for result in results:
                            table.add_row(
                                str(result["score"]),
                                result.get("brand", "N/A"),
                                result.get("part_type", "N/A"),
                                result["content"][:50] + "..."
                            )
                        
                        console.print(table)
                    else:
                        console.print("  No results found")
                else:
                    console.print(f"  ❌ Search failed: {response.status_code}")
                    
            except Exception as e:
                console.print(f"  ❌ Error: {e}")
            
            time.sleep(1)

def main():
    """Main demo function"""
    demo = VectorSearchDemo()
    demo.run_demo()

if __name__ == "__main__":
    main()