import pdfplumber
import os
import re
import json

def extract_rapaport_prices(pdf_path, shapes_label):
    results = {}
    ranges = [
        "0.18-0.22", "0.23-0.29", "0.30-0.39", "0.40-0.49", 
        "0.50-0.69", "0.70-0.89", "0.90-0.99", "1.00-1.49"
    ]
    
    clarities = ["VVS1", "VVS2", "VS1", "VS2", "SI1", "SI2", "I1", "I2"]
    
    with pdfplumber.open(pdf_path) as pdf:
        full_text = ""
        for page in pdf.pages:
            full_text += page.extract_text() + "\n"
            
        for r_label in ranges:
            # Search for the range header
            # Rapaport usually uses (.18 - .22 CT.)
            alt_r = r_label.replace("0.", ".").replace("-", " - ")
            pattern = re.escape(alt_r)
            
            match = re.search(pattern, full_text)
            if not match:
                # Try with 0.
                alt_r2 = r_label.replace("-", " - ")
                pattern = re.escape(alt_r2)
                match = re.search(pattern, full_text)
            
            if match:
                # Get the text around this match
                context = full_text[match.start():match.start() + 2000]
                lines = context.split('\n')
                
                # Find the "DEF" or "D-F" or "D" row
                found_prices = None
                for line in lines:
                    line = line.strip()
                    # Check for D-F or D E F or D
                    if line.startswith("D-F") or line.startswith("D ") or line.startswith("D\t"):
                        # Extract numbers
                        numbers = re.findall(r'\d+\.?\d*', line)
                        # Sometimes numbers are separate from the label
                        if not numbers:
                            # Check next line
                            continue
                        
                        # If it's a D-F row, it might have the prices for that row
                        found_prices = numbers
                        break
                
                if not found_prices:
                    # Look for lines that look like price rows after the header
                    for line in lines:
                        nums = re.findall(r'\d+\.?\d*', line)
                        if len(nums) >= 8:
                            # Likely a price row (D row)
                            found_prices = nums
                            break
                
                if found_prices:
                    results[r_label] = found_prices[:8] # Take first 8 clarities
                else:
                    results[r_label] = "Prices not found in text"
            else:
                results[r_label] = "Range header not found"
                
    return results

round_pdf = r"d:\diamond_project\ef_rough_diamond_purchase-main\Round (2).pdf"
pear_pdf = r"d:\diamond_project\ef_rough_diamond_purchase-main\PEAR (2).PDF"

print("--- ROUND PRICES ---")
round_prices = extract_rapaport_prices(round_pdf, "ROUND")
print(json.dumps(round_prices, indent=2))

print("\n--- PEAR PRICES ---")
pear_prices = extract_rapaport_prices(pear_pdf, "PEAR")
print(json.dumps(pear_prices, indent=2))
