import fitz
import json
import re

PDF_YOLU = "src/data/Ayetul-Kubra.pdf"

def lugat_cikart():
    doc = fitz.open(PDF_YOLU)
    lugat = {}

    for sayfa_no in range(len(doc)):
        sayfa = doc[sayfa_no]
        sayfa_genisligi = sayfa.rect.width
        lugat_esigi = sayfa_genisligi * 0.55

        bloklar = sayfa.get_text("blocks")
        for blok in bloklar:
            x0, y0, x1, y1, metin, *_ = blok
            if x0 < lugat_esigi:
                continue

            satirlar = metin.strip().split("\n")
            for satir in satirlar:
                s = " ".join(satir.split()).strip()
                if ":" not in s or len(s) < 5:
                    continue
                iki_nokta = s.index(":")
                if iki_nokta > 60:
                    continue
                kelime = s[:iki_nokta].strip()
                anlam = s[iki_nokta+1:].strip()
                if len(kelime) > 2 and len(anlam) > 3:
                    # Tire birleştirme
                    anlam = anlam.replace(" - ", "")
                    lugat[kelime] = anlam

    doc.close()
    return lugat

if __name__ == "__main__":
    lugat = lugat_cikart()
    # Mevcut lugat.json ile birleştir
    try:
        with open("src/data/lugat.json", encoding="utf-8") as f:
            mevcut = json.load(f)
    except:
        mevcut = {}

    # Yenileri ekle, mevcutları koru
    for k, v in lugat.items():
        anahtar = k.lower()
        if anahtar not in mevcut:
            mevcut[anahtar] = v

    mevcut = dict(sorted(mevcut.items()))

    with open("src/data/lugat.json", "w", encoding="utf-8") as f:
        json.dump(mevcut, f, ensure_ascii=False, indent=2)

    print(f"Toplam kelime: {len(mevcut)}")
    print("\n--- ÖRNEK ---")
    for k, v in list(lugat.items())[:10]:
        print(f"{k}: {v}")