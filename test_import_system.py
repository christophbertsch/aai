#!/usr/bin/env python3
"""
Test script for AAI Import System
Shows the file discovery and agent routing capabilities
"""

import asyncio
from pathlib import Path
from aai_import_system import AAIImportOrchestrator

async def test_discovery():
    """Test file discovery and agent routing"""
    print("🔍 Testing AAI Import System - File Discovery")
    print("=" * 60)
    
    orchestrator = AAIImportOrchestrator()
    
    # Discover files
    data_path = "/workspace/data/aai"
    files = orchestrator.discover_files(data_path)
    
    # Display comprehensive summary
    orchestrator.display_file_summary(files)
    
    # Show agent capabilities
    print("\n🤖 MICRO-AGENT CAPABILITIES:")
    print("=" * 60)
    
    for agent in orchestrator.agents:
        print(f"\n📋 {agent.name} Micro-Agent:")
        print(f"   Supported Extensions: {agent.supported_extensions}")
        
        # Count files this agent can handle
        handled_files = [f for f in files if agent.can_handle(f)]
        print(f"   Can Handle: {len(handled_files)} files")
        
        if handled_files:
            print("   Sample Files:")
            for f in handled_files[:3]:
                size_mb = f.stat().st_size / (1024*1024)
                print(f"     • {f.name} ({size_mb:.1f} MB)")
    
    print("\n✅ Discovery test completed!")
    return len(files)

if __name__ == "__main__":
    asyncio.run(test_discovery())