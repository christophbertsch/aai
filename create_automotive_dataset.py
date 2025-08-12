#!/usr/bin/env python3
"""
Create comprehensive automotive dataset for import
"""

import json
import csv
import os
from pathlib import Path

# Create data directory
data_dir = Path("/workspace/aai/automotive_data")
data_dir.mkdir(exist_ok=True)

# 1. TecDoc-style parts data
tecdoc_data = []
for i in range(1000):
    tecdoc_data.append({
        "part_id": f"TD{i:06d}",
        "part_name": f"Brake Pad Set {i}",
        "manufacturer": ["Bosch", "Brembo", "ATE", "Textar", "Ferodo"][i % 5],
        "category": ["Brake System", "Engine", "Suspension", "Electrical", "Transmission"][i % 5],
        "vehicle_compatibility": f"BMW 3 Series, Audi A4, Mercedes C-Class",
        "price": round(29.99 + (i * 0.5), 2),
        "description": f"High-quality brake pad set for premium vehicles. Part number TD{i:06d}.",
        "specifications": {
            "material": "Ceramic",
            "thickness": "12mm",
            "width": "150mm",
            "height": "60mm"
        }
    })

with open(data_dir / "tecdoc_parts.json", "w") as f:
    json.dump(tecdoc_data, f, indent=2)

# 2. AutoCare compatibility data
autocare_data = []
for i in range(500):
    autocare_data.append({
        "part_number": f"AC{i:05d}",
        "vehicle_year": 2015 + (i % 10),
        "make": ["BMW", "Mercedes", "Audi", "Volkswagen", "Porsche"][i % 5],
        "model": ["3 Series", "C-Class", "A4", "Golf", "911"][i % 5],
        "engine": f"{1.8 + (i % 4) * 0.2}L",
        "compatibility_notes": f"Compatible with model year {2015 + (i % 10)} and later",
        "fitment_type": ["Direct Fit", "Universal", "Modified"][i % 3]
    })

with open(data_dir / "autocare_compatibility.csv", "w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=autocare_data[0].keys())
    writer.writeheader()
    writer.writerows(autocare_data)

# 3. Motor Manager XML-style data
mm_xml_content = """<?xml version="1.0" encoding="UTF-8"?>
<MotorManager>
    <VehicleDatabase>
        <Vehicle id="1">
            <Make>BMW</Make>
            <Model>3 Series</Model>
            <Year>2020</Year>
            <Engine>2.0L Turbo</Engine>
            <Transmission>8-Speed Automatic</Transmission>
            <Parts>
                <Part id="BP001" category="Brakes">Brake Pad Set Front</Part>
                <Part id="BP002" category="Brakes">Brake Disc Set Front</Part>
                <Part id="OF001" category="Engine">Oil Filter</Part>
            </Parts>
        </Vehicle>
        <Vehicle id="2">
            <Make>Mercedes</Make>
            <Model>C-Class</Model>
            <Year>2019</Year>
            <Engine>1.8L Turbo</Engine>
            <Transmission>7-Speed Automatic</Transmission>
            <Parts>
                <Part id="BP003" category="Brakes">Brake Pad Set Rear</Part>
                <Part id="AF001" category="Engine">Air Filter</Part>
            </Parts>
        </Vehicle>
    </VehicleDatabase>
</MotorManager>"""

with open(data_dir / "motor_manager_vehicles.xml", "w") as f:
    f.write(mm_xml_content)

# 4. Interchange data
interchange_data = []
for i in range(300):
    interchange_data.append({
        "original_part": f"OEM{i:05d}",
        "interchange_part": f"AFT{i:05d}",
        "manufacturer_original": ["BMW", "Mercedes", "Audi"][i % 3],
        "manufacturer_aftermarket": ["Bosch", "Continental", "Mahle"][i % 3],
        "interchange_type": ["Direct", "Functional", "Modified"][i % 3],
        "notes": f"Aftermarket replacement for OEM part OEM{i:05d}"
    })

with open(data_dir / "interchange_data.csv", "w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=interchange_data[0].keys())
    writer.writeheader()
    writer.writerows(interchange_data)

# 5. Polk vehicle registration data
polk_data = []
for i in range(200):
    polk_data.append({
        "vin": f"WBA3A5C5{i:08d}",
        "year": 2015 + (i % 8),
        "make": ["BMW", "Mercedes", "Audi", "Volkswagen"][i % 4],
        "model": ["3 Series", "C-Class", "A4", "Golf"][i % 4],
        "registration_state": ["CA", "TX", "NY", "FL", "IL"][i % 5],
        "registration_date": f"2020-{(i % 12) + 1:02d}-15",
        "owner_type": ["Individual", "Fleet", "Lease"][i % 3]
    })

with open(data_dir / "polk_registrations.json", "w") as f:
    json.dump(polk_data, f, indent=2)

# 6. PIES technical documentation
pies_data = {
    "product_information": {
        "standard_version": "7.2",
        "products": []
    }
}

for i in range(100):
    pies_data["product_information"]["products"].append({
        "part_number": f"PIES{i:05d}",
        "brand": ["Bosch", "Continental", "Mahle", "Febi"][i % 4],
        "part_terminology": f"Brake Component {i}",
        "product_description": f"High-performance automotive part for brake system applications",
        "hazmat": False,
        "digital_assets": [
            {
                "asset_type": "P04",
                "representation": "A",
                "resolution": "300",
                "color_mode": "RGB",
                "uri": f"https://example.com/images/PIES{i:05d}.jpg"
            }
        ],
        "packages": [
            {
                "package_level": "EA",
                "quantity": 1,
                "dimensions": {
                    "length": 10.5,
                    "width": 8.2,
                    "height": 3.1,
                    "weight": 2.4
                }
            }
        ]
    })

with open(data_dir / "pies_technical.json", "w") as f:
    json.dump(pies_data, f, indent=2)

print(f"✅ Created comprehensive automotive dataset in {data_dir}")
print(f"📊 Files created:")
print(f"   - tecdoc_parts.json (1000 parts)")
print(f"   - autocare_compatibility.csv (500 compatibility records)")
print(f"   - motor_manager_vehicles.xml (vehicle database)")
print(f"   - interchange_data.csv (300 interchange records)")
print(f"   - polk_registrations.json (200 registration records)")
print(f"   - pies_technical.json (100 technical specifications)")