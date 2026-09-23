"""Extract factual medicine names from the Algerian MIPH August 2026 XLSX.

Usage: python scripts/import-medicines.py INPUT.xlsx OUTPUT.json
The source workbook is deliberately not committed. Re-import when MIPH updates it.
"""

import json
import sys
from pathlib import Path

from openpyxl import load_workbook


source, output = map(Path, sys.argv[1:3])
sheet = load_workbook(source, read_only=True, data_only=True).worksheets[0]
medicines = []
for row in list(sheet.values)[16:]:
    if not isinstance(row[0], int) or not isinstance(row[4], str):
        continue
    brand = row[4].strip()
    ingredient = str(row[3] or "").strip()
    dosage = str(row[6] or "").strip()
    form = str(row[5] or "").strip()
    registration = str(row[1] or "").strip()
    if brand and ingredient:
        medicines.append([brand, dosage, ingredient, form, registration])
assert len(medicines) > 5000, f"Unexpectedly short source: {len(medicines)}"
output.write_text(json.dumps(medicines, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(f"Imported {len(medicines)} official nomenclature entries into {output}")
