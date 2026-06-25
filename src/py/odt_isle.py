from odf.opendocument import load
from odf.text import P, H
from odf import teletype
import json

def odt_isle(dosya_yolu, cikti_adi):
    doc = load(dosya_yolu)
    
    satirlar = []
    
    # getElementsByType ile al
    for p in doc.text.getElementsByType(P):
        metin = teletype.extractText(p).strip()
        if metin:
            satirlar.append(metin)
    
    for h in doc.text.getElementsByType(H):
        metin = teletype.extractText(h).strip()
        if metin:
            satirlar.append(metin)

    # Tire birleştirme
    birlesmis = []
    i = 0
    while i < len(satirlar):
        satir = satirlar[i]
        if satir.endswith("-") and i + 1 < len(satirlar):
            birlesmis.append(satir[:-1] + satirlar[i + 1])
            i += 2
        else:
            birlesmis.append(satir)
            i += 1

    # Sabit boyutlu sayfalara böl
    sayfalar = []
    sayfa_no = 1
    mevcut = []
    mevcut_uzunluk = 0
    hedef = 1200

    for satir in birlesmis:
        mevcut.append(satir)
        mevcut_uzunluk += len(satir)
        if mevcut_uzunluk >= hedef:
            sayfalar.append({"sayfa": sayfa_no, "metin": "\n".join(mevcut)})
            sayfa_no += 1
            mevcut = []
            mevcut_uzunluk = 0

    if mevcut:
        sayfalar.append({"sayfa": sayfa_no, "metin": "\n".join(mevcut)})

    cikti_yolu = f"/home/hosgoer/Projeler/vukuf/public/{cikti_adi}.json"
    with open(cikti_yolu, "w", encoding="utf-8") as f:
        json.dump(sayfalar, f, ensure_ascii=False, indent=2)

    print(f"Toplam sayfa: {len(sayfalar)}")
    print(f"Kaydedildi: {cikti_yolu}")
    print("\n--- ÖRNEK ---")
    if sayfalar:
        print(sayfalar[0]["metin"][:400])

if __name__ == "__main__":
    odt_isle(
        "/home/hosgoer/Projeler/vukuf/public/Writer/Tasavvuf/İmâm-ı Gazzâlî/KIYÂMET ve ÂHİRET.odt",
        "kıyametveahiret-metin"
    )