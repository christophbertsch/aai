#!/usr/bin/env python3
"""
Enhanced TecDoc 7z Archive Import System
Processes 922 TecDoc .7z archives with proper format parsing
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

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Configuration
DATA_DIR = "/workspace/aai/aai/aai"
QDRANT_URL = "http://34.40.104.64:6333"
COLLECTION_NAME = "aai_comprehensive_automotive"

class TecDocParser:
    """Parser for TecDoc format files"""
    
    def __init__(self):
        self.table_definitions = {
            '001': {'name': 'Header', 'key_fields': ['BrandNo', 'TableNo']},
            '200': {'name': 'Article Table', 'key_fields': ['ArtNo']},
            '203': {'name': 'Reference Numbers', 'key_fields': ['ArtNo', 'ManNo', 'RefNo']},
            '400': {'name': 'Article Linkage', 'key_fields': ['ArtNo', 'GenArtNo', 'LnkTargetType', 'LnkTargetNo']},
            '410': {'name': 'Linkage Attributes', 'key_fields': ['ArtNo', 'CritNo', 'CritVal']},
            '210': {'name': 'Article Criteria', 'key_fields': ['ArtNo', 'CritNo']},
            '211': {'name': 'Article to Generic Article', 'key_fields': ['ArtNo', 'GenArtNo']},
            '231': {'name': 'Graphics/Documents', 'key_fields': ['DocNo', 'DocType']},
            '232': {'name': 'Graphics to Articles', 'key_fields': ['ArtNo', 'DocNo']},
        }
    
    def parse_header(self, content):
        """Parse TecDoc header (table 001)"""
        if len(content) < 58:
            return None
        
        return {
            'brand_no': content[0:4].strip(),
            'table_no': content[4:7].strip(),
            'data_release': content[7:11].strip(),
            'version_date': content[11:19].strip(),
            'full': content[19:20].strip(),
            'man_no': content[20:26].strip(),
            'brand_name': content[26:46].strip(),
            'ref_data_version': content[46:50].strip(),
            'format_version': content[54:57].strip(),
        }
    
    def parse_article(self, content):
        """Parse TecDoc article record (table 200)"""
        if len(content) < 53:
            return None
            
        return {
            'art_no': content[0:22].strip(),
            'brand_no': content[22:26].strip(),
            'table_no': content[26:29].strip(),
            'term_no': content[29:38].strip(),
            'self_serv': content[38:39].strip(),
            'mat_cert': content[39:40].strip(),
            'remanufact': content[40:41].strip(),
            'accessory': content[41:42].strip(),
            'batch_size1': content[42:47].strip(),
            'batch_size2': content[47:52].strip(),
        }
    
    def parse_reference(self, content):
        """Parse TecDoc reference number (table 203)"""
        if len(content) < 71:
            return None
            
        return {
            'art_no': content[0:22].strip(),
            'brand_no': content[22:26].strip(),
            'table_no': content[26:29].strip(),
            'man_no': content[29:35].strip(),
            'country_code': content[35:38].strip(),
            'ref_no': content[38:60].strip(),
            'exclude': content[60:61].strip(),
            'sort_no': content[61:66].strip(),
            'additive': content[66:67].strip(),
            'reference_info': content[67:70].strip(),
        }
    
    def parse_linkage(self, content):
        """Parse TecDoc article linkage (table 400)"""
        if len(content) < 56:
            return None
            
        return {
            'art_no': content[0:22].strip(),
            'brand_no': content[22:26].strip(),
            'table_no': content[26:29].strip(),
            'gen_art_no': content[29:34].strip(),
            'lnk_target_type': content[34:37].strip(),
            'lnk_target_no': content[37:46].strip(),
            'seq_no': content[46:55].strip(),
        }

class EnhancedTecDocImporter:
    """Enhanced TecDoc importer with 7z support"""
    
    def __init__(self):
        self.parser = TecDocParser()
        self.processed_archives = 0
        self.total_records = 0
        self.temp_dirs = []
        
    def cleanup_temp_dirs(self):
        """Clean up temporary directories"""
        for temp_dir in self.temp_dirs:
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)
        self.temp_dirs.clear()
    
    def extract_7z_archive(self, archive_path):
        """Extract a 7z archive to temporary directory"""
        temp_dir = tempfile.mkdtemp(prefix="tecdoc_")
        self.temp_dirs.append(temp_dir)
        
        try:
            with py7zr.SevenZipFile(archive_path, mode='r') as archive:
                archive.extractall(path=temp_dir)
                return temp_dir
        except Exception as e:
            logger.error(f"Failed to extract {archive_path}: {e}")
            return None
    
    def process_tecdoc_file(self, file_path, table_type):
        """Process a single TecDoc format file"""
        records = []
        
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                for line_num, line in enumerate(f, 1):
                    line = line.rstrip('\n\r')
                    if not line:
                        continue
                    
                    try:
                        if table_type == '001':
                            record = self.parser.parse_header(line)
                        elif table_type == '200':
                            record = self.parser.parse_article(line)
                        elif table_type == '203':
                            record = self.parser.parse_reference(line)
                        elif table_type == '400':
                            record = self.parser.parse_linkage(line)
                        else:
                            # Generic parsing for other tables
                            record = {
                                'raw_content': line,
                                'table_type': table_type,
                                'line_number': line_num
                            }
                        
                        if record:
                            record['table_type'] = table_type
                            record['line_number'] = line_num
                            records.append(record)
                            
                    except Exception as e:
                        logger.warning(f"Error parsing line {line_num} in {file_path}: {e}")
                        continue
                        
        except Exception as e:
            logger.error(f"Error reading file {file_path}: {e}")
            
        return records
    
    def process_archive(self, archive_path):
        """Process a single 7z archive"""
        logger.info(f"Processing archive: {os.path.basename(archive_path)}")
        
        # Extract archive
        temp_dir = self.extract_7z_archive(archive_path)
        if not temp_dir:
            return []
        
        all_records = []
        archive_name = os.path.basename(archive_path)
        
        try:
            # Process all extracted files
            for file_name in os.listdir(temp_dir):
                file_path = os.path.join(temp_dir, file_name)
                if not os.path.isfile(file_path):
                    continue
                
                # Extract table type from filename (e.g., "200.0295" -> "200")
                table_type = file_name.split('.')[0]
                
                records = self.process_tecdoc_file(file_path, table_type)
                
                # Add archive metadata to each record
                for record in records:
                    record['archive_name'] = archive_name
                    record['file_name'] = file_name
                    record['source'] = 'TecDoc'
                    
                all_records.extend(records)
                
                if records:
                    logger.info(f"  Processed {file_name}: {len(records)} records")
            
            self.processed_archives += 1
            self.total_records += len(all_records)
            
        except Exception as e:
            logger.error(f"Error processing archive {archive_path}: {e}")
        
        return all_records
    
    def create_embeddings(self, records, batch_size=100):
        """Create embeddings for records and prepare for Qdrant"""
        points = []
        
        for i, record in enumerate(records):
            # Create content string for embedding
            content_parts = []
            
            # Add structured data
            for key, value in record.items():
                if key not in ['raw_content', 'line_number'] and value:
                    content_parts.append(f"{key}: {value}")
            
            # Add raw content if available
            if 'raw_content' in record and record['raw_content']:
                content_parts.append(f"raw: {record['raw_content']}")
            
            content = " | ".join(content_parts)
            
            # Create deterministic embedding based on content
            content_hash = hashlib.md5(content.encode()).hexdigest()
            random.seed(content_hash)
            embedding = [random.uniform(-1, 1) for _ in range(384)]
            
            # Create point for Qdrant
            point = {
                "id": f"tecdoc_{record['archive_name']}_{record.get('table_type', 'unknown')}_{i}",
                "vector": embedding,
                "payload": {
                    "content": content,
                    "source": "TecDoc",
                    "archive_name": record['archive_name'],
                    "table_type": record.get('table_type', 'unknown'),
                    "file_name": record.get('file_name', ''),
                    **{k: str(v) for k, v in record.items() if k not in ['raw_content']}
                }
            }
            points.append(point)
        
        return points
    
    def upload_to_qdrant(self, points, batch_size=100):
        """Upload points to Qdrant in batches"""
        logger.info(f"Uploading {len(points)} points to Qdrant...")
        
        for i in range(0, len(points), batch_size):
            batch = points[i:i + batch_size]
            
            try:
                response = requests.put(
                    f"{QDRANT_URL}/collections/{COLLECTION_NAME}/points",
                    json={"points": batch},
                    timeout=30
                )
                
                if response.status_code == 200:
                    logger.info(f"Uploaded batch {i//batch_size + 1}/{(len(points) + batch_size - 1)//batch_size}")
                else:
                    logger.error(f"Failed to upload batch: {response.status_code} - {response.text}")
                    
            except Exception as e:
                logger.error(f"Error uploading batch: {e}")
    
    def run_enhanced_import(self, max_archives=None):
        """Run the enhanced import process"""
        logger.info("🚀 Starting Enhanced TecDoc Import System")
        logger.info(f"📁 Data directory: {DATA_DIR}")
        logger.info(f"🗄️ Qdrant URL: {QDRANT_URL}")
        logger.info(f"📦 Collection: {COLLECTION_NAME}")
        
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
        
        all_points = []
        
        try:
            for i, archive_name in enumerate(archives, 1):
                archive_path = os.path.join(tecdoc_dir, archive_name)
                
                logger.info(f"🔄 Processing archive {i}/{len(archives)}: {archive_name}")
                
                # Process archive
                records = self.process_archive(archive_path)
                
                if records:
                    # Create embeddings
                    points = self.create_embeddings(records)
                    all_points.extend(points)
                    
                    logger.info(f"✅ Archive {archive_name}: {len(records)} records, {len(points)} points")
                else:
                    logger.warning(f"⚠️ No records extracted from {archive_name}")
                
                # Upload in batches to avoid memory issues
                if len(all_points) >= 1000:
                    self.upload_to_qdrant(all_points)
                    all_points.clear()
                
                # Progress update
                if i % 10 == 0:
                    logger.info(f"📊 Progress: {i}/{len(archives)} archives processed, {self.total_records} total records")
                
                # Cleanup temp directories periodically
                if i % 5 == 0:
                    self.cleanup_temp_dirs()
        
        except KeyboardInterrupt:
            logger.info("⏹️ Import interrupted by user")
        except Exception as e:
            logger.error(f"❌ Import failed: {e}")
        finally:
            # Upload remaining points
            if all_points:
                self.upload_to_qdrant(all_points)
            
            # Final cleanup
            self.cleanup_temp_dirs()
            
            logger.info("🎉 Enhanced TecDoc Import Complete!")
            logger.info(f"📈 Final Statistics:")
            logger.info(f"   - Archives processed: {self.processed_archives}")
            logger.info(f"   - Total records: {self.total_records}")
            logger.info(f"   - Timestamp: {datetime.now().isoformat()}")

def main():
    """Main function"""
    importer = EnhancedTecDocImporter()
    
    # Start with a smaller batch for testing
    max_archives = int(sys.argv[1]) if len(sys.argv) > 1 else 50
    
    try:
        importer.run_enhanced_import(max_archives=max_archives)
    except Exception as e:
        logger.error(f"Import failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()