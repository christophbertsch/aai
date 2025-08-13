#!/usr/bin/env python3
"""
TecDoc SQL Import System for PostgreSQL
Imports TecDoc 7z archives into PostgreSQL database with proper schema
"""

import os
import sys
import py7zr
import tempfile
import shutil
import logging
import psycopg2
from sqlalchemy import create_engine, text, MetaData, Table, Column, Integer, String, DateTime, Text, Index
from sqlalchemy.orm import sessionmaker
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
from pathlib import Path
import gc

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Database Configuration
DB_CONFIG = {
    'host': '34.107.63.251',
    'port': '5432',
    'database': 'postgres',
    'user': 'postgres',
    'password': '<o8-x_@8smbXhI.V',
}

# TecDoc Configuration
TECDOC_DIR = "/workspace/aai/aai/aai/TecDoc"

class TecDocSQLImporter:
    """TecDoc SQL Importer with PostgreSQL support"""
    
    def __init__(self, db_config):
        self.db_config = db_config
        self.engine = None
        self.session = None
        self.metadata = MetaData()
        self.tables = {}
        self.processed_archives = 0
        self.total_records = 0
        
        # TecDoc table definitions based on format specification
        self.table_definitions = {
            '001': {
                'name': 'tecdoc_headers',
                'columns': [
                    ('brand_no', String(4)),
                    ('table_no', String(3)),
                    ('data_release', String(4)),
                    ('version_date', String(8)),
                    ('full_flag', String(1)),
                    ('man_no', String(6)),
                    ('brand_name', String(20)),
                    ('ref_data_version', String(4)),
                    ('format_version', String(4)),
                ]
            },
            '200': {
                'name': 'tecdoc_articles',
                'columns': [
                    ('art_no', String(22)),
                    ('brand_no', String(4)),
                    ('table_no', String(3)),
                    ('term_no', String(9)),
                    ('self_serv', String(1)),
                    ('mat_cert', String(1)),
                    ('remanufact', String(1)),
                    ('accessory', String(1)),
                    ('batch_size1', String(5)),
                    ('batch_size2', String(5)),
                ]
            },
            '203': {
                'name': 'tecdoc_reference_numbers',
                'columns': [
                    ('art_no', String(22)),
                    ('brand_no', String(4)),
                    ('table_no', String(3)),
                    ('man_no', String(6)),
                    ('country_code', String(3)),
                    ('ref_no', String(22)),
                    ('exclude', String(1)),
                    ('sort_no', String(5)),
                    ('additive', String(1)),
                    ('reference_info', String(3)),
                ]
            },
            '400': {
                'name': 'tecdoc_article_linkage',
                'columns': [
                    ('art_no', String(22)),
                    ('brand_no', String(4)),
                    ('table_no', String(3)),
                    ('gen_art_no', String(5)),
                    ('lnk_target_type', String(3)),
                    ('lnk_target_no', String(9)),
                    ('seq_no', String(9)),
                ]
            },
            '410': {
                'name': 'tecdoc_linkage_attributes',
                'columns': [
                    ('art_no', String(22)),
                    ('brand_no', String(4)),
                    ('table_no', String(3)),
                    ('gen_art_no', String(5)),
                    ('lnk_target_type', String(3)),
                    ('lnk_target_no', String(9)),
                    ('crit_no', String(4)),
                    ('crit_val', String(20)),
                ]
            },
            '210': {
                'name': 'tecdoc_article_criteria',
                'columns': [
                    ('art_no', String(22)),
                    ('brand_no', String(4)),
                    ('table_no', String(3)),
                    ('crit_no', String(4)),
                    ('crit_val', String(20)),
                ]
            },
            '211': {
                'name': 'tecdoc_article_to_generic',
                'columns': [
                    ('art_no', String(22)),
                    ('brand_no', String(4)),
                    ('table_no', String(3)),
                    ('gen_art_no', String(5)),
                ]
            },
            '231': {
                'name': 'tecdoc_graphics_documents',
                'columns': [
                    ('doc_no', String(9)),
                    ('doc_type', String(1)),
                    ('doc_name', String(32)),
                    ('doc_format', String(3)),
                ]
            },
            '232': {
                'name': 'tecdoc_graphics_to_articles',
                'columns': [
                    ('art_no', String(22)),
                    ('brand_no', String(4)),
                    ('table_no', String(3)),
                    ('doc_no', String(9)),
                    ('sort_no', String(3)),
                ]
            }
        }
    
    def connect_database(self):
        """Connect to PostgreSQL database"""
        try:
            # Prompt for password if not set
            if not self.db_config.get('password'):
                import getpass
                self.db_config['password'] = getpass.getpass("Enter PostgreSQL password: ")
            
            # Create connection string
            conn_string = (
                f"postgresql://{self.db_config['user']}:{self.db_config['password']}"
                f"@{self.db_config['host']}:{self.db_config['port']}/{self.db_config['database']}"
            )
            
            self.engine = create_engine(conn_string, echo=False)
            Session = sessionmaker(bind=self.engine)
            self.session = Session()
            
            # Test connection
            with self.engine.connect() as conn:
                result = conn.execute(text("SELECT version()"))
                version = result.fetchone()[0]
                logger.info(f"Connected to PostgreSQL: {version}")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            return False
    
    def create_schema(self):
        """Create TecDoc database schema"""
        logger.info("Creating TecDoc database schema...")
        
        try:
            # Create tables for each TecDoc table type
            for table_code, table_def in self.table_definitions.items():
                table_name = table_def['name']
                
                # Define common columns
                columns = [
                    Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
                    Column('archive_name', String(50), nullable=False),
                    Column('file_name', String(50), nullable=False),
                    Column('line_number', Integer, nullable=False),
                    Column('created_at', DateTime, default=datetime.utcnow),
                    Column('raw_content', Text),
                ]
                
                # Add table-specific columns
                for col_name, col_type in table_def['columns']:
                    columns.append(Column(col_name, col_type))
                
                # Create table
                table = Table(table_name, self.metadata, *columns)
                self.tables[table_code] = table
                
                # Add indexes for performance
                Index(f'idx_{table_name}_brand_no', table.c.brand_no)
                Index(f'idx_{table_name}_archive', table.c.archive_name)
                if hasattr(table.c, 'art_no'):
                    Index(f'idx_{table_name}_art_no', table.c.art_no)
                if hasattr(table.c, 'ref_no'):
                    Index(f'idx_{table_name}_ref_no', table.c.ref_no)
            
            # Create all tables
            self.metadata.create_all(self.engine)
            logger.info(f"Created {len(self.tables)} TecDoc tables")
            
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
        """Import a single TecDoc file to SQL database"""
        if table_type not in self.tables:
            logger.warning(f"Unknown table type: {table_type}")
            return 0
        
        table = self.tables[table_type]
        records_imported = 0
        batch_size = 1000
        batch_records = []
        
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                for line_num, line in enumerate(f, 1):
                    if not line.strip():
                        continue
                    
                    # Parse line
                    parsed_data = self.parse_tecdoc_line(line, table_type)
                    
                    # Create record
                    record = {
                        'id': uuid.uuid4(),
                        'archive_name': archive_name,
                        'file_name': file_name,
                        'line_number': line_num,
                        'created_at': datetime.utcnow(),
                        'raw_content': line.strip(),
                    }
                    
                    # Add parsed data
                    if parsed_data:
                        record.update(parsed_data)
                    
                    batch_records.append(record)
                    
                    # Insert batch when full
                    if len(batch_records) >= batch_size:
                        with self.engine.connect() as conn:
                            conn.execute(table.insert(), batch_records)
                            conn.commit()
                        
                        records_imported += len(batch_records)
                        batch_records.clear()
                        
                        if records_imported % 10000 == 0:
                            logger.info(f"    Imported {records_imported} records from {file_name}")
                
                # Insert remaining records
                if batch_records:
                    with self.engine.connect() as conn:
                        conn.execute(table.insert(), batch_records)
                        conn.commit()
                    records_imported += len(batch_records)
            
            return records_imported
            
        except Exception as e:
            logger.error(f"Error importing file {file_path}: {e}")
            return 0
    
    def extract_and_import_archive(self, archive_path):
        """Extract and import a single 7z archive"""
        archive_name = os.path.basename(archive_path)
        logger.info(f"Processing archive: {archive_name}")
        
        temp_dir = tempfile.mkdtemp(prefix="tecdoc_sql_")
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
    
    def run_import(self, max_archives=None, start_with_brand=None):
        """Run the TecDoc SQL import process"""
        logger.info("🚀 Starting TecDoc SQL Import System")
        logger.info(f"📁 TecDoc directory: {TECDOC_DIR}")
        logger.info(f"🗄️ Database: {self.db_config['host']}:{self.db_config['port']}")
        
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
            if self.session:
                self.session.close()
            
            logger.info("🎉 TecDoc SQL Import Complete!")
            logger.info(f"📈 Final Statistics:")
            logger.info(f"   - Archives processed: {self.processed_archives}")
            logger.info(f"   - Total records imported: {self.total_records}")
            logger.info(f"   - Timestamp: {datetime.now().isoformat()}")
        
        return True

def main():
    """Main function"""
    import argparse
    
    parser = argparse.ArgumentParser(description='TecDoc SQL Import System')
    parser.add_argument('--max-archives', type=int, default=1, 
                       help='Maximum number of archives to process (default: 1)')
    parser.add_argument('--brand', type=str, 
                       help='Start with specific brand (e.g., "0001")')
    parser.add_argument('--password', type=str, 
                       help='PostgreSQL password (will prompt if not provided)')
    
    args = parser.parse_args()
    
    # Set password if provided
    if args.password:
        DB_CONFIG['password'] = args.password
    
    # Create importer
    importer = TecDocSQLImporter(DB_CONFIG)
    
    # Run import
    success = importer.run_import(
        max_archives=args.max_archives,
        start_with_brand=args.brand
    )
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()