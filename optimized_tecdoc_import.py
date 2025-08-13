#!/usr/bin/env python3
"""
Optimized TecDoc 7z Archive Import System
Memory-efficient processing of TecDoc archives
"""

import os
import sys
import py7zr
import tempfile
import shutil
import logging
from datetime import datetime
import requests
import json
import hashlib
import random
from pathlib import Path
import gc
import uuid

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Configuration
DATA_DIR = "/workspace/aai/aai/aai"
QDRANT_URL = "http://34.40.104.64:6333"
COLLECTION_NAME = "aai_comprehensive_automotive"

class OptimizedTecDocImporter:
    """Memory-optimized TecDoc importer"""
    
    def __init__(self):
        self.processed_archives = 0
        self.total_records = 0
        self.batch_size = 50  # Smaller batches
        
    def extract_and_process_archive(self, archive_path):
        """Extract and immediately process archive to minimize memory usage"""
        logger.info(f"Processing: {os.path.basename(archive_path)}")
        
        temp_dir = tempfile.mkdtemp(prefix="tecdoc_")
        points_uploaded = 0
        
        try:
            # Extract archive
            with py7zr.SevenZipFile(archive_path, mode='r') as archive:
                archive.extractall(path=temp_dir)
            
            archive_name = os.path.basename(archive_path)
            
            # Process files one by one to minimize memory usage
            for file_name in os.listdir(temp_dir):
                file_path = os.path.join(temp_dir, file_name)
                if not os.path.isfile(file_path):
                    continue
                
                table_type = file_name.split('.')[0]
                points_count = self.process_file_streaming(file_path, table_type, archive_name, file_name)
                
                if points_count > 0:
                    points_uploaded += points_count
                    logger.info(f"  {file_name}: {points_count} points uploaded")
                
                # Force garbage collection
                gc.collect()
            
            self.processed_archives += 1
            self.total_records += points_uploaded
            
        except Exception as e:
            logger.error(f"Error processing {archive_path}: {e}")
        finally:
            # Cleanup
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)
        
        return points_uploaded
    
    def process_file_streaming(self, file_path, table_type, archive_name, file_name):
        """Process file in streaming fashion with immediate upload"""
        points_batch = []
        total_uploaded = 0
        
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                for line_num, line in enumerate(f, 1):
                    line = line.rstrip('\n\r')
                    if not line:
                        continue
                    
                    # Create point directly
                    point = self.create_point_from_line(
                        line, table_type, archive_name, file_name, line_num
                    )
                    
                    if point:
                        points_batch.append(point)
                    
                    # Upload when batch is full
                    if len(points_batch) >= self.batch_size:
                        if self.upload_batch(points_batch):
                            total_uploaded += len(points_batch)
                        points_batch.clear()
                        gc.collect()  # Force garbage collection
                
                # Upload remaining points
                if points_batch:
                    if self.upload_batch(points_batch):
                        total_uploaded += len(points_batch)
                    points_batch.clear()
                    
        except Exception as e:
            logger.error(f"Error processing file {file_path}: {e}")
        
        return total_uploaded
    
    def create_point_from_line(self, line, table_type, archive_name, file_name, line_num):
        """Create a single point from a line of data"""
        try:
            # Parse based on table type
            parsed_data = self.parse_line(line, table_type)
            
            # Create content for embedding
            content_parts = [f"table: {table_type}"]
            
            if parsed_data:
                for key, value in parsed_data.items():
                    if value and value.strip():
                        content_parts.append(f"{key}: {value}")
            else:
                content_parts.append(f"raw: {line[:100]}")  # Truncate long lines
            
            content = " | ".join(content_parts)
            
            # Create deterministic embedding
            content_hash = hashlib.md5(content.encode()).hexdigest()
            random.seed(content_hash)
            embedding = [random.uniform(-1, 1) for _ in range(384)]
            
            # Create UUID from content hash for deterministic but valid ID
            content_hash = hashlib.md5(f"{archive_name}_{table_type}_{line_num}_{content}".encode()).hexdigest()
            point_id = str(uuid.UUID(content_hash))
            
            payload = {
                "content": content,
                "source": "TecDoc",
                "archive_name": archive_name,
                "table_type": table_type,
                "file_name": file_name,
                "line_number": line_num
            }
            
            # Add parsed data to payload
            if parsed_data:
                for key, value in parsed_data.items():
                    if value and value.strip():
                        payload[key] = str(value).strip()
            
            return {
                "id": point_id,
                "vector": embedding,
                "payload": payload
            }
            
        except Exception as e:
            logger.warning(f"Error creating point from line {line_num}: {e}")
            return None
    
    def parse_line(self, line, table_type):
        """Parse a line based on table type"""
        try:
            if table_type == '200':  # Article Table
                if len(line) >= 53:
                    return {
                        'art_no': line[0:22].strip(),
                        'brand_no': line[22:26].strip(),
                        'term_no': line[29:38].strip(),
                    }
            elif table_type == '203':  # Reference Numbers
                if len(line) >= 60:
                    return {
                        'art_no': line[0:22].strip(),
                        'man_no': line[29:35].strip(),
                        'ref_no': line[38:60].strip(),
                    }
            elif table_type == '400':  # Article Linkage
                if len(line) >= 46:
                    return {
                        'art_no': line[0:22].strip(),
                        'gen_art_no': line[29:34].strip(),
                        'lnk_target_type': line[34:37].strip(),
                        'lnk_target_no': line[37:46].strip(),
                    }
            elif table_type == '410':  # Linkage Attributes
                if len(line) >= 62:
                    return {
                        'art_no': line[0:22].strip(),
                        'crit_no': line[58:62].strip(),
                        'crit_val': line[62:82].strip() if len(line) > 62 else '',
                    }
            
            # For other tables, just return basic info
            return {
                'content_preview': line[:50].strip()
            }
            
        except Exception as e:
            logger.warning(f"Error parsing line for table {table_type}: {e}")
            return None
    
    def upload_batch(self, points):
        """Upload a batch of points to Qdrant"""
        try:
            response = requests.put(
                f"{QDRANT_URL}/collections/{COLLECTION_NAME}/points",
                json={"points": points},
                timeout=30
            )
            
            if response.status_code == 200:
                return True
            else:
                logger.error(f"Upload failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Error uploading batch: {e}")
            return False
    
    def run_optimized_import(self, max_archives=None):
        """Run the optimized import process"""
        logger.info("🚀 Starting Optimized TecDoc Import System")
        logger.info(f"📁 Data directory: {DATA_DIR}")
        logger.info(f"🗄️ Qdrant URL: {QDRANT_URL}")
        logger.info(f"📦 Collection: {COLLECTION_NAME}")
        logger.info(f"⚡ Batch size: {self.batch_size}")
        
        # Find all 7z archives
        tecdoc_dir = os.path.join(DATA_DIR, "TecDoc")
        if not os.path.exists(tecdoc_dir):
            logger.error(f"TecDoc directory not found: {tecdoc_dir}")
            return
        
        archives = [f for f in os.listdir(tecdoc_dir) if f.endswith('.7z')]
        archives.sort()
        
        if max_archives:
            archives = archives[:max_archives]
        
        logger.info(f"📋 Found {len(archives)} TecDoc archives to process")
        
        try:
            for i, archive_name in enumerate(archives, 1):
                archive_path = os.path.join(tecdoc_dir, archive_name)
                
                logger.info(f"🔄 Processing archive {i}/{len(archives)}: {archive_name}")
                
                # Process archive with streaming
                points_uploaded = self.extract_and_process_archive(archive_path)
                
                logger.info(f"✅ {archive_name}: {points_uploaded} points uploaded")
                
                # Progress update
                if i % 5 == 0:
                    logger.info(f"📊 Progress: {i}/{len(archives)} archives, {self.total_records} total points")
                
                # Force garbage collection
                gc.collect()
        
        except KeyboardInterrupt:
            logger.info("⏹️ Import interrupted by user")
        except Exception as e:
            logger.error(f"❌ Import failed: {e}")
        finally:
            logger.info("🎉 Optimized TecDoc Import Complete!")
            logger.info(f"📈 Final Statistics:")
            logger.info(f"   - Archives processed: {self.processed_archives}")
            logger.info(f"   - Total points uploaded: {self.total_records}")
            logger.info(f"   - Timestamp: {datetime.now().isoformat()}")

def main():
    """Main function"""
    importer = OptimizedTecDocImporter()
    
    # Start with a smaller batch for testing
    max_archives = int(sys.argv[1]) if len(sys.argv) > 1 else 10
    
    try:
        importer.run_optimized_import(max_archives=max_archives)
    except Exception as e:
        logger.error(f"Import failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()