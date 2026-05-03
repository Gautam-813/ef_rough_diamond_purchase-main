import os
import sys
import pandas as pd

# Add the backend directory to sys.path so we can import database and models
sys.path.append(os.getcwd())

from database import SessionLocal
import models

def force_sync():
    db = SessionLocal()
    excel_path = r"d:\diamond_project\ef_rough_diamond_purchase-main\Final-Price-Template.xlsx"
    if not os.path.exists(excel_path):
        print(f"Error: {excel_path} not found")
        return

    # Read both Round and Fancy sheets
    df_round = pd.read_excel(excel_path, sheet_name="Round", header=None)
    df_fancy = pd.read_excel(excel_path, sheet_name="Fancy", header=None)

    colors = ["DEF", "G", "H", "I", "J", "K", "L", "M", "CAPE"]
    clarities = ["VVS", "VS1", "VS2", "SI1", "SI2", "I1", "I2"]

    clarity_col_mapping = {
        "VVS": 1, "VS1": 2, "VS2": 3, "SI1": 4, "SI2": 5, "I1": 6, "I2": 7
    }

    range_mapping = {
        "0.002-0.004": "r1", "0.005-0.008": "r2", "0.009-0.021": "r3", "0.022-0.051": "r4",
        "0.052-0.077": "r5", "0.078-0.115": "r6", "0.116-0.158": "r7", "0.159-0.18": "r8",
        "0.19-0.22": "r9", "0.23-0.29": "r10", "0.30-0.39": "r11", "0.40-0.49": "r12",
        "0.50-0.69": "r13", "0.70-0.89": "r14", "0.90-0.99": "r15", "1.00-1.49": "r16"
    }

    def extract_block(df, start_row, shape_col_offset):
        block = {}
        # Scan the next 12 rows to find all matching colors (each range block is about 10-12 rows)
        for offset in range(1, 13):
            row_idx = start_row + offset
            if row_idx >= len(df): break

            # Get the row label (Color) from the first column of the block
            row_label = str(df.iloc[row_idx, shape_col_offset]).strip().upper()
            if not row_label or row_label == 'NAN': continue

            # Match against our standard color list
            matched_color = None
            for color in colors:
                # Match exact or handle CAPE / DEF labels
                if color == row_label or (color == "CAPE" and "CAPE" in row_label) or (color == "DEF" and "DEF" in row_label):
                    matched_color = color
                    break

            if matched_color:
                # Check if we already found this color (avoid duplicates from adjacent ranges)
                if matched_color in block:
                    continue
                block[matched_color] = {}
                for clarity in clarities:
                    c_offset = clarity_col_mapping.get(clarity)
                    col_idx = shape_col_offset + c_offset
                    try:
                        val = df.iloc[row_idx, col_idx]
                        # Clean the value (handle strings with commas or symbols)
                        if isinstance(val, str):
                            val = val.replace(',', '').replace('$', '').strip()
                        block[matched_color][clarity] = round(float(val), 2) if pd.notnull(val) else 0
                    except:
                        block[matched_color][clarity] = 0
        return block

    price_lists = {"Round": {}, "Fancy": {}}

    # Extract Round prices
    for row_idx in range(len(df_round)):
        cell_val = str(df_round.iloc[row_idx, 1]).strip()
        for label, r_id in range_mapping.items():
            if label in cell_val:
                price_lists["Round"][r_id] = extract_block(df_round, row_idx + 1, 0)

    # Extract Fancy prices
    for row_idx in range(len(df_fancy)):
        cell_val = str(df_fancy.iloc[row_idx, 1]).strip()
        for label, r_id in range_mapping.items():
            if label in cell_val:
                price_lists["Fancy"][r_id] = extract_block(df_fancy, row_idx + 1, 0)

    # Save to all users (just to be safe)
    users = db.query(models.User).all()
    print(f"Found {len(users)} users")
    for user in users:
        print(f"Processing user {user.id}: {user.email}")
        config = db.query(models.MasterConfig).filter(models.MasterConfig.user_id == user.id).first()
        if not config:
            print(f"Creating new config for user {user.id}")
            config = models.MasterConfig(user_id=user.id)
            db.add(config)
        else:
            print(f"Found existing config for user {user.id}")
        config.price_overrides = price_lists
        print(f"Set price_overrides for user {user.email}")

    try:
        db.commit()
        print("SUCCESS: Prices Forced into DB for all users")
    except Exception as e:
        print(f"ERROR during commit: {e}")
        db.rollback()

if __name__ == "__main__":
    force_sync()
