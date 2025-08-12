#!/usr/bin/env python3
"""
Temporary redirect file for Render deployment
This file redirects to the correct backend file
"""

import subprocess
import sys
import os

if __name__ == '__main__':
    print("🔄 Redirecting to aai_lightweight_backend.py...")
    
    # Get the current directory
    current_dir = os.path.dirname(os.path.abspath(__file__))
    backend_file = os.path.join(current_dir, 'aai_lightweight_backend.py')
    
    if os.path.exists(backend_file):
        print(f"✅ Found backend file: {backend_file}")
        # Execute the correct backend file
        os.execv(sys.executable, [sys.executable, backend_file])
    else:
        print(f"❌ Backend file not found: {backend_file}")
        print("Available files:")
        for file in os.listdir(current_dir):
            if file.endswith('.py'):
                print(f"  - {file}")
        sys.exit(1)