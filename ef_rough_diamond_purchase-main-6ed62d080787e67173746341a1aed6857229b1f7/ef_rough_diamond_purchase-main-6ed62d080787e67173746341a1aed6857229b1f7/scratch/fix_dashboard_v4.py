import os

path = r'D:\diamond_project\ef_rough_diamond_purchase-main\src\Dashboard.jsx'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
found = False
for line in lines:
    new_lines.append(line)
    if 'SizeProfileTable' in line and 'state={state}' in line and not found:
        indent = line[:line.find('<')]
        new_lines.append(f'{indent}<FluoProfileTable \n')
        new_lines.append(f'{indent}  totalWeight={{parcelData.total_cts || 0}} \n')
        new_lines.append(f'{indent}  fluoState={{state.fluo || {{}}}} \n')
        new_lines.append(f'{indent}  onUpdate={{(cat, val) => setState({{ \n')
        new_lines.append(f'{indent}    ...state, \n')
        new_lines.append(f'{indent}    fluo: {{ ...state.fluo, [cat]: val }} \n')
        new_lines.append(f'{indent}  }})}} \n')
        new_lines.append(f'{indent}/>\n')
        found = True

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
