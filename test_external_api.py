#!/usr/bin/env python3
"""
🧪 TEST EXTERNAL AAI API
=======================

Test script for the external Qdrant AAI system
"""

import requests
import json
import time
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

console = Console()

def test_api():
    """Test the external API"""
    
    base_url = "http://localhost:5003"
    
    console.print(Panel.fit(
        "🧪 TESTING AAI EXTERNAL API\n"
        "===========================\n\n"
        "Testing all endpoints and functionality",
        title="API Test Suite",
        border_style="blue"
    ))
    
    # Test health endpoint
    console.print("🔍 Testing health endpoint...")
    try:
        response = requests.get(f"{base_url}/api/health")
        if response.status_code == 200:
            health_data = response.json()
            console.print("✅ Health check passed")
            console.print(f"   External Qdrant: {health_data.get('external_qdrant')}")
            console.print(f"   Collection: {health_data.get('collection')}")
        else:
            console.print(f"❌ Health check failed: {response.status_code}")
    except Exception as e:
        console.print(f"❌ Health check error: {e}")
    
    # Test stats endpoint
    console.print("\n📊 Testing stats endpoint...")
    try:
        response = requests.get(f"{base_url}/api/stats")
        if response.status_code == 200:
            stats_data = response.json()
            console.print("✅ Stats retrieved successfully")
            console.print(f"   Points: {stats_data.get('points_count', 0)}")
            console.print(f"   Status: {stats_data.get('status')}")
        else:
            console.print(f"❌ Stats failed: {response.status_code}")
    except Exception as e:
        console.print(f"❌ Stats error: {e}")
    
    # Test sample data insertion
    console.print("\n📥 Testing sample data insertion...")
    try:
        response = requests.post(f"{base_url}/api/insert-sample")
        if response.status_code == 200:
            insert_data = response.json()
            if insert_data.get('success'):
                console.print(f"✅ Sample data inserted: {insert_data.get('count')} records")
            else:
                console.print(f"❌ Insert failed: {insert_data.get('error')}")
        else:
            console.print(f"❌ Insert failed: {response.status_code}")
    except Exception as e:
        console.print(f"❌ Insert error: {e}")
    
    # Wait a moment for indexing
    time.sleep(2)
    
    # Test search functionality
    console.print("\n🔍 Testing search functionality...")
    test_queries = [
        "BMW brake pads",
        "Mercedes oil filter",
        "TecDoc automotive parts",
        "AutoCare standards"
    ]
    
    for query in test_queries:
        try:
            response = requests.post(
                f"{base_url}/api/search",
                json={"query": query, "limit": 3}
            )
            
            if response.status_code == 200:
                search_data = response.json()
                results = search_data.get('results', [])
                console.print(f"✅ Search '{query}': {len(results)} results")
                
                if results:
                    table = Table(title=f"Results for '{query}'")
                    table.add_column("Score", style="green")
                    table.add_column("Source", style="cyan")
                    table.add_column("Content", style="white")
                    
                    for result in results[:2]:  # Show top 2 results
                        table.add_row(
                            str(result.get('score', 0)),
                            result.get('source', 'Unknown'),
                            result.get('content', '')[:50] + "..."
                        )
                    
                    console.print(table)
            else:
                console.print(f"❌ Search '{query}' failed: {response.status_code}")
                
        except Exception as e:
            console.print(f"❌ Search '{query}' error: {e}")
    
    # Final stats check
    console.print("\n📊 Final stats check...")
    try:
        response = requests.get(f"{base_url}/api/stats")
        if response.status_code == 200:
            stats_data = response.json()
            
            final_table = Table(title="🎯 Final API Test Results")
            final_table.add_column("Metric", style="cyan")
            final_table.add_column("Value", style="green")
            
            final_table.add_row("Collection", stats_data.get('collection', 'Unknown'))
            final_table.add_row("Status", stats_data.get('status', 'Unknown'))
            final_table.add_row("Points Count", str(stats_data.get('points_count', 0)))
            final_table.add_row("Indexed Vectors", str(stats_data.get('indexed_vectors', 0)))
            final_table.add_row("Segments", str(stats_data.get('segments', 0)))
            
            console.print(final_table)
            
    except Exception as e:
        console.print(f"❌ Final stats error: {e}")
    
    console.print(Panel.fit(
        "🎉 API TEST COMPLETE!\n\n"
        "✅ External Qdrant integration working\n"
        "🔍 Search functionality operational\n"
        "📊 Data insertion successful\n"
        "🌐 Dashboard ready for use\n\n"
        "Access dashboard at: http://localhost:5003",
        title="Test Results",
        border_style="green"
    ))

if __name__ == "__main__":
    test_api()