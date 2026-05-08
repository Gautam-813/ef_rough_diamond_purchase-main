import pandas as pd
import os

excel_path = "Final-Price-Template.xlsx"
df = pd.read_excel(excel_path, sheet_name=0, header=None)

range_mapping = {
    "0.002-0.004": "r1", "0.005-0.008": "r2", "0.009-0.021": "r3", "0.022-0.051": "r4",
    "0.052-0.077": "r5", "0.078-0.115": "r6", "0.116-0.158": "r7", "0.159": "r8"
}

print("Finding ranges in Excel:")
for row_idx in range(len(df)):
    cell_val = str(df.iloc[row_idx, 1]).strip()
    for label, r_id in range_mapping.items():
        if label in cell_val:
            print(f"Found {label} ({r_id}) at row {row_idx}")
            # Show the next few rows for both Round (col 0) and Fancy (col 11)
            for offset in range(5):
                idx = row_idx + offset
                if idx < len(df):
                    row_data = df.iloc[idx, :20].tolist()
                    row_data = [str(x) if pd.notnull(x) else "NaN" for x in row_data]
                    print(f"  Row {idx}: {row_data}")
            print()