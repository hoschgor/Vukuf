import json

with open("public/ayetul-kubra-metin.json", encoding="utf-8") as f:
    data = json.load(f)

for s in data:
    satirlar = s["metin"].split("\n")
    for satir in satirlar:
        if satir.startswith("§"):
            print(f"Sayfa {s['sayfa']}: {satir[:150]}")
            break
    else:
        continue
    break