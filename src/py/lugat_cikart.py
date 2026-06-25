import json
import re

with open("src/data/ayetul-kubra-metin.json", encoding="utf-8") as f:
    data = json.load(f)

kara_liste = {
    "tel", "faks", "isbn", "birincisi", "ikincisi", "üçüncüsü",
    "dördüncüsü", "beşincisi", "altıncısı", "yedincisi", "sekizincisi",
    "birinci", "ikinci", "üçüncü", "dördüncü", "beşinci", "tas",
    "not", "bkz", "age", "asm", "ra", "sav", "as"
}

kalip = re.compile(
    r'^([A-ZÂÎÛa-zâîûçğışöüÇĞİŞÖÜ][A-ZÂÎÛa-zâîûçğışöüÇĞİŞÖÜ\'\-îâû]{2,})'
    r'\s*:\s*'
    r'([A-ZÂÎÛa-zâîûçğışöüÇĞİŞÖÜ][^\n]{5,120})$',
    re.MULTILINE
)

lugat = {}

for sayfa in data:
    metin = sayfa["metin"]
    for esleme in kalip.finditer(metin):
        kelime = esleme.group(1).strip()
        anlam = esleme.group(2).strip()

        if kelime.lower() in kara_liste:
            continue
        if re.search(r'\d{4}|\bwww\b|\.com|\.org', anlam):
            continue
        if len(kelime) < 3:
            continue
        if len(anlam) > 120:
            continue

        # Yarım kalan anlamları atla (tire veya virgülle bitenler)
        if anlam.endswith("-") or anlam.endswith(","):
            continue

        # Nokta veya noktalı virgülle bitmeyenleri atla
        # (büyük ihtimalle yarım kalmış)
        if not re.search(r'[.!?]$', anlam):
            # Yine de al ama sonuna nokta ekle
            anlam = anlam.rstrip() + "."

        # Normalize et: küçük harfe çevir sadece anahtarı
        anahtar = kelime.lower()

        # Zaten varsa daha uzun olanı tut
        if anahtar in lugat:
            if len(anlam) > len(lugat[anahtar]):
                lugat[anahtar] = anlam
        else:
            lugat[anahtar] = anlam

# Alfabetik sırala
lugat = dict(sorted(lugat.items()))

with open("src/data/lugat.json", "w", encoding="utf-8") as f:
    json.dump(lugat, f, ensure_ascii=False, indent=2)

print(f"Temizlenen kelime sayısı: {len(lugat)}")
print("\n--- İLK 20 KELİME ---")
for k, v in list(lugat.items())[:20]:
    print(f"{k}: {v}")