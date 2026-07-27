"""
diyanet_donustur.py
───────────────────
Diyanet hazır verilerini Vukuf'un kuran-mushaf.json formatına dönüştürür.

Giriş dosyaları:
  ~/İndirilenler/kuran-mushaf.json  → ayet metinleri (Diyanet)
  ~/İndirilenler/surahs.json        → sure bilgileri (Diyanet)
  ~/Projeler/vukuf/src/data/kuran.json → yer (Mekke/Medine) bilgisi

Çıkış dosyaları:
  ~/Projeler/vukuf/src/data/kuran-mushaf.json  → ana mushaf verisi
  ~/Projeler/vukuf/src/data/ayet-meal.json      → meal verisi (Diyanet'ten)
  ~/Projeler/vukuf/src/data/sayfa-harita.json   → sayfa başları

Çalıştır:
  python3 ~/Projeler/vukuf/src/py/diyanet_donustur.py
"""

import json
import re
from pathlib import Path

# ── Yollar
INDIRILENLER     = Path.home() / "İndirilenler"
VUKUF_DATA       = Path.home() / "Projeler/vukuf/src/data"

GIRIS_AYETLER    = INDIRILENLER / "kuran-mushaf.json"
GIRIS_SURELER    = INDIRILENLER / "surahs.json"
GIRIS_KURAN_ESK  = VUKUF_DATA  / "kuran.json"       # sadece yer bilgisi için

CIKIS_MUSHAF     = VUKUF_DATA  / "kuran-mushaf.json"
CIKIS_MEAL       = VUKUF_DATA  / "ayet-meal.json"
CIKIS_SAYFA      = VUKUF_DATA  / "sayfa-harita.json"

# ── Secde ayetleri (15 adet, sabit)
SECDE_AYETLERI = {
    (7,206),(13,15),(16,50),(17,109),(19,58),
    (22,18),(22,77),(25,60),(27,26),(32,15),
    (38,24),(41,38),(53,62),(84,21),(96,19),
}

# Vakıf verisi Diyanet veri setinden geliyor, ayrıca eklemeye gerek yok
VAKIF_DB = {}

def arapca_temizle(metin: str) -> str:
    """Diyanet verisindeki non-standard karakterleri düzeltir."""
    # Farsça/Urduca ye → Arapça ye
    metin = metin.replace("ی", "ي")
    # Uthmani bağımsız işaretler — kelime içinden temizle
    for cp in ["06d9","06da","06db","06d6","06d7","06d8","06dc","06dd","06df","06e0","0615"]:
        metin = metin.replace(cp, "")
    return metin

def html_temizle(metin: str) -> str:
    """info alanındaki HTML taglarını temizler."""
    return re.sub(r"<[^>]+>", "", metin or "").strip()

def main():
    # ── Dosyaları yükle
    print("Dosyalar yükleniyor...")

    with open(GIRIS_AYETLER, encoding="utf-8") as f:
        diyanet_ayetler = json.load(f)
    print(f"  ✓ Diyanet ayetler — {len(diyanet_ayetler):,} ayet")

    with open(GIRIS_SURELER, encoding="utf-8") as f:
        diyanet_sureler = json.load(f)
    print(f"  ✓ Diyanet sureler — {len(diyanet_sureler)} sure")

    with open(GIRIS_KURAN_ESK, encoding="utf-8") as f:
        eski_kuran = json.load(f)
    print(f"  ✓ Eski kuran.json — {len(eski_kuran)} sure (yer bilgisi için)")

    # ── Yer (Mekke/Medine) haritası — eski veriden al
    yer_haritasi = {}
    for sure in eski_kuran:
        yer_haritasi[sure["id"]] = sure.get("yer", "")

    # ── Sure bilgileri haritası
    sure_haritasi = {s["id"]: s for s in diyanet_sureler}

    # ── Ayetleri sure bazında grupla
    sure_ayetleri: dict[int, list] = {}
    for ayet in diyanet_ayetler:
        sid = ayet["surah_id"]
        sure_ayetleri.setdefault(sid, []).append(ayet)

    # Sure içinde ayet numarasına göre sırala
    for sid in sure_ayetleri:
        sure_ayetleri[sid].sort(key=lambda a: a["ayah_number"])

    # ── Ana dönüşüm
    print("\nDönüştürülüyor...")
    mushaf = []
    meal_dict = {}          # {sure_id_str: {ayet_no_str: meal}}
    sayfa_baslar = {}       # {sayfa_no: (sure_id, ayet_no)} — sayfa haritası için
    toplam_kelime = 0

    for sure_no in range(1, 115):
        sure_meta = sure_haritasi.get(sure_no)
        if not sure_meta:
            print(f"  UYARI: sure {sure_no} surahs.json'da bulunamadı!")
            continue

        ayetler_raw = sure_ayetleri.get(sure_no, [])
        ayetler_mushaf = []
        meal_sure = {}

        for ayet_raw in ayetler_raw:
            ayet_no  = ayet_raw["ayah_number"]
            arapca   = arapca_temizle(ayet_raw["text_arabic"].strip())
            meal_tr  = (ayet_raw.get("text_turkish") or "").strip()
            sayfa    = ayet_raw.get("page", 0)
            cuz      = ayet_raw.get("juz", 0)

            # Sayfa haritası — bu sayfayı ilk kez görüyorsak kaydet
            if sayfa not in sayfa_baslar:
                sayfa_baslar[sayfa] = (sure_no, ayet_no)

            # Kelime bazlı işlem
            kelime_listesi = arapca.split()
            kelimeler = []

            for ki, ham in enumerate(kelime_listesi):
                vakif = None
                secde = "سَجْدَة" if (
                    (sure_no, ayet_no) in SECDE_AYETLERI and
                    ki == len(kelime_listesi) - 1
                ) else None

                kelimeler.append({
                    "id":     f"{sure_no}:{ayet_no}:{ki+1}",
                    "arabic": ham,
                    "vakif":  vakif,
                    "secde":  secde,
                })

            toplam_kelime += len(kelimeler)
            meal_sure[str(ayet_no)] = meal_tr

            ayetler_mushaf.append({
                "no":       ayet_no,
                "sayfa":    sayfa,
                "cuz":      cuz,
                "kelimeler": kelimeler,
            })

        mushaf.append({
            "id":          sure_no,
            "isim":        sure_meta.get("name_turkish", ""),
            "isimArapca":  sure_meta.get("name_arabic", ""),
            "anlam":       "",           # Diyanet verisinde anlam yok; gerekirse elle eklenebilir
            "yer":         yer_haritasi.get(sure_no, ""),
            "ayetSayisi":  sure_meta.get("ayah_count", len(ayetler_mushaf)),
            "bilgi":       html_temizle(sure_meta.get("info", "")),
            "besmele":     sure_meta.get("besmele_visible", 1),
            "ayetler":     ayetler_mushaf,
        })

        meal_dict[str(sure_no)] = meal_sure
        print(f"  {sure_no:>3}. {sure_meta['name_turkish']:<20} — {len(ayetler_mushaf)} ayet, {sum(len(a['kelimeler']) for a in ayetler_mushaf):,} kelime")

    # ── Sayfa haritası üret
    sayfa_haritasi = [
        {"sayfa": s, "sure": v[0], "ayet": v[1]}
        for s, v in sorted(sayfa_baslar.items())
    ]

    # ── Dosyaları yaz
    print("\nDosyalar yazılıyor...")

    with open(CIKIS_MUSHAF, "w", encoding="utf-8") as f:
        json.dump(mushaf, f, ensure_ascii=False, separators=(",", ":"))
    boyut = CIKIS_MUSHAF.stat().st_size / 1024 / 1024
    print(f"  ✓ kuran-mushaf.json — {boyut:.1f} MB, {toplam_kelime:,} kelime")

    with open(CIKIS_MEAL, "w", encoding="utf-8") as f:
        json.dump(meal_dict, f, ensure_ascii=False, indent=2)
    print(f"  ✓ ayet-meal.json — {len(meal_dict)} sure")

    with open(CIKIS_SAYFA, "w", encoding="utf-8") as f:
        json.dump(sayfa_haritasi, f, ensure_ascii=False, indent=2)
    print(f"  ✓ sayfa-harita.json — {len(sayfa_haritasi)} sayfa")

    print("\n✅ Tamamlandı!")
    print(f"   {len(mushaf)} sure · {toplam_kelime:,} kelime · {len(sayfa_haritasi)} sayfa")

if __name__ == "__main__":
    main()
