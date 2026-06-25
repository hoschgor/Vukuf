import json
import re

with open("public/ayetul-kubra-metin.json", encoding="utf-8") as f:
    data = json.load(f)

# Dipnot kalıplarını ara
for sayfa in data[:30]:
    for satir in sayfa["metin"].split("\n"):
        s = satir.strip()
        if re.match(r'^\d+\s+', s) and len(s) > 10:
            print(f'Sayfa {sayfa["sayfa"]}: {s[:100]}')