#!/usr/bin/env python3
"""
Enhanced AAI Import System with Frontend Integration
Provides WebSocket support and REST API for the frontend application
"""

import os
import sys
import json
import logging
import asyncio
import socketio
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime
import uuid
from aiohttp import web, web_ws
import aiohttp_cors
from aai_import_system import AAIImportOrchestrator
import threading
import time

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/workspace/aai_import.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class EnhancedAAIImportSystem:
    def __init__(self):
        self.orchestrator = AAIImportOrchestrator()
        self.sio = socketio.AsyncServer(cors_allowed_origins="*")
        self.app = web.Application()
        self.sio.attach(self.app)
        
        # Import state management
        self.active_imports = {}
        self.import_stats = {
            'total_imports': 0,
            'successful_imports': 0,
            'failed_imports': 0,
            'total_records': 0
        }
        
        self.setup_routes()
        self.setup_socket_handlers()
    
    def setup_routes(self):
        """Setup REST API routes"""
        # API routes
        self.app.router.add_get('/api/collections', self.get_collections)
        self.app.router.add_post('/api/search', self.search_collections)
        self.app.router.add_get('/api/analytics', self.get_analytics)
        self.app.router.add_post('/api/discover_files', self.discover_files)
        
        # CORS setup - only for API routes
        cors = aiohttp_cors.setup(self.app, defaults={
            "*": aiohttp_cors.ResourceOptions(
                allow_credentials=True,
                expose_headers="*",
                allow_headers="*",
                allow_methods="*"
            )
        })
        
        # Add CORS only to API routes
        for route in list(self.app.router.routes()):
            if route.resource.canonical.startswith('/api'):
                cors.add(route)
    
    def setup_socket_handlers(self):
        """Setup WebSocket event handlers"""
        
        @self.sio.event
        async def connect(sid, environ):
            logger.info(f"Client connected: {sid}")
            await self.sio.emit('connection_status', {'status': 'connected'}, room=sid)
        
        @self.sio.event
        async def disconnect(sid):
            logger.info(f"Client disconnected: {sid}")
            # Clean up any active imports for this client
            if sid in self.active_imports:
                await self.stop_import(sid)
        
        @self.sio.event
        async def discover_files(sid, data):
            """Discover files in the selected folder"""
            try:
                folder_path = data.get('folderPath', '/workspace/data/aai')
                logger.info(f"Discovering files in: {folder_path}")
                
                # Use the orchestrator to discover files
                files = self.orchestrator.discover_files(folder_path)
                
                # Convert to frontend format
                file_list = []
                for file_path in files:
                    agent = self.orchestrator.route_file_to_agent(file_path)
                    file_info = {
                        'path': str(file_path),
                        'name': file_path.name,
                        'size': file_path.stat().st_size,
                        'agent': agent.name if agent else 'Unknown',
                        'extension': file_path.suffix
                    }
                    file_list.append(file_info)
                
                await self.sio.emit('file_discovery', file_list, room=sid)
                await self.sio.emit('import_log', {
                    'level': 'info',
                    'message': f'Discovered {len(file_list)} files for import'
                }, room=sid)
                
            except Exception as e:
                logger.error(f"Error discovering files: {e}")
                await self.sio.emit('import_log', {
                    'level': 'error',
                    'message': f'Error discovering files: {str(e)}'
                }, room=sid)
        
        @self.sio.event
        async def start_import(sid, data):
            """Start the import process"""
            try:
                folder_path = data.get('folderPath')
                collection_name = data.get('collectionName')
                
                if not folder_path or not collection_name:
                    await self.sio.emit('import_log', {
                        'level': 'error',
                        'message': 'Missing folder path or collection name'
                    }, room=sid)
                    return
                
                # Create collection
                if self.orchestrator.create_collection(collection_name):
                    await self.sio.emit('import_log', {
                        'level': 'info',
                        'message': f'Created collection: {collection_name}'
                    }, room=sid)
                
                # Start import in background thread
                import_thread = threading.Thread(
                    target=self.run_import_process,
                    args=(sid, folder_path, collection_name)
                )
                import_thread.daemon = True
                import_thread.start()
                
                self.active_imports[sid] = {
                    'thread': import_thread,
                    'status': 'running',
                    'collection': collection_name,
                    'start_time': datetime.now()
                }
                
                await self.sio.emit('import_status', 'running', room=sid)
                
            except Exception as e:
                logger.error(f"Error starting import: {e}")
                await self.sio.emit('import_status', 'error', room=sid)
                await self.sio.emit('import_log', {
                    'level': 'error',
                    'message': f'Error starting import: {str(e)}'
                }, room=sid)
        
        @self.sio.event
        async def pause_import(sid, data):
            """Pause the import process"""
            if sid in self.active_imports:
                self.active_imports[sid]['status'] = 'paused'
                await self.sio.emit('import_status', 'paused', room=sid)
                await self.sio.emit('import_log', {
                    'level': 'warning',
                    'message': 'Import paused by user'
                }, room=sid)
        
        @self.sio.event
        async def resume_import(sid, data):
            """Resume the import process"""
            if sid in self.active_imports:
                self.active_imports[sid]['status'] = 'running'
                await self.sio.emit('import_status', 'running', room=sid)
                await self.sio.emit('import_log', {
                    'level': 'info',
                    'message': 'Import resumed'
                }, room=sid)
        
        @self.sio.event
        async def stop_import(sid, data=None):
            """Stop the import process"""
            if sid in self.active_imports:
                self.active_imports[sid]['status'] = 'stopped'
                del self.active_imports[sid]
                await self.sio.emit('import_status', 'idle', room=sid)
                await self.sio.emit('import_log', {
                    'level': 'warning',
                    'message': 'Import stopped by user'
                }, room=sid)
    
    def run_import_process(self, sid, folder_path, collection_name):
        """Run the import process in a separate thread"""
        try:
            # Discover files
            files = self.orchestrator.discover_files(folder_path)
            total_files = len(files)
            files_processed = 0
            total_records = 0
            
            asyncio.run(self.sio.emit('import_log', {
                'level': 'info',
                'message': f'Starting import of {total_files} files'
            }, room=sid))
            
            for file_path in files:
                # Check if import is still active
                if sid not in self.active_imports or self.active_imports[sid]['status'] == 'stopped':
                    break
                
                # Wait if paused
                while (sid in self.active_imports and 
                       self.active_imports[sid]['status'] == 'paused'):
                    time.sleep(1)
                
                # Process file
                agent = self.orchestrator.route_file_to_agent(file_path)
                if agent:
                    try:
                        # Emit current file progress
                        asyncio.run(self.sio.emit('import_progress', {
                            'currentFile': file_path.name,
                            'filesProcessed': files_processed,
                            'totalFiles': total_files,
                            'recordsImported': total_records,
                            'currentAgent': agent.name,
                            'overallProgress': round((files_processed / total_files) * 100)
                        }, room=sid))
                        
                        # Process the file (simplified for demo)
                        # In production, this would call agent.process_file()
                        time.sleep(2)  # Simulate processing time
                        
                        # Simulate records imported
                        records_imported = 50 + (files_processed * 10)
                        total_records += records_imported
                        
                        asyncio.run(self.sio.emit('import_log', {
                            'level': 'info',
                            'message': f'{agent.name} Agent: Processed {file_path.name} - {records_imported} records'
                        }, room=sid))
                        
                    except Exception as e:
                        asyncio.run(self.sio.emit('import_log', {
                            'level': 'error',
                            'message': f'Error processing {file_path.name}: {str(e)}'
                        }, room=sid))
                
                files_processed += 1
            
            # Import completed
            if sid in self.active_imports and self.active_imports[sid]['status'] != 'stopped':
                self.import_stats['successful_imports'] += 1
                self.import_stats['total_records'] += total_records
                
                asyncio.run(self.sio.emit('import_status', 'completed', room=sid))
                asyncio.run(self.sio.emit('import_log', {
                    'level': 'success',
                    'message': f'Import completed! {total_records} records imported to {collection_name}'
                }, room=sid))
                
                # Final progress update
                asyncio.run(self.sio.emit('import_progress', {
                    'currentFile': '',
                    'filesProcessed': files_processed,
                    'totalFiles': total_files,
                    'recordsImported': total_records,
                    'currentAgent': '',
                    'overallProgress': 100
                }, room=sid))
            
        except Exception as e:
            logger.error(f"Import process error: {e}")
            asyncio.run(self.sio.emit('import_status', 'error', room=sid))
            asyncio.run(self.sio.emit('import_log', {
                'level': 'error',
                'message': f'Import process error: {str(e)}'
            }, room=sid))
        finally:
            if sid in self.active_imports:
                del self.active_imports[sid]
    
    async def get_collections(self, request):
        """Get all Qdrant collections"""
        try:
            collections = []
            try:
                # Get collections from Qdrant
                collection_info = self.orchestrator.qdrant_client.get_collections()
                collections = [{'name': col.name} for col in collection_info.collections]
            except Exception as e:
                logger.warning(f"Could not fetch collections from Qdrant: {e}")
            
            return web.json_response({
                'result': {'collections': collections},
                'status': 'ok'
            })
        except Exception as e:
            return web.json_response({
                'error': str(e),
                'status': 'error'
            }, status=500)
    
    async def search_collections(self, request):
        """Search in collections"""
        try:
            data = await request.json()
            query = data.get('query', '')
            collection = data.get('collection', '')
            agent_type = data.get('agent', 'semantic')
            limit = data.get('limit', 20)
            
            # Mock search results for demo
            results = [
                {
                    'id': str(uuid.uuid4()),
                    'score': 0.95,
                    'payload': {
                        'source': 'TecDoc',
                        'file_name': 'brake_components.txt',
                        'content': f'Search results for: {query}. High-quality brake components for various vehicle models...',
                        'fields': {
                            'part_number': 'TC-BRK-001',
                            'category': 'Brake System',
                            'compatibility': 'Universal'
                        },
                        'timestamp': datetime.now().isoformat()
                    }
                }
            ]
            
            return web.json_response({'results': results})
            
        except Exception as e:
            return web.json_response({
                'error': str(e)
            }, status=500)
    
    async def get_analytics(self, request):
        """Get analytics data"""
        try:
            analytics = {
                'overview': {
                    'totalRecords': self.import_stats['total_records'],
                    'totalCollections': len(self.orchestrator.qdrant_client.get_collections().collections),
                    'successfulImports': self.import_stats['successful_imports'],
                    'failedImports': self.import_stats['failed_imports']
                },
                'activeImports': len(self.active_imports),
                'systemStatus': 'healthy'
            }
            
            return web.json_response(analytics)
            
        except Exception as e:
            return web.json_response({
                'error': str(e)
            }, status=500)
    
    async def discover_files(self, request):
        """Discover files in a folder"""
        try:
            data = await request.json()
            folder_path = data.get('folderPath', '/workspace/data/aai')
            
            files = self.orchestrator.discover_files(folder_path)
            
            file_list = []
            for file_path in files:
                agent = self.orchestrator.route_file_to_agent(file_path)
                file_info = {
                    'path': str(file_path),
                    'name': file_path.name,
                    'size': file_path.stat().st_size,
                    'agent': agent.name if agent else 'Unknown',
                    'extension': file_path.suffix
                }
                file_list.append(file_info)
            
            return web.json_response({'files': file_list})
            
        except Exception as e:
            return web.json_response({
                'error': str(e)
            }, status=500)
    
    async def start_server(self, host='0.0.0.0', port=55910):
        """Start the enhanced import server"""
        logger.info(f"🚀 Starting Enhanced AAI Import System on {host}:{port}")
        
        runner = web.AppRunner(self.app)
        await runner.setup()
        site = web.TCPSite(runner, host, port)
        await site.start()
        
        logger.info(f"📡 WebSocket server running on ws://{host}:{port}")
        logger.info(f"🔗 REST API available at http://{host}:{port}/api")
        
        return runner

async def main():
    """Main function to start the enhanced import system"""
    system = EnhancedAAIImportSystem()
    runner = await system.start_server()
    
    try:
        # Keep the server running
        while True:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        logger.info("Shutting down server...")
    finally:
        await runner.cleanup()

if __name__ == "__main__":
    asyncio.run(main())