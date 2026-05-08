import pandas as pd

file_path = r"D:\diamond_project\ef_rough_diamond_purchase-main\PRICE LIST_27_4_2026.xlsx"

try:
    xl = pd.ExcelFile(file_path)
    with open("scratch/excel_analysis.txt", "w", encoding="utf-8") as f:
        for sheet in xl.sheet_names:
            f.write(f"\n--- SHEET: {sheet} ---\n")
            df = pd.read_excel(file_path, sheet_name=sheet)
            f.write(df.to_string())
            f.write("\n\n")
    print("Excel analysis saved to scratch/excel_analysis.txt")
except Exception as e:
    print(f"Error: {e}")
