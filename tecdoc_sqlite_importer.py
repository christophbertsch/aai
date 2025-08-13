#!/usr/bin/env python3
"""
TecDoc SQLite Import System
Local development version using SQLite for testing TecDoc import
"""

import os
import sys
import py7zr
import tempfile
import shutil
import logging
import sqlite3
from datetime import datetime
import uuid
from pathlib import Path
import gc

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Configuration
TECDOC_DIR = "/workspace/aai/aai/aai/TecDoc"
SQLITE_DB = "/workspace/aai/tecdoc_data.db"

class TecDocSQLiteImporter:
    """TecDoc SQLite Importer for local development and testing"""
    
    def __init__(self, db_path):
        self.db_path = db_path
        self.conn = None
        self.processed_archives = 0
        self.total_records = 0
        
        # TecDoc table definitions
        self.table_schemas = {
            'tecdoc_headers': '''
                CREATE TABLE IF NOT EXISTS tecdoc_headers (
                    id TEXT PRIMARY KEY,
                    archive_name TEXT NOT NULL,
                    file_name TEXT NOT NULL,
                    line_number INTEGER NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    raw_content TEXT,
                    brand_no TEXT,
                    table_no TEXT,
                    data_release TEXT,
                    version_date TEXT,
                    full_flag TEXT,
                    man_no TEXT,
                    brand_name TEXT,
                    ref_data_version TEXT,
                    format_version TEXT
                )
            ''',
            'tecdoc_articles': '''
                CREATE TABLE IF NOT EXISTS tecdoc_articles (
                    id TEXT PRIMARY KEY,
                    archive_name TEXT NOT NULL,
                    file_name TEXT NOT NULL,
                    line_number INTEGER NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    raw_content TEXT,
                    art_no TEXT,
                    brand_no TEXT,
                    table_no TEXT,
                    term_no TEXT,
                    self_serv TEXT,
                    mat_cert TEXT,
                    remanufact TEXT,
                    accessory TEXT,
                    batch_size1 TEXT,
                    batch_size2 TEXT
                )
            ''',
            'tecdoc_reference_numbers': '''
                CREATE TABLE IF NOT EXISTS tecdoc_reference_numbers (
                    id TEXT PRIMARY KEY,
                    archive_name TEXT NOT NULL,
                    file_name TEXT NOT NULL,
                    line_number INTEGER NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    raw_content TEXT,
                    art_no TEXT,
                    brand_no TEXT,
                    table_no TEXT,
                    man_no TEXT,
                    country_code TEXT,
                    ref_no TEXT,
                    exclude TEXT,
                    sort_no TEXT,
                    additive TEXT,
                    reference_info TEXT
                )
            ''',
            'tecdoc_article_linkage': '''
                CREATE TABLE IF NOT EXISTS tecdoc_article_linkage (
                    id TEXT PRIMARY KEY,
                    archive_name TEXT NOT NULL,
                    file_name TEXT NOT NULL,
                    line_number INTEGER NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    raw_content TEXT,
                    art_no TEXT,
                    brand_no TEXT,
                    table_no TEXT,
                    gen_art_no TEXT,
                    lnk_target_type TEXT,
                    lnk_target_no TEXT,
                    seq_no TEXT
                )
            ''',
            'tecdoc_linkage_attributes': '''
                CREATE TABLE IF NOT EXISTS tecdoc_linkage_attributes (
                    id TEXT PRIMARY KEY,
                    archive_name TEXT NOT NULL,
                    file_name TEXT NOT NULL,
                    line_number INTEGER NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    raw_content TEXT,
                    art_no TEXT,
                    brand_no TEXT,
                    table_no TEXT,
                    gen_art_no TEXT,
                    lnk_target_type TEXT,
                    lnk_target_no TEXT,
                    crit_no TEXT,
                    crit_val TEXT
                )
            ''',
            'tecdoc_article_criteria': '''
                CREATE TABLE IF NOT EXISTS tecdoc_article_criteria (
                    id TEXT PRIMARY KEY,
                    archive_name TEXT NOT NULL,
                    file_name TEXT NOT NULL,
                    line_number INTEGER NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    raw_content TEXT,
                    art_no TEXT,
                    brand_no TEXT,
                    table_no TEXT,
                    crit_no TEXT,
                    crit_val TEXT
                )
            ''',
            'tecdoc_article_to_generic': '''
                CREATE TABLE IF NOT EXISTS tecdoc_article_to_generic (
                    id TEXT PRIMARY KEY,
                    archive_name TEXT NOT NULL,
                    file_name TEXT NOT NULL,
                    line_number INTEGER NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    raw_content TEXT,
                    art_no TEXT,
                    brand_no TEXT,
                    table_no TEXT,
                    gen_art_no TEXT
                )
            ''',
            'tecdoc_graphics_documents': '''
                CREATE TABLE IF NOT EXISTS tecdoc_graphics_documents (
                    id TEXT PRIMARY KEY,
                    archive_name TEXT NOT NULL,
                    file_name TEXT NOT NULL,
                    line_number INTEGER NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    raw_content TEXT,
                    doc_no TEXT,
                    doc_type TEXT,
                    doc_name TEXT,
                    doc_format TEXT
                )
            ''',
            'tecdoc_graphics_to_articles': '''
                CREATE TABLE IF NOT EXISTS tecdoc_graphics_to_articles (
                    id TEXT PRIMARY KEY,
                    archive_name TEXT NOT NULL,
                    file_name TEXT NOT NULL,
                    line_number INTEGER NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    raw_content TEXT,
                    art_no TEXT,
                    brand_no TEXT,
                    table_no TEXT,
                    doc_no TEXT,
                    sort_no TEXT
                )
            '''
        }
        
        # Table type to table name mapping
        self.table_mapping = {
            '001': 'tecdoc_headers',
            '200': 'tecdoc_articles',
            '203': 'tecdoc_reference_numbers',
            '400': 'tecdoc_article_linkage',
            '410': 'tecdoc_linkage_attributes',
            '210': 'tecdoc_article_criteria',
            '211': 'tecdoc_article_to_generic',
            '231': 'tecdoc_graphics_documents',
            '232': 'tecdoc_graphics_to_articles',
        }
    
    def connect_database(self):
        """Connect to SQLite database"""
        try:
            self.conn = sqlite3.connect(self.db_path)
            self.conn.execute("PRAGMA journal_mode=WAL")  # Better performance
            self.conn.execute("PRAGMA synchronous=NORMAL")
            self.conn.execute("PRAGMA cache_size=10000")
            
            logger.info(f"Connected to SQLite database: {self.db_path}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            return False
    
    def create_schema(self):
        """Create TecDoc database schema"""
        logger.info("Creating TecDoc database schema...")
        
        try:
            cursor = self.conn.cursor()
            
            # Create all tables
            for table_name, schema in self.table_schemas.items():
                cursor.execute(schema)
                
                # Create indexes for performance (only if columns exist)
                cursor.execute(f"CREATE INDEX IF NOT EXISTS idx_{table_name}_archive ON {table_name}(archive_name)")
                
                # Check if specific columns exist before creating indexes
                cursor.execute(f"PRAGMA table_info({table_name})")
                columns = [row[1] for row in cursor.fetchall()]
                
                if 'brand_no' in columns:
                    cursor.execute(f"CREATE INDEX IF NOT EXISTS idx_{table_name}_brand_no ON {table_name}(brand_no)")
                if 'art_no' in columns:
                    cursor.execute(f"CREATE INDEX IF NOT EXISTS idx_{table_name}_art_no ON {table_name}(art_no)")
                if 'ref_no' in columns:
                    cursor.execute(f"CREATE INDEX IF NOT EXISTS idx_{table_name}_ref_no ON {table_name}(ref_no)")
            
            self.conn.commit()
            logger.info(f"Created {len(self.table_schemas)} TecDoc tables")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to create schema: {e}")
            return False
    
    def parse_tecdoc_line(self, line, table_type):
        """Parse a TecDoc format line based on table type"""
        try:
            line = line.rstrip('\n\r')
            if not line:
                return None
            
            parsed_data = {}
            
            if table_type == '001':  # Header
                if len(line) >= 58:
                    parsed_data = {
                        'brand_no': line[0:4].strip(),
                        'table_no': line[4:7].strip(),
                        'data_release': line[7:11].strip(),
                        'version_date': line[11:19].strip(),
                        'full_flag': line[19:20].strip(),
                        'man_no': line[20:26].strip(),
                        'brand_name': line[26:46].strip(),
                        'ref_data_version': line[46:50].strip(),
                        'format_version': line[54:58].strip(),
                    }
            
            elif table_type == '200':  # Articles
                if len(line) >= 53:
                    parsed_data = {
                        'art_no': line[0:22].strip(),
                        'brand_no': line[22:26].strip(),
                        'table_no': line[26:29].strip(),
                        'term_no': line[29:38].strip(),
                        'self_serv': line[38:39].strip(),
                        'mat_cert': line[39:40].strip(),
                        'remanufact': line[40:41].strip(),
                        'accessory': line[41:42].strip(),
                        'batch_size1': line[42:47].strip(),
                        'batch_size2': line[47:52].strip(),
                    }
            
            elif table_type == '203':  # Reference Numbers
                if len(line) >= 71:
                    parsed_data = {
                        'art_no': line[0:22].strip(),
                        'brand_no': line[22:26].strip(),
                        'table_no': line[26:29].strip(),
                        'man_no': line[29:35].strip(),
                        'country_code': line[35:38].strip(),
                        'ref_no': line[38:60].strip(),
                        'exclude': line[60:61].strip(),
                        'sort_no': line[61:66].strip(),
                        'additive': line[66:67].strip(),
                        'reference_info': line[67:70].strip(),
                    }
            
            elif table_type == '400':  # Article Linkage
                if len(line) >= 56:
                    parsed_data = {
                        'art_no': line[0:22].strip(),
                        'brand_no': line[22:26].strip(),
                        'table_no': line[26:29].strip(),
                        'gen_art_no': line[29:34].strip(),
                        'lnk_target_type': line[34:37].strip(),
                        'lnk_target_no': line[37:46].strip(),
                        'seq_no': line[46:55].strip(),
                    }
            
            elif table_type == '410':  # Linkage Attributes
                if len(line) >= 82:
                    parsed_data = {
                        'art_no': line[0:22].strip(),
                        'brand_no': line[22:26].strip(),
                        'table_no': line[26:29].strip(),
                        'gen_art_no': line[29:34].strip(),
                        'lnk_target_type': line[34:37].strip(),
                        'lnk_target_no': line[37:46].strip(),
                        'crit_no': line[58:62].strip(),
                        'crit_val': line[62:82].strip(),
                    }
            
            elif table_type == '210':  # Article Criteria
                if len(line) >= 62:
                    parsed_data = {
                        'art_no': line[0:22].strip(),
                        'brand_no': line[22:26].strip(),
                        'table_no': line[26:29].strip(),
                        'crit_no': line[58:62].strip(),
                        'crit_val': line[62:82].strip() if len(line) > 62 else '',
                    }
            
            elif table_type == '211':  # Article to Generic
                if len(line) >= 34:
                    parsed_data = {
                        'art_no': line[0:22].strip(),
                        'brand_no': line[22:26].strip(),
                        'table_no': line[26:29].strip(),
                        'gen_art_no': line[29:34].strip(),
                    }
            
            return parsed_data
            
        except Exception as e:
            logger.warning(f"Error parsing line for table {table_type}: {e}")
            return None
    
    def import_file_to_sql(self, file_path, table_type, archive_name, file_name):
        """Import a single TecDoc file to SQLite database"""
        if table_type not in self.table_mapping:
            logger.warning(f"Unknown table type: {table_type}")
            return 0
        
        table_name = self.table_mapping[table_type]
        records_imported = 0
        batch_size = 1000
        batch_records = []
        
        try:
            cursor = self.conn.cursor()
            
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                for line_num, line in enumerate(f, 1):
                    if not line.strip():
                        continue
                    
                    # Parse line
                    parsed_data = self.parse_tecdoc_line(line, table_type)
                    
                    # Create record
                    record = {
                        'id': str(uuid.uuid4()),
                        'archive_name': archive_name,
                        'file_name': file_name,
                        'line_number': line_num,
                        'created_at': datetime.now().isoformat(),
                        'raw_content': line.strip(),
                    }
                    
                    # Add parsed data
                    if parsed_data:
                        record.update(parsed_data)
                    
                    batch_records.append(record)
                    
                    # Insert batch when full
                    if len(batch_records) >= batch_size:
                        self.insert_batch(cursor, table_name, batch_records)
                        records_imported += len(batch_records)
                        batch_records.clear()
                        
                        if records_imported % 10000 == 0:
                            logger.info(f"    Imported {records_imported} records from {file_name}")
                
                # Insert remaining records
                if batch_records:
                    self.insert_batch(cursor, table_name, batch_records)
                    records_imported += len(batch_records)
            
            self.conn.commit()
            return records_imported
            
        except Exception as e:
            logger.error(f"Error importing file {file_path}: {e}")
            return 0
    
    def insert_batch(self, cursor, table_name, records):
        """Insert a batch of records into the specified table"""
        if not records:
            return
        
        # Get column names from first record
        columns = list(records[0].keys())
        placeholders = ', '.join(['?' for _ in columns])
        column_names = ', '.join(columns)
        
        sql = f"INSERT INTO {table_name} ({column_names}) VALUES ({placeholders})"
        
        # Convert records to tuples
        values = [tuple(record.get(col, '') for col in columns) for record in records]
        
        cursor.executemany(sql, values)
    
    def extract_and_import_archive(self, archive_path):
        """Extract and import a single 7z archive"""
        archive_name = os.path.basename(archive_path)
        logger.info(f"Processing archive: {archive_name}")
        
        temp_dir = tempfile.mkdtemp(prefix="tecdoc_sqlite_")
        total_imported = 0
        
        try:
            # Extract archive
            with py7zr.SevenZipFile(archive_path, mode='r') as archive:
                archive.extractall(path=temp_dir)
            
            # Process each extracted file
            for file_name in os.listdir(temp_dir):
                file_path = os.path.join(temp_dir, file_name)
                if not os.path.isfile(file_path):
                    continue
                
                # Extract table type from filename
                table_type = file_name.split('.')[0]
                
                # Import file
                records_imported = self.import_file_to_sql(
                    file_path, table_type, archive_name, file_name
                )
                
                if records_imported > 0:
                    logger.info(f"  {file_name}: {records_imported} records imported")
                    total_imported += records_imported
            
            self.processed_archives += 1
            self.total_records += total_imported
            
        except Exception as e:
            logger.error(f"Error processing archive {archive_path}: {e}")
        finally:
            # Cleanup
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)
            gc.collect()
        
        return total_imported
    
    def get_statistics(self):
        """Get database statistics"""
        try:
            cursor = self.conn.cursor()
            stats = {}
            
            for table_name in self.table_schemas.keys():
                cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                count = cursor.fetchone()[0]
                stats[table_name] = count
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting statistics: {e}")
            return {}
    
    def run_import(self, max_archives=None, start_with_brand=None):
        """Run the TecDoc SQLite import process"""
        logger.info("🚀 Starting TecDoc SQLite Import System")
        logger.info(f"📁 TecDoc directory: {TECDOC_DIR}")
        logger.info(f"🗄️ SQLite database: {self.db_path}")
        
        # Connect to database
        if not self.connect_database():
            logger.error("Failed to connect to database")
            return False
        
        # Create schema
        if not self.create_schema():
            logger.error("Failed to create database schema")
            return False
        
        # Find archives
        if not os.path.exists(TECDOC_DIR):
            logger.error(f"TecDoc directory not found: {TECDOC_DIR}")
            return False
        
        archives = [f for f in os.listdir(TECDOC_DIR) if f.endswith('.7z')]
        archives.sort()
        
        # Filter archives if start_with_brand specified
        if start_with_brand:
            archives = [a for a in archives if a.startswith(start_with_brand)]
        
        if max_archives:
            archives = archives[:max_archives]
        
        logger.info(f"📋 Found {len(archives)} archives to process")
        
        try:
            for i, archive_name in enumerate(archives, 1):
                archive_path = os.path.join(TECDOC_DIR, archive_name)
                
                logger.info(f"🔄 Processing archive {i}/{len(archives)}: {archive_name}")
                
                # Import archive
                records_imported = self.extract_and_import_archive(archive_path)
                
                logger.info(f"✅ {archive_name}: {records_imported} total records imported")
                
                # Progress update
                if i % 5 == 0:
                    logger.info(f"📊 Progress: {i}/{len(archives)} archives, {self.total_records} total records")
        
        except KeyboardInterrupt:
            logger.info("⏹️ Import interrupted by user")
        except Exception as e:
            logger.error(f"❌ Import failed: {e}")
        finally:
            # Show final statistics
            stats = self.get_statistics()
            logger.info("📊 Final Database Statistics:")
            for table_name, count in stats.items():
                if count > 0:
                    logger.info(f"   {table_name}: {count:,} records")
            
            if self.conn:
                self.conn.close()
            
            logger.info("🎉 TecDoc SQLite Import Complete!")
            logger.info(f"📈 Final Statistics:")
            logger.info(f"   - Archives processed: {self.processed_archives}")
            logger.info(f"   - Total records imported: {self.total_records:,}")
            logger.info(f"   - Database size: {os.path.getsize(self.db_path) / 1024 / 1024:.1f} MB")
            logger.info(f"   - Timestamp: {datetime.now().isoformat()}")
        
        return True

def main():
    """Main function"""
    import argparse
    
    parser = argparse.ArgumentParser(description='TecDoc SQLite Import System')
    parser.add_argument('--max-archives', type=int, default=1, 
                       help='Maximum number of archives to process (default: 1)')
    parser.add_argument('--brand', type=str, 
                       help='Start with specific brand (e.g., "0001")')
    parser.add_argument('--db-path', type=str, default=SQLITE_DB,
                       help='SQLite database path')
    
    args = parser.parse_args()
    
    # Create importer
    importer = TecDocSQLiteImporter(args.db_path)
    
    # Run import
    success = importer.run_import(
        max_archives=args.max_archives,
        start_with_brand=args.brand
    )
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()