import pandas as pd
import os

excel_path = "Final-Price-Template.xlsx"
df = pd.read_excel(excel_path, sheet_name=0, header=None)

print(f"DataFrame shape: {df.shape}")
print(f"Columns with data: {df.notna().any().sum()}")

# Check specific rows for r4
print("\nRow 36 (r4 header):")
row36 = df.iloc[36, :20].tolist()
row36 = [str(x) if pd.notnull(x) else "NaN" for x in row36]
print(row36)

print("\nRow 37 (r4 VVS headers):")
row37 = df.iloc[37, :20].tolist()
row37 = [str(x) if pd.notnull(x) else "NaN" for x in row37]
print(row37)

print("\nRow 38 (r4 DEF data):")
row38 = df.iloc[38, :20].tolist()
row38 = [str(x) if pd.notnull(x) else "NaN" for x in row38]
print(row38)

# Check if there's data beyond column 8
print("\nChecking columns 8-20 for row 38:")
for col in range(8, min(20, df.shape[1])):
    val = df.iloc[38, col]
    if pd.notnull(val):
        print(f"Column {col}: {val}")