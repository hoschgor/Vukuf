"""
vakif_indir_isle.py
───────────────────
Konum: src/data/vakif_indir_isle.py

Bu script tanzil.net'ten vakıf işaretli Kuran metnini indirir,
mevcut kuran-mushaf.json dosyasına vakıf verisi ekler.

Çalıştır:
  cd ~/Projeler/vukuf/src/data
  pip install requests --break-system-packages   # yoksa
  python3 vakif_indir_isle.py
"""

import json
import re
import urllib.request
from pathlib import Path

# Tanzil.net vakıf işaretli metin URL'si
# pause=enhanced → tüm vakıf işaretlerini içerir
TANZIL_URL = "https://tanzil.net/pub/quran/quran-uthmani-hafs.txt"

# Vakıf Unicode karakterleri
VAKIF_ISARETLERI = {
    "\u06D6": "ط",   # ARABIC SMALL HIGH LIGATURE SAD WITH LAM WITH ALEF MAKSURA
    "\u06D7": "ط",   # benzeri
    "\u06D8": "ج",   # ARABIC SMALL HIGH MEEM INITIAL FORM
    "\u06D9": "ز",   # ARABIC SMALL HIGH LAM ALEF
    "\u06DA": "ص",   # ARABIC SMALL HIGH JEEM
    "\u06DB": "ق",   # ARABIC SMALL HIGH THREE DOTS
    "\u06DC": "م",   # ARABIC SMALL HIGH SEEN
    "\u06DF": "∴",   # ARABIC SMALL HIGH ROUNDED ZERO (muanaka)
    "\u06E0": "∴",   # ARABIC SMALL HIGH UPRIGHT RECTANGULAR ZERO
    "\u0615": "م",   # ARABIC SMALL HIGH TAH (lazım/mecburi)
}

def vakif_bul(kelime):
    """Kelime içindeki vakıf işaretini döndür, yoksa None"""
    for char, isaret in VAKIF_ISARETLERI.items():
        if char in kelime:
            return isaret
    return None

def hareke_temiz(metin):
    """Vakıf dahil tüm işaretleri kaldır, sadece harf bırak"""
    return re.sub(
        r'[\u0600-\u0615\u064B-\u065F\u0670'
        r'\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8'
        r'\u06EA-\u06ED]',
        '', metin
    ).strip()

def tanzil_indir(hedef_path):
    """Tanzil metnini indir"""
    print("📥 Tanzil.net'ten vakıf metni indiriliyor...")
    try:
        req = urllib.request.Request(
            TANZIL_URL,
            headers={"User-Agent": "Mozilla/5.0"}
        )
        with urllib.request.urlopen(req, timeout=30) as r:
            icerik = r.read().decode("utf-8")
        with open(hedef_path, "w", encoding="utf-8") as f:
            f.write(icerik)
        print(f"✓ İndirildi → {hedef_path}")
        return True
    except Exception as e:
        print(f"✗ İndirme hatası: {e}")
        return False

def tanzil_isle(txt_path):
    """
    Tanzil metin dosyasını parse et.
    Format: sure_no|ayet_no|metin
    Dönüş: { (sure_no, ayet_no): [kelime1, kelime2, ...] }
    """
    veri = {}
    with open(txt_path, encoding="utf-8") as f:
        for satir in f:
            satir = satir.strip()
            if not satir or satir.startswith("#"):
                continue
            parca = satir.split("|")
            if len(parca) < 3:
                continue
            try:
                sure_no  = int(parca[0])
                ayet_no  = int(parca[1])
                metin    = parca[2]
                kelimeler = metin.split()
                veri[(sure_no, ayet_no)] = kelimeler
            except ValueError:
                continue
    return veri

def mushaf_guncelle(mushaf_path, tanzil_veri):
    """kuran-mushaf.json'a vakıf verisi ekle"""
    with open(mushaf_path, encoding="utf-8") as f:
        mushaf = json.load(f)

    eslesen = 0
    eslesmez = 0
    toplam_vakif = 0

    for sure in mushaf:
        sure_no = sure["id"]
        for ayet in sure["ayetler"]:
            ayet_no = ayet["no"]
            anahtar = (sure_no, ayet_no)

            if anahtar not in tanzil_veri:
                eslesmez += 1
                continue

            tanzil_kelimeler = tanzil_veri[anahtar]
            mevcut_kelimeler = ayet["kelimeler"]

            # Kelime sayısı eşleşmiyorsa atla
            if len(tanzil_kelimeler) != len(mevcut_kelimeler):
                eslesmez += 1
                continue

            eslesen += 1
            for i, (mk, tk) in enumerate(zip(mevcut_kelimeler, tanzil_kelimeler)):
                vakif = vakif_bul(tk)
                if vakif:
                    mk["vakif"] = vakif
                    toplam_vakif += 1

    # Kaydet
    with open(mushaf_path, "w", encoding="utf-8") as f:
        json.dump(mushaf, f, ensure_ascii=False, separators=(",", ":"))

    return eslesen, eslesmez, toplam_vakif

def main():
    base = Path(__file__).parent
    mushaf_path  = base / "kuran-mushaf.json"
    tanzil_path  = base / "tanzil-hafs.txt"

    # kuran-mushaf.json kontrolü
    if not mushaf_path.exists():
        print("HATA: kuran-mushaf.json bulunamadı")
        print("Önce kuran_mushaf_hazirla.py scriptini çalıştır")
        return

    # Tanzil metnini indir (yoksa)
    if not tanzil_path.exists():
        basarili = tanzil_indir(tanzil_path)
        if not basarili:
            print()
            print("Manuel indirme:")
            print("  1. https://tanzil.net/pub/quran/quran-uthmani-hafs.txt adresine git")
            print("  2. Dosyayı tanzil-hafs.txt olarak src/data/ içine kaydet")
            print("  3. Bu scripti tekrar çalıştır")
            return
    else:
        print(f"✓ Mevcut tanzil dosyası kullanılıyor: {tanzil_path}")

    # Tanzil verisini parse et
    print("⚙️  Tanzil verisi işleniyor...")
    tanzil_veri = tanzil_isle(tanzil_path)
    print(f"✓ {len(tanzil_veri):,} ayet parse edildi")

    # kuran-mushaf.json güncelle
    print("⚙️  kuran-mushaf.json güncelleniyor...")
    eslesen, eslesmez, toplam_vakif = mushaf_guncelle(mushaf_path, tanzil_veri)

    print(f"✓ Tamamlandı")
    print(f"  Eşleşen ayet  : {eslesen:,}")
    print(f"  Eşleşmeyen    : {eslesmez:,}")
    print(f"  Eklenen vakıf : {toplam_vakif:,}")

if __name__ == "__main__":
    main()
