import pypdf
import os
import re

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

ranges = [
    "0.18 - 0.22", "0.19 - 0.22", "0.23 - 0.29", "0.30 - 0.39", "0.40 - 0.49", 
    "0.50 - 0.69", "0.70 - 0.89", "0.90 - 0.99", "1.00 - 1.49"
]

round_pdf = r"d:\diamond_project\ef_rough_diamond_purchase-main\Round (2).pdf"
pear_pdf = r"d:\diamond_project\ef_rough_diamond_purchase-main\PEAR (2).PDF"

def find_ranges_in_text(text, label):
    print(f"\n--- Searching in {label} ---")
    for r in ranges:
        # Match something like "(.18 - .22)" or "(0.18 - 0.22)"
        pattern = r.replace("0.", r"0?\.").replace(" ", r"\s*")
        matches = re.finditer(pattern, text)
        found = False
        for match in matches:
            found = True
            start = max(0, match.start() - 100)
            end = min(len(text), match.end() + 1000)
            print(f"Found range {r} at position {match.start()}:")
            print(text[start:end])
            print("-" * 40)
        if not found:
            # Try without the leading 0
            alt_r = r.replace("0.", ".")
            pattern = alt_r.replace(".", r"\.").replace(" ", r"\s*")
            matches = re.finditer(pattern, text)
            for match in matches:
                found = True
                start = max(0, match.start() - 100)
                end = min(len(text), match.end() + 1000)
                print(f"Found range {r} (as {alt_r}) at position {match.start()}:")
                print(text[start:end])
                print("-" * 40)
            if not found:
                print(f"Range {r} NOT FOUND")

round_text = extract_pdf_text(round_pdf)
pear_text = extract_pdf_text(pear_pdf)

find_ranges_in_text(round_text, "ROUND")
find_ranges_in_text(pear_text, "PEAR")
