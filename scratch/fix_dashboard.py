import os

path = r'D:\diamond_project\ef_rough_diamond_purchase-main\src\Dashboard.jsx'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = 0
for i, line in enumerate(lines):
    if skip > 0:
        skip -= 1
        continue
    
    # Check for the button block
    if 'Rough Assortment Input' in line and i + 1 < len(lines) and 'Add Sieve Category' in lines[i+1]:
         # This is likely the block
         pass
    
    if 'style={{display:\'flex\', justifyContent:\'space-between\', alignItems:\'center\'}}' in line and 'Rough Assortment Input' in lines[i+1]:
        new_lines.append(line.replace(' style={{display:\'flex\', justifyContent:\'space-between\', alignItems:\'center\'}}', ''))
        new_lines.append(lines[i+1])
        skip = 5 # skip the button lines
        continue

    if 'Click "+ Add Sieve Category" to start.' in line:
        new_lines.append(line.replace('Click "+ Add Sieve Category" to start.', 'Go to "Parcel Input" to add Sieve Ranges.'))
        continue

    new_lines.append(line)

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
