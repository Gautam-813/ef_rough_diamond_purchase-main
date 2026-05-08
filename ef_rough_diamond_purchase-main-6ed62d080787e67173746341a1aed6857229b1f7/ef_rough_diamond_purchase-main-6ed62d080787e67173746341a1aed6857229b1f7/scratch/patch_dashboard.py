
import os

file_path = 'src/Dashboard.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 1. Add import
# Find where other imports are
import_idx = -1
for i, line in enumerate(lines):
    if "import TenderComparisonReport" in line:
        import_idx = i
        break

if import_idx != -1:
    lines.insert(import_idx + 1, "import { calculateParcelTotals, getPriceIdxByWeight } from './utils/parcelMath';\n")

# 2. Remove getPriceIdxByWeight
start_idx = -1
end_idx = -1
for i, line in enumerate(lines):
    if "const getPriceIdxByWeight = (w) => {" in line:
        start_idx = i
    if start_idx != -1 and "return \"r16\";" in line:
        # scan a bit more for the closing brace
        for j in range(i, i+5):
            if "};" in lines[j]:
                end_idx = j
                break
        break

if start_idx != -1 and end_idx != -1:
    # Delete from end to start to maintain indices
    del lines[start_idx:end_idx+1]

# 3. Swap totals useMemo
memo_start = -1
memo_end = -1
for i, line in enumerate(lines):
    if "const totals = useMemo(() => {" in line:
        # Check if it's the large one (line 1372 approx)
        if "let totalCts = 0;" in lines[i+1]:
            memo_start = i
            # Find the end by matching braces or finding the closing array
            for j in range(i, i+150):
                if "}, [state, globalPrices]);" in lines[j]:
                    memo_end = j
                    break
            break

if memo_start != -1 and memo_end != -1:
    replacement = [
        "   const totals = useMemo(() => {\n",
        "      return calculateParcelTotals(state, parcelData, globalPrices, COLOUR_LIST, CLARITY_LIST, isHotSize);\n",
        "   }, [state, globalPrices, parcelData]);\n"
    ]
    lines[memo_start:memo_end+1] = replacement

# 4. Pass totals to ParcelSummaryReport
for i, line in enumerate(lines):
    if "<ParcelSummaryReport" in line:
        # Check if it already has totals
        if "totals={totals}" not in lines[i+5]: # scan a few lines down
            for j in range(i, i+10):
                if "/>" in lines[j]:
                    lines.insert(j, "                        totals={totals}\n")
                    break
        break

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Successfully patched Dashboard.jsx")
