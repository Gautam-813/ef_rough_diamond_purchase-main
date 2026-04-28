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

    df = pd.read_excel(excel_path, sheet_name=0, header=None)

    colors = ["DEF", "G", "H", "I", "J", "K", "L", "M", "CAPE"]
    clarities = ["VVS", "VS1", "VS2", "SI1", "SI2", "I1", "I2"]

    clarity_col_mapping = {
        "VVS": 1, "VS1": 2, "VS2": 3, "SI1": 4, "SI2": 5, "I1": 6, "I2": 7
    }

    range_mapping = {
        "0.002-0.004": "r1", "0.005-0.008": "r2", "0.009-0.021": "r3", "0.022-0.051": "r4",
        "0.052-0.077": "r5", "0.078-0.115": "r6", "0.116-0.158": "r7", "0.159": "r8"
    }

    def extract_block(start_row, shape_col_offset):
        block = {}
        # Scan the next 20 rows to find all matching colors
        for offset in range(1, 20):
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
    for row_idx in range(len(df)):
        cell_val = str(df.iloc[row_idx, 1])
        for label, r_id in range_mapping.items():
            if label in cell_val:
                price_lists["Round"][r_id] = extract_block(row_idx + 1, 0)
                price_lists["Fancy"][r_id] = extract_block(row_idx + 1, 11)

    # Save to all users (just to be safe)
    users = db.query(models.User).all()
    for user in users:
        config = db.query(models.MasterConfig).filter(models.MasterConfig.user_id == user.id).first()
        if not config:
            config = models.MasterConfig(user_id=user.id)
            db.add(config)
        config.price_overrides = price_lists
        print(f"Updated config for user {user.email}")
    
    db.commit()
    print("SUCCESS: Prices Forced into DB for all users")

if __name__ == "__main__":
    force_sync()
