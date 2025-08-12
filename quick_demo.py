#!/usr/bin/env python3
"""
Quick Demo - Shows the AAI Import System with small files only
"""

import asyncio
from pathlib import Path
from aai_import_system import AAIImportOrchestrator

async def quick_demo():
    """Run a quick demo with only small files"""
    print("🚀 AAI Import System - QUICK DEMO")
    print("=" * 50)
    
    orchestrator = AAIImportOrchestrator()
    collection_name = "aai_quick_demo"
    
    # Create collection
    print(f"📦 Creating collection: {collection_name}")
    orchestrator.create_collection(collection_name)
    
    # Select only small files
    demo_files = [
        Path("/workspace/data/aai/MM/MM20240619-164553-839_TEST.xml"),
        Path("/workspace/data/aai/Autocare/AutoCare_PCdb_enUS_ASCII_20250227/Categories.txt"),
    ]
    
    existing_files = [f for f in demo_files if f.exists()]
    
    print(f"\n📋 Processing {len(existing_files)} small files:")
    for f in existing_files:
        size_mb = f.stat().st_size / (1024*1024)
        agent = orchestrator.route_file_to_agent(f)
        print(f"   • {f.name} ({size_mb:.1f} MB) → {agent.name if agent else 'Unknown'} Agent")
    
    total_records = 0
    for file_path in existing_files:
        agent = orchestrator.route_file_to_agent(file_path)
        if agent:
            print(f"\n🤖 {agent.name} Agent processing: {file_path.name}")
            result = await agent.process_file(file_path, collection_name)
            if result['success']:
                records = result.get('records_processed', 0)
                total_records += records
                print(f"   ✅ Success! Imported {records:,} records")
            else:
                print(f"   ❌ Failed: {result.get('errors', ['Unknown error'])}")
    
    # Show final results
    print(f"\n🎉 Quick Demo Complete!")
    print(f"📊 Total Records Imported: {total_records:,}")
    
    # Show collection info
    try:
        collection_info = orchestrator.qdrant_client.get_collection(collection_name)
        print(f"📊 Collection Points: {collection_info.points_count:,}")
    except Exception as e:
        print(f"⚠️  Could not get collection info: {e}")

if __name__ == "__main__":
    asyncio.run(quick_demo())