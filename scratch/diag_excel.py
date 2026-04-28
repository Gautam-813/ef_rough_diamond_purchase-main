import pandas as pd
import numpy as np

try:
    df = pd.read_excel('Final-Price-Template.xlsx', header=None)
    print("Excel loaded successfully.")
    
    # Search for the range
    row_idx = -1
    for i, val in enumerate(df[1]):
        if '0.022-0.051' in str(val):
            row_idx = i
            break
            
    if row_idx == -1:
        print("Range 0.022-0.051 not found in Column 1.")
    else:
        print(f"\n--- Diagnostic for Range 0.022-0.051 (Starting at Row {row_idx}) ---")
        for offset in range(-1, 15):
            idx = row_idx + offset
            if idx < 0 or idx >= len(df): continue
            row_data = df.iloc[idx, :12].tolist()
            # Clean up nan for printing
            row_data = [str(x) if x is not np.nan else "NaN" for x in row_data]
            print(f"Row {idx:3}: {' | '.join(row_data)}")
            
    # Also check the Fancy side
    print(f"\n--- Checking Fancy side columns (Row {row_idx}) ---")
    if row_idx != -1:
        row_data = df.iloc[row_idx, 10:20].tolist()
        row_data = [str(x) if x is not np.nan else "NaN" for x in row_data]
        print(f"Fancy Header Row {row_idx}: {' | '.join(row_data)}")

except Exception as e:
    print(f"Error: {e}")
