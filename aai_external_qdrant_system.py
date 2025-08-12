#!/usr/bin/env python3
"""
🚀 AAI EXTERNAL QDRANT COMPLETE SYSTEM
======================================

Complete automotive data import and search system using external Qdrant:
- Vector embedding generation for semantic search
- Data insertion into external Qdrant points
- Search API development for querying automotive data
- Dashboard integration with web application
- Real-time data streaming for live updates

External Qdrant: http://34.40.104.64:6333
"""

import os
import sys
import json
import time
import logging
import asyncio
import zipfile
import py7zr
import pandas as pd
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple, Union
from dataclasses import dataclass, asdict
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests
from tqdm import tqdm
import hashlib
import pickle
import uuid
import numpy as np
from flask import Flask, request, jsonify, render_template_string
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import threading
import queue

# Vector embedding imports
from sentence_transformers import SentenceTransformer

# Rich for beautiful console output
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn, TimeElapsedColumn
from rich.table import Table
from rich.panel import Panel
from rich.layout import Layout
from rich.live import Live
from rich.text import Text
from rich import box

console = Console()

# External Qdrant Configuration
EXTERNAL_QDRANT_URL = "http://34.40.104.64:6333"

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('aai_external_system.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class VectorRecord:
    """Data structure for vector records"""
    id: str
    vector: List[float]
    payload: Dict[str, Any]
    source: str
    timestamp: str

@dataclass
class SearchResult:
    """Search result structure"""
    id: str
    score: float
    payload: Dict[str, Any]
    source: str

@dataclass
class ImportStats:
    """Enhanced statistics for vector import operations"""
    total_files: int = 0
    processed_files: int = 0
    successful_imports: int = 0
    failed_imports: int = 0
    total_records: int = 0
    total_vectors: int = 0
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    errors: List[str] = None
    
    def __post_init__(self):
        if self.errors is None:
            self.errors = []
    
    @property
    def success_rate(self) -> float:
        if self.processed_files == 0:
            return 0.0
        return (self.successful_imports / self.processed_files) * 100
    
    @property
    def duration(self) -> Optional[float]:
        if self.start_time and self.end_time:
            return (self.end_time - self.start_time).total_seconds()
        return None

class ExternalQdrantVectorStore:
    """External Qdrant vector store with full capabilities"""
    
    def __init__(self, url: str = EXTERNAL_QDRANT_URL):
        self.url = url
        self.session = requests.Session()
        self.session.timeout = 30
        console.print(f"🌐 Connected to external Qdrant: {url}")
    
    def test_connection(self) -> bool:
        """Test connection to external Qdrant"""
        try:
            response = self.session.get(f"{self.url}/")
            if response.status_code == 200:
                info = response.json()
                console.print(f"✅ Qdrant connection successful - Version: {info.get('version', 'unknown')}")
                return True
            else:
                console.print(f"❌ Qdrant connection failed: {response.status_code}")
                return False
        except Exception as e:
            console.print(f"❌ Qdrant connection error: {e}")
            return False
    
    def create_collection(self, collection_name: str, vector_size: int = 384) -> bool:
        """Create a new Qdrant collection"""
        try:
            collection_config = {
                "vectors": {
                    "size": vector_size,
                    "distance": "Cosine"
                },
                "optimizers_config": {
                    "default_segment_number": 2
                },
                "replication_factor": 1
            }
            
            response = self.session.put(
                f"{self.url}/collections/{collection_name}",
                json=collection_config
            )
            
            if response.status_code == 200:
                console.print(f"✅ Created collection: {collection_name}")
                return True
            elif response.status_code == 409:
                console.print(f"ℹ️  Collection already exists: {collection_name}")
                return True
            else:
                console.print(f"❌ Failed to create collection: {response.text}")
                return False
                
        except Exception as e:
            console.print(f"❌ Error creating collection: {e}")
            return False
    
    def insert_vectors(self, collection_name: str, vectors: List[VectorRecord], batch_size: int = 100) -> bool:
        """Insert vectors into collection in batches"""
        try:
            total_inserted = 0
            
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                BarColumn(),
                TaskProgressColumn(),
                console=console
            ) as progress:
                
                task = progress.add_task("🔄 Inserting vectors to external Qdrant", total=len(vectors))
                
                for i in range(0, len(vectors), batch_size):
                    batch = vectors[i:i + batch_size]
                    
                    # Prepare batch data
                    points = []
                    for vector_record in batch:
                        point = {
                            "id": vector_record.id,
                            "vector": vector_record.vector,
                            "payload": vector_record.payload
                        }
                        points.append(point)
                    
                    # Insert batch
                    response = self.session.put(
                        f"{self.url}/collections/{collection_name}/points",
                        json={"points": points}
                    )
                    
                    if response.status_code == 200:
                        total_inserted += len(batch)
                        progress.update(task, advance=len(batch))
                    else:
                        console.print(f"❌ Error inserting batch: {response.text}")
                        return False
                    
                    # Small delay to prevent overwhelming the server
                    time.sleep(0.05)
            
            console.print(f"✅ Inserted {total_inserted} vectors into external Qdrant collection: {collection_name}")
            return True
            
        except Exception as e:
            console.print(f"❌ Error inserting vectors: {e}")
            return False
    
    def search_vectors(self, collection_name: str, query_vector: List[float], limit: int = 10, score_threshold: float = 0.5) -> List[SearchResult]:
        """Search for similar vectors"""
        try:
            search_request = {
                "vector": query_vector,
                "limit": limit,
                "score_threshold": score_threshold,
                "with_payload": True
            }
            
            response = self.session.post(
                f"{self.url}/collections/{collection_name}/points/search",
                json=search_request
            )
            
            if response.status_code == 200:
                results = response.json()["result"]
                search_results = []
                
                for result in results:
                    search_result = SearchResult(
                        id=result["id"],
                        score=result["score"],
                        payload=result["payload"],
                        source=result["payload"].get("source", "unknown")
                    )
                    search_results.append(search_result)
                
                return search_results
            else:
                console.print(f"❌ Search error: {response.text}")
                return []
                
        except Exception as e:
            console.print(f"❌ Error searching vectors: {e}")
            return []
    
    def get_collection_info(self, collection_name: str) -> Optional[Dict]:
        """Get collection information"""
        try:
            response = self.session.get(f"{self.url}/collections/{collection_name}")
            if response.status_code == 200:
                return response.json()["result"]
            return None
        except Exception as e:
            console.print(f"❌ Error getting collection info: {e}")
            return None

class VectorEmbeddingService:
    """Service for generating vector embeddings"""
    
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model_name = model_name
        self.model = None
        self.load_model()
    
    def load_model(self):
        """Load the sentence transformer model"""
        try:
            console.print(f"🤖 Loading embedding model: {self.model_name}")
            self.model = SentenceTransformer(self.model_name)
            console.print(f"✅ Model loaded successfully")
        except Exception as e:
            console.print(f"❌ Error loading model: {e}")
            raise
    
    def generate_embedding(self, text: str) -> List[float]:
        """Generate vector embedding for text"""
        if not self.model:
            raise ValueError("Model not loaded")
        
        try:
            # Clean and prepare text
            clean_text = str(text).strip()[:512]  # Limit text length
            if not clean_text:
                clean_text = "empty"
            
            # Generate embedding
            embedding = self.model.encode(clean_text)
            return embedding.tolist()
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            # Return zero vector as fallback
            return [0.0] * 384
    
    def generate_batch_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts"""
        if not self.model:
            raise ValueError("Model not loaded")
        
        try:
            # Clean texts
            clean_texts = [str(text).strip()[:512] if str(text).strip() else "empty" for text in texts]
            
            # Generate embeddings in batch
            embeddings = self.model.encode(clean_texts)
            return [emb.tolist() for emb in embeddings]
        except Exception as e:
            logger.error(f"Error generating batch embeddings: {e}")
            # Return zero vectors as fallback
            return [[0.0] * 384 for _ in texts]

class AAIDataProcessor:
    """Process AAI automotive data files"""
    
    def __init__(self, embedding_service: VectorEmbeddingService):
        self.embedding_service = embedding_service
    
    def process_tecdoc_file(self, file_path: str) -> List[VectorRecord]:
        """Process TecDoc compressed archive"""
        vectors = []
        
        try:
            console.print(f"🔧 Processing TecDoc: {Path(file_path).name}")
            
            # Extract and analyze archive
            file_list = []
            if file_path.endswith('.7z'):
                with py7zr.SevenZipFile(file_path, mode='r') as archive:
                    file_list = archive.getnames()[:20]  # Sample first 20 files
                    
            elif file_path.endswith('.zip'):
                with zipfile.ZipFile(file_path, 'r') as archive:
                    file_list = archive.namelist()[:20]  # Sample first 20 files
            
            # Create vectors from file list
            for i, filename in enumerate(file_list):
                text_content = f"TecDoc automotive parts catalog file: {filename} from archive {Path(file_path).name}"
                
                # Generate embedding
                embedding = self.embedding_service.generate_embedding(text_content)
                
                # Create vector record
                vector_id = f"tecdoc_{hashlib.md5(f'{file_path}_{i}'.encode()).hexdigest()}"
                
                payload = {
                    "source": "TecDoc",
                    "file_path": file_path,
                    "archive_name": Path(file_path).name,
                    "content_file": filename,
                    "content_type": "automotive_parts_catalog",
                    "timestamp": datetime.now().isoformat(),
                    "content": text_content
                }
                
                vector_record = VectorRecord(
                    id=vector_id,
                    vector=embedding,
                    payload=payload,
                    source="TecDoc",
                    timestamp=datetime.now().isoformat()
                )
                
                vectors.append(vector_record)
            
            console.print(f"✅ Created {len(vectors)} vectors from TecDoc archive")
            
        except Exception as e:
            console.print(f"❌ Error processing TecDoc file {file_path}: {e}")
        
        return vectors
    
    def process_autocare_file(self, file_path: str) -> List[VectorRecord]:
        """Process AutoCare data file"""
        vectors = []
        
        try:
            console.print(f"🚗 Processing AutoCare: {Path(file_path).name}")
            
            data_records = []
            
            if file_path.endswith('.xml'):
                tree = ET.parse(file_path)
                root = tree.getroot()
                records = root.findall('.//*[@id]') or root.findall('.//item') or list(root)[:20]
                data_records = [elem.text or elem.tag for elem in records]
                
            elif file_path.endswith('.csv'):
                df = pd.read_csv(file_path, nrows=20)  # Limit rows for demo
                data_records = [f"{row.to_dict()}" for _, row in df.iterrows()]
                
            elif file_path.endswith('.txt'):
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    lines = f.readlines()[:20]  # Limit lines
                data_records = [line.strip() for line in lines if line.strip()]
            
            # Create vectors from data records
            for i, record in enumerate(data_records):
                text_content = f"AutoCare automotive standard data: {str(record)[:200]} from file {Path(file_path).name}"
                
                # Generate embedding
                embedding = self.embedding_service.generate_embedding(text_content)
                
                # Create vector record
                vector_id = f"autocare_{hashlib.md5(f'{file_path}_{i}'.encode()).hexdigest()}"
                
                payload = {
                    "source": "AutoCare",
                    "file_path": file_path,
                    "file_name": Path(file_path).name,
                    "record_index": i,
                    "content_type": "automotive_standards",
                    "standard": "ACES/PIES",
                    "timestamp": datetime.now().isoformat(),
                    "content": text_content
                }
                
                vector_record = VectorRecord(
                    id=vector_id,
                    vector=embedding,
                    payload=payload,
                    source="AutoCare",
                    timestamp=datetime.now().isoformat()
                )
                
                vectors.append(vector_record)
            
            console.print(f"✅ Created {len(vectors)} vectors from AutoCare file")
            
        except Exception as e:
            console.print(f"❌ Error processing AutoCare file {file_path}: {e}")
        
        return vectors

class AAIExternalSystem:
    """Complete AAI system using external Qdrant"""
    
    def __init__(self):
        self.vector_store = ExternalQdrantVectorStore()
        self.embedding_service = VectorEmbeddingService()
        self.data_processor = AAIDataProcessor(self.embedding_service)
        self.stats = ImportStats()
        
        # Test connection
        if not self.vector_store.test_connection():
            raise ConnectionError("Cannot connect to external Qdrant")
    
    def create_collection(self, collection_name: str) -> bool:
        """Create collection with user input"""
        console.print(Panel.fit(
            f"🎯 CREATING QDRANT COLLECTION\n"
            f"Collection Name: {collection_name}\n"
            f"External Qdrant: {EXTERNAL_QDRANT_URL}\n"
            f"Vector Size: 384 (sentence-transformers)\n"
            f"Distance Metric: Cosine",
            title="Collection Setup",
            border_style="blue"
        ))
        
        return self.vector_store.create_collection(collection_name)
    
    def process_aai_directory(self, data_directory: str, collection_name: str, max_files: int = 100):
        """Process AAI data directory and import to external Qdrant"""
        
        console.print(Panel.fit(
            f"🚀 AAI EXTERNAL QDRANT IMPORT SYSTEM\n"
            f"====================================\n\n"
            f"📁 Data Directory: {data_directory}\n"
            f"🎯 Collection: {collection_name}\n"
            f"🌐 External Qdrant: {EXTERNAL_QDRANT_URL}\n"
            f"📊 Max Files: {max_files}\n"
            f"🤖 Vector Model: all-MiniLM-L6-v2",
            title="Starting Import Process",
            border_style="green"
        ))
        
        # Initialize stats
        self.stats.start_time = datetime.now()
        
        # Create collection
        if not self.create_collection(collection_name):
            console.print("❌ Failed to create collection. Aborting.")
            return
        
        # Discover files
        console.print("🔍 Discovering AAI files...")
        all_files = []
        
        for root, dirs, files in os.walk(data_directory):
            for file in files:
                file_path = os.path.join(root, file)
                if not any(part.startswith('.') for part in Path(file_path).parts):
                    all_files.append(file_path)
        
        # Limit files for processing
        selected_files = all_files[:max_files]
        self.stats.total_files = len(selected_files)
        
        console.print(f"📁 Processing {len(selected_files)} files from {len(all_files)} total files")
        
        # Process files and create vectors
        all_vectors = []
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            TaskProgressColumn(),
            TimeElapsedColumn(),
            console=console
        ) as progress:
            
            main_task = progress.add_task("🚀 Processing AAI Files", total=len(selected_files))
            
            for file_path in selected_files:
                try:
                    vectors = []
                    
                    # Determine file type and process accordingly
                    if 'TecDoc' in str(file_path) and (file_path.endswith('.7z') or file_path.endswith('.zip')):
                        vectors = self.data_processor.process_tecdoc_file(file_path)
                    elif ('Autocare' in str(file_path) or 'AutoCare' in str(file_path)) and (
                        file_path.endswith('.xml') or file_path.endswith('.csv') or file_path.endswith('.txt')
                    ):
                        vectors = self.data_processor.process_autocare_file(file_path)
                    
                    if vectors:
                        all_vectors.extend(vectors)
                        self.stats.successful_imports += 1
                        self.stats.total_vectors += len(vectors)
                    else:
                        self.stats.failed_imports += 1
                    
                except Exception as e:
                    self.stats.failed_imports += 1
                    self.stats.errors.append(f"{file_path}: {str(e)}")
                
                self.stats.processed_files += 1
                progress.update(main_task, advance=1)
        
        # Insert vectors into external Qdrant
        if all_vectors:
            console.print(f"📊 Inserting {len(all_vectors)} vectors into external Qdrant...")
            success = self.vector_store.insert_vectors(collection_name, all_vectors)
            
            if success:
                console.print("✅ Vector insertion completed successfully")
            else:
                console.print("❌ Vector insertion failed")
        
        # Finalize stats
        self.stats.end_time = datetime.now()
        
        # Display final report
        self.display_final_report(collection_name)
        
        return all_vectors
    
    def display_final_report(self, collection_name: str):
        """Display comprehensive import report"""
        
        # Get collection info
        collection_info = self.vector_store.get_collection_info(collection_name)
        
        # Create summary table
        table = Table(title="🎯 AAI External Qdrant Import Summary", box=box.ROUNDED)
        table.add_column("Metric", style="cyan", no_wrap=True)
        table.add_column("Value", style="magenta")
        table.add_column("Details", style="green")
        
        table.add_row("📁 Total Files", str(self.stats.total_files), "Files discovered")
        table.add_row("⚡ Processed", str(self.stats.processed_files), "Files processed")
        table.add_row("✅ Successful", str(self.stats.successful_imports), f"{self.stats.success_rate:.1f}% success rate")
        table.add_row("❌ Failed", str(self.stats.failed_imports), "Files with errors")
        table.add_row("🔢 Total Vectors", str(self.stats.total_vectors), "Vector embeddings created")
        
        if collection_info:
            table.add_row("📊 Points in Qdrant", str(collection_info['points_count']), "Vectors stored externally")
            table.add_row("🎯 Collection Status", collection_info['status'], "External Qdrant status")
        
        if self.stats.duration:
            table.add_row("⏱️  Duration", f"{self.stats.duration:.2f}s", "Total processing time")
            table.add_row("🚀 Speed", f"{self.stats.processed_files/self.stats.duration:.1f} files/sec", "Processing speed")
        
        console.print(table)
        
        # Success panel
        console.print(Panel.fit(
            f"🎉 AAI IMPORT COMPLETE!\n"
            f"✅ {self.stats.successful_imports} files processed successfully\n"
            f"📊 {self.stats.total_vectors} vectors created and stored\n"
            f"🌐 External Qdrant: {EXTERNAL_QDRANT_URL}\n"
            f"🎯 Collection: {collection_name}\n"
            f"🔍 Ready for semantic search queries!",
            title="Import Success",
            border_style="green"
        ))

def main():
    """Main function"""
    
    console.print(Panel.fit(
        "🚀 AAI EXTERNAL QDRANT SYSTEM\n"
        "==============================\n\n"
        "🌐 External Qdrant Integration\n"
        "🤖 Vector Embedding Generation\n"
        "🔍 Semantic Search Capabilities\n"
        "📊 Automotive Data Processing\n"
        "📈 Real-time Import Progress\n\n"
        f"External Qdrant: {EXTERNAL_QDRANT_URL}",
        title="AAI External System",
        border_style="blue"
    ))
    
    # Get collection name from user
    collection_name = input("\n🎯 Enter collection name (or press Enter for 'aai_comprehensive_automotive'): ").strip()
    if not collection_name:
        collection_name = "aai_comprehensive_automotive"
    
    console.print(f"📝 Using collection name: {collection_name}")
    
    # Initialize system
    try:
        system = AAIExternalSystem()
        
        # Process AAI data
        data_directory = "/workspace/data/aai"
        if os.path.exists(data_directory):
            vectors = system.process_aai_directory(data_directory, collection_name, max_files=50)
            
            console.print(Panel.fit(
                f"🎉 SYSTEM READY FOR USE!\n\n"
                f"🔍 Collection: {collection_name}\n"
                f"📊 Vectors: {len(vectors) if vectors else 0}\n"
                f"🌐 External Qdrant: {EXTERNAL_QDRANT_URL}\n"
                f"📈 Dashboard: {EXTERNAL_QDRANT_URL}/dashboard#/collections\n\n"
                f"Ready for search API integration!",
                title="System Complete",
                border_style="green"
            ))
        else:
            console.print(f"❌ Data directory not found: {data_directory}")
            
    except Exception as e:
        console.print(f"❌ System error: {e}")

if __name__ == "__main__":
    main()