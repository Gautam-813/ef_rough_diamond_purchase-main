import os

path = r'D:\diamond_project\ef_rough_diamond_purchase-main\src\Dashboard.jsx'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
found = False
skip_until_end = False
for i, line in enumerate(lines):
    new_lines.append(line)
    if '<SizeProfileTable' in line and not found:
        # Find where it ends
        curr = i
        while '/>' not in lines[curr]:
            curr += 1
        
        # Add after that line
        pass
    
    if '/>' in line and i > 400 and not found: # 400 to avoid the component definition
         # Check if we just finished SizeProfileTable
         # This is risky. 
         pass

# Let's try another way. 
# Find the line with onDeleteRange={deleteRange}
for i, line in enumerate(lines):
    if 'onDeleteRange={deleteRange}' in line and i > 400:
        # The next line should be />
        if '/>' in lines[i+1]:
            indent = "                       "
            lines.insert(i+2, f'{indent}<FluoProfileTable \n')
            lines.insert(i+3, f'{indent}  totalWeight={{parcelData.total_cts || 0}} \n')
            lines.insert(i+4, f'{indent}  fluoState={{state.fluo || {{}}}} \n')
            lines.insert(i+5, f'{indent}  onUpdate={{(cat, val) => setState({{ \n')
            lines.insert(i+6, f'{indent}    ...state, \n')
            lines.insert(i+7, f'{indent}    fluo: {{ ...state.fluo, [cat]: val }} \n')
            lines.insert(i+8, f'{indent}  }})}} \n')
            lines.insert(i+9, f'{indent}/>\n')
            break

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
