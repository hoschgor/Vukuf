"""
diyanet_donustur.py (v3)
────────────────────────
Kelime sıralaması: Uthmani
Kelime metni:      Diyanet karakterleri (ters mapping ile birleştirilir)
Sayfa/cüz/vakıf:  Diyanet
Meal:              Diyanet
"""

import json, re
from pathlib import Path

INDIRILENLER = Path.home() / "İndirilenler"
VUKUF_DATA   = Path.home() / "Projeler/vukuf/src/data"
YEDEK        = Path.home() / "Projeler/vukuf/public/Yedek"

GIRIS_DIYANET_AYETLER = INDIRILENLER / "kuran-mushaf.json"
GIRIS_DIYANET_SURELER = INDIRILENLER / "surahs.json"
GIRIS_DIYANET_MUSHAF  = YEDEK / "kuran-mushaf-diyanet.bak.json"
GIRIS_UTHMANI_MUSHAF  = YEDEK / "kuran-mushaf.json"
GIRIS_YER             = VUKUF_DATA / "kuran.json"
GIRIS_MAPPING         = VUKUF_DATA / "kelime-mapping.json"

CIKIS_MUSHAF = VUKUF_DATA / "kuran-mushaf.json"
CIKIS_MEAL   = VUKUF_DATA / "ayet-meal.json"
CIKIS_SAYFA  = VUKUF_DATA / "sayfa-harita.json"

SECDE_AYETLERI = {
    (7,206),(13,15),(16,50),(17,109),(19,58),
    (22,18),(22,77),(25,60),(27,26),(32,15),
    (38,24),(41,38),(53,62),(84,21),(96,19),
}

VAKIF_CPS = {0x615, 0x617, 0x06D8, 0x06D9, 0x06DA, 0x06DB, 0x06DC, 0x08D6}

def html_temizle(metin):
    return re.sub(r"<[^>]+>", "", metin or "").strip()

def arapca_temizle(metin):
    metin = metin.replace("\u06cc", "\u064a")  # Farsça ye → Arapça ye
    return metin

def vakif_bul(arabic):
    """Kelime içindeki vakıf karakterini döner."""
    for c in arabic:
        if ord(c) in VAKIF_CPS:
            return c
    return None

def main():
    print("Dosyalar yükleniyor...")

    with open(GIRIS_DIYANET_AYETLER, encoding='utf-8') as f:
        diyanet_ayetler = json.load(f)

    with open(GIRIS_DIYANET_SURELER, encoding='utf-8') as f:
        diyanet_sureler = json.load(f)

    with open(GIRIS_DIYANET_MUSHAF, encoding='utf-8') as f:
        diyanet_mushaf = json.load(f)

    with open(GIRIS_UTHMANI_MUSHAF, encoding='utf-8') as f:
        uthmani_mushaf = json.load(f)

    with open(GIRIS_YER, encoding='utf-8') as f:
        yer_data = json.load(f)

    with open(GIRIS_MAPPING, encoding='utf-8') as f:
        mapping = json.load(f)

    print(f"  ✓ Tüm dosyalar yüklendi")

    # Ters mapping: uthmani_id -> [diyanet_id listesi] (sıralı)
    ters_mapping = {}
    for diyanet_id, uthmani_id in mapping.items():
        ters_mapping.setdefault(uthmani_id, []).append(diyanet_id)

    # Diyanet kelime id -> kelime objesi
    diyanet_kelime_map = {}
    for sure in diyanet_mushaf:
        for ayet in sure['ayetler']:
            for k in ayet['kelimeler']:
                diyanet_kelime_map[k['id']] = k

    # Diyanet ayet map: (sure_id, ayet_no) -> ayet
    diyanet_ayet_map = {}
    for sure in diyanet_mushaf:
        for ayet in sure['ayetler']:
            diyanet_ayet_map[(sure['id'], ayet['no'])] = ayet

    # Diyanet meal map
    diyanet_meal_map = {}
    for item in diyanet_ayetler:
        diyanet_meal_map[(item['surah_id'], item['ayah_number'])] = (item.get('text_turkish') or '').strip()

    # Sure bilgileri
    sure_haritasi = {s['id']: s for s in diyanet_sureler}
    yer_haritasi  = {s['id']: s.get('yer', '') for s in yer_data}

    print("\nDönüştürülüyor...")
    mushaf = []
    meal_dict = {}
    sayfa_baslar = {}
    toplam_kelime = 0

    for uthmani_sure in uthmani_mushaf:
        sure_no   = uthmani_sure['id']
        sure_meta = sure_haritasi.get(sure_no, {})
        ayetler_mushaf = []
        meal_sure = {}

        for uthmani_ayet in uthmani_sure['ayetler']:
            ayet_no   = uthmani_ayet['no']
            d_ayet    = diyanet_ayet_map.get((sure_no, ayet_no))
            sayfa     = d_ayet['sayfa'] if d_ayet else 0
            cuz       = d_ayet['cuz']   if d_ayet else 0
            meal_tr   = diyanet_meal_map.get((sure_no, ayet_no), '')
            meal_sure[str(ayet_no)] = meal_tr

            if sayfa and sayfa not in sayfa_baslar:
                sayfa_baslar[sayfa] = (sure_no, ayet_no)

            kelimeler = []
            for uthmani_k in uthmani_ayet['kelimeler']:
                uid = uthmani_k['id']
                diyanet_ids = ters_mapping.get(uid, [])

                if diyanet_ids:
                    # Diyanet kelimelerinin metnini birleştir
                    diyanet_grp = [diyanet_kelime_map[did] for did in diyanet_ids if did in diyanet_kelime_map]
                    arabic = ''.join(arapca_temizle(dk['arabic']) for dk in diyanet_grp)
                else:
                    # Mapping'de yoksa Uthmani metni kullan
                    arabic = uthmani_k['arabic']
                    vakif  = None

                secde = uthmani_k.get('secde')

                kelimeler.append({
                    "id":     uid,
                    "arabic": arabic,
                    "secde":  secde,
                })

            toplam_kelime += len(kelimeler)
            ayetler_mushaf.append({
                "no":        ayet_no,
                "sayfa":     sayfa,
                "cuz":       cuz,
                "kelimeler": kelimeler,
            })

        mushaf.append({
            "id":         sure_no,
            "isim":       sure_meta.get("name_turkish", uthmani_sure.get("isim", "")),
            "isimArapca": sure_meta.get("name_arabic",  uthmani_sure.get("isimArapca", "")),
            "anlam":      uthmani_sure.get("anlam", ""),
            "yer":        yer_haritasi.get(sure_no, uthmani_sure.get("yer", "")),
            "ayetSayisi": sure_meta.get("ayah_count", len(ayetler_mushaf)),
            "bilgi":      html_temizle(sure_meta.get("info", "")),
            "besmele":    sure_meta.get("besmele_visible", 1),
            "ayetler":    ayetler_mushaf,
        })

        meal_dict[str(sure_no)] = meal_sure
        print(f"  {sure_no:>3}. {sure_meta.get('name_turkish', '?'):<20} — {len(ayetler_mushaf)} ayet, {sum(len(a['kelimeler']) for a in ayetler_mushaf):,} kelime")

    sayfa_haritasi = [
        {"sayfa": s, "sure": v[0], "ayet": v[1]}
        for s, v in sorted(sayfa_baslar.items())
    ]

    print("\nDosyalar yazılıyor...")

    with open(CIKIS_MUSHAF, "w", encoding="utf-8") as f:
        json.dump(mushaf, f, ensure_ascii=False, separators=(",", ":"))
    print(f"  ✓ kuran-mushaf.json — {CIKIS_MUSHAF.stat().st_size/1024/1024:.1f} MB, {toplam_kelime:,} kelime")

    with open(CIKIS_MEAL, "w", encoding="utf-8") as f:
        json.dump(meal_dict, f, ensure_ascii=False, indent=2)
    print(f"  ✓ ayet-meal.json — {len(meal_dict)} sure")

    with open(CIKIS_SAYFA, "w", encoding="utf-8") as f:
        json.dump(sayfa_haritasi, f, ensure_ascii=False, indent=2)
    print(f"  ✓ sayfa-harita.json — {len(sayfa_haritasi)} sayfa")

    print(f"\n✅ Tamamlandı! {len(mushaf)} sure · {toplam_kelime:,} kelime · {len(sayfa_haritasi)} sayfa")

if __name__ == "__main__":
    main()