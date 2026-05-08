import pandas as pd
import os

excel_path = r"d:\diamond_project\ef_rough_diamond_purchase-main\PRICE LIST_27_4_2026.xlsx"
df = pd.read_excel(excel_path, sheet_name="PRICE LIST")

colors = ["DEF", "G", "H", "I", "J", "K", "L", "M", "CAPE"]
clarities = ["VVS", "VS1", "VS2", "SI1", "SI2", "I1", "I2"]
clarity_col_mapping = { "VVS": 1, "VS1": 3, "VS2": 4, "SI1": 5, "SI2": 6, "I1": 7, "I2": 8 }
range_mapping = {
    "0.002-0.004": "r1", "0.005-0.008": "r2", "0.009-0.021": "r3", "0.022-0.051": "r4",
    "0.052-0.077": "r5", "0.078-0.115": "r6", "0.116-0.158": "r7", "0.159-0.200": "r8"
}

def extract_block(start_row, shape_col_offset):
    block = {}
    for i, color in enumerate(colors):
        row_idx = start_row + i + 1
        if row_idx >= len(df): break
        block[color] = {}
        for clarity in clarities:
            col_offset = clarity_col_mapping.get(clarity)
            col_idx = shape_col_offset + col_offset
            try:
                val = df.iloc[row_idx, col_idx]
                block[color][clarity] = float(val) if pd.notnull(val) else 0
            except Exception as e:
                # print(f"Error at {row_idx}, {col_idx}: {e}")
                block[color][clarity] = 0
    return block

price_lists = {"Round": {}, "Fancy": {}}
found_labels = []
for row_idx in range(len(df)):
    cell_val = str(df.iloc[row_idx, 1])
    for label, r_id in range_mapping.items():
        if label in cell_val:
            found_labels.append(label)
            price_lists["Round"][r_id] = extract_block(row_idx + 1, 0)
            price_lists["Fancy"][r_id] = extract_block(row_idx + 1, 11)

print(f"Found labels: {found_labels}")
print(f"Sample price (Round r1 DEF VVS): {price_lists['Round'].get('r1', {}).get('DEF', {}).get('VVS')}")
print(f"Sample price (Fancy r1 DEF VVS): {price_lists['Fancy'].get('r1', {}).get('DEF', {}).get('VVS')}")
