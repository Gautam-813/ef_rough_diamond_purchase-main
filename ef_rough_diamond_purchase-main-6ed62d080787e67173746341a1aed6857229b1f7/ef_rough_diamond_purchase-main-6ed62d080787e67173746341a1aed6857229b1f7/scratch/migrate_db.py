import sqlite3
import os

db_path = r'D:\diamond_project\ef_rough_diamond_purchase-main\backend\diamond_erp.db'

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
else:
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Add profit_margin column to parcels table
        print("Attempting to add profit_margin column to parcels table...")
        cursor.execute("ALTER TABLE parcels ADD COLUMN profit_margin FLOAT DEFAULT 0.0")
        
        conn.commit()
        print("Column added successfully!")
        conn.close()
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("Column already exists.")
        else:
            print(f"Error: {e}")
    except Exception as e:
        print(f"An error occurred: {e}")
