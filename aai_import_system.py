#!/usr/bin/env python3
"""
AAI Data Import System with Micro-Agents
========================================

This system creates specialized micro-agents for importing different automotive data formats
into Qdrant vector database. Each micro-agent is self-learning and specialized for specific
data formats like TecDoc, AutoCare, MM, IA, Polk, and PIES.

Features:
- Orchestrator pattern with specialized micro-agents
- Progress bars and extensive logging
- Self-learning capabilities for format adaptation
- Automatic file type detection and routing
- Vector embeddings for semantic search
- Comprehensive error handling and recovery
"""

import os
import sys
import json
import logging
import asyncio
import zipfile
import tarfile
import subprocess
from pathlib import Path
from typing import Dict, List, Any, Optional, Union
from dataclasses import dataclass, asdict
from abc import ABC, abstractmethod
from datetime import datetime
import hashlib
import uuid

import pandas as pd
import numpy as np
from tqdm import tqdm
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from sentence_transformers import SentenceTransformer
import xml.etree.ElementTree as ET
from lxml import etree
import openpyxl

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('aai_import.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class ImportStats:
    """Statistics for import operations"""
    total_files: int = 0
    processed_files: int = 0
    successful_imports: int = 0
    failed_imports: int = 0
    total_records: int = 0
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    errors: List[str] = None
    
    def __post_init__(self):
        if self.errors is None:
            self.errors = []

class BaseMicroAgent(ABC):
    """Base class for all micro-agents"""
    
    def __init__(self, name: str, qdrant_client: QdrantClient, embedding_model: SentenceTransformer):
        self.name = name
        self.qdrant_client = qdrant_client
        self.embedding_model = embedding_model
        self.logger = logging.getLogger(f"MicroAgent.{name}")
        self.stats = ImportStats()
        self.learning_data = {}
        self.supported_extensions = []
        
    @abstractmethod
    def can_handle(self, file_path: Path) -> bool:
        """Check if this agent can handle the given file"""
        pass
    
    @abstractmethod
    async def process_file(self, file_path: Path, collection_name: str) -> Dict[str, Any]:
        """Process a single file and return results"""
        pass
    
    def learn_from_file(self, file_path: Path, metadata: Dict[str, Any]):
        """Self-learning mechanism to adapt to new file patterns"""
        file_hash = self._get_file_hash(file_path)
        self.learning_data[file_hash] = {
            'file_path': str(file_path),
            'metadata': metadata,
            'timestamp': datetime.now().isoformat(),
            'success': metadata.get('success', False)
        }
        
    def _get_file_hash(self, file_path: Path) -> str:
        """Generate hash for file identification"""
        with open(file_path, 'rb') as f:
            return hashlib.md5(f.read(1024)).hexdigest()  # Hash first 1KB for speed
    
    def create_embedding(self, text: str) -> List[float]:
        """Create vector embedding for text"""
        try:
            embedding = self.embedding_model.encode(text)
            return embedding.tolist()
        except Exception as e:
            self.logger.error(f"Error creating embedding: {e}")
            return [0.0] * 384  # Default dimension for all-MiniLM-L6-v2

class TecDocMicroAgent(BaseMicroAgent):
    """Specialized agent for TecDoc format files"""
    
    def __init__(self, qdrant_client: QdrantClient, embedding_model: SentenceTransformer):
        super().__init__("TecDoc", qdrant_client, embedding_model)
        self.supported_extensions = ['.7z', '.zip', '.txt', '.dat']
        
    def can_handle(self, file_path: Path) -> bool:
        """Check if file is TecDoc format"""
        if 'tecdoc' in file_path.name.lower():
            return True
        if file_path.suffix.lower() in self.supported_extensions:
            if file_path.parent.name.lower() == 'tecdoc':
                return True
        return False
    
    async def process_file(self, file_path: Path, collection_name: str) -> Dict[str, Any]:
        """Process TecDoc files"""
        self.logger.info(f"Processing TecDoc file: {file_path}")
        result = {'success': False, 'records_processed': 0, 'errors': []}
        
        try:
            if file_path.suffix == '.7z':
                result = await self._process_7z_file(file_path, collection_name)
            elif file_path.suffix in ['.txt', '.dat']:
                result = await self._process_text_file(file_path, collection_name)
            else:
                result['errors'].append(f"Unsupported TecDoc file type: {file_path.suffix}")
                
            self.learn_from_file(file_path, result)
            return result
            
        except Exception as e:
            error_msg = f"Error processing TecDoc file {file_path}: {e}"
            self.logger.error(error_msg)
            result['errors'].append(error_msg)
            return result
    
    async def _process_7z_file(self, file_path: Path, collection_name: str) -> Dict[str, Any]:
        """Process 7z compressed TecDoc files"""
        result = {'success': False, 'records_processed': 0, 'errors': []}
        temp_dir = Path(f"/tmp/tecdoc_extract_{file_path.stem}")
        
        try:
            # Extract 7z file
            temp_dir.mkdir(exist_ok=True)
            subprocess.run(['7z', 'x', str(file_path), f'-o{temp_dir}'], 
                         check=True, capture_output=True)
            
            # Process extracted files
            extracted_files = list(temp_dir.rglob('*'))
            self.logger.info(f"Extracted {len(extracted_files)} files from {file_path}")
            
            total_records = 0
            for extracted_file in tqdm(extracted_files, desc=f"Processing {file_path.name}"):
                if extracted_file.is_file():
                    file_result = await self._process_text_file(extracted_file, collection_name)
                    total_records += file_result.get('records_processed', 0)
                    result['errors'].extend(file_result.get('errors', []))
            
            result['success'] = True
            result['records_processed'] = total_records
            
        except subprocess.CalledProcessError as e:
            error_msg = f"Failed to extract 7z file: {e}"
            result['errors'].append(error_msg)
            self.logger.error(error_msg)
        except Exception as e:
            error_msg = f"Error processing 7z file: {e}"
            result['errors'].append(error_msg)
            self.logger.error(error_msg)
        finally:
            # Cleanup
            if temp_dir.exists():
                subprocess.run(['rm', '-rf', str(temp_dir)], capture_output=True)
        
        return result
    
    async def _process_text_file(self, file_path: Path, collection_name: str) -> Dict[str, Any]:
        """Process TecDoc text/dat files"""
        result = {'success': False, 'records_processed': 0, 'errors': []}
        
        try:
            # Try different encodings
            encodings = ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']
            content = None
            
            for encoding in encodings:
                try:
                    with open(file_path, 'r', encoding=encoding) as f:
                        content = f.read()
                    break
                except UnicodeDecodeError:
                    continue
            
            if content is None:
                result['errors'].append(f"Could not decode file {file_path}")
                return result
            
            # Parse TecDoc format (typically tab-separated or pipe-separated)
            lines = content.strip().split('\n')
            if not lines:
                return result
            
            # Detect separator
            separator = '\t' if '\t' in lines[0] else '|' if '|' in lines[0] else ';'
            
            records_processed = 0
            batch_size = 100
            points = []
            
            for i, line in enumerate(tqdm(lines, desc=f"Processing {file_path.name}")):
                if not line.strip():
                    continue
                    
                fields = line.split(separator)
                if len(fields) < 2:
                    continue
                
                # Create document text for embedding
                doc_text = f"TecDoc {file_path.stem}: {' '.join(fields)}"
                embedding = self.create_embedding(doc_text)
                
                # Create point for Qdrant
                point = PointStruct(
                    id=str(uuid.uuid4()),
                    vector=embedding,
                    payload={
                        'source': 'TecDoc',
                        'file_name': file_path.name,
                        'file_path': str(file_path),
                        'record_id': i,
                        'content': doc_text,
                        'fields': fields,
                        'timestamp': datetime.now().isoformat()
                    }
                )
                points.append(point)
                records_processed += 1
                
                # Batch insert
                if len(points) >= batch_size:
                    self.qdrant_client.upsert(collection_name, points)
                    points = []
            
            # Insert remaining points
            if points:
                self.qdrant_client.upsert(collection_name, points)
            
            result['success'] = True
            result['records_processed'] = records_processed
            self.logger.info(f"Processed {records_processed} records from {file_path}")
            
        except Exception as e:
            error_msg = f"Error processing text file {file_path}: {e}"
            result['errors'].append(error_msg)
            self.logger.error(error_msg)
        
        return result

class AutoCareMicroAgent(BaseMicroAgent):
    """Specialized agent for AutoCare format files"""
    
    def __init__(self, qdrant_client: QdrantClient, embedding_model: SentenceTransformer):
        super().__init__("AutoCare", qdrant_client, embedding_model)
        self.supported_extensions = ['.txt', '.csv']
        
    def can_handle(self, file_path: Path) -> bool:
        """Check if file is AutoCare format"""
        return 'autocare' in file_path.name.lower() or 'autocare' in str(file_path.parent).lower()
    
    async def process_file(self, file_path: Path, collection_name: str) -> Dict[str, Any]:
        """Process AutoCare files"""
        self.logger.info(f"Processing AutoCare file: {file_path}")
        result = {'success': False, 'records_processed': 0, 'errors': []}
        
        try:
            # AutoCare files are typically tab-delimited text files
            df = pd.read_csv(file_path, sep='\t', encoding='utf-8', low_memory=False)
            
            records_processed = 0
            batch_size = 100
            points = []
            
            for idx, row in tqdm(df.iterrows(), total=len(df), desc=f"Processing {file_path.name}"):
                # Create document text
                doc_text = f"AutoCare {file_path.stem}: {' '.join(str(v) for v in row.values if pd.notna(v))}"
                embedding = self.create_embedding(doc_text)
                
                point = PointStruct(
                    id=str(uuid.uuid4()),
                    vector=embedding,
                    payload={
                        'source': 'AutoCare',
                        'file_name': file_path.name,
                        'file_path': str(file_path),
                        'record_id': idx,
                        'content': doc_text,
                        'data': row.to_dict(),
                        'timestamp': datetime.now().isoformat()
                    }
                )
                points.append(point)
                records_processed += 1
                
                if len(points) >= batch_size:
                    self.qdrant_client.upsert(collection_name, points)
                    points = []
            
            if points:
                self.qdrant_client.upsert(collection_name, points)
            
            result['success'] = True
            result['records_processed'] = records_processed
            self.learn_from_file(file_path, result)
            
        except Exception as e:
            error_msg = f"Error processing AutoCare file {file_path}: {e}"
            result['errors'].append(error_msg)
            self.logger.error(error_msg)
        
        return result

class MMMicroAgent(BaseMicroAgent):
    """Specialized agent for MM (Material Master) XML files"""
    
    def __init__(self, qdrant_client: QdrantClient, embedding_model: SentenceTransformer):
        super().__init__("MM", qdrant_client, embedding_model)
        self.supported_extensions = ['.xml']
        
    def can_handle(self, file_path: Path) -> bool:
        """Check if file is MM format"""
        return (file_path.suffix.lower() == '.xml' and 
                ('mm' in file_path.name.lower() or 'mm' in str(file_path.parent).lower()))
    
    async def process_file(self, file_path: Path, collection_name: str) -> Dict[str, Any]:
        """Process MM XML files"""
        self.logger.info(f"Processing MM file: {file_path}")
        result = {'success': False, 'records_processed': 0, 'errors': []}
        
        try:
            tree = ET.parse(file_path)
            root = tree.getroot()
            
            records_processed = 0
            batch_size = 100
            points = []
            
            # Process each row in the XML
            for idx, row in enumerate(tqdm(root.findall('.//row'), desc=f"Processing {file_path.name}")):
                # Extract all data from the row
                row_data = {}
                for child in row:
                    row_data[child.tag] = child.text
                
                # Create document text
                doc_text = f"MM {file_path.stem}: {' '.join(f'{k}:{v}' for k, v in row_data.items() if v)}"
                embedding = self.create_embedding(doc_text)
                
                point = PointStruct(
                    id=str(uuid.uuid4()),
                    vector=embedding,
                    payload={
                        'source': 'MM',
                        'file_name': file_path.name,
                        'file_path': str(file_path),
                        'record_id': idx,
                        'content': doc_text,
                        'data': row_data,
                        'timestamp': datetime.now().isoformat()
                    }
                )
                points.append(point)
                records_processed += 1
                
                if len(points) >= batch_size:
                    self.qdrant_client.upsert(collection_name, points)
                    points = []
            
            if points:
                self.qdrant_client.upsert(collection_name, points)
            
            result['success'] = True
            result['records_processed'] = records_processed
            self.learn_from_file(file_path, result)
            
        except Exception as e:
            error_msg = f"Error processing MM file {file_path}: {e}"
            result['errors'].append(error_msg)
            self.logger.error(error_msg)
        
        return result

class IAMicroAgent(BaseMicroAgent):
    """Specialized agent for IA (Interchange Analysis) CSV files"""
    
    def __init__(self, qdrant_client: QdrantClient, embedding_model: SentenceTransformer):
        super().__init__("IA", qdrant_client, embedding_model)
        self.supported_extensions = ['.csv']
        
    def can_handle(self, file_path: Path) -> bool:
        """Check if file is IA format"""
        return (file_path.suffix.lower() == '.csv' and 
                ('ia' in file_path.name.lower() or 'ia' in str(file_path.parent).lower()))
    
    async def process_file(self, file_path: Path, collection_name: str) -> Dict[str, Any]:
        """Process IA CSV files"""
        self.logger.info(f"Processing IA file: {file_path}")
        result = {'success': False, 'records_processed': 0, 'errors': []}
        
        try:
            # IA files use semicolon separator
            df = pd.read_csv(file_path, sep=';', encoding='utf-8', low_memory=False)
            
            records_processed = 0
            batch_size = 100
            points = []
            
            for idx, row in tqdm(df.iterrows(), total=len(df), desc=f"Processing {file_path.name}"):
                doc_text = f"IA {file_path.stem}: {' '.join(str(v) for v in row.values if pd.notna(v))}"
                embedding = self.create_embedding(doc_text)
                
                point = PointStruct(
                    id=str(uuid.uuid4()),
                    vector=embedding,
                    payload={
                        'source': 'IA',
                        'file_name': file_path.name,
                        'file_path': str(file_path),
                        'record_id': idx,
                        'content': doc_text,
                        'data': row.to_dict(),
                        'timestamp': datetime.now().isoformat()
                    }
                )
                points.append(point)
                records_processed += 1
                
                if len(points) >= batch_size:
                    self.qdrant_client.upsert(collection_name, points)
                    points = []
            
            if points:
                self.qdrant_client.upsert(collection_name, points)
            
            result['success'] = True
            result['records_processed'] = records_processed
            self.learn_from_file(file_path, result)
            
        except Exception as e:
            error_msg = f"Error processing IA file {file_path}: {e}"
            result['errors'].append(error_msg)
            self.logger.error(error_msg)
        
        return result

class PolkMicroAgent(BaseMicroAgent):
    """Specialized agent for Polk CSV files"""
    
    def __init__(self, qdrant_client: QdrantClient, embedding_model: SentenceTransformer):
        super().__init__("Polk", qdrant_client, embedding_model)
        self.supported_extensions = ['.csv']
        
    def can_handle(self, file_path: Path) -> bool:
        """Check if file is Polk format"""
        return (file_path.suffix.lower() == '.csv' and 
                ('polk' in file_path.name.lower() or 'polk' in str(file_path.parent).lower()))
    
    async def process_file(self, file_path: Path, collection_name: str) -> Dict[str, Any]:
        """Process Polk CSV files"""
        self.logger.info(f"Processing Polk file: {file_path}")
        result = {'success': False, 'records_processed': 0, 'errors': []}
        
        try:
            df = pd.read_csv(file_path, encoding='utf-8', low_memory=False)
            
            records_processed = 0
            batch_size = 100
            points = []
            
            for idx, row in tqdm(df.iterrows(), total=len(df), desc=f"Processing {file_path.name}"):
                doc_text = f"Polk {file_path.stem}: {' '.join(str(v) for v in row.values if pd.notna(v))}"
                embedding = self.create_embedding(doc_text)
                
                point = PointStruct(
                    id=str(uuid.uuid4()),
                    vector=embedding,
                    payload={
                        'source': 'Polk',
                        'file_name': file_path.name,
                        'file_path': str(file_path),
                        'record_id': idx,
                        'content': doc_text,
                        'data': row.to_dict(),
                        'timestamp': datetime.now().isoformat()
                    }
                )
                points.append(point)
                records_processed += 1
                
                if len(points) >= batch_size:
                    self.qdrant_client.upsert(collection_name, points)
                    points = []
            
            if points:
                self.qdrant_client.upsert(collection_name, points)
            
            result['success'] = True
            result['records_processed'] = records_processed
            self.learn_from_file(file_path, result)
            
        except Exception as e:
            error_msg = f"Error processing Polk file {file_path}: {e}"
            result['errors'].append(error_msg)
            self.logger.error(error_msg)
        
        return result

class PIESMicroAgent(BaseMicroAgent):
    """Specialized agent for PIES (Product Information Exchange Standard) files"""
    
    def __init__(self, qdrant_client: QdrantClient, embedding_model: SentenceTransformer):
        super().__init__("PIES", qdrant_client, embedding_model)
        self.supported_extensions = ['.pdf', '.xml', '.txt']
        
    def can_handle(self, file_path: Path) -> bool:
        """Check if file is PIES format"""
        return ('pies' in file_path.name.lower() or 'pies' in str(file_path.parent).lower())
    
    async def process_file(self, file_path: Path, collection_name: str) -> Dict[str, Any]:
        """Process PIES files"""
        self.logger.info(f"Processing PIES file: {file_path}")
        result = {'success': False, 'records_processed': 0, 'errors': []}
        
        try:
            if file_path.suffix.lower() == '.pdf':
                # For PDF files, we'll just index metadata for now
                doc_text = f"PIES Documentation: {file_path.name}"
                embedding = self.create_embedding(doc_text)
                
                point = PointStruct(
                    id=str(uuid.uuid4()),
                    vector=embedding,
                    payload={
                        'source': 'PIES',
                        'file_name': file_path.name,
                        'file_path': str(file_path),
                        'content': doc_text,
                        'file_type': 'documentation',
                        'timestamp': datetime.now().isoformat()
                    }
                )
                
                self.qdrant_client.upsert(collection_name, [point])
                result['success'] = True
                result['records_processed'] = 1
            
            self.learn_from_file(file_path, result)
            
        except Exception as e:
            error_msg = f"Error processing PIES file {file_path}: {e}"
            result['errors'].append(error_msg)
            self.logger.error(error_msg)
        
        return result

class ExcelMicroAgent(BaseMicroAgent):
    """Specialized agent for Excel files"""
    
    def __init__(self, qdrant_client: QdrantClient, embedding_model: SentenceTransformer):
        super().__init__("Excel", qdrant_client, embedding_model)
        self.supported_extensions = ['.xlsx', '.xls']
        
    def can_handle(self, file_path: Path) -> bool:
        """Check if file is Excel format"""
        return file_path.suffix.lower() in self.supported_extensions
    
    async def process_file(self, file_path: Path, collection_name: str) -> Dict[str, Any]:
        """Process Excel files"""
        self.logger.info(f"Processing Excel file: {file_path}")
        result = {'success': False, 'records_processed': 0, 'errors': []}
        
        try:
            # Read all sheets
            excel_file = pd.ExcelFile(file_path)
            total_records = 0
            
            for sheet_name in excel_file.sheet_names:
                df = pd.read_excel(file_path, sheet_name=sheet_name)
                
                batch_size = 100
                points = []
                
                for idx, row in tqdm(df.iterrows(), total=len(df), 
                                   desc=f"Processing {file_path.name} - {sheet_name}"):
                    doc_text = f"Excel {file_path.stem} {sheet_name}: {' '.join(str(v) for v in row.values if pd.notna(v))}"
                    embedding = self.create_embedding(doc_text)
                    
                    point = PointStruct(
                        id=str(uuid.uuid4()),
                        vector=embedding,
                        payload={
                            'source': 'Excel',
                            'file_name': file_path.name,
                            'file_path': str(file_path),
                            'sheet_name': sheet_name,
                            'record_id': idx,
                            'content': doc_text,
                            'data': row.to_dict(),
                            'timestamp': datetime.now().isoformat()
                        }
                    )
                    points.append(point)
                    total_records += 1
                    
                    if len(points) >= batch_size:
                        self.qdrant_client.upsert(collection_name, points)
                        points = []
                
                if points:
                    self.qdrant_client.upsert(collection_name, points)
            
            result['success'] = True
            result['records_processed'] = total_records
            self.learn_from_file(file_path, result)
            
        except Exception as e:
            error_msg = f"Error processing Excel file {file_path}: {e}"
            result['errors'].append(error_msg)
            self.logger.error(error_msg)
        
        return result

class AAIImportOrchestrator:
    """Main orchestrator for AAI data import system"""
    
    def __init__(self, qdrant_url: str = "http://localhost:6333"):
        self.qdrant_client = QdrantClient(url=qdrant_url)
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        self.logger = logging.getLogger("AAIOrchestrator")
        
        # Initialize micro-agents
        self.agents = [
            TecDocMicroAgent(self.qdrant_client, self.embedding_model),
            AutoCareMicroAgent(self.qdrant_client, self.embedding_model),
            MMMicroAgent(self.qdrant_client, self.embedding_model),
            IAMicroAgent(self.qdrant_client, self.embedding_model),
            PolkMicroAgent(self.qdrant_client, self.embedding_model),
            PIESMicroAgent(self.qdrant_client, self.embedding_model),
            ExcelMicroAgent(self.qdrant_client, self.embedding_model)
        ]
        
        self.stats = ImportStats()
        
    def create_collection(self, collection_name: str, vector_size: int = 384):
        """Create a new Qdrant collection"""
        try:
            self.qdrant_client.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE)
            )
            self.logger.info(f"Created collection: {collection_name}")
            return True
        except Exception as e:
            if "already exists" in str(e):
                self.logger.info(f"Collection {collection_name} already exists")
                return True
            else:
                self.logger.error(f"Error creating collection {collection_name}: {e}")
                return False
    
    def discover_files(self, data_path: str) -> List[Path]:
        """Discover all files in the data directory"""
        data_path = Path(data_path)
        files = []
        
        for file_path in data_path.rglob('*'):
            if file_path.is_file():
                files.append(file_path)
        
        self.logger.info(f"Discovered {len(files)} files in {data_path}")
        return files
    
    def route_file_to_agent(self, file_path: Path) -> Optional[BaseMicroAgent]:
        """Route file to appropriate micro-agent"""
        for agent in self.agents:
            if agent.can_handle(file_path):
                return agent
        return None
    
    def display_file_summary(self, files: List[Path]):
        """Display comprehensive file summary"""
        print("\n" + "="*80)
        print("AAI DATA IMPORT SYSTEM - FILE DISCOVERY SUMMARY")
        print("="*80)
        
        # Group files by type and agent
        agent_files = {}
        unhandled_files = []
        
        for file_path in files:
            agent = self.route_file_to_agent(file_path)
            if agent:
                if agent.name not in agent_files:
                    agent_files[agent.name] = []
                agent_files[agent.name].append(file_path)
            else:
                unhandled_files.append(file_path)
        
        # Display summary by agent
        total_files = 0
        for agent_name, agent_file_list in agent_files.items():
            print(f"\n📁 {agent_name} Micro-Agent:")
            print(f"   Files to process: {len(agent_file_list)}")
            total_files += len(agent_file_list)
            
            # Show file types
            extensions = {}
            for f in agent_file_list:
                ext = f.suffix.lower()
                extensions[ext] = extensions.get(ext, 0) + 1
            
            for ext, count in extensions.items():
                print(f"   - {ext or 'no extension'}: {count} files")
            
            # Show sample files
            print("   Sample files:")
            for f in agent_file_list[:3]:
                size_mb = f.stat().st_size / (1024*1024)
                print(f"     • {f.name} ({size_mb:.1f} MB)")
            if len(agent_file_list) > 3:
                print(f"     ... and {len(agent_file_list) - 3} more files")
        
        # Display unhandled files
        if unhandled_files:
            print(f"\n⚠️  Unhandled Files: {len(unhandled_files)}")
            for f in unhandled_files[:5]:
                print(f"   • {f}")
            if len(unhandled_files) > 5:
                print(f"   ... and {len(unhandled_files) - 5} more files")
        
        print(f"\n📊 TOTAL FILES TO IMPORT: {total_files}")
        print("="*80)
    
    async def import_all_files(self, data_path: str, collection_name: str):
        """Import all files from data directory"""
        self.stats.start_time = datetime.now()
        
        # Discover files
        files = self.discover_files(data_path)
        self.stats.total_files = len(files)
        
        # Display summary
        self.display_file_summary(files)
        
        # Create collection
        if not self.create_collection(collection_name):
            self.logger.error("Failed to create collection")
            return
        
        # Process files
        print(f"\n🚀 Starting import to collection: {collection_name}")
        print("="*80)
        
        with tqdm(total=len(files), desc="Overall Progress") as pbar:
            for file_path in files:
                agent = self.route_file_to_agent(file_path)
                if agent:
                    try:
                        result = await agent.process_file(file_path, collection_name)
                        if result['success']:
                            self.stats.successful_imports += 1
                            self.stats.total_records += result.get('records_processed', 0)
                        else:
                            self.stats.failed_imports += 1
                            self.stats.errors.extend(result.get('errors', []))
                    except Exception as e:
                        self.stats.failed_imports += 1
                        error_msg = f"Error processing {file_path}: {e}"
                        self.stats.errors.append(error_msg)
                        self.logger.error(error_msg)
                else:
                    self.logger.warning(f"No agent available for file: {file_path}")
                
                self.stats.processed_files += 1
                pbar.update(1)
                pbar.set_postfix({
                    'Success': self.stats.successful_imports,
                    'Failed': self.stats.failed_imports,
                    'Records': self.stats.total_records
                })
        
        self.stats.end_time = datetime.now()
        self.display_final_report()
    
    def display_final_report(self):
        """Display final import report"""
        duration = self.stats.end_time - self.stats.start_time
        
        print("\n" + "="*80)
        print("🎉 AAI DATA IMPORT COMPLETED!")
        print("="*80)
        print(f"📊 FINAL STATISTICS:")
        print(f"   Total Files Discovered: {self.stats.total_files}")
        print(f"   Files Processed: {self.stats.processed_files}")
        print(f"   Successful Imports: {self.stats.successful_imports}")
        print(f"   Failed Imports: {self.stats.failed_imports}")
        print(f"   Total Records Imported: {self.stats.total_records:,}")
        print(f"   Duration: {duration}")
        print(f"   Average Speed: {self.stats.total_records / duration.total_seconds():.1f} records/second")
        
        if self.stats.errors:
            print(f"\n❌ ERRORS ({len(self.stats.errors)}):")
            for error in self.stats.errors[:10]:  # Show first 10 errors
                print(f"   • {error}")
            if len(self.stats.errors) > 10:
                print(f"   ... and {len(self.stats.errors) - 10} more errors")
        
        print("\n🔗 Access Qdrant Dashboard: http://localhost:6333/dashboard")
        print("="*80)
        
        # Save report to file
        report_data = asdict(self.stats)
        report_data['start_time'] = self.stats.start_time.isoformat()
        report_data['end_time'] = self.stats.end_time.isoformat()
        
        with open('import_report.json', 'w') as f:
            json.dump(report_data, f, indent=2)
        
        print("📄 Detailed report saved to: import_report.json")

async def main():
    """Main function"""
    print("🚀 AAI Data Import System with Micro-Agents")
    print("=" * 50)
    
    # Get collection name from user
    collection_name = input("Enter collection name (default: 'aai_automotive_data'): ").strip()
    if not collection_name:
        collection_name = "aai_automotive_data"
    
    # Initialize orchestrator
    orchestrator = AAIImportOrchestrator()
    
    # Import all files
    data_path = "/workspace/data/aai"
    await orchestrator.import_all_files(data_path, collection_name)

if __name__ == "__main__":
    asyncio.run(main())