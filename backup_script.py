import os
import json
from datetime import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Database connection
DATABASE_URL = "postgresql://neondb_owner:npg_cCV10ZjmWYBL@ep-silent-feather-ancnww5y.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require"
engine = create_engine(DATABASE_URL)

# Create session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def export_table_to_json(table_name):
    """Export a table to JSON file"""
    session = SessionLocal()
    try:
        # Get all records from table
        result = session.execute(text(f"SELECT * FROM {table_name}"))
        columns = result.keys()
        rows = result.fetchall()

        # Convert to dict format
        data = []
        for row in rows:
            row_dict = {}
            for i, col in enumerate(columns):
                # Handle datetime serialization
                if isinstance(row[i], datetime):
                    row_dict[col] = row[i].isoformat()
                else:
                    row_dict[col] = row[i]
            data.append(row_dict)

        # Write to JSON file
        filename = f"{table_name}_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        print(f"Exported {len(data)} records from {table_name} to {filename}")
        return filename

    except Exception as e:
        print(f"Error exporting {table_name}: {e}")
        return None
    finally:
        session.close()

def main():
    # Tables to export based on models.py
    tables = ['users', 'tenders', 'parcels', 'media']

    exported_files = []
    for table in tables:
        filename = export_table_to_json(table)
        if filename:
            exported_files.append(filename)

    print(f"\nBackup completed! Files created: {exported_files}")

if __name__ == "__main__":
    main()