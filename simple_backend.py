#!/usr/bin/env python3
"""
Simple Backend Integration for AAI Import System
Works alongside the Node.js frontend server
"""

import asyncio
import json
import logging
from pathlib import Path
from aai_import_system import AAIImportOrchestrator
from flask import Flask, request, jsonify
from flask_cors import CORS
import threading
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Global orchestrator instance
orchestrator = AAIImportOrchestrator()

@app.route('/api/collections', methods=['GET'])
def get_collections():
    """Get all Qdrant collections"""
    try:
        collections = []
        try:
            collection_info = orchestrator.qdrant_client.get_collections()
            collections = [{'name': col.name} for col in collection_info.collections]
        except Exception as e:
            logger.warning(f"Could not fetch collections from Qdrant: {e}")
        
        return jsonify({
            'result': {'collections': collections},
            'status': 'ok'
        })
    except Exception as e:
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500

@app.route('/api/search', methods=['POST'])
def search_collections():
    """Search in collections"""
    try:
        data = request.get_json()
        query = data.get('query', '')
        collection = data.get('collection', '')
        agent_type = data.get('agent', 'semantic')
        limit = data.get('limit', 20)
        
        # For demo purposes, return mock results
        # In production, this would use the actual Qdrant search
        results = [
            {
                'id': '1',
                'score': 0.95,
                'payload': {
                    'source': 'TecDoc',
                    'file_name': 'brake_components.txt',
                    'content': f'Search results for: {query}. High-quality brake components for various vehicle models including BMW, Mercedes, Audi...',
                    'fields': {
                        'part_number': 'TC-BRK-001',
                        'category': 'Brake System',
                        'compatibility': 'Universal'
                    },
                    'timestamp': '2025-08-12T04:00:00Z'
                }
            },
            {
                'id': '2',
                'score': 0.87,
                'payload': {
                    'source': 'AutoCare',
                    'file_name': 'categories.txt',
                    'content': f'AutoCare data matching: {query}. Comprehensive automotive parts catalog with detailed specifications...',
                    'fields': {
                        'category_id': 'AC-001',
                        'description': 'Automotive Parts',
                        'manufacturer': 'Various'
                    },
                    'timestamp': '2025-08-12T04:00:00Z'
                }
            }
        ]
        
        # Filter results based on query
        if query:
            filtered_results = [r for r in results if query.lower() in r['payload']['content'].lower()]
        else:
            filtered_results = results
        
        return jsonify({'results': filtered_results[:limit]})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/discover_files', methods=['POST'])
def discover_files():
    """Discover files in a folder"""
    try:
        data = request.get_json()
        folder_path = data.get('folderPath', '/workspace/data/aai')
        
        files = orchestrator.discover_files(folder_path)
        
        file_list = []
        for file_path in files:
            agent = orchestrator.route_file_to_agent(file_path)
            file_info = {
                'path': str(file_path),
                'name': file_path.name,
                'size': file_path.stat().st_size,
                'agent': agent.name if agent else 'Unknown',
                'extension': file_path.suffix
            }
            file_list.append(file_info)
        
        return jsonify({'files': file_list})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analytics', methods=['GET'])
def get_analytics():
    """Get analytics data"""
    try:
        # Mock analytics data
        analytics = {
            'overview': {
                'totalRecords': 1250000,
                'totalCollections': 2,
                'successfulImports': 5,
                'failedImports': 0
            },
            'activeImports': 0,
            'systemStatus': 'healthy'
        }
        
        return jsonify(analytics)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    logger.info("🚀 Starting Simple AAI Backend on port 5000")
    app.run(host='0.0.0.0', port=5000, debug=False)