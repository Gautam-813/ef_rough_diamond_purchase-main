import pdfplumber
import os
import re
import json

def extract_raw_lines(pdf_path, ranges):
    results = {}
    with pdfplumber.open(pdf_path) as pdf:
        full_text = ""
        for page in pdf.pages:
            full_text += page.extract_text() + "\n"
            
        for r_label in ranges:
            alt_r = r_label.replace("0.", ".").replace("-", " - ")
            pattern = re.escape(alt_r)
            match = re.search(pattern, full_text)
            if match:
                start = match.start()
                context = full_text[start:start + 1000]
                results[r_label] = context
            else:
                results[r_label] = "NOT FOUND"
    return results

ranges = ["0.18-0.22", "0.30-0.39", "0.50-0.69", "0.90-0.99"]
round_pdf = r"d:\diamond_project\ef_rough_diamond_purchase-main\Round (2).pdf"
pear_pdf = r"d:\diamond_project\ef_rough_diamond_purchase-main\PEAR (2).PDF"

print("--- ROUND CONTEXT ---")
round_context = extract_raw_lines(round_pdf, ranges)
for r, c in round_context.items():
    print(f"\nRange {r}:\n{c[:500]}")

print("\n--- PEAR CONTEXT ---")
pear_context = extract_raw_lines(pear_pdf, ranges)
for r, c in pear_context.items():
    print(f"\nRange {r}:\n{c[:500]}")
