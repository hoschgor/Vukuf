import json
import re

with open("public/ayetul-kubra-metin.json", encoding="utf-8") as f:
    data = json.load(f)

kalip = re.compile(r'^[A-Za-zÂÎÛâîûçğışöüÇĞİŞÖÜ].{2,}\s*:\s*[A-Za-zÂÎÛâîûçğışöüÇĞİŞÖÜ].{3,}$')

for sayfa in data[:30]:
    satirlar = sayfa["metin"].split("\n")
    for satir in satirlar:
        if kalip.match(satir.strip()) and len(satir) < 100:
            print(f'Sayfa {sayfa["sayfa"]}: {satir.strip()}')