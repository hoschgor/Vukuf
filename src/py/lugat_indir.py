"""
Quran.com Word-by-Word Türkçe Lugat İndirici
Kaynak: api.quran.com/api/v4

Çıktı: src/data/arapca-lugat.json
Format:
  {
    "بسم": { "okunuş": "bis'mi", "anlamlar": ["adıyla"] },
    "لله": { "okunuş": "l-lahi", "anlamlar": ["Allah'ın"] },
    ...
  }

Anahtarlar normalize edilmiş Arapça:
  - Hareke/teşdid silinir
  - Elif varyantları (أ إ آ ٱ) → ا
  - Baştaki (ال) → (ل)  — mevcut lugat formatıyla uyumlu

Kullanım:
    python3 lugat_indir.py
    python3 lugat_indir.py --cikti /farkli/yol/arapca-lugat.json
    python3 lugat_indir.py --sure 1      # Sadece 1 sure (test)
    python3 lugat_indir.py --mevcut-koru # Mevcut kayıtların üzerine yazma
"""

import urllib.request
import urllib.parse
import json
import re
import time
import os
import sys
import argparse

BASE_URL = "https://api.quran.com/api/v4"

VARSAYILAN_CIKTI = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "..", "data", "arapca-lugat.json"
)

# Hareke, teşdid ve Kur'an özel işaretleri
HAREKE_RE = re.compile(
    r"[\u0610-\u061A\u064B-\u065F\u0640\u0670"  # ← \u0640 eklendi
    r"\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED\u06E1]"
)
# Elif varyantları → ا
ELIF_RE = re.compile(r"[\u0671\u0622\u0623\u0625]")
# Baştaki ال → ل
TANIM_RE = re.compile(r"^ال")


def normalize(kelime: str) -> str:
    k = HAREKE_RE.sub("", kelime)
    k = ELIF_RE.sub("\u0627", k)
    k = TANIM_RE.sub("ل", k)
    return k.strip()


def api_cek(endpoint: str, params: dict) -> dict:
    url = f"{BASE_URL}/{endpoint}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"User-Agent": "vukuf/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def sure_kelimeleri_cek(sure_no: int) -> list[dict]:
    """
    Bir surenin tüm kelimelerini sayfalı olarak çeker.
    Döndürür: [{"arapca": str, "okunuş": str, "anlam": str}, ...]
    """
    kelimeler = []
    sayfa = 1
    while True:
        veri = api_cek("verses/by_chapter/" + str(sure_no), {
            "language":    "tr",
            "words":       "true",
            "word_fields": "text_uthmani,translation,transliteration",
            "per_page":    50,
            "page":        sayfa,
        })
        for ayet in veri.get("verses", []):
            for w in ayet.get("words", []):
                # Sadece gerçek kelimeleri al, sayfa işareti vs. değil
                if w.get("char_type_name") != "word":
                    continue
                arapca     = w.get("text_uthmani", "").strip()
                okunuş     = (w.get("transliteration") or {}).get("text", "")
                anlam      = (w.get("translation") or {}).get("text", "")
                if arapca and anlam:
                    kelimeler.append({
                        "arapca": arapca,
                        "okunuş": okunuş,
                        "anlam":  anlam,
                    })

        meta = veri.get("meta", {})
        if sayfa >= meta.get("total_pages", 1):
            break
        sayfa += 1
        time.sleep(0.15)  # Rate limit

    return kelimeler


def lugat_guncelle(lugat: dict, kelimeler: list[dict], mevcut_koru: bool) -> int:
    """
    Kelime listesinden lugat dict'ini günceller.
    Aynı anahtarda birden fazla anlam varsa listeye ekler (tekrar etmeden).
    Döndürür: eklenen yeni anahtar sayısı
    """
    yeni = 0
    for k in kelimeler:
        anahtar = normalize(k["arapca"])
        if not anahtar:
            continue

        anlam   = k["anlam"].strip()
        okunuş  = k["okunuş"].strip()

        if anahtar not in lugat:
            lugat[anahtar] = {"okunuş": okunuş, "anlamlar": [anlam] if anlam else []}
            yeni += 1
        elif not mevcut_koru:
            # Yeni anlam varsa ekle, tekrar etme
            if anlam and anlam not in lugat[anahtar]["anlamlar"]:
                lugat[anahtar]["anlamlar"].append(anlam)
            # Okunuş yoksa doldur
            if not lugat[anahtar].get("okunuş") and okunuş:
                lugat[anahtar]["okunuş"] = okunuş

    return yeni


def kaydet(veri: dict, yol: str) -> None:
    os.makedirs(os.path.dirname(os.path.abspath(yol)), exist_ok=True)
    # Anahtarları alfabetik sırala (diff dostu)
    sirali = dict(sorted(veri.items()))
    with open(yol, "w", encoding="utf-8") as f:
        json.dump(sirali, f, ensure_ascii=False, indent=2)
    boyut_kb = os.path.getsize(yol) / 1024
    print(f"  → Kaydedildi: {yol}  ({boyut_kb:.1f} KB, {len(sirali)} benzersiz kelime)")


def main():
    parser = argparse.ArgumentParser(description="Quran.com word-by-word Türkçe lugat indirici")
    parser.add_argument("--cikti", default=VARSAYILAN_CIKTI,
                        help="Çıktı dosya yolu")
    parser.add_argument("--sure", type=int, default=0,
                        help="Sadece bu sureyi çek (0 = tümü)")
    parser.add_argument("--mevcut-koru", action="store_true",
                        help="Mevcut anahtarların anlamlarını değiştirme")
    args = parser.parse_args()

    # Mevcut lugati yükle (varsa)
    lugat = {}
    if os.path.exists(args.cikti):
        with open(args.cikti, encoding="utf-8") as f:
            lugat = json.load(f)
        print(f"Mevcut lugat yüklendi: {len(lugat)} kelime")

    sureler = [args.sure] if args.sure else range(1, 115)
    toplam_yeni = 0

    for sure_no in sureler:
        print(f"Sure {sure_no:3d}/114 çekiliyor...", end=" ", flush=True)
        try:
            kelimeler = sure_kelimeleri_cek(sure_no)
            yeni = lugat_guncelle(lugat, kelimeler, args.mevcut_koru)
            toplam_yeni += yeni
            print(f"{len(kelimeler):4d} kelime, +{yeni} yeni")
        except Exception as e:
            print(f"HATA: {e}")
            time.sleep(2)
            continue

        # Her 10 surede bir ara kaydet
        if sure_no % 10 == 0:
            kaydet(lugat, args.cikti)

    kaydet(lugat, args.cikti)
    print(f"\n✓ Tamamlandı — {len(lugat)} benzersiz kelime, {toplam_yeni} yeni eklendi")

    # Örnek kontrol
    print("\nÖrnek eşleşmeler:")
    for test in ["بِسْمِ", "ٱللَّهِ", "ٱلرَّحْمَٰنِ", "رَبِّ"]:
        anahtar = normalize(test)
        sonuc = lugat.get(anahtar)
        if sonuc:
            print(f"  {test} → {anahtar} → {sonuc['anlamlar'][0]}")
        else:
            print(f"  {test} → {anahtar} → ✗ bulunamadı")


if __name__ == "__main__":
    main()
