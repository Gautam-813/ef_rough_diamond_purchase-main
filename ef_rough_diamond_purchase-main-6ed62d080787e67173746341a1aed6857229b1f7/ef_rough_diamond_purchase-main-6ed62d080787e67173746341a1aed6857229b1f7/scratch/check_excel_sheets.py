import pandas as pd
import os

excel_path = "Final-Price-Template.xlsx"

# Check what sheets exist
xl = pd.ExcelFile(excel_path)
print(f"Sheets in Excel file: {xl.sheet_names}")

# Read each sheet
for sheet_name in xl.sheet_names:
    print(f"\nSheet: {sheet_name}")
    df = pd.read_excel(excel_path, sheet_name=sheet_name, header=None)
    print(f"Shape: {df.shape}")
    
    # Check first few rows
    for i in range(min(5, len(df))):
        row = df.iloc[i, :10].tolist()
        row = [str(x) if pd.notnull(x) else "NaN" for x in row]
        print(f"Row {i}: {row}")