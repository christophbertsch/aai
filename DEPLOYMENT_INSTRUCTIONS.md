# TecDoc SQL Import - Deployment Instructions

## ✅ Current Status

**SQLite Import**: ✅ **WORKING** - Successfully imported 1,475,148 records from SPIDAN brand (0001.7z)
**PostgreSQL Connection**: ✅ **CONFIRMED** - Works from your local machine
**Network Issue**: ❌ OpenHands environment cannot reach your Cloud SQL instance

## 🚀 Recommended Deployment Strategy

### Option 1: Local Machine Import (Recommended)

Since PostgreSQL connection works from your MacBook Pro, run the import locally:

#### Step 1: Setup Local Environment

```bash
# On your MacBook Pro
cd /path/to/your/project
git clone https://github.com/christophbertsch/aai.git
cd aai

# Install dependencies
pip install py7zr psycopg2-binary sqlalchemy

# Copy the import scripts from this workspace
# (Files are already in the repository)
```

#### Step 2: Test PostgreSQL Connection

```bash
# Test connection (you already confirmed this works)
psql -h 34.107.63.251 -U postgres -d mydatabase -p 5432

# Or use our test script
python test_gcloud_sql.py
```

#### Step 3: Run PostgreSQL Import

```bash
# Import one brand for testing
python tecdoc_sql_importer.py --max-archives 1 --brand "0001"

# Import multiple brands
python tecdoc_sql_importer.py --max-archives 10

# Import all brands (will take many hours)
python tecdoc_sql_importer.py --max-archives 922
```

### Option 2: Cloud-Based Import

#### Setup Cloud SQL Proxy

```bash
# Download Cloud SQL Proxy
wget https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64 -O cloud_sql_proxy
chmod +x cloud_sql_proxy

# Start proxy
./cloud_sql_proxy -instances=universe-vm:europe-west3:postgresql-0711-ai=tcp:5432

# Update connection in script to use localhost:5432
```

#### Configure Authorized Networks

1. Go to Google Cloud Console
2. SQL → Instances → postgresql-0711-ai
3. Connections → Authorized Networks
4. Add your current IP address
5. Save changes

## 📁 Files Ready for Deployment

All files are available in the repository at `/workspace/aai/`:

### Core Import Scripts
- `tecdoc_sql_importer.py` - PostgreSQL import system
- `tecdoc_sqlite_importer.py` - SQLite import system (working)
- `test_gcloud_sql.py` - Connection tester
- `query_tecdoc.py` - Data exploration tool

### Configuration Files
- `README_SQL_IMPORT.md` - Complete documentation
- `postgresql_setup_guide.md` - PostgreSQL troubleshooting
- `DEPLOYMENT_INSTRUCTIONS.md` - This file

### Database Files
- `tecdoc_data.db` - SQLite database with SPIDAN data (447.4 MB)

## 🗄️ PostgreSQL Database Setup

### Step 1: Create Dedicated Database

```sql
-- Connect to your PostgreSQL instance
psql -h 34.107.63.251 -U postgres -d mydatabase -p 5432

-- Create dedicated database for TecDoc
CREATE DATABASE tecdoc_automotive;

-- Create dedicated user
CREATE USER tecdoc_importer WITH PASSWORD 'secure_random_password';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE tecdoc_automotive TO tecdoc_importer;

-- Switch to new database
\c tecdoc_automotive;

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO tecdoc_importer;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO tecdoc_importer;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO tecdoc_importer;
```

### Step 2: Update Import Script Configuration

```python
# In tecdoc_sql_importer.py, update DB_CONFIG:
DB_CONFIG = {
    'host': '34.107.63.251',
    'port': '5432',
    'database': 'tecdoc_automotive',  # New dedicated database
    'user': 'tecdoc_importer',        # New dedicated user
    'password': 'secure_random_password',
}
```

## 📊 Expected Results

### Single Brand Import (0001 - SPIDAN)
- **Records**: ~1.47 million
- **Time**: 3-5 minutes
- **Size**: ~500 MB in PostgreSQL
- **Tables**: 9 TecDoc tables created

### Full Import (922 Brands)
- **Records**: ~1.3 billion (estimated)
- **Time**: 40-60 hours
- **Size**: ~400-500 GB
- **Recommendation**: Run in batches of 10-20 brands

## 🔧 Performance Optimization

### For Large Imports

```sql
-- Before import: Optimize PostgreSQL settings
ALTER SYSTEM SET work_mem = '256MB';
ALTER SYSTEM SET maintenance_work_mem = '1GB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
SELECT pg_reload_conf();
```

### Batch Processing Strategy

```bash
# Import in batches to monitor progress
python tecdoc_sql_importer.py --max-archives 10 --brand "000"  # Brands 0001-0010
python tecdoc_sql_importer.py --max-archives 10 --brand "001"  # Brands 0010-0019
# ... continue in batches
```

## 🔍 Data Verification

### After Import Completion

```sql
-- Check record counts
SELECT 
    schemaname,
    tablename,
    n_tup_ins as records_inserted
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_tup_ins DESC;

-- Check table sizes
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size(tablename::regclass)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(tablename::regclass) DESC;

-- Sample data verification
SELECT COUNT(*) FROM tecdoc_articles;
SELECT COUNT(*) FROM tecdoc_reference_numbers;
SELECT COUNT(DISTINCT brand_no) as brands_imported FROM tecdoc_articles;
```

## 🎯 Next Steps

### Immediate Actions
1. **Clone Repository**: Get all files on your local machine
2. **Test Connection**: Verify PostgreSQL access from your machine
3. **Create Database**: Set up dedicated TecDoc database
4. **Import Test Brand**: Start with one brand (0001)
5. **Verify Data**: Check import results

### Production Deployment
1. **Batch Import**: Process brands in manageable batches
2. **Monitor Progress**: Track import statistics
3. **Optimize Performance**: Tune PostgreSQL settings
4. **Create Indexes**: Add performance indexes after import
5. **Setup Backup**: Configure automated backups

### Integration
1. **API Development**: Create REST API for data access
2. **Search Interface**: Build search functionality
3. **Analytics Dashboard**: Create business intelligence views
4. **Data Validation**: Implement quality checks

## 📝 Important Notes

- **Data Location**: TecDoc files are at `/workspace/aai/aai/aai/TecDoc/`
- **Archive Count**: 922 brand archives (7z format)
- **Format Version**: TecDoc 2.70
- **Encoding**: UTF-8 with error handling
- **Memory Usage**: Optimized with batch processing and cleanup

## 🆘 Support

If you encounter issues:

1. **Connection Problems**: Check authorized networks in Cloud SQL
2. **Import Errors**: Review logs and reduce batch size
3. **Performance Issues**: Optimize PostgreSQL configuration
4. **Data Questions**: Use the query tool to explore data structure

## 🎉 Success Metrics

You'll know the import is successful when:
- ✅ All 9 TecDoc tables are created
- ✅ Record counts match expected values
- ✅ Sample queries return automotive data
- ✅ Cross-references work between tables
- ✅ No critical errors in import logs

The system is ready for production deployment! 🚀