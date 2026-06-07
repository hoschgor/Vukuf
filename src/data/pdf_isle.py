import fitz
import json
import re

PDF_YOLU = "src/data/Ayetul-Kubra.pdf"

def arapca_duzelt(metin):
    if not metin:
        return metin
    satirlar = metin.split("\n")
    sonuc = []
    for satir in satirlar:
        if re.search(r'[\u0600-\u06FF]', satir):
            try:
                duzeltilmis = arabic_reshaper.reshape(satir)
                duzeltilmis = get_display(duzeltilmis)
                sonuc.append(duzeltilmis)
            except:
                sonuc.append(satir)
        else:
            sonuc.append(satir)
    return "\n".join(sonuc)

doc = fitz.open(PDF_YOLU)

# Arapça içeren ilk 5 sayfayı bul ve göster
bulunan = 0
for i in range(len(doc)):
    sayfa = doc[i]
    metin = sayfa.get_text()
    if re.search(r'[\u0600-\u06FF]', metin) and bulunan < 3:
        print(f"\n=== SAYFA {i+1} (ham) ===")
        print(metin[:400])
        print(f"\n=== SAYFA {i+1} (düzeltilmiş) ===")
        print(arapca_duzelt(metin)[:400])
        bulunan += 1

doc.close()

# Lügat satırı kalıbı
lugat_kalip = re.compile(
    r'^[A-ZÂÎÛa-zâîûçğışöüÇĞİŞÖÜ]'  # Büyük veya küçük harfle başlar
    r'[A-ZÂÎÛa-zâîûçğışöüÇĞİŞÖÜ\'\-îâû\s]{2,40}'  # 2-40 karakter (boşluk dahil)
    r'\s*:\s*'  # İki nokta
    r'[A-ZÂÎÛa-zâîûçğışöüÇĞİŞÖÜ].{3,}$'  # Anlam kısmı
)

# İçindekiler / tire satırı kalıbı
gereksiz_kalip = re.compile(r'\.{3,}|_{3,}|-{3,}|={3,}')

def satir_lugat_mi(satir):
    s = satir.strip()
    # İki nokta yoksa lügat değil
    if ":" not in s:
        return False
    # İki noktadan önceki kısım çok uzunsa lügat değil (cümle olabilir)
    iki_nokta_pos = s.index(":")
    if iki_nokta_pos > 50:
        return False
    return bool(lugat_kalip.match(s))

def satir_gereksiz_mi(satir):
    s = satir.strip()
    if gereksiz_kalip.search(s):
        return True
    if re.match(r'^\d+$', s):
        return True
    return False

def metni_cikart_bloklu():
    doc = fitz.open(PDF_YOLU)
    sayfalar = []
    
    for sayfa_no in range(len(doc)):
        sayfa = doc[sayfa_no]
        
        # Blokları al
        bloklar = sayfa.get_text("blocks")
        
        temiz_metin = ""
        for blok in bloklar:
            # blok: x0, y0, x1, y1, "metin", blok_no, satir_no, blok_tipi
            metin = blok[4].strip()
            if metin and not satir_lugat_mi(metin) and not satir_gereksiz_mi(metin):
                temiz_metin += metin + "\n\n"  # Bloklar arasına 2 \n
        
        if temiz_metin:
            sayfalar.append({
                "sayfa": sayfa_no + 1,
                "metin": temiz_metin.strip()
            })
    
    doc.close()
    return sayfalar

def satir_birlestir(satirlar):
    birlesmis = []
    i = 0
    while i < len(satirlar):
        satir = satirlar[i].strip()
        
        if not satir:
            if birlesmis and birlesmis[-1] != "":
                birlesmis.append("")
            i += 1
            continue
        
        # Tire ile bitiyor mu? (boşluklu veya boşluksuz)
        tire_kalip = satir.endswith("-") or satir.endswith("- ")
        
        if tire_kalip and i + 1 < len(satirlar):
            sonraki = satirlar[i + 1].strip()
            if sonraki:
                # Tireyi kaldır, sonrakiyle birleştir
                satir_temiz = satir.rstrip().rstrip("-").rstrip()
                birlesmis.append(satir_temiz + sonraki)
                i += 2
                continue
        
        birlesmis.append(satir)
        i += 1
    
    return birlesmis

dipnot_kalip = re.compile(r'^\d+\s+["""]')
hasiye_kalip = re.compile(r'^Haşiye')

def blok_atlanacak_mi(metin, x0, y0, sayfa_genisligi, sayfa_yuksekligi):
    lugat_x_esigi = sayfa_genisligi * 0.50
    alt_bolge_y = sayfa_yuksekligi * 0.58

    # Sağ sütun — her zaman lügat, atla
    if x0 > lugat_x_esigi:
        return True

    # Sol sütun alt bölge
    if y0 > alt_bolge_y:
        ilk_satir = metin.split("\n")[0].strip()
        # Dipnot veya haşiyeyse tut
        if re.match(r'^\d+\s+["""]', ilk_satir) or re.match(r'^Haşiye', ilk_satir):
            return False
        # Tüm satırların çoğu lügat kalıbına uyuyorsa atla
        satirlar = [s.strip() for s in metin.split("\n") if s.strip()]
        lugat_sayisi = sum(1 for s in satirlar if satir_lugat_mi(s))
        if lugat_sayisi > 0:
            return True
        # İlk satır lügat kalıbına uyuyorsa atla
        if satir_lugat_mi(ilk_satir):
            return True

    return False

def metni_cikart():
    doc = fitz.open(PDF_YOLU)
    sayfalar = []

    for sayfa_no in range(len(doc)):
        sayfa = doc[sayfa_no]
        sayfa_genisligi = sayfa.rect.width
        sayfa_yuksekligi = sayfa.rect.height

        bloklar = sayfa.get_text("blocks")
        temiz_satirlar = []

        for blok in bloklar:
            x0, y0, x1, y1, metin, *_ = blok
            metin = metin.strip()

            if not metin:
                continue

            if blok_atlanacak_mi(metin, x0, y0, sayfa_genisligi, sayfa_yuksekligi):
                continue

            if satir_gereksiz_mi(metin):
                continue

            satirlar = metin.split("\n")
            for satir in satirlar:
                s = " ".join(satir.split())
                if s and not satir_gereksiz_mi(s):
                    temiz_satirlar.append(s)

        # Tire birleştirme
        birlesmis = []
        i = 0
        while i < len(temiz_satirlar):
            satir = temiz_satirlar[i]
            if (satir.endswith("-") or satir.endswith("- ")) and i + 1 < len(temiz_satirlar):
                sonraki = temiz_satirlar[i + 1]
                satir_temiz = satir.rstrip().rstrip("-").rstrip()
                birlesmis.append(satir_temiz + sonraki)
                i += 2
            else:
                birlesmis.append(satir)
                i += 1

        # Paragrafları birleştir
        paragraflar = []
        mevcut = []
        for satir in birlesmis:
            mevcut.append(satir)
            if satir.endswith(("..", ".", "!", "?", ":", ";")):
                paragraflar.append(" ".join(mevcut))
                mevcut = []
        if mevcut:
            paragraflar.append(" ".join(mevcut))

        temiz_metin = "\n".join(paragraflar).strip()

        if temiz_metin:
            sayfalar.append({
                "sayfa": sayfa_no + 1,
                "metin": temiz_metin
            })

    doc.close()
    return sayfalar

def sayfala(tumMetin, satir_sayisi=18):
    satirlar = [s for s in tumMetin.split("\n") if s.strip()]
    sayfalar = []
    sayfa_no = 1

    for i in range(0, len(satirlar), satir_sayisi):
        grup = satirlar[i:i + satir_sayisi]
        metin = "\n".join(grup)
        if metin.strip():
            sayfalar.append({
                "sayfa": sayfa_no,
                "metin": metin
            })
            sayfa_no += 1

    return sayfalar

def kaydet(sayfalar):
    satirlar = []
    
    for sayfa in sayfalar:
        for satir in sayfa["metin"].split("\n"):
            s = satir.strip()
            if not s:
                continue
            if re.match(r'^\d+\s', s) or re.match(r'^Haşiye', s):
                satirlar.append("§" + s)
            else:
                satirlar.append(s)
    
    tumMetin = "\n".join(satirlar)
    yeniSayfalar = sayfala(tumMetin, satir_sayisi=15)
    
    with open("public/ayetul-kubra-metin.json", "w", encoding="utf-8") as f:
        json.dump(yeniSayfalar, f, ensure_ascii=False, indent=2)
    
    print(f"Toplam sayfa: {len(yeniSayfalar)}")
    if len(yeniSayfalar) > 5:
        print(f"\n--- ÖRNEK SAYFA ---")
        print(yeniSayfalar[5]["metin"][:500])

if __name__ == "__main__":
    print("PDF işleniyor...")
    sayfalar = metni_cikart()
    kaydet(sayfalar)