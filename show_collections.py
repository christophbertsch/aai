#!/usr/bin/env python3
"""
Display Qdrant Collections Status
"""

import requests
import json
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich import box

console = Console()

def show_collections():
    """Display all collections and their status"""
    
    try:
        # Get all collections
        response = requests.get("http://localhost:6333/collections")
        if response.status_code == 200:
            data = response.json()
            collections = data['result']['collections']
            
            console.print(Panel.fit(
                f"🎯 QDRANT COLLECTIONS STATUS\n"
                f"Found {len(collections)} collections",
                title="Collections Overview",
                border_style="blue"
            ))
            
            # Create table
            table = Table(title="📊 Collection Details", box=box.ROUNDED)
            table.add_column("Collection Name", style="cyan", no_wrap=True)
            table.add_column("Status", style="green")
            table.add_column("Points", style="yellow")
            table.add_column("Vectors", style="magenta")
            table.add_column("Config", style="white")
            
            for collection in collections:
                name = collection['name']
                
                # Get detailed info for each collection
                detail_response = requests.get(f"http://localhost:6333/collections/{name}")
                if detail_response.status_code == 200:
                    details = detail_response.json()['result']
                    
                    status = details['status']
                    points_count = details['points_count']
                    vectors_count = details['indexed_vectors_count']
                    vector_size = details['config']['params']['vectors']['size']
                    distance = details['config']['params']['vectors']['distance']
                    
                    config_info = f"Size: {vector_size}, Distance: {distance}"
                    
                    # Status emoji
                    status_emoji = "✅" if status == "green" else "⚠️" if status == "yellow" else "❌"
                    
                    table.add_row(
                        name,
                        f"{status_emoji} {status}",
                        str(points_count),
                        str(vectors_count),
                        config_info
                    )
                else:
                    table.add_row(name, "❌ Error", "N/A", "N/A", "N/A")
            
            console.print(table)
            
            # Show specific AAI collection details
            if any(c['name'] == 'aai_comprehensive_automotive' for c in collections):
                console.print("\n🚀 AAI Collection Details:")
                aai_response = requests.get("http://localhost:6333/collections/aai_comprehensive_automotive")
                if aai_response.status_code == 200:
                    aai_data = aai_response.json()['result']
                    
                    details_table = Table(title="🎯 AAI Comprehensive Automotive Collection")
                    details_table.add_column("Property", style="cyan")
                    details_table.add_column("Value", style="green")
                    
                    details_table.add_row("Status", aai_data['status'])
                    details_table.add_row("Optimizer Status", aai_data['optimizer_status'])
                    details_table.add_row("Points Count", str(aai_data['points_count']))
                    details_table.add_row("Indexed Vectors", str(aai_data['indexed_vectors_count']))
                    details_table.add_row("Segments", str(aai_data['segments_count']))
                    details_table.add_row("Vector Size", str(aai_data['config']['params']['vectors']['size']))
                    details_table.add_row("Distance Metric", aai_data['config']['params']['vectors']['distance'])
                    
                    console.print(details_table)
                    
                    console.print(Panel.fit(
                        "✅ Collection is ready for data import!\n"
                        "🔍 Use the import system to add automotive data\n"
                        "🌐 Access via: http://localhost:6333/dashboard#/collections",
                        title="Ready for Use",
                        border_style="green"
                    ))
        else:
            console.print(f"❌ Error connecting to Qdrant: {response.status_code}")
            
    except Exception as e:
        console.print(f"❌ Error: {e}")

if __name__ == "__main__":
    show_collections()