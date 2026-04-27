import sqlite3

db_path = r'D:\diamond_project\ef_rough_diamond_purchase-main\backend\diamond_erp.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("PRAGMA table_info(parcels)")
columns = [row[1] for row in cursor.fetchall()]
print(f"Columns in 'parcels': {columns}")

cursor.execute("PRAGMA table_info(tenders)")
columns = [row[1] for row in cursor.fetchall()]
print(f"Columns in 'tenders': {columns}")
conn.close()
