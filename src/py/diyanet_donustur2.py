"""
diyanet_donustur.py (v2)
────────────────────────
Kelime bölümleme: Uthmani mushaf (eski kuran-mushaf.json)
Kelime metni:     Diyanet karakterleri
Sayfa/cüz/vakıf: Diyanet
Meal:             Diyanet

Giriş:
  ~/İndirilenler/kuran-mushaf.json     → Diyanet ayet metinleri
  ~/İndirilenler/surahs.json           → Diyanet sure bilgileri
  ~/Projeler/vukuf/public/Yedek/kuran-mushaf-diyanet.bak.json  → önceki Diyanet mushaf (sayfa/vakıf için)
  ~/Projeler/vukuf/public/Yedek/kuran-mushaf.json              → Uthmani mushaf (kelime bölümleme için)
  ~/Projeler/vukuf/src/data/kuran.json → yer bilgisi

Çıkış:
  ~/Projeler/vukuf/src/data/kuran-mushaf.json
  ~/Projeler/vukuf/src/data/ayet-meal.json
  ~/Projeler/vukuf/src/data/sayfa-harita.json
"""

import json
import re
from pathlib import Path

# ── Yollar
INDIRILENLER  = Path.home() / "İndirilenler"
VUKUF_DATA    = Path.home() / "Projeler/vukuf/src/data"
YEDEK         = Path.home() / "Projeler/vukuf/public/Yedek"

GIRIS_DIYANET_AYETLER = INDIRILENLER / "kuran-mushaf.json"
GIRIS_DIYANET_SURELER = INDIRILENLER / "surahs.json"
GIRIS_DIYANET_MUSHAF  = YEDEK / "kuran-mushaf-diyanet.bak.json"  # sayfa/vakıf
GIRIS_UTHMANI_MUSHAF  = YEDEK / "kuran-mushaf.json"              # kelime bölümleme
GIRIS_YER             = VUKUF_DATA / "kuran.json"

CIKIS_MUSHAF  = VUKUF_DATA / "kuran-mushaf.json"
CIKIS_MEAL    = VUKUF_DATA / "ayet-meal.json"
CIKIS_SAYFA   = VUKUF_DATA / "sayfa-harita.json"

# ── Secde ayetleri
SECDE_AYETLERI = {
    (7,206),(13,15),(16,50),(17,109),(19,58),
    (22,18),(22,77),(25,60),(27,26),(32,15),
    (38,24),(41,38),(53,62),(84,21),(96,19),
}

# ── Normalizasyon (hizalama için)
def normalize(k):
    k = re.sub(r'[\u0610-\u061A\u064B-\u065F\u0640\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED\u06E1\u08D0-\u08D6\u0615\u0617]', '', k)
    k = re.sub(r'[\u0671\u0622\u0623\u0625]', '\u0627', k)
    return k.strip()

def html_temizle(metin: str) -> str:
    return re.sub(r"<[^>]+>", "", metin or "").strip()

def arapca_temizle(metin: str) -> str:
    """Diyanet verisindeki non-standard karakterleri düzeltir."""
    metin = metin.replace("\u06cc", "\u064a")  # Farsça ye → Arapça ye
    return metin

def eslesir_ayet(yeni_kel, eski_kel):
    """Uthmani kelimelerini Diyanet kelimelerine hizalar.
    Döner: [(uthmani_kelime, [diyanet_kelime, ...]), ...]
    """
    yn = [(k, normalize(k['arabic'])) for k in yeni_kel]  # Diyanet
    es = [(k, normalize(k['arabic'])) for k in eski_kel]  # Uthmani

    pairs = []  # [(uthmani_kel, [diyanet_kel_listesi])]
    yi, ei = 0, 0

    while ei < len(es):
        if yi >= len(yn):
            pairs.append((es[ei][0], []))
            ei += 1
            continue

        yn_buf = ''
        es_buf = ''
        yn_idx = yi
        es_idx = ei
        eslesti = False

        while yn_idx < len(yn) or es_idx < len(es):
            if len(yn_buf) <= len(es_buf):
                if yn_idx < len(yn):
                    yn_buf += yn[yn_idx][1]
                    yn_idx += 1
                else:
                    es_buf += es[es_idx][1]
                    es_idx += 1
                    continue
            else:
                if es_idx < len(es):
                    es_buf += es[es_idx][1]
                    es_idx += 1
                else:
                    yn_buf += yn[yn_idx][1]
                    yn_idx += 1
                    continue

            if yn_buf == es_buf:
                diyanet_grup = [yn[j][0] for j in range(yi, yn_idx)]
                uthmani_grup = [es[j][0] for j in range(ei, es_idx)]
                # İlk Uthmani kelimeye tüm Diyanet grubunu eşleştir
                pairs.append((uthmani_grup[0], diyanet_grup))
                # Sonraki Uthmani kelimeler boş
                for uk in uthmani_grup[1:]:
                    pairs.append((uk, []))
                yi = yn_idx
                ei = es_idx
                eslesti = True
                break

            if len(yn_buf) > 60 or len(es_buf) > 60:
                break

        if not eslesti:
            pairs.append((es[ei][0], [yn[yi][0]] if yi < len(yn) else []))
            yi += 1
            ei += 1

    return pairs

def main():
    print("Dosyalar yükleniyor...")

    with open(GIRIS_DIYANET_AYETLER, encoding='utf-8') as f:
        diyanet_ayetler = json.load(f)
    print(f"  ✓ Diyanet ayetler — {len(diyanet_ayetler):,}")

    with open(GIRIS_DIYANET_SURELER, encoding='utf-8') as f:
        diyanet_sureler = json.load(f)
    print(f"  ✓ Diyanet sureler — {len(diyanet_sureler)}")

    with open(GIRIS_DIYANET_MUSHAF, encoding='utf-8') as f:
        diyanet_mushaf = json.load(f)
    print(f"  ✓ Diyanet mushaf (sayfa/vakıf) — {len(diyanet_mushaf)} sure")

    with open(GIRIS_UTHMANI_MUSHAF, encoding='utf-8') as f:
        uthmani_mushaf = json.load(f)
    print(f"  ✓ Uthmani mushaf (kelime bölümleme) — {len(uthmani_mushaf)} sure")

    with open(GIRIS_YER, encoding='utf-8') as f:
        yer_data = json.load(f)
    yer_haritasi = {s['id']: s.get('yer', '') for s in yer_data}

    # Sure ve ayet haritaları
    sure_haritasi = {s['id']: s for s in diyanet_sureler}

    # Diyanet mushaf → ayet bazında sayfa/vakıf/meal haritası
    # diyanet_mushaf[si]['ayetler'][ai] → {sayfa, cuz, kelimeler(vakıflı)}
    diyanet_ayet_map = {}
    for sure in diyanet_mushaf:
        for ayet in sure['ayetler']:
            diyanet_ayet_map[(sure['id'], ayet['no'])] = ayet

    # Diyanet düz liste → meal haritası
    diyanet_meal_map = {}
    for item in diyanet_ayetler:
        diyanet_meal_map[(item['surah_id'], item['ayah_number'])] = (item.get('text_turkish') or '').strip()

    print("\nDönüştürülüyor...")
    mushaf = []
    meal_dict = {}
    sayfa_baslar = {}
    toplam_kelime = 0
    hata = 0

    for si, uthmani_sure in enumerate(uthmani_mushaf):
        sure_no = uthmani_sure['id']
        sure_meta = sure_haritasi.get(sure_no)
        if not sure_meta:
            print(f"  UYARI: sure {sure_no} surahs.json'da bulunamadı!")
            continue

        ayetler_mushaf = []
        meal_sure = {}

        for ai, uthmani_ayet in enumerate(uthmani_sure['ayetler']):
            ayet_no = uthmani_ayet['no']
            diyanet_ayet = diyanet_ayet_map.get((sure_no, ayet_no))

            # Sayfa ve cüz — Diyanet'ten
            sayfa = diyanet_ayet['sayfa'] if diyanet_ayet else 0
            cuz   = diyanet_ayet['cuz']   if diyanet_ayet else 0

            # Meal — Diyanet'ten
            meal_tr = diyanet_meal_map.get((sure_no, ayet_no), '')
            meal_sure[str(ayet_no)] = meal_tr

            # Sayfa haritası
            if sayfa and sayfa not in sayfa_baslar:
                sayfa_baslar[sayfa] = (sure_no, ayet_no)

            # Diyanet kelimelerini al (vakıf dahil)
            diyanet_kel = diyanet_ayet['kelimeler'] if diyanet_ayet else []

            # Uthmani kelimelerini Diyanet kelimeleriyle hizala
            pairs = eslesir_ayet(diyanet_kel, uthmani_ayet['kelimeler'])

            kelimeler = []
            for ki, (uthmani_k, diyanet_grup) in enumerate(pairs):
                # Metin: Diyanet grubundaki kelimeleri birleştir
                if diyanet_grup:
                    arabic = ' '.join(arapca_temizle(dk['arabic']) for dk in diyanet_grup)
                    # Vakıf: Diyanet grubundaki herhangi birinde vakıf varsa al
                    vakif = None
                    for dk in diyanet_grup:
                        if dk.get('vakif'):
                            vakif = dk['vakif']
                            break
                else:
                    # Diyanet'te karşılığı yoksa Uthmani metni kullan
                    arabic = uthmani_k['arabic']
                    vakif = uthmani_k.get('vakif')

                # Secde
                secde = uthmani_k.get('secde')

                kelimeler.append({
                    "id":     uthmani_k['id'],
                    "arabic": arabic,
                    "vakif":  vakif,
                    "secde":  secde,
                })

            toplam_kelime += len(kelimeler)

            ayetler_mushaf.append({
                "no":       ayet_no,
                "sayfa":    sayfa,
                "cuz":      cuz,
                "kelimeler": kelimeler,
            })

        mushaf.append({
            "id":         sure_no,
            "isim":       sure_meta.get("name_turkish", ""),
            "isimArapca": sure_meta.get("name_arabic", ""),
            "anlam":      yer_haritasi.get(sure_no, ""),  # anlam yerine yer
            "yer":        yer_haritasi.get(sure_no, ""),
            "ayetSayisi": sure_meta.get("ayah_count", len(ayetler_mushaf)),
            "bilgi":      html_temizle(sure_meta.get("info", "")),
            "besmele":    sure_meta.get("besmele_visible", 1),
            "ayetler":    ayetler_mushaf,
        })

        meal_dict[str(sure_no)] = meal_sure
        print(f"  {sure_no:>3}. {sure_meta['name_turkish']:<20} — {len(ayetler_mushaf)} ayet, {sum(len(a['kelimeler']) for a in ayetler_mushaf):,} kelime")

    # Sayfa haritası
    sayfa_haritasi = [
        {"sayfa": s, "sure": v[0], "ayet": v[1]}
        for s, v in sorted(sayfa_baslar.items())
    ]

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

    print(f"\n✅ Tamamlandı! {len(mushaf)} sure · {toplam_kelime:,} kelime · {len(sayfa_haritasi)} sayfa")

if __name__ == "__main__":
    main()
