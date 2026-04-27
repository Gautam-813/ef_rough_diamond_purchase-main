import pandas as pd

file_path = r"D:\diamond_project\ef_rough_diamond_purchase-main\PRICE LIST_27_4_2026.xlsx"

try:
    # Load the excel file
    xl = pd.ExcelFile(file_path)
    print(f"Sheets in Excel: {xl.sheet_names}")
    
    for sheet in xl.sheet_names:
        print(f"\n--- Reading Sheet: {sheet} ---")
        df = pd.read_excel(file_path, sheet_name=sheet)
        print(df.head(20)) # Show first 20 lines to understand structure
except Exception as e:
    print(f"Error reading Excel: {e}")
