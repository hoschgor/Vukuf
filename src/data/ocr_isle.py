import fitz
import pytesseract
from PIL import Image
import json
import io
import re

PDF_YOLU = "/home/hosgoer/Projeler/vukuf/src/data/Munkiz - Gazali.pdf"

def sayfayi_ocr_et(sayfa, zoom=2.5):
    mat = fitz.Matrix(zoom, zoom)
    pix = sayfa.get_pixmap(matrix=mat)
    img = Image.open(io.BytesIO(pix.tobytes("png")))
    metin = pytesseract.image_to_string(img, lang="tur")
    return metin

def temizle(metin):
    satirlar = metin.split("\n")
    temiz = []
    
    # Atlanacak kalıplar
    atlama_kaliplari = [
        r'(?i)el-munkız',
        r'(?i)el-munkızu',
        r'(?i)munkızu',
        r'(?i)min-ad-dal',
        r'^\d+\s+EL-',
        r'^EL-MUNKIZU',
    ]
    
    for satir in satirlar:
        s = satir.strip()
        if not s:
            continue
        if len(s) < 3:
            continue
        if re.match(r'^\d+$', s):
            continue
        
        # Kitap adı tekrarlarını atla
        atla = False
        for kalip in atlama_kaliplari:
            if re.search(kalip, s):
                atla = True
                break
        if atla:
            continue
        
        s = " ".join(s.split())
        temiz.append(s)


    # Tire birleştirme
    birlesmis = []
    i = 0
    while i < len(temiz):
        satir = temiz[i]
        if satir.endswith("-") and i + 1 < len(temiz):
            sonraki = temiz[i + 1]
            birlesmis.append(satir[:-1] + sonraki)
            i += 2
        else:
            birlesmis.append(satir)
            i += 1

    return "\n".join(birlesmis)



def sayfala(tumMetin, sayfa_boyutu=1800):
    sayfalar = []
    satirlar = tumMetin.split("\n")
    sayfa_no = 1
    mevcut = []
    uzunluk = 0

    for satir in satirlar:
        su = len(satir) + 1
        if uzunluk + su > sayfa_boyutu and mevcut:
            sayfalar.append({"sayfa": sayfa_no, "metin": "\n".join(mevcut)})
            sayfa_no += 1
            mevcut = [satir]
            uzunluk = su
        else:
            mevcut.append(satir)
            uzunluk += su

    if mevcut:
        sayfalar.append({"sayfa": sayfa_no, "metin": "\n".join(mevcut)})

    return sayfalar

if __name__ == "__main__":
    doc = fitz.open(PDF_YOLU)
    toplam = len(doc)
    print(f"Toplam sayfa: {toplam}")

    tumMetin = ""
    basladi = False
    
    for i in range(toplam):
        print(f"İşleniyor: {i+1}/{toplam}", end="\r")
        sayfa = doc[i]
        ham = sayfayi_ocr_et(sayfa)
        temiz = temizle(ham)
        
        # Önsöz geçene kadar atla
        if not basladi:
            if "ÖNSÖZ" in temiz.upper():
                basladi = True
            else:
                continue
        
        if temiz:
            tumMetin += temiz + "\n"

    doc.close()

    sayfalar = sayfala(tumMetin)
    print(f"\nOluşturulan sayfa: {len(sayfalar)}")

    with open("/home/hosgoer/Projeler/vukuf/public/munkiz-metin.json", "w", encoding="utf-8") as f:
        json.dump(sayfalar, f, ensure_ascii=False, indent=2)

    print("Tamamlandı!")
    if sayfalar:
        print("\n--- ÖRNEK ---")
        print(sayfalar[0]["metin"][:400])