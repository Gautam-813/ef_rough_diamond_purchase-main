import os

file_path = r"d:\diamond_project\ef_rough_diamond_purchase-main\src\Dashboard.jsx"

with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
    lines = f.readlines()

# Fix the broken emojis and characters
new_lines = []
for line in lines:
    # Fix the corrupted lines I saw in PowerShell
    if "'dY\"S Show List'" in line:
        line = line.replace("'dY\"S Show List'", "'📊 Show List'")
    if "'dY\"< Notebook Summary'" in line:
        line = line.replace("'dY\"< Notebook Summary'", "'📋 Notebook Summary'")
    if "+? Back" in line:
        line = line.replace("+? Back", "← Back")
    
    # Replace the summary block
    if "activeTab === 'summary'" in line and "all-view-dashboard" in next((l for l in lines[lines.index(line):lines.index(line)+5]), ""):
        # We'll handle this in a more surgical way
        pass
    
    new_lines.append(line)

# Surgical replacement of the summary block
start_idx = -1
end_idx = -1
for i, line in enumerate(new_lines):
    if "activeTab === 'summary' && (" in line and i > 1200:
        start_idx = i
        # Find the closing tag for this block
        bracket_count = 1
        for j in range(i + 1, len(new_lines)):
            if "(" in new_lines[j]: bracket_count += 1
            if ")" in new_lines[j]: bracket_count -= 1
            if bracket_count == 0:
                end_idx = j
                break
        break

if start_idx != -1 and end_idx != -1:
    replacement = [
        "             {activeTab === 'summary' && (\n",
        "                <div className=\"summary-report-view\">\n",
        "                   <div className=\"section-hdr\" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>\n",
        "                      <h2 className=\"title-glow\">Parcel Purchase Summary</h2>\n",
        "                      <button className=\"btn btn-gold\" onClick={() => window.print()}>🖨 Print Report</button>\n",
        "                   </div>\n",
        "                   <ParcelSummaryReport \n",
        "                     parcel={parcelData} \n",
        "                     tender={tenderData} \n",
        "                     state={state} \n",
        "                     prices={globalPrices} \n",
        "                   />\n",
        "                </div>\n",
        "              )}\n"
    ]
    new_lines[start_idx:end_idx+1] = replacement

with open(file_path, "w", encoding="utf-8") as f:
    f.writelines(new_lines)

print("File updated successfully!")
