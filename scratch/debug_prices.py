import pandas as pd
import os

excel_path = "PRICE LIST_27_4_2026.xlsx"
df = pd.read_excel(excel_path, sheet_name="PRICE LIST")

range_mapping = {
    "r1": "0.002-0.004",
    "r2": "0.005-0.008",
    "r3": "0.009-0.021",
    "r4": "0.022-0.051",
    "r5": "0.052-0.077",
    "r6": "0.078-0.115",
    "r7": "0.116-0.158",
    "r8": "0.159-0.200"
}

for r_id, label in range_mapping.items():
    print(f"\n--- {r_id} ({label}) ---")
    for row_idx in range(len(df)):
        cell_val = str(df.iloc[row_idx, 1])
        if label in cell_val:
            print(f"Found {label} at row {row_idx}")
            # Header is row_idx + 1 (VVS1, VVS2, VS1, VS2...)
            # DEF is row_idx + 2
            try:
                # Column offsets from main.py:
                # VVS: 1 (VVS1), 2 (VVS2)
                # VS1: 3
                # VS2: 4
                # SI1: 5
                # SI2: 6
                # I1: 7
                # I2: 8
                
                vvs1 = df.iloc[row_idx + 2, 1]
                vvs2 = df.iloc[row_idx + 2, 2]
                vs1 = df.iloc[row_idx + 2, 3]
                print(f"DEF -> VVS1: {vvs1}, VVS2: {vvs2}, VS1: {vs1}")
            except Exception as e:
                print(f"Error: {e}")
