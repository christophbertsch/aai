# PostgreSQL Setup Guide for TecDoc Import

## Current Connection Issue

The PostgreSQL database at `34.107.63.251:5432` is not accessible due to connection timeout. This typically indicates network/firewall restrictions.

## Troubleshooting Steps

### 1. Check Google Cloud SQL Instance Settings

```bash
# Check if the instance allows external connections
gcloud sql instances describe postgresql-0711-ai --project=your-project-id
```

### 2. Configure Authorized Networks

In Google Cloud Console:
1. Go to SQL → Instances → postgresql-0711-ai
2. Click "Connections" tab
3. Under "Authorized networks", add your IP address:
   - Name: "Import Server"
   - Network: `0.0.0.0/0` (for testing) or specific IP
   - Save changes

### 3. Verify PostgreSQL Configuration

Connect to the instance and check:

```sql
-- Check listen_addresses
SHOW listen_addresses;

-- Check current connections
SELECT * FROM pg_stat_activity;

-- Check pg_hba.conf settings
SELECT * FROM pg_hba_file_rules;
```

### 4. Test Connection from Different Location

```bash
# Test from local machine
psql -h 34.107.63.251 -p 5432 -U postgres -d postgres

# Test with telnet
telnet 34.107.63.251 5432
```

### 5. Alternative: Use Cloud SQL Proxy

```bash
# Download Cloud SQL Proxy
wget https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64 -O cloud_sql_proxy
chmod +x cloud_sql_proxy

# Start proxy (replace with your connection name)
./cloud_sql_proxy -instances=universe-vm:europe-west3:postgresql-0711-ai=tcp:5432
```

## Quick Fix Options

### Option 1: Enable Public IP Access

1. Go to Google Cloud Console
2. SQL → Instances → postgresql-0711-ai
3. Edit instance
4. Connections → Public IP → Enable
5. Add authorized network: `0.0.0.0/0`
6. Save and restart instance

### Option 2: Use Private IP with VPN

1. Set up VPN connection to your VPC
2. Use private IP: Connect through internal network
3. Update connection string to use private IP

### Option 3: Use Cloud SQL Proxy

Most secure option - creates encrypted tunnel:

```python
# Update connection string to use proxy
DB_CONFIG = {
    'host': '127.0.0.1',  # Proxy local endpoint
    'port': '5432',
    'database': 'postgres',
    'user': 'postgres',
    'password': '<o8-x_@8smbXhI.V',
}
```

## Recommended Production Setup

### 1. Create Dedicated Database

```sql
-- Connect as postgres user
CREATE DATABASE tecdoc_automotive;
CREATE USER tecdoc_importer WITH PASSWORD 'secure_random_password';
GRANT ALL PRIVILEGES ON DATABASE tecdoc_automotive TO tecdoc_importer;

-- Switch to new database
\c tecdoc_automotive;

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO tecdoc_importer;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO tecdoc_importer;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO tecdoc_importer;
```

### 2. Optimize for Large Imports

```sql
-- Increase work_mem for import operations
SET work_mem = '256MB';

-- Disable autovacuum during import
ALTER TABLE tecdoc_articles SET (autovacuum_enabled = false);

-- Increase checkpoint_segments
SET checkpoint_segments = 32;

-- Increase wal_buffers
SET wal_buffers = '16MB';
```

### 3. Update Import Script Configuration

```python
DB_CONFIG = {
    'host': '34.107.63.251',
    'port': '5432',
    'database': 'tecdoc_automotive',  # New dedicated database
    'user': 'tecdoc_importer',        # New dedicated user
    'password': 'secure_random_password',
}
```

## Testing the Fix

Once connection is established:

```bash
# Test connection
python test_db_connection.py

# Import one brand for testing
python tecdoc_sql_importer.py --max-archives 1 --brand "0001"

# Verify data
python -c "
import psycopg2
conn = psycopg2.connect(
    host='34.107.63.251',
    port='5432',
    database='tecdoc_automotive',
    user='tecdoc_importer',
    password='secure_random_password'
)
cursor = conn.cursor()
cursor.execute('SELECT COUNT(*) FROM tecdoc_articles')
print(f'Articles imported: {cursor.fetchone()[0]:,}')
conn.close()
"
```

## Performance Tuning for Large Imports

### 1. Batch Size Optimization

```python
# In tecdoc_sql_importer.py, adjust batch size based on available memory
batch_size = 5000  # Increase from 1000 for better performance
```

### 2. Disable Indexes During Import

```sql
-- Drop indexes before import
DROP INDEX IF EXISTS idx_tecdoc_articles_brand_no;
DROP INDEX IF EXISTS idx_tecdoc_articles_art_no;

-- Recreate after import
CREATE INDEX idx_tecdoc_articles_brand_no ON tecdoc_articles(brand_no);
CREATE INDEX idx_tecdoc_articles_art_no ON tecdoc_articles(art_no);
```

### 3. Use COPY Instead of INSERT

For maximum performance, consider using PostgreSQL's COPY command:

```python
# Example modification for bulk import
import io
import csv

def bulk_import_with_copy(self, table_name, records):
    """Use COPY for faster bulk imports"""
    if not records:
        return
    
    # Create CSV buffer
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    
    # Write records to buffer
    for record in records:
        writer.writerow(record.values())
    
    # Reset buffer position
    buffer.seek(0)
    
    # Use COPY command
    cursor = self.conn.cursor()
    cursor.copy_from(
        buffer, 
        table_name, 
        columns=list(records[0].keys()),
        sep=','
    )
    self.conn.commit()
```

## Security Considerations

### 1. Network Security

- Use SSL connections: `sslmode=require`
- Restrict IP access to specific ranges
- Use VPN or private networks when possible

### 2. Authentication

- Use strong passwords
- Create dedicated users with minimal privileges
- Rotate passwords regularly

### 3. Data Protection

- Enable encryption at rest
- Use SSL for data in transit
- Regular backups with encryption

## Monitoring and Maintenance

### 1. Import Monitoring

```sql
-- Monitor import progress
SELECT 
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_tup_ins DESC;
```

### 2. Performance Monitoring

```sql
-- Check table sizes
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size(tablename::regclass)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(tablename::regclass) DESC;
```

### 3. Maintenance Tasks

```sql
-- After import completion
VACUUM ANALYZE;
REINDEX DATABASE tecdoc_automotive;
UPDATE pg_stat_user_tables SET n_tup_ins = 0, n_tup_upd = 0, n_tup_del = 0;
```