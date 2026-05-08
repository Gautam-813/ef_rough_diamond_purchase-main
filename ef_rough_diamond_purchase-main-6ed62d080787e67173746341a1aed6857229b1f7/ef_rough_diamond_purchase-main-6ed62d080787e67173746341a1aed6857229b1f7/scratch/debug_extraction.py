import pandas as pd
import os

excel_path = "Final-Price-Template.xlsx"
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
    print(f"extract_block called with start_row={start_row}, shape_col_offset={shape_col_offset}")
    block = {}
    # Scan the next 20 rows to find all matching colors
    for offset in range(1, 20):
        row_idx = start_row + offset
        if row_idx >= len(df): break

        # Get the row label (Color) from the first column of the block
        row_label = str(df.iloc[row_idx, shape_col_offset]).strip().upper()
        print(f"  Checking row {row_idx}, col {shape_col_offset}: '{row_label}'")
        if not row_label or row_label == 'NAN': continue

        # Match against our standard color list
        matched_color = None
        for color in colors:
            # Match exact or handle CAPE / DEF labels
            if color == row_label or (color == "CAPE" and "CAPE" in row_label) or (color == "DEF" and "DEF" in row_label):
                matched_color = color
                break

        if matched_color:
            print(f"  Found color {matched_color} at row {row_idx}")
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
                    print(f"    {matched_color}[{clarity}] = {block[matched_color][clarity]} (from col {col_idx})")
                except Exception as e:
                    print(f"    Error getting {matched_color}[{clarity}]: {e}")
                    block[matched_color][clarity] = 0
    return block

price_lists = {"Round": {}, "Fancy": {}}
for row_idx in range(len(df)):
    cell_val = str(df.iloc[row_idx, 1]).strip()
    for label, r_id in range_mapping.items():
        if label in cell_val:
            print(f"\nProcessing {label} ({r_id}) at row {row_idx}")
            price_lists["Round"][r_id] = extract_block(row_idx + 1, 0)
            price_lists["Fancy"][r_id] = extract_block(row_idx + 1, 11)

print(f"\nFinal Round r4 DEF: {price_lists['Round'].get('r4', {}).get('DEF', {})}")
print(f"Final Fancy r4 DEF: {price_lists['Fancy'].get('r4', {}).get('DEF', {})}")