import sqlite3

db_path = r'D:\diamond_project\ef_rough_diamond_purchase-main\backend\diamond_erp.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()
print("Tables:", [table[0] for table in tables])

conn.close()