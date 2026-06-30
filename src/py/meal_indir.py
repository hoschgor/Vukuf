"""
Diyanet Vakfı Türkçe Meal İndirici
Kaynak: fawazahmed0/quran-api (GitHub)

Çıktı: src/data/ayet-meal.json
Format: { "sure_no": { "ayet_no": "meal metni", ... }, ... }
        Anahtarlar string, örn. meal["2"]["255"]

Kullanım:
    python3 meal_indir.py
    python3 meal_indir.py --cikti /farkli/yol/ayet-meal.json
"""

import urllib.request
import json
import os
import sys
import argparse

KAYNAK_URL = "https://raw.githubusercontent.com/fawazahmed0/quran-api/1/editions/tur-diyanetvakfi.json"

VARSAYILAN_CIKTI = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "..", "data", "ayet-meal.json"
)


def indir(url: str) -> dict:
    print(f"İndiriliyor: {url}")
    req = urllib.request.Request(url, headers={"User-Agent": "vukuf/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def nokta_ekle(metin: str) -> str:
    """Cümle sonu noktalama işareti yoksa nokta ekler."""
    metin = metin.strip()
    if not metin:
        return metin
    # Zaten noktalama ile bitiyorsa dokunma
    if metin[-1] in ".،؟!…":
        return metin
    # Parantez ile bitiyorsa dışına nokta ekle: "...değil)" → "...değil)."
    return metin + "."


def donustur(ham: dict) -> dict:
    """
    [{"chapter": 1, "verse": 1, "text": "..."}, ...]
    →
    {"1": {"1": "...", "2": "..."}, "2": {...}, ...}
    """
    meal = {}
    for ayet in ham["quran"]:
        sure = str(ayet["chapter"])
        no   = str(ayet["verse"])
        if sure not in meal:
            meal[sure] = {}
        meal[sure][no] = nokta_ekle(ayet["text"])
    return meal


def kaydet(veri: dict, yol: str) -> None:
    os.makedirs(os.path.dirname(os.path.abspath(yol)), exist_ok=True)
    with open(yol, "w", encoding="utf-8") as f:
        json.dump(veri, f, ensure_ascii=False, indent=2)
    boyut_kb = os.path.getsize(yol) / 1024
    print(f"Kaydedildi: {yol}  ({boyut_kb:.1f} KB)")


def dogrula(meal: dict) -> None:
    assert len(meal) == 114, f"Beklenen 114 sure, gelen: {len(meal)}"
    toplam = sum(len(v) for v in meal.values())
    assert toplam == 6236, f"Beklenen 6236 ayet, gelen: {toplam}"
    # Spot kontroller
    assert "Allah" in meal["2"]["255"], "2:255 Ayetel Kürsi kontrolü başarısız"
    assert meal["114"]["6"],            "114:6 son ayet kontrolü başarısız"
    print(f"✓ Doğrulama geçti — 114 sure, {toplam} ayet")


def main():
    parser = argparse.ArgumentParser(description="Diyanet Vakfı mealini indir")
    parser.add_argument(
        "--cikti", default=VARSAYILAN_CIKTI,
        help=f"Çıktı dosya yolu (varsayılan: {VARSAYILAN_CIKTI})"
    )
    args = parser.parse_args()

    try:
        ham   = indir(KAYNAK_URL)
        meal  = donustur(ham)
        dogrula(meal)
        kaydet(meal, args.cikti)
        print("\nÖrnek ayetler:")
        print(f"  1:1  → {meal['1']['1']}")
        print(f"  2:255 → {meal['2']['255'][:70]}...")
        print(f"  112:1 → {meal['112']['1']}")
    except Exception as e:
        print(f"HATA: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
