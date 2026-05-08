import pypdf
import os

def extract_pdf_text(pdf_path):
    if not os.path.exists(pdf_path):
        return f"Error: {pdf_path} not found"
    
    try:
        reader = pypdf.PdfReader(pdf_path)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text
    except Exception as e:
        return f"Error reading {pdf_path}: {e}"

round_pdf = r"d:\diamond_project\ef_rough_diamond_purchase-main\Round (2).pdf"
pear_pdf = r"d:\diamond_project\ef_rough_diamond_purchase-main\PEAR (2).PDF"

print("--- ROUND PDF CONTENT ---")
print(extract_pdf_text(round_pdf))
print("\n--- PEAR PDF CONTENT ---")
print(extract_pdf_text(pear_pdf))
