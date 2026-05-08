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
            # Round is offset 0 from col 1
            # Fancy is offset 11 from col 1
            vvs_round = df.iloc[row_idx + 2, 1]
            vvs_fancy = df.iloc[row_idx + 2, 12]
            print(f"DEF VVS -> Round: {vvs_round}, Fancy: {vvs_fancy}")
