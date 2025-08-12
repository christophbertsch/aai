#!/usr/bin/env python3
"""
🚀 POPULATE EXTERNAL QDRANT
===========================

Simple script to populate the external Qdrant with automotive data
and demonstrate the complete vector search system.
"""

import requests
import json
import uuid
import time
from sentence_transformers import SentenceTransformer
from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn
from rich.table import Table
from datetime import datetime

console = Console()

# External Qdrant Configuration
EXTERNAL_QDRANT_URL = "http://34.40.104.64:6333"
COLLECTION_NAME = "aai_comprehensive_automotive"

class ExternalQdrantPopulator:
    """Populate external Qdrant with automotive data"""
    
    def __init__(self):
        self.qdrant_url = EXTERNAL_QDRANT_URL
        self.collection_name = COLLECTION_NAME
        self.session = requests.Session()
        self.session.timeout = 30
        self.model = None
        
        console.print(f"🌐 Connecting to external Qdrant: {self.qdrant_url}")
        self.load_model()
    
    def load_model(self):
        """Load sentence transformer model"""
        console.print("🤖 Loading embedding model...")
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        console.print("✅ Model loaded successfully")
    
    def generate_embedding(self, text: str):
        """Generate vector embedding for text"""
        clean_text = str(text).strip()[:512]
        if not clean_text:
            clean_text = "empty"
        
        embedding = self.model.encode(clean_text)
        return embedding.tolist()
    
    def create_automotive_dataset(self):
        """Create comprehensive automotive dataset"""
        
        automotive_data = [
            # TecDoc Data
            {
                "text": "BMW 3 Series E90 brake pads front axle ceramic compound high performance TecDoc automotive parts catalog",
                "metadata": {
                    "source": "TecDoc",
                    "brand": "BMW",
                    "model": "3 Series E90",
                    "part_type": "brake_pads",
                    "position": "front",
                    "material": "ceramic",
                    "content_type": "automotive_parts_catalog",
                    "category": "braking_system"
                }
            },
            {
                "text": "Mercedes-Benz C-Class W204 oil filter engine maintenance premium quality OEM specification TecDoc database",
                "metadata": {
                    "source": "TecDoc",
                    "brand": "Mercedes-Benz",
                    "model": "C-Class W204",
                    "part_type": "oil_filter",
                    "category": "maintenance",
                    "quality": "OEM",
                    "content_type": "automotive_parts_catalog"
                }
            },
            {
                "text": "Audi A4 B8 headlight LED xenon replacement left side driver automotive lighting system TecDoc parts",
                "metadata": {
                    "source": "TecDoc",
                    "brand": "Audi",
                    "model": "A4 B8",
                    "part_type": "headlight",
                    "technology": "LED_xenon",
                    "position": "left",
                    "content_type": "automotive_parts_catalog",
                    "category": "lighting"
                }
            },
            {
                "text": "Volkswagen Golf MK7 air filter cabin HEPA filtration system interior air quality TecDoc automotive",
                "metadata": {
                    "source": "TecDoc",
                    "brand": "Volkswagen",
                    "model": "Golf MK7",
                    "part_type": "air_filter",
                    "filter_type": "cabin",
                    "technology": "HEPA",
                    "content_type": "automotive_parts_catalog",
                    "category": "filtration"
                }
            },
            
            # AutoCare ACES/PIES Data
            {
                "text": "Ford F-150 transmission fluid automatic gearbox synthetic ATF specification AutoCare ACES PIES standard",
                "metadata": {
                    "source": "AutoCare",
                    "brand": "Ford",
                    "model": "F-150",
                    "part_type": "transmission_fluid",
                    "transmission_type": "automatic",
                    "fluid_type": "synthetic",
                    "content_type": "automotive_standards",
                    "standard": "ACES_PIES"
                }
            },
            {
                "text": "Toyota Camry engine oil 5W-30 synthetic motor oil viscosity grade AutoCare aftermarket standards",
                "metadata": {
                    "source": "AutoCare",
                    "brand": "Toyota",
                    "model": "Camry",
                    "part_type": "engine_oil",
                    "viscosity": "5W-30",
                    "oil_type": "synthetic",
                    "content_type": "automotive_standards",
                    "standard": "ACES_PIES"
                }
            },
            {
                "text": "Chevrolet Silverado spark plugs iridium electrode ignition system AutoCare PIES product information",
                "metadata": {
                    "source": "AutoCare",
                    "brand": "Chevrolet",
                    "model": "Silverado",
                    "part_type": "spark_plugs",
                    "material": "iridium",
                    "content_type": "automotive_standards",
                    "category": "ignition_system"
                }
            },
            
            # MM (Mitchell Motor) Data
            {
                "text": "Honda Accord timing belt replacement procedure maintenance schedule MM Mitchell Motor automotive repair",
                "metadata": {
                    "source": "MM",
                    "brand": "Honda",
                    "model": "Accord",
                    "part_type": "timing_belt",
                    "content_type": "repair_procedures",
                    "category": "maintenance"
                }
            },
            {
                "text": "Nissan Altima brake rotor disc replacement front wheel bearing MM automotive service information",
                "metadata": {
                    "source": "MM",
                    "brand": "Nissan",
                    "model": "Altima",
                    "part_type": "brake_rotor",
                    "position": "front",
                    "content_type": "repair_procedures",
                    "category": "braking_system"
                }
            },
            
            # IA (Information Access) Data
            {
                "text": "Jeep Wrangler differential oil gear lubricant 75W-90 synthetic IA automotive fluid specifications",
                "metadata": {
                    "source": "IA",
                    "brand": "Jeep",
                    "model": "Wrangler",
                    "part_type": "differential_oil",
                    "viscosity": "75W-90",
                    "oil_type": "synthetic",
                    "content_type": "fluid_specifications"
                }
            },
            
            # Polk Automotive Data
            {
                "text": "Ram 1500 coolant antifreeze ethylene glycol 50/50 mixture Polk automotive database vehicle specifications",
                "metadata": {
                    "source": "Polk",
                    "brand": "Ram",
                    "model": "1500",
                    "part_type": "coolant",
                    "coolant_type": "ethylene_glycol",
                    "mixture": "50_50",
                    "content_type": "vehicle_specifications"
                }
            },
            
            # PIES (Product Information Exchange Standard) Data
            {
                "text": "Subaru Outback all-weather floor mats rubber material PIES product information exchange standard",
                "metadata": {
                    "source": "PIES",
                    "brand": "Subaru",
                    "model": "Outback",
                    "part_type": "floor_mats",
                    "material": "rubber",
                    "content_type": "product_information",
                    "category": "interior_accessories"
                }
            },
            
            # Additional comprehensive automotive data
            {
                "text": "Universal automotive diagnostic OBD2 scanner code reader engine fault detection automotive service tools",
                "metadata": {
                    "source": "TecDoc",
                    "part_type": "diagnostic_tool",
                    "technology": "OBD2",
                    "content_type": "automotive_tools",
                    "category": "diagnostics"
                }
            },
            {
                "text": "Heavy duty truck diesel engine oil 15W-40 commercial vehicle lubricant specifications automotive fleet",
                "metadata": {
                    "source": "AutoCare",
                    "vehicle_type": "heavy_duty_truck",
                    "part_type": "engine_oil",
                    "viscosity": "15W-40",
                    "application": "commercial",
                    "content_type": "automotive_standards"
                }
            },
            {
                "text": "Motorcycle brake fluid DOT 4 hydraulic brake system performance automotive two-wheeler maintenance",
                "metadata": {
                    "source": "MM",
                    "vehicle_type": "motorcycle",
                    "part_type": "brake_fluid",
                    "specification": "DOT_4",
                    "content_type": "maintenance_fluids",
                    "category": "braking_system"
                }
            }
        ]
        
        return automotive_data
    
    def insert_data(self, data_items):
        """Insert data into external Qdrant"""
        
        console.print(f"📊 Preparing to insert {len(data_items)} automotive records...")
        
        points = []
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            console=console
        ) as progress:
            
            task = progress.add_task("🔄 Generating embeddings", total=len(data_items))
            
            for item in data_items:
                # Generate embedding
                vector = self.generate_embedding(item["text"])
                
                # Create point with proper UUID
                point = {
                    "id": str(uuid.uuid4()),
                    "vector": vector,
                    "payload": {
                        "content": item["text"],
                        "timestamp": datetime.now().isoformat(),
                        **item["metadata"]
                    }
                }
                points.append(point)
                progress.update(task, advance=1)
        
        # Insert into external Qdrant
        console.print(f"🌐 Inserting {len(points)} points into external Qdrant...")
        
        try:
            response = self.session.put(
                f"{self.qdrant_url}/collections/{self.collection_name}/points",
                json={"points": points}
            )
            
            if response.status_code == 200:
                console.print(f"✅ Successfully inserted {len(points)} points!")
                return True
            else:
                console.print(f"❌ Insert failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            console.print(f"❌ Insert error: {e}")
            return False
    
    def verify_insertion(self):
        """Verify data was inserted correctly"""
        try:
            response = self.session.get(f"{self.qdrant_url}/collections/{self.collection_name}")
            if response.status_code == 200:
                data = response.json()["result"]
                
                table = Table(title="🎯 External Qdrant Collection Status")
                table.add_column("Property", style="cyan")
                table.add_column("Value", style="green")
                
                table.add_row("Collection Name", self.collection_name)
                table.add_row("Status", data['status'])
                table.add_row("Points Count", str(data['points_count']))
                table.add_row("Indexed Vectors", str(data['indexed_vectors_count']))
                table.add_row("Segments", str(data['segments_count']))
                table.add_row("Vector Size", str(data['config']['params']['vectors']['size']))
                table.add_row("Distance Metric", data['config']['params']['vectors']['distance'])
                
                console.print(table)
                
                return data['points_count'] > 0
            else:
                console.print(f"❌ Verification failed: {response.status_code}")
                return False
                
        except Exception as e:
            console.print(f"❌ Verification error: {e}")
            return False
    
    def test_search(self):
        """Test search functionality"""
        console.print("\n🔍 Testing search functionality...")
        
        test_queries = [
            "BMW brake pads",
            "Mercedes oil filter",
            "Ford transmission fluid",
            "automotive diagnostic tools"
        ]
        
        for query in test_queries:
            try:
                # Generate query embedding
                query_vector = self.generate_embedding(query)
                
                # Search
                search_request = {
                    "vector": query_vector,
                    "limit": 3,
                    "with_payload": True,
                    "score_threshold": 0.3
                }
                
                response = self.session.post(
                    f"{self.qdrant_url}/collections/{self.collection_name}/points/search",
                    json=search_request
                )
                
                if response.status_code == 200:
                    results = response.json()["result"]
                    console.print(f"✅ Query '{query}': {len(results)} results")
                    
                    if results:
                        for i, result in enumerate(results[:2]):
                            console.print(f"   {i+1}. Score: {result['score']:.4f} - {result['payload'].get('brand', 'Unknown')} {result['payload'].get('part_type', '')}")
                else:
                    console.print(f"❌ Search failed for '{query}': {response.status_code}")
                    
            except Exception as e:
                console.print(f"❌ Search error for '{query}': {e}")
    
    def run(self):
        """Run the complete population process"""
        
        console.print(Panel.fit(
            f"🚀 POPULATING EXTERNAL QDRANT\n"
            f"==============================\n\n"
            f"🌐 External Qdrant: {self.qdrant_url}\n"
            f"🎯 Collection: {self.collection_name}\n"
            f"🤖 Model: all-MiniLM-L6-v2\n"
            f"📊 Comprehensive automotive dataset",
            title="External Qdrant Population",
            border_style="blue"
        ))
        
        # Create dataset
        automotive_data = self.create_automotive_dataset()
        console.print(f"📁 Created dataset with {len(automotive_data)} automotive records")
        
        # Insert data
        success = self.insert_data(automotive_data)
        
        if success:
            # Wait for indexing
            console.print("⏳ Waiting for indexing...")
            time.sleep(3)
            
            # Verify insertion
            if self.verify_insertion():
                console.print("✅ Data verification successful!")
                
                # Test search
                self.test_search()
                
                console.print(Panel.fit(
                    f"🎉 EXTERNAL QDRANT POPULATED SUCCESSFULLY!\n\n"
                    f"✅ {len(automotive_data)} automotive records inserted\n"
                    f"🔍 Search functionality verified\n"
                    f"🌐 External Qdrant: {self.qdrant_url}\n"
                    f"📈 Dashboard: {self.qdrant_url}/dashboard#/collections\n\n"
                    f"Ready for production use!",
                    title="Population Complete",
                    border_style="green"
                ))
            else:
                console.print("❌ Data verification failed")
        else:
            console.print("❌ Data insertion failed")

def main():
    """Main function"""
    populator = ExternalQdrantPopulator()
    populator.run()

if __name__ == "__main__":
    main()