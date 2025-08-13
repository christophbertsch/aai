#!/usr/bin/env python3
"""
Test Google Cloud SQL PostgreSQL connection
"""

import psycopg2
import sys
import os

# Google Cloud SQL Configuration
GCLOUD_SQL_CONFIG = {
    'host': '34.107.63.251',  # Public IP
    'port': '5432',
    'database': 'postgres',
    'user': 'postgres',
    'password': '<o8-x_@8smbXhI.V',
    'sslmode': 'prefer',  # Try SSL first, fallback to non-SSL
}

# Alternative connection via Cloud SQL Proxy (if available)
CLOUD_SQL_PROXY_CONFIG = {
    'host': '127.0.0.1',
    'port': '5432',
    'database': 'postgres',
    'user': 'postgres',
    'password': '<o8-x_@8smbXhI.V',
}

def test_direct_connection():
    """Test direct connection to Cloud SQL"""
    print("🔗 Testing Direct Connection to Google Cloud SQL")
    print("=" * 60)
    print(f"Host: {GCLOUD_SQL_CONFIG['host']}")
    print(f"Port: {GCLOUD_SQL_CONFIG['port']}")
    print(f"Database: {GCLOUD_SQL_CONFIG['database']}")
    print(f"User: {GCLOUD_SQL_CONFIG['user']}")
    print(f"SSL Mode: {GCLOUD_SQL_CONFIG['sslmode']}")
    print()
    
    try:
        # Try with SSL first
        print("Attempting connection with SSL...")
        conn = psycopg2.connect(
            host=GCLOUD_SQL_CONFIG['host'],
            port=GCLOUD_SQL_CONFIG['port'],
            database=GCLOUD_SQL_CONFIG['database'],
            user=GCLOUD_SQL_CONFIG['user'],
            password=GCLOUD_SQL_CONFIG['password'],
            sslmode='require',
            connect_timeout=30
        )
        
        cursor = conn.cursor()
        cursor.execute("SELECT version();")
        version = cursor.fetchone()[0]
        
        print(f"✅ SUCCESS! Connected with SSL")
        print(f"PostgreSQL Version: {version}")
        
        # Test creating a table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS test_connection (
                id SERIAL PRIMARY KEY,
                test_data VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        cursor.execute("INSERT INTO test_connection (test_data) VALUES ('TecDoc Import Test');")
        conn.commit()
        
        cursor.execute("SELECT COUNT(*) FROM test_connection;")
        count = cursor.fetchone()[0]
        print(f"Test table records: {count}")
        
        cursor.execute("DROP TABLE test_connection;")
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return True
        
    except psycopg2.OperationalError as e:
        print(f"❌ SSL Connection failed: {e}")
        
        # Try without SSL
        try:
            print("Attempting connection without SSL...")
            conn = psycopg2.connect(
                host=GCLOUD_SQL_CONFIG['host'],
                port=GCLOUD_SQL_CONFIG['port'],
                database=GCLOUD_SQL_CONFIG['database'],
                user=GCLOUD_SQL_CONFIG['user'],
                password=GCLOUD_SQL_CONFIG['password'],
                sslmode='disable',
                connect_timeout=30
            )
            
            cursor = conn.cursor()
            cursor.execute("SELECT version();")
            version = cursor.fetchone()[0]
            
            print(f"✅ SUCCESS! Connected without SSL")
            print(f"PostgreSQL Version: {version}")
            
            cursor.close()
            conn.close()
            
            return True
            
        except Exception as e2:
            print(f"❌ Non-SSL Connection also failed: {e2}")
            return False
    
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return False

def test_cloud_sql_proxy():
    """Test connection via Cloud SQL Proxy (if running)"""
    print("🔗 Testing Cloud SQL Proxy Connection")
    print("=" * 60)
    
    try:
        conn = psycopg2.connect(
            host=CLOUD_SQL_PROXY_CONFIG['host'],
            port=CLOUD_SQL_PROXY_CONFIG['port'],
            database=CLOUD_SQL_PROXY_CONFIG['database'],
            user=CLOUD_SQL_PROXY_CONFIG['user'],
            password=CLOUD_SQL_PROXY_CONFIG['password'],
            connect_timeout=10
        )
        
        cursor = conn.cursor()
        cursor.execute("SELECT version();")
        version = cursor.fetchone()[0]
        
        print(f"✅ SUCCESS! Connected via Cloud SQL Proxy")
        print(f"PostgreSQL Version: {version}")
        
        cursor.close()
        conn.close()
        
        return True
        
    except Exception as e:
        print(f"❌ Cloud SQL Proxy connection failed: {e}")
        print("💡 Make sure Cloud SQL Proxy is running:")
        print("   cloud_sql_proxy -instances=universe-vm:europe-west3:postgresql-0711-ai=tcp:5432")
        return False

def check_network_connectivity():
    """Check basic network connectivity"""
    print("🌐 Testing Network Connectivity")
    print("=" * 60)
    
    import subprocess
    
    # Test ping
    try:
        result = subprocess.run(['ping', '-c', '3', GCLOUD_SQL_CONFIG['host']], 
                              capture_output=True, text=True, timeout=15)
        if result.returncode == 0:
            print(f"✅ Ping to {GCLOUD_SQL_CONFIG['host']} successful")
        else:
            print(f"❌ Ping to {GCLOUD_SQL_CONFIG['host']} failed")
    except Exception as e:
        print(f"❌ Ping test failed: {e}")
    
    # Test telnet (port connectivity)
    try:
        import socket
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(10)
        result = sock.connect_ex((GCLOUD_SQL_CONFIG['host'], int(GCLOUD_SQL_CONFIG['port'])))
        sock.close()
        
        if result == 0:
            print(f"✅ Port {GCLOUD_SQL_CONFIG['port']} is open on {GCLOUD_SQL_CONFIG['host']}")
        else:
            print(f"❌ Port {GCLOUD_SQL_CONFIG['port']} is closed or filtered on {GCLOUD_SQL_CONFIG['host']}")
    except Exception as e:
        print(f"❌ Port test failed: {e}")

def main():
    """Main function"""
    print("🚀 Google Cloud SQL PostgreSQL Connection Test")
    print("=" * 70)
    print("Instance: universe-vm:europe-west3:postgresql-0711-ai")
    print("Public IP: 34.107.63.251")
    print("SSL: Optional (not required)")
    print()
    
    # Test network connectivity first
    check_network_connectivity()
    print()
    
    # Test direct connection
    direct_success = test_direct_connection()
    print()
    
    # Test Cloud SQL Proxy connection
    proxy_success = test_cloud_sql_proxy()
    print()
    
    # Summary
    print("📋 Connection Test Summary")
    print("=" * 60)
    print(f"Direct Connection: {'✅ SUCCESS' if direct_success else '❌ FAILED'}")
    print(f"Cloud SQL Proxy: {'✅ SUCCESS' if proxy_success else '❌ FAILED'}")
    
    if direct_success or proxy_success:
        print("\n🎉 At least one connection method works!")
        print("You can proceed with the TecDoc import.")
        return True
    else:
        print("\n❌ All connection methods failed.")
        print("\n💡 Troubleshooting suggestions:")
        print("1. Check if your IP is whitelisted in Cloud SQL")
        print("2. Verify the password is correct")
        print("3. Try using Cloud SQL Proxy")
        print("4. Check Google Cloud firewall rules")
        print("5. Ensure the Cloud SQL instance is running")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)