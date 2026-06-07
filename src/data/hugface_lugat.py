from datasets import load_dataset
import json
import re

print("Dataset indiriliyor...")
ds = load_dataset("TurkOpenDataOrg/Ottoman2Turkish_dictionary")

lugat = {}
for ornek in ds["train"]:
    # "role": "user" → kelime, "role": "assistant" → anlam
    mesajlar = ornek.get("messages", ornek.get("content", []))
    
    kelime = None
    anlam = None
    
    for msg in mesajlar:
        if msg["role"] == "user":
            eslesme = re.search(r"'(.+?)' kelimesinin", msg["content"])
            if eslesme:
                kelime = eslesme.group(1).strip().lower()
        elif msg["role"] == "assistant":
            eslesme = re.search(r"anlamı:\s*(.+)", msg["content"])
            if eslesme:
                anlam = eslesme.group(1).strip()
    
    if kelime and anlam:
        lugat[kelime] = anlam

# Mevcut lugat.json ile birleştir
try:
    with open("src/data/lugat.json", encoding="utf-8") as f:
        mevcut = json.load(f)
except:
    mevcut = {}

# Mevcutu koru, yenileri ekle
for k, v in lugat.items():
    if k not in mevcut:
        mevcut[k] = v

mevcut = dict(sorted(mevcut.items()))

with open("src/data/lugat.json", "w", encoding="utf-8") as f:
    json.dump(mevcut, f, ensure_ascii=False, indent=2)

print(f"Dataset kelime sayısı: {len(lugat)}")
print(f"Toplam lugat kelime sayısı: {len(mevcut)}")