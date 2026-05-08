import os

path = r'D:\diamond_project\ef_rough_diamond_purchase-main\src\Dashboard.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

if '<FluoProfileTable' not in content:
    old_block = '                       <SizeProfileTable \n                         state={state} \n                         onAddRange={name => setState({...state, ranges: [...state.ranges, name]})} \n                         onDeleteRange={deleteRange}\n                       />'
    # Wait, the indentation might be different. 
    # Let's find the SizeProfileTable block regardless of indentation.
    import re
    pattern = r'( +)<SizeProfileTable[^>]+/>'
    match = re.search(pattern, content, re.DOTALL)
    if match:
        indent = match.group(1)
        fluo_block = f'\n{indent}<FluoProfileTable \n{indent}  totalWeight={{parcelData.total_cts || 0}} \n{indent}  fluoState={{state.fluo || {{}}}} \n{indent}  onUpdate={{(cat, val) => setState({{ \n{indent}    ...state, \n{indent}    fluo: {{ ...state.fluo, [cat]: val }} \n{indent}  }})}} \n{indent}/>'
        new_content = content[:match.end()] + fluo_block + content[match.end():]
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("Success")
    else:
        print("SizeProfileTable not found")
else:
    print("FluoProfileTable already exists")
