import psycopg2
import json
import os

# Database connection
DATABASE_URL = "postgresql://neondb_owner:npg_cCV10ZjmWYBL@ep-silent-feather-ancnww5y.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require"

conn = psycopg2.connect(DATABASE_URL)
cursor = conn.cursor()

# Check master_configs table
cursor.execute("SELECT id, user_id, price_overrides FROM master_configs")
rows = cursor.fetchall()

for row in rows:
    id, user_id, price_overrides = row
    print(f"Config ID {id}, User {user_id}:")
    print(f"Raw price_overrides: {repr(price_overrides)}")
    print(f"Type: {type(price_overrides)}")
    if price_overrides:
        try:
            if isinstance(price_overrides, str):
                prices = json.loads(price_overrides)
            else:
                prices = price_overrides
            print(f"Parsed type: {type(prices)}")
            print(f"Round r4 DEF: {prices.get('Round', {}).get('r4', {}).get('DEF', {})}")
            print(f"Keys: Round={list(prices.get('Round', {}).keys())}, Fancy={list(prices.get('Fancy', {}).keys())}")
        except Exception as e:
            print(f"Error parsing JSON: {e}")
    else:
        print("No price overrides")
    print("---")

conn.close()