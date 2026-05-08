import os

path = r'D:\diamond_project\ef_rough_diamond_purchase-main\src\Dashboard.jsx'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    new_lines.append(line)
    if '<SizeProfileTable' in line:
        # Find where the tag ends
        tag_end = i
        while '/>' not in lines[tag_end]:
            tag_end += 1
        
        # We need to skip until tag_end if we are iterating, but here we are just looking for the end
        if i == tag_end or '/>' in line:
            # tag is self-contained or ends on this line
            new_lines.append('                       <FluoProfileTable \n')
            new_lines.append('                         totalWeight={parcelData.total_cts || 0} \n')
            new_lines.append('                         fluoState={state.fluo || {}} \n')
            new_lines.append('                         onUpdate={(cat, val) => setState({ \n')
            new_lines.append('                           ...state, \n')
            new_lines.append('                           fluo: { ...state.fluo, [cat]: val } \n')
            new_lines.append('                         })} \n')
            new_lines.append('                       />\n')

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
