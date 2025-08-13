#!/usr/bin/env python3
"""
TecDoc SQLite Query Tool
Explore the imported TecDoc data
"""

import sqlite3
import sys
import json
from datetime import datetime

SQLITE_DB = "/workspace/aai/tecdoc_data.db"

class TecDocQueryTool:
    """Query tool for TecDoc SQLite database"""
    
    def __init__(self, db_path):
        self.db_path = db_path
        self.conn = None
    
    def connect(self):
        """Connect to database"""
        try:
            self.conn = sqlite3.connect(self.db_path)
            self.conn.row_factory = sqlite3.Row  # Enable column access by name
            return True
        except Exception as e:
            print(f"Error connecting to database: {e}")
            return False
    
    def get_table_stats(self):
        """Get statistics for all tables"""
        cursor = self.conn.cursor()
        
        tables = [
            'tecdoc_headers',
            'tecdoc_articles', 
            'tecdoc_reference_numbers',
            'tecdoc_article_linkage',
            'tecdoc_linkage_attributes',
            'tecdoc_article_criteria',
            'tecdoc_article_to_generic',
            'tecdoc_graphics_documents',
            'tecdoc_graphics_to_articles'
        ]
        
        print("📊 TecDoc Database Statistics")
        print("=" * 50)
        
        total_records = 0
        for table in tables:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            total_records += count
            print(f"{table:30} {count:>10,} records")
        
        print("-" * 50)
        print(f"{'TOTAL':30} {total_records:>10,} records")
        
        # Database size
        import os
        size_mb = os.path.getsize(self.db_path) / 1024 / 1024
        print(f"Database size: {size_mb:.1f} MB")
        print()
    
    def get_brand_info(self):
        """Get brand information"""
        cursor = self.conn.cursor()
        
        print("🏷️ Brand Information")
        print("=" * 50)
        
        cursor.execute("""
            SELECT brand_no, brand_name, data_release, version_date, format_version
            FROM tecdoc_headers
            ORDER BY brand_no
        """)
        
        for row in cursor.fetchall():
            print(f"Brand: {row['brand_no']} - {row['brand_name']}")
            print(f"  Data Release: {row['data_release']}")
            print(f"  Version Date: {row['version_date']}")
            print(f"  Format Version: {row['format_version']}")
        print()
    
    def search_articles(self, search_term, limit=10):
        """Search for articles"""
        cursor = self.conn.cursor()
        
        print(f"🔍 Searching Articles for: '{search_term}'")
        print("=" * 50)
        
        # Search in reference numbers (part numbers)
        cursor.execute("""
            SELECT DISTINCT r.art_no, r.ref_no, r.brand_no, a.term_no
            FROM tecdoc_reference_numbers r
            LEFT JOIN tecdoc_articles a ON r.art_no = a.art_no AND r.brand_no = a.brand_no
            WHERE r.ref_no LIKE ? OR r.art_no LIKE ?
            ORDER BY r.ref_no
            LIMIT ?
        """, (f'%{search_term}%', f'%{search_term}%', limit))
        
        results = cursor.fetchall()
        
        if results:
            print(f"Found {len(results)} matching articles:")
            print()
            for row in results:
                print(f"Article: {row['art_no']}")
                print(f"  Reference: {row['ref_no']}")
                print(f"  Brand: {row['brand_no']}")
                print(f"  Term: {row['term_no']}")
                print()
        else:
            print("No matching articles found.")
        print()
    
    def get_article_details(self, art_no, brand_no=None):
        """Get detailed information about an article"""
        cursor = self.conn.cursor()
        
        print(f"📋 Article Details: {art_no}")
        print("=" * 50)
        
        # Basic article info
        where_clause = "WHERE art_no = ?"
        params = [art_no]
        if brand_no:
            where_clause += " AND brand_no = ?"
            params.append(brand_no)
        
        cursor.execute(f"""
            SELECT * FROM tecdoc_articles 
            {where_clause}
            LIMIT 1
        """, params)
        
        article = cursor.fetchone()
        if not article:
            print("Article not found.")
            return
        
        print("Basic Information:")
        print(f"  Article Number: {article['art_no']}")
        print(f"  Brand: {article['brand_no']}")
        print(f"  Term Number: {article['term_no']}")
        print(f"  Self Service: {article['self_serv']}")
        print(f"  Material Certificate: {article['mat_cert']}")
        print(f"  Remanufactured: {article['remanufact']}")
        print(f"  Accessory: {article['accessory']}")
        print()
        
        # Reference numbers
        cursor.execute("""
            SELECT ref_no, man_no, country_code
            FROM tecdoc_reference_numbers
            WHERE art_no = ? AND brand_no = ?
            ORDER BY ref_no
            LIMIT 10
        """, [art_no, article['brand_no']])
        
        refs = cursor.fetchall()
        if refs:
            print("Reference Numbers:")
            for ref in refs:
                print(f"  {ref['ref_no']} (Manufacturer: {ref['man_no']}, Country: {ref['country_code']})")
            print()
        
        # Article criteria
        cursor.execute("""
            SELECT crit_no, crit_val
            FROM tecdoc_article_criteria
            WHERE art_no = ? AND brand_no = ?
            ORDER BY crit_no
            LIMIT 10
        """, [art_no, article['brand_no']])
        
        criteria = cursor.fetchall()
        if criteria:
            print("Article Criteria:")
            for crit in criteria:
                print(f"  Criterion {crit['crit_no']}: {crit['crit_val']}")
            print()
    
    def get_sample_data(self):
        """Get sample data from each table"""
        cursor = self.conn.cursor()
        
        print("📝 Sample Data")
        print("=" * 50)
        
        tables = {
            'tecdoc_articles': 'SELECT art_no, brand_no, term_no FROM tecdoc_articles LIMIT 5',
            'tecdoc_reference_numbers': 'SELECT art_no, ref_no, brand_no FROM tecdoc_reference_numbers LIMIT 5',
            'tecdoc_article_criteria': 'SELECT art_no, crit_no, crit_val FROM tecdoc_article_criteria LIMIT 5'
        }
        
        for table_name, query in tables.items():
            print(f"\n{table_name}:")
            cursor.execute(query)
            rows = cursor.fetchall()
            
            if rows:
                # Print column headers
                columns = [description[0] for description in cursor.description]
                print("  " + " | ".join(f"{col:15}" for col in columns))
                print("  " + "-" * (len(columns) * 18))
                
                # Print data
                for row in rows:
                    print("  " + " | ".join(f"{str(val):15}" for val in row))
            else:
                print("  No data")
        print()
    
    def interactive_mode(self):
        """Interactive query mode"""
        print("🔧 TecDoc Interactive Query Mode")
        print("Commands: stats, brand, search <term>, article <art_no> [brand_no], sample, quit")
        print("=" * 70)
        
        while True:
            try:
                command = input("\nTecDoc> ").strip().lower()
                
                if command == 'quit' or command == 'exit':
                    break
                elif command == 'stats':
                    self.get_table_stats()
                elif command == 'brand':
                    self.get_brand_info()
                elif command == 'sample':
                    self.get_sample_data()
                elif command.startswith('search '):
                    term = command[7:].strip()
                    if term:
                        self.search_articles(term)
                    else:
                        print("Usage: search <term>")
                elif command.startswith('article '):
                    parts = command[8:].strip().split()
                    if parts:
                        art_no = parts[0]
                        brand_no = parts[1] if len(parts) > 1 else None
                        self.get_article_details(art_no, brand_no)
                    else:
                        print("Usage: article <art_no> [brand_no]")
                elif command == 'help':
                    print("Available commands:")
                    print("  stats          - Show database statistics")
                    print("  brand          - Show brand information")
                    print("  search <term>  - Search for articles")
                    print("  article <no>   - Show article details")
                    print("  sample         - Show sample data")
                    print("  quit           - Exit")
                else:
                    print("Unknown command. Type 'help' for available commands.")
                    
            except KeyboardInterrupt:
                print("\nExiting...")
                break
            except Exception as e:
                print(f"Error: {e}")
    
    def close(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()

def main():
    """Main function"""
    import argparse
    
    parser = argparse.ArgumentParser(description='TecDoc SQLite Query Tool')
    parser.add_argument('--db-path', type=str, default=SQLITE_DB,
                       help='SQLite database path')
    parser.add_argument('--stats', action='store_true',
                       help='Show database statistics')
    parser.add_argument('--brand', action='store_true',
                       help='Show brand information')
    parser.add_argument('--search', type=str,
                       help='Search for articles')
    parser.add_argument('--article', type=str,
                       help='Show article details')
    parser.add_argument('--interactive', action='store_true',
                       help='Start interactive mode')
    
    args = parser.parse_args()
    
    # Create query tool
    tool = TecDocQueryTool(args.db_path)
    
    if not tool.connect():
        sys.exit(1)
    
    try:
        if args.stats:
            tool.get_table_stats()
        elif args.brand:
            tool.get_brand_info()
        elif args.search:
            tool.search_articles(args.search)
        elif args.article:
            tool.get_article_details(args.article)
        elif args.interactive:
            tool.interactive_mode()
        else:
            # Default: show stats and start interactive mode
            tool.get_table_stats()
            tool.get_brand_info()
            tool.interactive_mode()
    
    finally:
        tool.close()

if __name__ == "__main__":
    main()