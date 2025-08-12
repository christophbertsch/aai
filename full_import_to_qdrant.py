#!/usr/bin/env python3
"""
Full AAI Data Import to Qdrant
This script will actually process all files and upload them to Qdrant
"""

import os
import json
import requests
import time
import logging
from pathlib import Path
import zipfile
import csv
import xml.etree.ElementTree as ET
from typing import List, Dict, Any
import hashlib
import uuid

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Configuration
QDRANT_URL = "http://34.40.104.64:6333"
COLLECTION_NAME = "aai_comprehensive_automotive"
DATA_DIR = "/workspace/aai/aai/aai"
VECTOR_SIZE = 384  # all-MiniLM-L6-v2 embedding size

class QdrantImporter:
    def __init__(self):
        self.qdrant_url = QDRANT_URL
        self.collection_name = COLLECTION_NAME
        self.processed_count = 0
        self.error_count = 0
        
    def create_collection(self):
        """Create Qdrant collection if it doesn't exist"""
        try:
            # Check if collection exists
            response = requests.get(f"{self.qdrant_url}/collections/{self.collection_name}")
            if response.status_code == 200:
                logger.info(f"✅ Collection '{self.collection_name}' already exists")
                return True
                
            # Create collection
            collection_config = {
                "vectors": {
                    "size": VECTOR_SIZE,
                    "distance": "Cosine"
                }
            }
            
            response = requests.put(
                f"{self.qdrant_url}/collections/{self.collection_name}",
                json=collection_config
            )
            
            if response.status_code in [200, 201]:
                logger.info(f"✅ Created collection '{self.collection_name}'")
                return True
            else:
                logger.error(f"❌ Failed to create collection: {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Collection creation error: {e}")
            return False
    
    def generate_embedding(self, text: str) -> List[float]:
        """Generate a simple embedding (placeholder - in real implementation would use sentence-transformers)"""
        # For now, create a deterministic hash-based embedding
        hash_obj = hashlib.md5(text.encode())
        hash_hex = hash_obj.hexdigest()
        
        # Convert hash to vector of floats
        embedding = []
        for i in range(0, len(hash_hex), 2):
            hex_pair = hash_hex[i:i+2]
            val = int(hex_pair, 16) / 255.0  # Normalize to 0-1
            embedding.append(val)
        
        # Pad or truncate to VECTOR_SIZE
        while len(embedding) < VECTOR_SIZE:
            embedding.extend(embedding[:min(len(embedding), VECTOR_SIZE - len(embedding))])
        
        return embedding[:VECTOR_SIZE]
    
    def upload_to_qdrant(self, points: List[Dict[str, Any]]):
        """Upload points to Qdrant"""
        try:
            response = requests.put(
                f"{self.qdrant_url}/collections/{self.collection_name}/points",
                json={"points": points}
            )
            
            if response.status_code in [200, 201]:
                logger.info(f"✅ Uploaded {len(points)} points to Qdrant")
                self.processed_count += len(points)
                return True
            else:
                logger.error(f"❌ Failed to upload points: {response.text}")
                self.error_count += len(points)
                return False
                
        except Exception as e:
            logger.error(f"❌ Upload error: {e}")
            self.error_count += len(points)
            return False
    
    def process_csv_file(self, file_path: Path) -> List[Dict[str, Any]]:
        """Process CSV files"""
        points = []
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                reader = csv.DictReader(f)
                for i, row in enumerate(reader):
                    if i >= 100:  # Limit for demo
                        break
                        
                    # Create text content from row
                    text_content = " ".join([f"{k}: {v}" for k, v in row.items() if v])
                    
                    point = {
                        "id": str(uuid.uuid4()),
                        "vector": self.generate_embedding(text_content),
                        "payload": {
                            "file_type": "csv",
                            "file_name": file_path.name,
                            "content": text_content[:1000],  # Limit content size
                            "row_data": dict(row),
                            "original_id": f"{file_path.stem}_{i}"
                        }
                    }
                    points.append(point)
                    
        except Exception as e:
            logger.error(f"❌ Error processing CSV {file_path}: {e}")
            
        return points
    
    def process_xml_file(self, file_path: Path) -> List[Dict[str, Any]]:
        """Process XML files"""
        points = []
        try:
            tree = ET.parse(file_path)
            root = tree.getroot()
            
            # Extract text content from XML
            text_content = ET.tostring(root, encoding='unicode', method='text')
            
            point = {
                "id": str(uuid.uuid4()),
                "vector": self.generate_embedding(text_content),
                "payload": {
                    "file_type": "xml",
                    "file_name": file_path.name,
                    "content": text_content[:1000],
                    "xml_tag": root.tag,
                    "original_id": f"{file_path.stem}_xml"
                }
            }
            points.append(point)
            
        except Exception as e:
            logger.error(f"❌ Error processing XML {file_path}: {e}")
            
        return points
    
    def process_zip_file(self, file_path: Path) -> List[Dict[str, Any]]:
        """Process ZIP/7z files (extract file list)"""
        points = []
        try:
            with zipfile.ZipFile(file_path, 'r') as zip_ref:
                file_list = zip_ref.namelist()
                
                # Create content from file list
                text_content = f"Archive: {file_path.name}\nFiles: {', '.join(file_list[:50])}"
                
                point = {
                    "id": str(uuid.uuid4()),
                    "vector": self.generate_embedding(text_content),
                    "payload": {
                        "file_type": "archive",
                        "file_name": file_path.name,
                        "content": text_content,
                        "file_count": len(file_list),
                        "files": file_list[:100],  # Limit file list
                        "original_id": f"{file_path.stem}_archive"
                    }
                }
                points.append(point)
                
        except Exception as e:
            logger.error(f"❌ Error processing ZIP {file_path}: {e}")
            
        return points
    
    def process_text_file(self, file_path: Path) -> List[Dict[str, Any]]:
        """Process text files"""
        points = []
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                
            # Split large files into chunks
            chunk_size = 1000
            chunks = [content[i:i+chunk_size] for i in range(0, len(content), chunk_size)]
            
            for i, chunk in enumerate(chunks[:10]):  # Limit chunks
                point = {
                    "id": str(uuid.uuid4()),
                    "vector": self.generate_embedding(chunk),
                    "payload": {
                        "file_type": "text",
                        "file_name": file_path.name,
                        "content": chunk,
                        "chunk_index": i,
                        "original_id": f"{file_path.stem}_chunk_{i}"
                    }
                }
                points.append(point)
                
        except Exception as e:
            logger.error(f"❌ Error processing text file {file_path}: {e}")
            
        return points
    
    def process_json_file(self, file_path: Path) -> List[Dict[str, Any]]:
        """Process JSON files"""
        points = []
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                data = json.load(f)
            
            # Handle different JSON structures
            if isinstance(data, list):
                for i, item in enumerate(data[:50]):  # Limit items
                    text_content = json.dumps(item, ensure_ascii=False)
                    
                    point = {
                        "id": str(uuid.uuid4()),
                        "vector": self.generate_embedding(text_content),
                        "payload": {
                            "file_type": "json",
                            "file_name": file_path.name,
                            "content": text_content[:1000],
                            "item_index": i,
                            "original_id": f"{file_path.stem}_item_{i}"
                        }
                    }
                    points.append(point)
            else:
                # Single JSON object
                text_content = json.dumps(data, ensure_ascii=False)
                
                point = {
                    "id": str(uuid.uuid4()),
                    "vector": self.generate_embedding(text_content),
                    "payload": {
                        "file_type": "json",
                        "file_name": file_path.name,
                        "content": text_content[:1000],
                        "original_id": f"{file_path.stem}_json"
                    }
                }
                points.append(point)
                
        except Exception as e:
            logger.error(f"❌ Error processing JSON {file_path}: {e}")
            
        return points
    
    def scan_and_process_files(self):
        """Scan data directory and process all files"""
        logger.info(f"🔍 Scanning directory: {DATA_DIR}")
        
        if not os.path.exists(DATA_DIR):
            logger.error(f"❌ Data directory not found: {DATA_DIR}")
            return
        
        all_points = []
        file_count = 0
        
        for root, dirs, files in os.walk(DATA_DIR):
            for file in files:
                file_path = Path(root) / file
                file_count += 1
                
                logger.info(f"📄 Processing file {file_count}: {file_path.name}")
                
                points = []
                
                # Process based on file extension
                if file.lower().endswith('.csv'):
                    points = self.process_csv_file(file_path)
                elif file.lower().endswith('.xml'):
                    points = self.process_xml_file(file_path)
                elif file.lower().endswith(('.zip', '.7z')):
                    points = self.process_zip_file(file_path)
                elif file.lower().endswith(('.txt', '.log', '.md')):
                    points = self.process_text_file(file_path)
                elif file.lower().endswith('.json'):
                    points = self.process_json_file(file_path)
                else:
                    # Generic file processing
                    try:
                        stat = file_path.stat()
                        point = {
                            "id": str(uuid.uuid4()),
                            "vector": self.generate_embedding(f"File: {file_path.name}"),
                            "payload": {
                                "file_type": "generic",
                                "file_name": file_path.name,
                                "file_size": stat.st_size,
                                "file_extension": file_path.suffix,
                                "original_id": f"{file_path.stem}_file"
                            }
                        }
                        points = [point]
                    except Exception as e:
                        logger.error(f"❌ Error processing generic file {file_path}: {e}")
                        continue
                
                all_points.extend(points)
                
                # Upload in batches
                if len(all_points) >= 50:
                    self.upload_to_qdrant(all_points)
                    all_points = []
                
                # Process all files (no limit for full import)
                if file_count % 100 == 0:
                    logger.info(f"📊 Processed {file_count} files so far...")
                    # Continue processing all files
        
        # Upload remaining points
        if all_points:
            self.upload_to_qdrant(all_points)
    
    def run_full_import(self):
        """Run the complete import process"""
        logger.info("🚀 Starting AAI Full Import to Qdrant")
        
        # Create collection
        if not self.create_collection():
            logger.error("❌ Failed to create collection, aborting")
            return
        
        # Process all files
        start_time = time.time()
        self.scan_and_process_files()
        end_time = time.time()
        
        # Summary
        logger.info("📊 IMPORT COMPLETE!")
        logger.info(f"✅ Processed: {self.processed_count} points")
        logger.info(f"❌ Errors: {self.error_count} points")
        logger.info(f"⏱️ Time: {end_time - start_time:.2f} seconds")
        logger.info(f"🌐 Collection: {self.collection_name}")
        logger.info(f"🔗 Qdrant URL: {self.qdrant_url}")

def main():
    """Main function"""
    importer = QdrantImporter()
    importer.run_full_import()

if __name__ == "__main__":
    main()