#!/usr/bin/env python3
"""
Demo Import Script - Shows the AAI Import System in action
Imports a small subset of files to demonstrate capabilities
"""

import asyncio
import sys
from pathlib import Path
from aai_import_system import AAIImportOrchestrator

async def demo_import():
    """Run a demo import with a small subset of files"""
    print("🚀 AAI Import System - DEMO MODE")
    print("=" * 60)
    print("This demo will import a small subset of files to showcase")
    print("the micro-agent system capabilities.")
    print("=" * 60)
    
    # Initialize orchestrator
    orchestrator = AAIImportOrchestrator()
    
    # Collection name for demo
    collection_name = "aai_automotive_demo"
    
    # Create collection
    print(f"\n📦 Creating collection: {collection_name}")
    if orchestrator.create_collection(collection_name):
        print("✅ Collection created successfully!")
    else:
        print("❌ Failed to create collection")
        return
    
    # Select demo files (one from each category)
    demo_files = [
        # IA file
        Path("/workspace/data/aai/IA/IAM_OE_VCR.csv"),
        # MM file
        Path("/workspace/data/aai/MM/MM20240619-164553-839_TEST.xml"),
        # Excel file
        Path("/workspace/data/aai/MM/OCAP MM Mapping.xlsx"),
        # Polk file
        Path("/workspace/data/aai/Polk/Polk_Short.csv"),
        # AutoCare files (select a few small ones)
        Path("/workspace/data/aai/Autocare/AutoCare_PCdb_enUS_ASCII_20250227/Categories.txt"),
        Path("/workspace/data/aai/Autocare/AutoCare_PCdb_enUS_ASCII_20250227/Alias.txt"),
    ]
    
    # Filter to existing files
    existing_files = [f for f in demo_files if f.exists()]
    
    print(f"\n📋 Demo files selected: {len(existing_files)}")
    for f in existing_files:
        size_mb = f.stat().st_size / (1024*1024)
        agent = orchestrator.route_file_to_agent(f)
        agent_name = agent.name if agent else "Unknown"
        print(f"   • {f.name} ({size_mb:.1f} MB) → {agent_name} Agent")
    
    # Process files
    print(f"\n🔄 Processing files...")
    print("=" * 60)
    
    total_records = 0
    successful_imports = 0
    
    for file_path in existing_files:
        agent = orchestrator.route_file_to_agent(file_path)
        if agent:
            print(f"\n🤖 {agent.name} Agent processing: {file_path.name}")
            try:
                result = await agent.process_file(file_path, collection_name)
                if result['success']:
                    records = result.get('records_processed', 0)
                    total_records += records
                    successful_imports += 1
                    print(f"   ✅ Success! Imported {records:,} records")
                else:
                    print(f"   ❌ Failed: {result.get('errors', ['Unknown error'])}")
            except Exception as e:
                print(f"   ❌ Error: {e}")
        else:
            print(f"   ⚠️  No agent available for: {file_path.name}")
    
    # Final report
    print("\n" + "=" * 60)
    print("🎉 DEMO IMPORT COMPLETED!")
    print("=" * 60)
    print(f"📊 Files Processed: {len(existing_files)}")
    print(f"📊 Successful Imports: {successful_imports}")
    print(f"📊 Total Records: {total_records:,}")
    print(f"📊 Collection: {collection_name}")
    
    # Show collection info
    try:
        collection_info = orchestrator.qdrant_client.get_collection(collection_name)
        print(f"📊 Collection Status: {collection_info.status}")
        print(f"📊 Vector Count: {collection_info.points_count:,}")
    except Exception as e:
        print(f"⚠️  Could not get collection info: {e}")
    
    print("\n🔗 You can now query the collection using the Qdrant API!")
    print("🔗 API Endpoint: http://localhost:6333")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(demo_import())