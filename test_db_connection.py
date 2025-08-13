#!/usr/bin/env python3
"""
Test PostgreSQL database connection
"""

import psycopg2
import sys

# Database Configuration
DB_CONFIG = {
    'host': '34.107.63.251',
    'port': '5432',
    'database': 'postgres',
    'user': 'postgres',
    'password': '<o8-x_@8smbXhI.V',
}

def test_connection():
    """Test database connection with provided password"""
    
    # Use the provided password
    passwords_to_try = [
        DB_CONFIG['password'],
    ]
    
    print("Testing PostgreSQL connection...")
    print(f"Host: {DB_CONFIG['host']}")
    print(f"Port: {DB_CONFIG['port']}")
    print(f"Database: {DB_CONFIG['database']}")
    print(f"User: {DB_CONFIG['user']}")
    print()
    
    for password in passwords_to_try:
        try:
            print(f"Trying password: {'(empty)' if password == '' else '***'}")
            
            conn = psycopg2.connect(
                host=DB_CONFIG['host'],
                port=DB_CONFIG['port'],
                database=DB_CONFIG['database'],
                user=DB_CONFIG['user'],
                password=password,
                connect_timeout=10
            )
            
            cursor = conn.cursor()
            cursor.execute("SELECT version();")
            version = cursor.fetchone()[0]
            
            print(f"✅ SUCCESS! Connected to PostgreSQL")
            print(f"Version: {version}")
            print(f"Password: {'(empty)' if password == '' else password}")
            
            # Test creating a simple table
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
            
            return password
            
        except psycopg2.OperationalError as e:
            print(f"❌ Connection failed: {e}")
        except Exception as e:
            print(f"❌ Error: {e}")
    
    print("\n❌ All connection attempts failed!")
    return None

if __name__ == "__main__":
    password = test_connection()
    if password is not None:
        print(f"\n🎉 Use this password for the import: {password if password else '(empty)'}")
        sys.exit(0)
    else:
        print("\n💡 Please check:")
        print("1. Database server is running")
        print("2. Firewall allows connections")
        print("3. Correct host/port/database/user")
        print("4. Password authentication method")
        sys.exit(1)