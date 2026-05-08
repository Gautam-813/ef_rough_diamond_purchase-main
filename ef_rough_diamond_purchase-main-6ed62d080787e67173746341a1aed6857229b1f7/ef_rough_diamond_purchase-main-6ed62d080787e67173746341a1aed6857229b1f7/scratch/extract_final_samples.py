import pdfplumber
import os
import re

def get_numbers_after_header(pdf_path, range_header):
    with pdfplumber.open(pdf_path) as pdf:
        full_text = ""
        for page in pdf.pages:
            full_text += page.extract_text() + "\n"
        
        alt_r = range_header.replace("0.", ".").replace("-", " - ")
        pattern = re.escape(alt_r)
        match = re.search(pattern, full_text)
        if not match:
            pattern = re.escape(range_header.replace("-", " - "))
            match = re.search(pattern, full_text)
            
        if match:
            context = full_text[match.start():match.start() + 1500]
            # Find all lines starting with D-F or D
            lines = context.split('\n')
            results = []
            for line in lines:
                if line.startswith("D-F") or line.startswith("D ") or line.startswith("D\t"):
                    # Find all numbers including floats
                    nums = re.findall(r'\d+\.\d+|\d+', line)
                    if nums:
                        results.append((line, nums))
            return results
        return None

ranges = ["0.18-0.22", "0.23-0.29", "0.30-0.39", "0.40-0.49", "0.50-0.69", "0.70-0.89", "0.90-0.99", "1.00-1.49"]
round_pdf = r"d:\diamond_project\ef_rough_diamond_purchase-main\Round (2).pdf"
pear_pdf = r"d:\diamond_project\ef_rough_diamond_purchase-main\PEAR (2).PDF"

print("--- ROUND ---")
for r in ranges:
    print(f"\nRange {r}:")
    res = get_numbers_after_header(round_pdf, r)
    if res:
        for line, nums in res:
            print(f"  {nums}")
    else:
        print("  Not found")

print("\n--- PEAR ---")
for r in ranges:
    print(f"\nRange {r}:")
    res = get_numbers_after_header(pear_pdf, r)
    if res:
        for line, nums in res:
            print(f"  {nums}")
    else:
        print("  Not found")
