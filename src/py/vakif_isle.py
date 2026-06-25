"""
vakif_isle.py
─────────────
Konum: src/data/vakif_isle.py

npm'den quran-json paketini indirir, vakıf verilerini
kuran-mushaf.json dosyasına ekler.

Çalıştır:
  cd ~/Projeler/vukuf/src/data
  python3 vakif_isle.py
"""

import json
import re
import subprocess
import sys
import tempfile
import tarfile
import urllib.request
from pathlib import Path

NPM_URL = "https://registry.npmjs.org/quran-json/-/quran-json-3.1.2.tgz"

# Gerçek vakıf işaretleri (U+06D6–U+06E4 aralığı, seçili)
VAKIF_MAP = {
    '\u06D6': 'ط',   # ARABIC SMALL HIGH LIGATURE SAD WITH LAM
    '\u06D7': 'ط',   # ARABIC SMALL HIGH LIGATURE QAF WITH LAM
    '\u06D8': 'ج',   # ARABIC SMALL HIGH MEEM INITIAL FORM
    '\u06D9': 'ز',   # ARABIC SMALL HIGH LAM ALEF
    '\u06DA': 'ص',   # ARABIC SMALL HIGH JEEM
    '\u06DB': 'ق',   # ARABIC SMALL HIGH THREE DOTS (muanaka)
    '\u06DC': 'م',   # ARABIC SMALL HIGH SEEN
    '\u06DF': '∴',   # ARABIC SMALL HIGH ROUNDED ZERO
    '\u06E0': '∴',   # ARABIC SMALL HIGH UPRIGHT RECTANGULAR ZERO
    '\u0615': 'م',   # ARABIC SMALL HIGH TAH (lazım)
    '\u06E2': 'م',   # ARABIC SMALL HIGH MEEM MEDIAL FORM
    '\u06E3': 'ص',   # ARABIC SMALL LOW SEEN
    '\u06E4': 'ط',   # ARABIC SMALL HIGH MADDA
}

def kelime_vakif_bul(kelime):
    """Kelime içindeki vakıf işaretini döndür"""
    for ch in kelime:
        if ch in VAKIF_MAP:
            return VAKIF_MAP[ch]
    return None

def hareke_sil(metin):
    """Tüm hareke ve işaretleri kaldır, sadece harf bırak"""
    return re.sub(
        r'[\u0600-\u0615\u064B-\u065F\u0670'
        r'\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8'
        r'\u06EA-\u06ED\u0671]',
        '', metin
    ).strip()

def npm_paketi_indir(hedef_dir):
    """npm paketini indir ve aç"""
    tgz_path = hedef_dir / "quran-json.tgz"
    print("📥 npm'den quran-json paketi indiriliyor...")
    try:
        req = urllib.request.Request(
            NPM_URL,
            headers={"User-Agent": "Mozilla/5.0"}
        )
        with urllib.request.urlopen(req, timeout=60) as r:
            data = r.read()
        with open(tgz_path, 'wb') as f:
            f.write(data)
        print(f"  ✓ İndirildi ({len(data) // 1024} KB)")
    except Exception as e:
        print(f"  ✗ İndirme hatası: {e}")
        return None

    # Aç
    with tarfile.open(tgz_path, 'r:gz') as tar:
        tar.extractall(hedef_dir)

    json_path = hedef_dir / "package" / "dist" / "quran.json"
    if json_path.exists():
        print(f"  ✓ Açıldı: {json_path}")
        return json_path
    else:
        print("  ✗ quran.json pakette bulunamadı")
        return None

def vakif_verisi_hazirla(quran_json_path):
    """
    quran-json'dan vakıf verisini çek.
    Dönüş: { (sure_no, ayet_no): [vakif_or_None, ...] }
    vakif listesi kelime indisine göre sıralı.
    """
    with open(quran_json_path, encoding='utf-8') as f:
        d = json.load(f)

    veri = {}
    for sure in d:
        sure_no = sure['id']
        for ayet in sure['verses']:
            ayet_no = ayet['id']
            kelimeler = ayet['text'].split()
            vakiflar = [kelime_vakif_bul(k) for k in kelimeler]
            veri[(sure_no, ayet_no)] = vakiflar

    return veri

def mushaf_guncelle(mushaf_path, vakif_veri):
    """kuran-mushaf.json'a vakıf verisi ekle"""
    with open(mushaf_path, encoding='utf-8') as f:
        mushaf = json.load(f)

    eslesen = 0
    eslesmez = 0
    eklenen_vakif = 0

    for sure in mushaf:
        sure_no = sure['id']
        for ayet in sure['ayetler']:
            ayet_no = ayet['no']
            anahtar = (sure_no, ayet_no)

            if anahtar not in vakif_veri:
                eslesmez += 1
                continue

            npm_vakiflar = vakif_veri[anahtar]
            mevcut_kelimeler = ayet['kelimeler']

            # Kelime sayısı farklıysa eşleştirmeyi dene
            if len(npm_vakiflar) != len(mevcut_kelimeler):
                # Bazı ayetlerde kelime bölümlemesi farklı olabilir
                # Bu durumda atla
                eslesmez += 1
                continue

            eslesen += 1
            for mk, vakif in zip(mevcut_kelimeler, npm_vakiflar):
                if vakif:
                    mk['vakif'] = vakif
                    eklenen_vakif += 1

    # Kaydet
    with open(mushaf_path, 'w', encoding='utf-8') as f:
        json.dump(mushaf, f, ensure_ascii=False, separators=(',', ':'))

    return eslesen, eslesmez, eklenen_vakif

def main():
    base = Path(__file__).parent
    mushaf_path = base / 'kuran-mushaf.json'

    if not mushaf_path.exists():
        print("HATA: kuran-mushaf.json bulunamadı")
        print("Önce kuran_mushaf_hazirla.py scriptini çalıştır")
        return

    # Geçici dizine indir
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        quran_json_path = npm_paketi_indir(tmp_path)

        if not quran_json_path:
            return

        # Vakıf verisini hazırla
        print("⚙️  Vakıf verisi işleniyor...")
        vakif_veri = vakif_verisi_hazirla(quran_json_path)
        print(f"  ✓ {len(vakif_veri):,} ayet verisi hazırlandı")

        # mushaf güncelle
        print("⚙️  kuran-mushaf.json güncelleniyor...")
        eslesen, eslesmez, eklenen = mushaf_guncelle(mushaf_path, vakif_veri)

    boyut_mb = mushaf_path.stat().st_size / 1024 / 1024
    print()
    print("✓ Tamamlandı!")
    print(f"  Eşleşen ayet  : {eslesen:,}")
    print(f"  Eşleşmeyen    : {eslesmez:,}")
    print(f"  Eklenen vakıf : {eklenen:,}")
    print(f"  Dosya boyutu  : {boyut_mb:.1f} MB")

if __name__ == '__main__':
    main()
